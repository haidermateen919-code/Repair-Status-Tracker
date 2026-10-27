import { describe, expect, it } from "vitest";

import { ApiClientError } from "@/lib/client/api";
import {
  AppError,
  JobDeletedError,
  NotFoundError,
  RateLimitError,
  ReopenConfirmationError,
  UnauthorizedError,
  ValidationError,
  toPublicError,
} from "@/lib/errors";
import { bucketKey } from "@/lib/rate-limit";
import { buildTimelineItems } from "@/lib/timeline";
import { isAcceptablePassword, hashPassword, simulatePasswordCheck, verifyPassword } from "@/lib/password";

describe("error mapping", () => {
  it("keeps typed errors intact", () => {
    const mapped = toPublicError(new ValidationError("bad", { name: "required" }));
    expect(mapped).toMatchObject({ code: "VALIDATION_FAILED", status: 400 });
  });

  it("never leaks internals for unexpected errors", () => {
    const mapped = toPublicError(new Error("database password=secret"));
    expect(mapped).toEqual({ code: "INTERNAL", status: 500, message: "Something went wrong" });
  });

  it("maps every documented status code", () => {
    expect(toPublicError(new UnauthorizedError()).status).toBe(401);
    expect(toPublicError(new NotFoundError()).status).toBe(404);
    expect(toPublicError(new JobDeletedError()).status).toBe(409);
    expect(toPublicError(new ReopenConfirmationError()).status).toBe(409);
    expect(toPublicError(new RateLimitError(120)).status).toBe(429);
    expect(new RateLimitError(120).retryAfterSeconds).toBe(120);
  });

  it("is an AppError subclass chain", () => {
    expect(new ValidationError()).toBeInstanceOf(AppError);
  });

  it("browser client error keeps the machine code", () => {
    const error = new ApiClientError("VALIDATION_FAILED", 400, "Invalid request", { a: "b" });
    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.details).toEqual({ a: "b" });
  });
});

describe("rate limit buckets", () => {
  it("hashes identifiers so raw IPs and phones are never stored", () => {
    const key = bucketKey("lookup-phone", "+923001234567");
    expect(key.startsWith("lookup-phone:")).toBe(true);
    expect(key).not.toContain("923001234567");
    expect(key.length).toBe("lookup-phone:".length + 64);
  });

  it("is deterministic and namespace-separated", () => {
    expect(bucketKey("a", "1.2.3.4")).toBe(bucketKey("a", "1.2.3.4"));
    expect(bucketKey("a", "1.2.3.4")).not.toBe(bucketKey("b", "1.2.3.4"));
  });
});

describe("passwords", () => {
  it("hashes with argon2id and verifies", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
    expect(await verifyPassword(hash, "wrong password")).toBe(false);
  });

  it("produces a different hash every time (salted)", async () => {
    const [a, b] = await Promise.all([hashPassword("same-password"), hashPassword("same-password")]);
    expect(a).not.toBe(b);
  });

  it("treats a corrupted hash as a failed login, not a crash", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });

  it("never throws while simulating a check for unknown users", async () => {
    await expect(simulatePasswordCheck("anything")).resolves.toBeUndefined();
  });

  it("enforces a minimum password length for the seeded owner", () => {
    expect(isAcceptablePassword("short")).toBe(false);
    expect(isAcceptablePassword("twelve-chars")).toBe(true);
    expect(isAcceptablePassword("x".repeat(201))).toBe(false);
  });
});

describe("timeline building", () => {
  const events = [
    { status: "READY" as const, publicNote: null, at: new Date("2026-10-30T09:00:00.000Z") },
    { status: null, publicNote: "Part order kar diya hai", at: new Date("2026-10-28T09:00:00.000Z") },
  ];

  it("labels status events for the owner", () => {
    const items = buildTimelineItems(events, "owner");
    expect(items[0]?.label).toBe("Ready");
    expect(items[1]?.label).toBe("Public note updated");
  });

  it("adds the Roman Urdu reassurance for customers", () => {
    const items = buildTimelineItems(events, "customer");
    expect(items[0]?.detail).toBe("Aap ki cheez theek ho gayi hai. Dukaan se le jayen.");
    expect(items[1]?.detail).toBe("Part order kar diya hai");
  });

  it("formats every entry in shop time", () => {
    const items = buildTimelineItems(events, "owner");
    expect(items[0]?.when).toContain("30 Oct");
  });
});
