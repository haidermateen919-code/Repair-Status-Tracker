import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  bucketKey,
  consumeRateLimit,
  isRateLimited,
  recordRateLimitEvent,
} from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/config";
import { createTestDatabase, type TestDatabase } from "./helpers";

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

const rule = { key: bucketKey("lookup-ip", "1.2.3.4"), ...RATE_LIMITS.lookupPerIp };

describe("consumeRateLimit", () => {
  it("allows exactly the configured number of requests", async () => {
    const results = [];
    for (let index = 0; index < RATE_LIMITS.lookupPerIp.limit; index += 1) {
      results.push(await consumeRateLimit(rule));
    }

    expect(results.every((result) => result.allowed)).toBe(true);
  });

  it("blocks the next request and reports when to retry", async () => {
    for (let index = 0; index < RATE_LIMITS.lookupPerIp.limit; index += 1) {
      await consumeRateLimit(rule);
    }

    const blocked = await consumeRateLimit(rule);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(RATE_LIMITS.lookupPerIp.windowSeconds);
    }
  });

  it("keeps buckets independent (one phone cannot block another)", async () => {
    const phoneA = { key: bucketKey("lookup-phone", "+923001234567"), ...RATE_LIMITS.lookupPerPhone };
    const phoneB = { key: bucketKey("lookup-phone", "+923009876543"), ...RATE_LIMITS.lookupPerPhone };

    for (let index = 0; index < phoneA.limit; index += 1) {
      await consumeRateLimit(phoneA);
    }

    expect((await consumeRateLimit(phoneA)).allowed).toBe(false);
    expect((await consumeRateLimit(phoneB)).allowed).toBe(true);
  });

  it("starts a fresh window once events age out", async () => {
    for (let index = 0; index < rule.limit; index += 1) {
      await consumeRateLimit(rule);
    }
    expect((await consumeRateLimit(rule)).allowed).toBe(false);

    // Simulate the window passing.
    await test.handle.exec(
      `UPDATE rate_limit_events SET created_at = now() - interval '20 minutes'`,
    );

    expect((await consumeRateLimit(rule)).allowed).toBe(true);
  });

  it("only counts events inside the current window", async () => {
    // One ancient event must not count against today's budget.
    await test.handle.exec(
      `INSERT INTO rate_limit_events (bucket, created_at) VALUES ('${rule.key}', now() - interval '2 hours')`,
    );
    expect((await consumeRateLimit(rule)).allowed).toBe(true);
    expect((await consumeRateLimit(rule)).allowed).toBe(true);
  });

  it("does not record blocked attempts, so the window cannot be extended forever", async () => {
    for (let index = 0; index < rule.limit; index += 1) {
      await consumeRateLimit(rule);
    }

    // Ten rejections in a row must not push the retry time further out.
    const first = await consumeRateLimit(rule);
    for (let index = 0; index < 10; index += 1) await consumeRateLimit(rule);
    const last = await consumeRateLimit(rule);

    if (!first.allowed && !last.allowed) {
      expect(last.retryAfterSeconds).toBeLessThanOrEqual(first.retryAfterSeconds);
    }
  });
});

describe("login throttling helpers", () => {
  it("counts failures and reports the limit without blocking early", async () => {
    const key = bucketKey("login-ip", "9.9.9.9");
    const loginRule = { key, ...RATE_LIMITS.loginPerIp };

    expect(await isRateLimited(loginRule)).toBe(false);

    for (let index = 0; index < loginRule.limit; index += 1) {
      await recordRateLimitEvent(key);
    }

    expect(await isRateLimited(loginRule)).toBe(true);
  });
});
