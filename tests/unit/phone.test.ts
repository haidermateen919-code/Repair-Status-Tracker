import { describe, expect, it } from "vitest";

import { formatPhone, normalisePhone, phoneLastFour, phoneToDialDigits } from "@/lib/phone";

describe("normalisePhone", () => {
  it.each([
    ["03001234567", "+923001234567"],
    ["3001234567", "+923001234567"],
    ["+923001234567", "+923001234567"],
    ["923001234567", "+923001234567"],
    ["0300-1234567", "+923001234567"],
    ["0300 1234567", "+923001234567"],
    ["  0300.123.4567  ", "+923001234567"],
    ["0092 300 1234567", "+923001234567"],
    ["+92 (300) 123-4567", "+923001234567"],
    ["+92 321 9876543", "+923219876543"],
  ])("normalises %s to %s", (input, expected) => {
    expect(normalisePhone(input)).toBe(expected);
  });

  it.each([
    [""],
    ["   "],
    ["not a phone"],
    ["0300 12345"], // too short
    ["0300 123456789"], // too long
    ["+9230012345678"], // too long after country code
    ["+13001234567"], // not Pakistan
    ["0212345678"], // landline, not a mobile
    ["+92 200 1234567"], // mobile prefixes start with 3
  ])("rejects %s", (input) => {
    expect(normalisePhone(input)).toBeNull();
  });

  it("rejects absurdly long input without throwing", () => {
    expect(normalisePhone("9".repeat(500))).toBeNull();
  });

  it("ignores non-string values", () => {
    // @ts-expect-error deliberately wrong type, mirrors an untyped API payload
    expect(normalisePhone(null)).toBeNull();
    // @ts-expect-error deliberately wrong type
    expect(normalisePhone(12345)).toBeNull();
  });
});

describe("formatPhone", () => {
  it("renders the local shape the shop recognises", () => {
    expect(formatPhone("+923001234567")).toBe("0300 1234567");
  });

  it("returns unknown formats untouched instead of guessing", () => {
    expect(formatPhone("123")).toBe("123");
  });
});

describe("phoneToDialDigits", () => {
  it("strips the plus for wa.me and tel links", () => {
    expect(phoneToDialDigits("+923001234567")).toBe("923001234567");
  });
});

describe("phoneLastFour", () => {
  it("returns the last four digits used for search", () => {
    expect(phoneLastFour("+923001234567")).toBe("4567");
  });
});
