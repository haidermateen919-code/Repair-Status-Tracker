import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * HTTP-contract tests for the owner API. The only thing mocked is the session
 * lookup (`requireOwnerApi`) — everything below it (Zod, services, Postgres) is
 * the real code path.
 */
vi.mock("@/lib/auth", () => ({
  requireOwnerApi: vi.fn(async () => ({
    userId: "testuser00000001",
    shopId: "testshop00000001",
    email: "owner@test.pk",
    name: "Owner",
  })),
  requireOwner: vi.fn(async () => ({
    userId: "testuser00000001",
    shopId: "testshop00000001",
    email: "owner@test.pk",
    name: "Owner",
  })),
  getOwnerSession: vi.fn(async () => null),
}));

const { DELETE, GET, PATCH } = await import("@/app/api/jobs/[id]/route");
const { GET: listGET, POST: createPOST } = await import("@/app/api/jobs/route");

import { UnauthorizedError } from "@/lib/errors";
import { createTestDatabase, jobInput, TEST_SHOP_ID, type TestDatabase } from "./helpers";

let test: TestDatabase;

const BASE = "http://localhost:3000";
const SAME_ORIGIN = { origin: BASE, host: "localhost:3000" };

beforeAll(async () => {
  test = await createTestDatabase();
});

beforeEach(async () => {
  await test.reset();
});

afterAll(async () => {
  await test.handle.close();
});

function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json", ...SAME_ORIGIN },
    body: JSON.stringify(body),
  });
}

async function params<T>(values: T): Promise<T> {
  return values;
}

async function createOne(): Promise<{ id: string; token: string; jobNumber: number }> {
  const response = await createPOST(jsonRequest(`${BASE}/api/jobs`, "POST", jobInput()));
  const body = (await response.json()) as { id: string; publicToken: string; jobNumber: number };
  return { id: body.id, token: body.publicToken, jobNumber: body.jobNumber };
}

describe("POST /api/jobs", () => {
  it("creates a job and returns 201 with the public URL", async () => {
    const response = await createPOST(jsonRequest(`${BASE}/api/jobs`, "POST", jobInput()));
    const body = (await response.json()) as {
      jobNumber: number;
      publicUrl: string;
      publicToken: string;
    };

    expect(response.status).toBe(201);
    expect(body.jobNumber).toBe(1001);
    expect(body.publicUrl).toBe(`${BASE}/s/${body.publicToken}`);
    expect(body.publicUrl).not.toContain(String(body.jobNumber));
  });

  it("returns field-level details for invalid input", async () => {
    const response = await createPOST(
      jsonRequest(`${BASE}/api/jobs`, "POST", {
        ...jobInput(),
        customerPhone: "123",
        itemName: "",
      }),
    );
    const body = (await response.json()) as {
      error: { code: string; details: Record<string, string> };
    };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(body.error.details)).toEqual(
      expect.arrayContaining(["customerPhone", "itemName"]),
    );
  });

  it("rejects unknown fields", async () => {
    const response = await createPOST(
      jsonRequest(`${BASE}/api/jobs`, "POST", { ...jobInput(), status: "READY" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects cross-origin writes", async () => {
    const response = await createPOST(
      new Request(`${BASE}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "https://evil.example",
          host: "localhost:3000",
        },
        body: JSON.stringify(jobInput()),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when there is no session", async () => {
    const auth = await import("@/lib/auth");
    vi.mocked(auth.requireOwnerApi).mockRejectedValueOnce(new UnauthorizedError());

    const response = await createPOST(jsonRequest(`${BASE}/api/jobs`, "POST", jobInput()));
    expect(response.status).toBe(401);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      "UNAUTHORIZED",
    );
  });
});

describe("GET /api/jobs", () => {
  it("lists active jobs with counts", async () => {
    await createOne();

    const response = await listGET(new Request(`${BASE}/api/jobs`));
    const body = (await response.json()) as {
      items: { jobNumber: number }[];
      counts: { active: number; ready: number };
    };

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.counts).toEqual({ active: 1, ready: 0, delivered: 0 });
  });

  it("honours the status filter and search query", async () => {
    await createOne();

    const ready = await listGET(new Request(`${BASE}/api/jobs?status=ready`));
    expect(((await ready.json()) as { items: unknown[] }).items).toHaveLength(0);

    const search = await listGET(new Request(`${BASE}/api/jobs?status=all&q=1001`));
    expect(((await search.json()) as { items: unknown[] }).items).toHaveLength(1);
  });

  it("rejects an invalid filter instead of silently ignoring it", async () => {
    const response = await listGET(new Request(`${BASE}/api/jobs?status=archived`));
    expect(response.status).toBe(400);
  });

  it("never caches owner data", async () => {
    const response = await listGET(new Request(`${BASE}/api/jobs`));
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});

describe("GET /api/jobs/:id", () => {
  it("returns the full job with events and the public URL", async () => {
    const job = await createOne();

    const response = await GET(new Request(`${BASE}/api/jobs/${job.id}`), {
      params: params({ id: job.id }),
    });
    const body = (await response.json()) as {
      id: string;
      customerPhone: string;
      events: { status: string }[];
      publicUrl: string;
    };

    expect(response.status).toBe(200);
    expect(body.customerPhone).toBe("+923001234567");
    expect(body.events[0]?.status).toBe("RECEIVED");
    expect(body.publicUrl).toContain(job.token);
  });

  it("404s for unknown ids and 400s for malformed ids", async () => {
    const unknown = await GET(new Request(`${BASE}/api/jobs/unknownjob000000`), {
      params: params({ id: "unknownjob000000" }),
    });
    expect(unknown.status).toBe(404);

    const malformed = await GET(new Request(`${BASE}/api/jobs/../etc/passwd`), {
      params: params({ id: "../etc/passwd" }),
    });
    expect(malformed.status).toBe(400);
  });
});

describe("PATCH /api/jobs/:id", () => {
  it("updates the status and appends an event", async () => {
    const job = await createOne();

    const response = await PATCH(
      jsonRequest(`${BASE}/api/jobs/${job.id}`, "PATCH", { status: "IN_REPAIR" }),
      { params: params({ id: job.id }) },
    );
    const body = (await response.json()) as { status: string; events: { status: string }[] };

    expect(response.status).toBe(200);
    expect(body.status).toBe("IN_REPAIR");
    expect(body.events).toHaveLength(2);
  });

  it("returns 409 with a machine code when re-opening without confirmation", async () => {
    const job = await createOne();
    await PATCH(jsonRequest(`${BASE}/api/jobs/${job.id}`, "PATCH", { status: "DELIVERED" }), {
      params: params({ id: job.id }),
    });

    const response = await PATCH(
      jsonRequest(`${BASE}/api/jobs/${job.id}`, "PATCH", { status: "IN_REPAIR" }),
      { params: params({ id: job.id }) },
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("REOPEN_REQUIRES_CONFIRMATION");
  });

  it("updates notes and the expected date", async () => {
    const job = await createOne();

    const response = await PATCH(
      jsonRequest(`${BASE}/api/jobs/${job.id}`, "PATCH", {
        publicNote: "Part order kar diya hai",
        expectedReadyAt: "2026-11-05",
      }),
      { params: params({ id: job.id }) },
    );
    const body = (await response.json()) as { publicNote: string; expectedReadyAt: string };

    expect(body.publicNote).toBe("Part order kar diya hai");
    expect(body.expectedReadyAt).toBe("2026-11-05");
  });

  it("rejects an empty patch", async () => {
    const job = await createOne();

    const response = await PATCH(jsonRequest(`${BASE}/api/jobs/${job.id}`, "PATCH", {}), {
      params: params({ id: job.id }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 409 for a deleted job", async () => {
    const job = await createOne();
    await DELETE(jsonRequest(`${BASE}/api/jobs/${job.id}`, "DELETE", {}), {
      params: params({ id: job.id }),
    });

    const response = await PATCH(
      jsonRequest(`${BASE}/api/jobs/${job.id}`, "PATCH", { status: "READY" }),
      { params: params({ id: job.id }) },
    );
    expect(response.status).toBe(409);
  });
});

describe("DELETE /api/jobs/:id", () => {
  it("soft deletes and returns 202", async () => {
    const job = await createOne();

    const response = await DELETE(jsonRequest(`${BASE}/api/jobs/${job.id}`, "DELETE", {}), {
      params: params({ id: job.id }),
    });
    expect(response.status).toBe(202);

    const list = await listGET(new Request(`${BASE}/api/jobs?status=all`));
    expect(((await list.json()) as { items: unknown[] }).items).toHaveLength(0);
  });

  it("404s for an unknown job", async () => {
    const response = await DELETE(jsonRequest(`${BASE}/api/jobs/unknownjob000000`, "DELETE", {}), {
      params: params({ id: "unknownjob000000" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("shop scoping", () => {
  it("the session's shopId decides which jobs are visible", async () => {
    await createOne();
    const auth = await import("@/lib/auth");
    vi.mocked(auth.requireOwnerApi).mockResolvedValueOnce({
      userId: "otheruser0000001",
      shopId: "testshop00000002",
      email: "other@test.pk",
      name: "Other",
    });

    const response = await listGET(new Request(`${BASE}/api/jobs?status=all`));
    expect(((await response.json()) as { items: unknown[] }).items).toHaveLength(0);
  });

  it("ignores any shop or tenant hint supplied by the client", async () => {
    await createOne();

    const response = await listGET(
      new Request(`${BASE}/api/jobs?status=all`, {
        headers: { "x-shop-id": TEST_SHOP_ID, "x-tenant": "testshop00000002" },
      }),
    );
    expect(((await response.json()) as { items: unknown[] }).items).toHaveLength(1);
  });
});
