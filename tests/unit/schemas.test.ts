import { describe, expect, it } from "vitest";

import { createJobSchema, listJobsQuerySchema, updateJobSchema } from "@/lib/schemas/job";
import { lookupSchema } from "@/lib/schemas/public";
import { isoDateSchema, nullableText, optionalInt, rowIdSchema } from "@/lib/schemas/common";

describe("createJobSchema", () => {
  const valid = { customerName: "Ali Raza", customerPhone: "03001234567", itemName: "Geyser" };

  it("accepts the three required fields", () => {
    expect(createJobSchema.safeParse(valid).success).toBe(true);
  });

  it("trims whitespace", () => {
    const parsed = createJobSchema.parse({ ...valid, customerName: "  Ali Raza  " });
    expect(parsed.customerName).toBe("Ali Raza");
  });

  it.each([
    ["customerName", ""],
    ["customerName", "x".repeat(81)],
    ["itemName", ""],
    ["itemName", "x".repeat(61)],
    ["customerPhone", ""],
    ["customerPhone", "12345"],
  ])("rejects invalid %s", (field, value) => {
    const result = createJobSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys instead of silently dropping them", () => {
    const result = createJobSchema.safeParse({ ...valid, isAdmin: true });
    expect(result.success).toBe(false);
  });

  it("caps optional text lengths", () => {
    expect(createJobSchema.safeParse({ ...valid, issue: "x".repeat(301) }).success).toBe(false);
    expect(createJobSchema.safeParse({ ...valid, issue: "x".repeat(300) }).success).toBe(true);
  });

  it("converts empty optional text to null, not empty strings in the database", () => {
    const parsed = createJobSchema.parse({ ...valid, issue: "", internalNote: "  " });
    expect(parsed.issue).toBeNull();
    expect(parsed.internalNote).toBeNull();
  });

  it("bounds estimateDays to 1–30 and ignores blanks", () => {
    expect(createJobSchema.parse({ ...valid, estimateDays: "" }).estimateDays).toBeUndefined();
    expect(createJobSchema.parse({ ...valid, estimateDays: "3" }).estimateDays).toBe(3);
    expect(createJobSchema.safeParse({ ...valid, estimateDays: 0 }).success).toBe(false);
    expect(createJobSchema.safeParse({ ...valid, estimateDays: 31 }).success).toBe(false);
    expect(createJobSchema.safeParse({ ...valid, estimateDays: 2.5 }).success).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(createJobSchema.safeParse({ ...valid, expectedReadyAt: "2026-02-31" }).success).toBe(false);
    expect(createJobSchema.safeParse({ ...valid, expectedReadyAt: "2026-02-28" }).success).toBe(true);
  });
});

describe("updateJobSchema", () => {
  it("accepts a status-only patch", () => {
    expect(updateJobSchema.safeParse({ status: "READY" }).success).toBe(true);
  });

  it("rejects an empty patch", () => {
    expect(updateJobSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown statuses and unknown keys", () => {
    expect(updateJobSchema.safeParse({ status: "SHIPPED" }).success).toBe(false);
    expect(updateJobSchema.safeParse({ status: "READY", id: "x" }).success).toBe(false);
  });

  it("accepts clearing the expected date", () => {
    expect(updateJobSchema.parse({ expectedReadyAt: null }).expectedReadyAt).toBeNull();
  });

  it("accepts clearing a note", () => {
    expect(updateJobSchema.parse({ publicNote: "" }).publicNote).toBeNull();
  });

  it("requires reopen confirmation to be a boolean", () => {
    expect(updateJobSchema.safeParse({ status: "READY", confirmReopen: "yes" }).success).toBe(false);
  });

  it("bounds the estimate days on updates too", () => {
    expect(updateJobSchema.safeParse({ estimateDays: 0 }).success).toBe(false);
    expect(updateJobSchema.safeParse({ estimateDays: 30 }).success).toBe(true);
    expect(updateJobSchema.safeParse({ estimateDays: null }).success).toBe(true);
  });
});

describe("listJobsQuerySchema", () => {
  it("defaults to the active tab", () => {
    expect(listJobsQuerySchema.parse({}).status).toBe("active");
  });

  it.each(["active", "ready", "delivered", "all"])("accepts the %s filter", (status) => {
    expect(listJobsQuerySchema.parse({ status }).status).toBe(status);
  });

  it("rejects unknown filters", () => {
    expect(listJobsQuerySchema.safeParse({ status: "archived" }).success).toBe(false);
  });

  it("caps the search query length", () => {
    expect(listJobsQuerySchema.safeParse({ q: "x".repeat(81) }).success).toBe(false);
  });
});

describe("lookupSchema", () => {
  it("accepts a local or international number", () => {
    expect(lookupSchema.safeParse({ phone: "03001234567" }).success).toBe(true);
    expect(lookupSchema.safeParse({ phone: "+923001234567" }).success).toBe(true);
  });

  it("rejects nonsense numbers before hitting the database", () => {
    expect(lookupSchema.safeParse({ phone: "abc" }).success).toBe(false);
  });

  it("accepts the honeypot field but nothing else", () => {
    expect(lookupSchema.safeParse({ phone: "03001234567", website: "spam" }).success).toBe(true);
    expect(lookupSchema.safeParse({ phone: "03001234567", admin: true }).success).toBe(false);
  });
});

describe("common field schemas", () => {
  it("validates row ids", () => {
    expect(rowIdSchema.safeParse("3N28a9YxoEyBl2FV").success).toBe(true);
    expect(rowIdSchema.safeParse("short").success).toBe(false);
    expect(rowIdSchema.safeParse("../../etc/passwd").success).toBe(false);
  });

  it("validates ISO dates", () => {
    expect(isoDateSchema.safeParse("2026-10-30").success).toBe(true);
    expect(isoDateSchema.safeParse("2026-10-30T10:00:00Z").success).toBe(false);
  });

  it("normalises nullable text", () => {
    const schema = nullableText(5);
    expect(schema.parse(undefined)).toBeUndefined();
    expect(schema.parse(null)).toBeNull();
    expect(schema.parse("")).toBeNull();
    expect(schema.parse("ok")).toBe("ok");
    expect(schema.safeParse("toolong").success).toBe(false);
  });

  it("treats blank optional ints as absent", () => {
    const schema = optionalInt(1, 30);
    expect(schema.parse("")).toBeUndefined();
    expect(schema.parse("5")).toBe(5);
    expect(schema.safeParse("0").success).toBe(false);
  });
});
