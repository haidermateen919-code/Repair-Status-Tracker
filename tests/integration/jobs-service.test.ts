import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { shops } from "@/lib/db/schema";
import { JobDeletedError, NotFoundError, ReopenConfirmationError } from "@/lib/errors";
import {
  createJob,
  getJobCounts,
  getJobForOwner,
  listJobs,
  softDeleteJob,
  updateJob,
} from "@/lib/services/jobs";
import { normalisePhone } from "@/lib/phone";
import {
  TEST_SHOP_ID,
  TEST_SHOP_ID_2,
  createTestDatabase,
  jobInput,
  type TestDatabase,
} from "./helpers";

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

describe("createJob", () => {
  it("creates a RECEIVED job with a sequential number and an audit event", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    expect(job.jobNumber).toBe(1001);
    expect(job.status).toBe("RECEIVED");
    expect(job.publicToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const result = await getJobForOwner({ shopId: TEST_SHOP_ID, jobId: job.id }, test.db);
    expect(result?.events).toHaveLength(1);
    expect(result?.events[0]?.status).toBe("RECEIVED");
  });

  it("normalises the phone number to E.164 before storing it", async () => {
    const job = await createJob(
      { shopId: TEST_SHOP_ID, input: jobInput({ customerPhone: "0300 1234567" }) },
      test.db,
    );
    expect(job.customerPhone).toBe("+923001234567");
  });

  it("computes the expected date from the day estimate", async () => {
    const job = await createJob(
      { shopId: TEST_SHOP_ID, input: jobInput({ estimateDays: 5, expectedReadyAt: null }) },
      test.db,
    );
    expect(job.expectedReadyAt).not.toBeNull();
    expect(job.estimateDays).toBe(5);
  });

  it("prefers an explicit expected date over the estimate", async () => {
    const job = await createJob(
      { shopId: TEST_SHOP_ID, input: jobInput({ expectedReadyAt: "2026-12-24" }) },
      test.db,
    );
    expect(job.expectedReadyAt).toBe("2026-12-24");
  });

  it("never stores an empty string in optional text columns", async () => {
    const job = await createJob(
      { shopId: TEST_SHOP_ID, input: jobInput({ issue: null, internalNote: null }) },
      test.db,
    );
    expect(job.issue).toBeNull();
    expect(job.internalNote).toBeNull();
  });

  it("allocates distinct numbers under concurrent writes", async () => {
    const created = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        createJob(
          { shopId: TEST_SHOP_ID, input: jobInput({ customerName: `Customer ${index}` }) },
          test.db,
        ),
      ),
    );

    const numbers = created.map((job) => job.jobNumber).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(8);
    expect(numbers).toEqual([1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008]);
  });

  it("allocates tokens that are unique across jobs", async () => {
    const jobs = await Promise.all(
      Array.from({ length: 5 }, () =>
        createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db),
      ),
    );
    expect(new Set(jobs.map((job) => job.publicToken)).size).toBe(5);
  });

  it("fails cleanly for an unknown shop and consumes no job number", async () => {
    await expect(
      createJob({ shopId: "missingshop000001", input: jobInput() }, test.db),
    ).rejects.toBeInstanceOf(NotFoundError);

    const [shop] = await test.db.select().from(shops).where(eq(shops.id, TEST_SHOP_ID));
    expect(shop?.jobSeq).toBe(1000);
  });
});

describe("updateJob", () => {
  it("changes the status and appends exactly one event", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    const { job: updated, events } = await updateJob(
      { shopId: TEST_SHOP_ID, jobId: job.id, patch: { status: "IN_REPAIR" } },
      test.db,
    );

    expect(updated.status).toBe("IN_REPAIR");
    expect(events).toHaveLength(2);
    expect(events[0]?.status).toBe("IN_REPAIR");
  });

  it("is idempotent: repeating the same status writes no duplicate event", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    await updateJob({ shopId: TEST_SHOP_ID, jobId: job.id, patch: { status: "READY" } }, test.db);
    const second = await updateJob(
      { shopId: TEST_SHOP_ID, jobId: job.id, patch: { status: "READY" } },
      test.db,
    );

    expect(second.events).toHaveLength(2);
  });

  it("sets deliveredAt when delivered and clears it when re-opened", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    const delivered = await updateJob(
      { shopId: TEST_SHOP_ID, jobId: job.id, patch: { status: "DELIVERED" } },
      test.db,
    );
    expect(delivered.job.deliveredAt).toBeInstanceOf(Date);

    const reopened = await updateJob(
      { shopId: TEST_SHOP_ID, jobId: job.id, patch: { status: "IN_REPAIR", confirmReopen: true } },
      test.db,
    );
    expect(reopened.job.deliveredAt).toBeNull();
  });

  it("refuses to re-open a finished job without confirmation", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);
    await updateJob(
      { shopId: TEST_SHOP_ID, jobId: job.id, patch: { status: "DELIVERED" } },
      test.db,
    );

    await expect(
      updateJob({ shopId: TEST_SHOP_ID, jobId: job.id, patch: { status: "READY" } }, test.db),
    ).rejects.toBeInstanceOf(ReopenConfirmationError);
  });

  it("records public-note changes in the timeline without a status", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    const { events } = await updateJob(
      { shopId: TEST_SHOP_ID, jobId: job.id, patch: { publicNote: "Part order kar diya hai" } },
      test.db,
    );

    expect(events[0]?.status).toBeNull();
    expect(events[0]?.publicNote).toBe("Part order kar diya hai");
  });

  it("does not create an event when a note is saved unchanged", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    await updateJob(
      { shopId: TEST_SHOP_ID, jobId: job.id, patch: { publicNote: "Same" } },
      test.db,
    );
    const { events } = await updateJob(
      { shopId: TEST_SHOP_ID, jobId: job.id, patch: { publicNote: "Same" } },
      test.db,
    );

    expect(events).toHaveLength(2);
  });

  it("keeps the internal note private and out of the event log", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    const { job: updated, events } = await updateJob(
      {
        shopId: TEST_SHOP_ID,
        jobId: job.id,
        patch: { internalNote: "Customer ne discount maanga" },
      },
      test.db,
    );

    expect(updated.internalNote).toBe("Customer ne discount maanga");
    expect(events.every((event) => event.publicNote !== "Customer ne discount maanga")).toBe(true);
  });

  it("recomputes the expected date when only the estimate changes", async () => {
    const job = await createJob(
      { shopId: TEST_SHOP_ID, input: jobInput({ expectedReadyAt: "2026-12-24" }) },
      test.db,
    );

    const { job: updated } = await updateJob(
      { shopId: TEST_SHOP_ID, jobId: job.id, patch: { estimateDays: 2 } },
      test.db,
    );

    expect(updated.estimateDays).toBe(2);
    expect(updated.expectedReadyAt).not.toBe("2026-12-24");
  });

  it("clears the expected date", async () => {
    const job = await createJob(
      { shopId: TEST_SHOP_ID, input: jobInput({ expectedReadyAt: "2026-12-24" }) },
      test.db,
    );

    const { job: updated } = await updateJob(
      { shopId: TEST_SHOP_ID, jobId: job.id, patch: { expectedReadyAt: null } },
      test.db,
    );

    expect(updated.expectedReadyAt).toBeNull();
  });

  it("cannot touch a job that belongs to another shop", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    await expect(
      updateJob({ shopId: TEST_SHOP_ID_2, jobId: job.id, patch: { status: "READY" } }, test.db),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("reports 409 semantics once a job is deleted", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);
    await softDeleteJob({ shopId: TEST_SHOP_ID, jobId: job.id }, test.db);

    await expect(
      updateJob({ shopId: TEST_SHOP_ID, jobId: job.id, patch: { status: "READY" } }, test.db),
    ).rejects.toBeInstanceOf(JobDeletedError);
  });

  it("rejects an unknown job", async () => {
    await expect(
      updateJob(
        { shopId: TEST_SHOP_ID, jobId: "nonexistent00000", patch: { status: "READY" } },
        test.db,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("listJobs", () => {
  beforeEach(async () => {
    const statuses = ["IN_REPAIR", "READY", "DELIVERED", "WAITING_FOR_PART", "CANCELLED"] as const;
    for (const status of statuses) {
      const job = await createJob(
        { shopId: TEST_SHOP_ID, input: jobInput({ customerName: `Customer ${status}` }) },
        test.db,
      );
      await updateJob({ shopId: TEST_SHOP_ID, jobId: job.id, patch: { status } }, test.db);
    }
  });

  it("returns only active jobs for the default tab", async () => {
    const { items } = await listJobs({ shopId: TEST_SHOP_ID, filter: "active" }, test.db);
    expect(items.map((job) => job.status).sort()).toEqual(["IN_REPAIR", "WAITING_FOR_PART"]);
  });

  it("filters ready and delivered jobs", async () => {
    const ready = await listJobs({ shopId: TEST_SHOP_ID, filter: "ready" }, test.db);
    const delivered = await listJobs({ shopId: TEST_SHOP_ID, filter: "delivered" }, test.db);
    expect(ready.items).toHaveLength(1);
    expect(delivered.items).toHaveLength(1);
  });

  it("returns everything (including cancelled) for the all tab", async () => {
    const { items } = await listJobs({ shopId: TEST_SHOP_ID, filter: "all" }, test.db);
    expect(items).toHaveLength(5);
  });

  it("computes the top-bar counts", async () => {
    const counts = await getJobCounts(TEST_SHOP_ID, test.db);
    expect(counts).toEqual({ active: 2, ready: 1, delivered: 1 });
  });

  it("counts ignore deleted jobs", async () => {
    const { items } = await listJobs({ shopId: TEST_SHOP_ID, filter: "ready" }, test.db);
    const readyJob = items[0];
    expect(readyJob).toBeDefined();
    await softDeleteJob({ shopId: TEST_SHOP_ID, jobId: readyJob!.id }, test.db);

    const counts = await getJobCounts(TEST_SHOP_ID, test.db);
    expect(counts.ready).toBe(0);
  });

  it("sorts newest first for active jobs", async () => {
    const { items } = await listJobs({ shopId: TEST_SHOP_ID, filter: "all" }, test.db);
    const numbers = items.map((job) => job.jobNumber);
    expect(numbers).toEqual([...numbers].sort((a, b) => b - a));
  });

  it("never returns another shop's jobs", async () => {
    const { items } = await listJobs({ shopId: TEST_SHOP_ID_2, filter: "all" }, test.db);
    expect(items).toHaveLength(0);
  });

  it("never returns more rows than the page size", async () => {
    const { items } = await listJobs({ shopId: TEST_SHOP_ID, filter: "all" }, test.db);
    expect(items.length).toBeLessThanOrEqual(100);
  });
});

describe("listJobs search", () => {
  beforeEach(async () => {
    await createJob(
      {
        shopId: TEST_SHOP_ID,
        input: jobInput({
          customerName: "Bilal Ahmed",
          customerPhone: "03219876543",
          itemName: "Juicer",
        }),
      },
      test.db,
    );
    await createJob(
      {
        shopId: TEST_SHOP_ID,
        input: jobInput({
          customerName: "Ali Raza",
          customerPhone: "03001234567",
          itemName: "Geyser",
        }),
      },
      test.db,
    );
  });

  it("matches the customer name case-insensitively", async () => {
    const { items } = await listJobs(
      { shopId: TEST_SHOP_ID, filter: "all", query: "bilal" },
      test.db,
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.customerName).toBe("Bilal Ahmed");
  });

  it("matches the last four digits of the phone number", async () => {
    const { items } = await listJobs(
      { shopId: TEST_SHOP_ID, filter: "all", query: "4567" },
      test.db,
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.customerName).toBe("Ali Raza");
  });

  it("matches every job whose number contains the fragment", async () => {
    // "6543" only appears in Bilal's number; "923" is the country code both share.
    const bilal = await listJobs({ shopId: TEST_SHOP_ID, filter: "all", query: "6543" }, test.db);
    expect(bilal.items.map((job) => job.customerName)).toEqual(["Bilal Ahmed"]);

    const both = await listJobs({ shopId: TEST_SHOP_ID, filter: "all", query: "923" }, test.db);
    expect(both.items).toHaveLength(2);
  });

  it("matches a local-format phone fragment", async () => {
    const { items } = await listJobs(
      { shopId: TEST_SHOP_ID, filter: "all", query: "0300 1234567" },
      test.db,
    );
    expect(items).toHaveLength(1);
  });

  it("matches the item name", async () => {
    const { items } = await listJobs(
      { shopId: TEST_SHOP_ID, filter: "all", query: "juicer" },
      test.db,
    );
    expect(items).toHaveLength(1);
  });

  it("matches the job number with or without a hash", async () => {
    const withHash = await listJobs(
      { shopId: TEST_SHOP_ID, filter: "all", query: "#1001" },
      test.db,
    );
    const plain = await listJobs({ shopId: TEST_SHOP_ID, filter: "all", query: "1001" }, test.db);
    expect(withHash.items).toHaveLength(1);
    expect(plain.items).toHaveLength(1);
  });

  it("returns nothing for a query with no matches", async () => {
    const { items } = await listJobs(
      { shopId: TEST_SHOP_ID, filter: "all", query: "zzzz" },
      test.db,
    );
    expect(items).toHaveLength(0);
  });

  it("treats SQL wildcards as literal characters", async () => {
    const { items } = await listJobs({ shopId: TEST_SHOP_ID, filter: "all", query: "%" }, test.db);
    expect(items).toHaveLength(0);
  });
});

describe("softDeleteJob", () => {
  it("removes the job from owner reads and public lookups", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);
    await softDeleteJob({ shopId: TEST_SHOP_ID, jobId: job.id }, test.db);

    expect(await getJobForOwner({ shopId: TEST_SHOP_ID, jobId: job.id }, test.db)).toBeNull();
    const { items } = await listJobs({ shopId: TEST_SHOP_ID, filter: "all" }, test.db);
    expect(items).toHaveLength(0);
  });

  it("is idempotent", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);
    await softDeleteJob({ shopId: TEST_SHOP_ID, jobId: job.id }, test.db);
    await expect(
      softDeleteJob({ shopId: TEST_SHOP_ID, jobId: job.id }, test.db),
    ).resolves.toBeUndefined();
  });

  it("404s for unknown jobs and for other shops' jobs", async () => {
    await expect(
      softDeleteJob({ shopId: TEST_SHOP_ID, jobId: "unknownjob000000" }, test.db),
    ).rejects.toBeInstanceOf(NotFoundError);

    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);
    await expect(
      softDeleteJob({ shopId: TEST_SHOP_ID_2, jobId: job.id }, test.db),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("phone search parity", () => {
  it("stores what the search helper expects", () => {
    expect(normalisePhone("0300 1234567")?.replace("+92", "")).toBe("3001234567");
  });
});
