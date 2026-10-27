import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { GET as getPublicJob } from "@/app/api/public/jobs/[token]/route";
import { GET as lookupGet, POST as lookupPost } from "@/app/api/public/lookup/route";
import { createJob, softDeleteJob, updateJob } from "@/lib/services/jobs";
import { RATE_LIMITS } from "@/lib/config";
import { createTestDatabase, jobInput, TEST_SHOP_ID, type TestDatabase } from "./helpers";

/**
 * HTTP-contract tests for the two customer-facing endpoints: status codes,
 * headers, PII boundaries, validation and abuse controls.
 */

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

const ORIGIN = { origin: "http://localhost:3000", host: "localhost:3000" };

function lookupRequest(body: unknown, init: RequestInit = {}): Request {
  return new Request("http://localhost:3000/api/public/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.7", ...ORIGIN },
    body: JSON.stringify(body),
    ...init,
  });
}

async function params<T>(values: T): Promise<T> {
  return values;
}

describe("GET /api/public/jobs/:token", () => {
  it("returns 200 with the public shape", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    const response = await getPublicJob(new Request("http://localhost:3000"), {
      params: params({ token: job.publicToken }),
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.jobNumber).toBe(job.jobNumber);
    expect(body).not.toHaveProperty("customerPhone");
    expect(body).not.toHaveProperty("internalNote");
  });

  it("sends noindex and no-store headers", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    const response = await getPublicJob(new Request("http://localhost:3000"), {
      params: params({ token: job.publicToken }),
    });

    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("returns an identical 404 for unknown and deleted tokens", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);
    await softDeleteJob({ shopId: TEST_SHOP_ID, jobId: job.id }, test.db);

    const deleted = await getPublicJob(new Request("http://localhost:3000"), {
      params: params({ token: job.publicToken }),
    });
    const unknown = await getPublicJob(new Request("http://localhost:3000"), {
      params: params({ token: "z".repeat(43) }),
    });

    expect(deleted.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(await deleted.text()).toBe(await unknown.text());
  });

  it("rejects malformed tokens before touching the database", async () => {
    const response = await getPublicJob(new Request("http://localhost:3000"), {
      params: params({ token: "../../etc/passwd" }),
    });
    expect(response.status).toBe(400);
  });

  it("serves a status change on the same token", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);
    await updateJob({ shopId: TEST_SHOP_ID, jobId: job.id, patch: { status: "READY" } }, test.db);

    const response = await getPublicJob(new Request("http://localhost:3000"), {
      params: params({ token: job.publicToken }),
    });
    const body = (await response.json()) as { status: string };

    expect(body.status).toBe("READY");
  });
});

describe("POST /api/public/lookup", () => {
  it("returns matching jobs in the reduced shape", async () => {
    const job = await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    const response = await lookupPost(lookupRequest({ phone: "0300 1234567" }));
    const body = (await response.json()) as { items: { token: string; jobNumber: number }[] };

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.token).toBe(job.publicToken);
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("returns an empty list (not 404) for unknown numbers", async () => {
    const response = await lookupPost(lookupRequest({ phone: "03459999999" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [] });
  });

  it("rejects invalid numbers with a 400 and field details", async () => {
    const response = await lookupPost(lookupRequest({ phone: "hello" }));
    const body = (await response.json()) as { error: { code: string; details?: unknown } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.details).toBeDefined();
  });

  it("rejects unknown fields", async () => {
    const response = await lookupPost(lookupRequest({ phone: "03001234567", role: "admin" }));
    expect(response.status).toBe(400);
  });

  it("rejects cross-origin submissions", async () => {
    const response = await lookupPost(
      lookupRequest(
        { phone: "03001234567" },
        {
          headers: {
            "Content-Type": "application/json",
            origin: "https://evil.example",
            host: "localhost:3000",
          },
        },
      ),
    );
    expect(response.status).toBe(400);
  });

  it("returns an empty list when the honeypot is filled", async () => {
    await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    const response = await lookupPost(lookupRequest({ phone: "03001234567", website: "spam" }));
    expect(await response.json()).toEqual({ items: [] });
  });

  it(`blocks the ${RATE_LIMITS.lookupPerIp.limit + 1}th request from one IP with 429`, async () => {
    await createJob({ shopId: TEST_SHOP_ID, input: jobInput() }, test.db);

    const statuses: number[] = [];
    for (let index = 0; index < RATE_LIMITS.lookupPerIp.limit + 1; index += 1) {
      const response = await lookupPost(lookupRequest({ phone: "03001234567" }));
      statuses.push(response.status);
    }

    expect(statuses.slice(0, -1).every((status) => status === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it("sends Retry-After when rate limited", async () => {
    for (let index = 0; index < RATE_LIMITS.lookupPerIp.limit; index += 1) {
      await lookupPost(lookupRequest({ phone: "03001234567" }));
    }

    const blocked = await lookupPost(lookupRequest({ phone: "03001234567" }));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("limits per phone number across different IPs", async () => {
    for (let index = 0; index < RATE_LIMITS.lookupPerPhone.limit; index += 1) {
      const response = await lookupPost(
        lookupRequest(
          { phone: "03001234567" },
          {
            headers: {
              "Content-Type": "application/json",
              "x-forwarded-for": `198.51.100.${index + 1}`,
              ...ORIGIN,
            },
          },
        ),
      );
      expect(response.status).toBe(200);
    }

    const blocked = await lookupPost(
      lookupRequest(
        { phone: "+923001234567" },
        {
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "198.51.100.99",
            ...ORIGIN,
          },
        },
      ),
    );
    expect(blocked.status).toBe(429);
  });

  it("rejects other HTTP methods", () => {
    const response = lookupGet();
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });

  it("rejects oversized bodies", async () => {
    const response = await lookupPost(
      lookupRequest({ phone: "03001234567", website: "x".repeat(20_000) }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON with a clear 400", async () => {
    const response = await lookupPost(
      new Request("http://localhost:3000/api/public/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...ORIGIN },
        body: "{not json",
      }),
    );
    expect(response.status).toBe(400);
  });
});
