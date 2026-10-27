import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createJob, softDeleteJob, updateJob } from "@/lib/services/jobs";
import { getPublicJobByToken, lookupJobsByPhone } from "@/lib/services/public-jobs";
import { normalisePhone } from "@/lib/phone";
import { toPublicJobResponse } from "@/lib/serializers";
import { createTestDatabase, jobInput, type TestDatabase } from "./helpers";

let test: TestDatabase;

beforeAll(async () => {
  test = await createTestDatabase();
});

beforeEach(async () => {
  await test.reset();
});

afterAll(async () => {
  await test.handle.close();
});

async function seedJob(overrides: Parameters<typeof jobInput>[0] = {}) {
  return createJob(
    {
      shopId: "testshop00000001",
      input: jobInput({ internalNote: "private: customer is difficult", ...overrides }),
    },
    test.db,
  );
}

describe("getPublicJobByToken", () => {
  it("returns the live status and shop details", async () => {
    const job = await seedJob();
    const view = await getPublicJobByToken(job.publicToken, test.db);

    expect(view).not.toBeNull();
    expect(view?.jobNumber).toBe(job.jobNumber);
    expect(view?.status).toBe("RECEIVED");
    expect(view?.shop.name).toBe("Test Shop");
  });

  it("reflects a status change on the same token", async () => {
    const job = await seedJob();
    await updateJob(
      { shopId: "testshop00000001", jobId: job.id, patch: { status: "READY" } },
      test.db,
    );

    const view = await getPublicJobByToken(job.publicToken, test.db);
    expect(view?.status).toBe("READY");
    expect(view?.timeline[0]?.status).toBe("READY");
  });

  it("returns null for an unknown token", async () => {
    expect(await getPublicJobByToken("y".repeat(43), test.db)).toBeNull();
  });

  it("returns null for a deleted job, exactly like an unknown token", async () => {
    const job = await seedJob();
    await softDeleteJob({ shopId: "testshop00000001", jobId: job.id }, test.db);

    expect(await getPublicJobByToken(job.publicToken, test.db)).toBeNull();
  });

  it("exposes no customer PII or internal fields", async () => {
    const job = await seedJob();
    const view = await getPublicJobByToken(job.publicToken, test.db);
    const serialised = JSON.stringify(toPublicJobResponse(view!));

    expect(serialised).not.toContain("Ali Raza");
    expect(serialised).not.toContain("03001234567");
    expect(serialised).not.toContain("+923001234567");
    expect(serialised).not.toContain("private: customer is difficult");
    expect(serialised).not.toContain(job.id);
    expect(serialised).not.toContain('"customerPhone"');
    expect(serialised).not.toContain('"customerName"');
    expect(serialised).not.toContain('"internalNote"');
    expect(serialised).not.toContain('"publicToken"');
    expect(serialised.toLowerCase()).not.toContain("price");
  });

  it("keeps the timeline capped and newest-first", async () => {
    const job = await seedJob();
    for (const status of ["IN_REPAIR", "WAITING_FOR_PART", "READY"] as const) {
      await updateJob({ shopId: "testshop00000001", jobId: job.id, patch: { status } }, test.db);
    }

    const view = await getPublicJobByToken(job.publicToken, test.db);
    expect(view?.timeline.length).toBeLessThanOrEqual(20);
    const times = view!.timeline.map((entry) => entry.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("shows public notes but never internal notes in the timeline", async () => {
    const job = await seedJob();
    await updateJob(
      {
        shopId: "testshop00000001",
        jobId: job.id,
        patch: { publicNote: "Part order kar diya hai", internalNote: "supplier owes us" },
      },
      test.db,
    );

    const view = await getPublicJobByToken(job.publicToken, test.db);
    expect(view?.publicNote).toBe("Part order kar diya hai");
    expect(JSON.stringify(view)).not.toContain("supplier owes us");
  });
});

describe("lookupJobsByPhone", () => {
  it("returns the reduced shape for a known number", async () => {
    const job = await seedJob();
    const phone = normalisePhone("03001234567")!;

    const items = await lookupJobsByPhone({ shopId: "testshop00000001", phone }, test.db);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      token: job.publicToken,
      jobNumber: job.jobNumber,
      itemName: "Geyser",
      status: "RECEIVED",
      expectedReadyAt: job.expectedReadyAt,
    });
  });

  it("never returns fault text, notes, or customer identity", async () => {
    await seedJob();
    const phone = normalisePhone("03001234567")!;
    const serialised = JSON.stringify(
      await lookupJobsByPhone({ shopId: "testshop00000001", phone }, test.db),
    );

    expect(serialised).not.toContain("heating nahi kar raha");
    expect(serialised).not.toContain("Ali Raza");
    expect(serialised).not.toContain("private:");
  });

  it("returns an empty list for an unknown number instead of erroring", async () => {
    const items = await lookupJobsByPhone(
      { shopId: "testshop00000001", phone: "+923459999999" },
      test.db,
    );
    expect(items).toEqual([]);
  });

  it("returns at most ten jobs, newest first", async () => {
    for (let index = 0; index < 12; index += 1) {
      await seedJob({ itemName: `Item ${index}` });
    }

    const items = await lookupJobsByPhone(
      { shopId: "testshop00000001", phone: normalisePhone("03001234567")! },
      test.db,
    );

    expect(items).toHaveLength(10);
    expect(items[0]?.jobNumber).toBe(1012);
  });

  it("excludes deleted jobs", async () => {
    const job = await seedJob();
    await softDeleteJob({ shopId: "testshop00000001", jobId: job.id }, test.db);

    const items = await lookupJobsByPhone(
      { shopId: "testshop00000001", phone: normalisePhone("03001234567")! },
      test.db,
    );
    expect(items).toEqual([]);
  });

  it("does not cross shops", async () => {
    await seedJob();
    const items = await lookupJobsByPhone(
      { shopId: "testshop00000002", phone: normalisePhone("03001234567")! },
      test.db,
    );
    expect(items).toEqual([]);
  });
});
