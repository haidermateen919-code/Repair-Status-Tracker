import { describe, expect, it } from "vitest";

import {
  addDays,
  daysBetween,
  describeExpectedReady,
  expectedDateFromDays,
  formatHumanDate,
  formatLongDate,
  formatTime,
  isIsoDate,
  todayInShopTimezone,
} from "@/lib/dates";

describe("todayInShopTimezone", () => {
  it("uses Asia/Karachi, not UTC, around midnight", () => {
    // 20:30 UTC on 27 Oct is already 01:30 on 28 Oct in Karachi (UTC+5).
    const lateEveningUtc = new Date("2026-10-27T20:30:00.000Z");
    expect(todayInShopTimezone(lateEveningUtc)).toBe("2026-10-28");
  });

  it("returns a date-only string", () => {
    expect(todayInShopTimezone(new Date("2026-10-27T10:00:00.000Z"))).toBe("2026-10-27");
  });
});

describe("isIsoDate", () => {
  it.each(["2026-10-30", "2024-02-29", "2000-01-01"])("accepts %s", (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each(["2026-02-31", "2026-13-01", "30-10-2026", "2026-1-1", "", "2026-10-30T00:00:00Z"])(
    "rejects %s",
    (value) => {
      expect(isIsoDate(value)).toBe(false);
    },
  );
});

describe("addDays / daysBetween", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
  });

  it("subtracts with a negative number", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("handles leap years", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("measures whole days in both directions", () => {
    expect(daysBetween("2026-10-27", "2026-10-30")).toBe(3);
    expect(daysBetween("2026-10-30", "2026-10-27")).toBe(-3);
    expect(daysBetween("2026-10-27", "2026-10-27")).toBe(0);
  });

  it("is not affected by daylight-saving shifts", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("formatHumanDate", () => {
  it("omits the year within the current year", () => {
    expect(formatHumanDate("2026-10-30", "2026-10-27")).toBe("30 Oct");
  });

  it("includes the year when the date is in another year", () => {
    expect(formatHumanDate("2027-01-05", "2026-12-30")).toBe("5 Jan 2027");
  });
});

describe("formatLongDate / formatTime", () => {
  it("formats a Date in shop local time", () => {
    expect(formatLongDate(new Date("2026-10-27T18:05:00.000Z"))).toBe("27 Oct 2026");
  });

  it("formats a date-only string without timezone drift", () => {
    expect(formatLongDate("2026-10-30")).toBe("30 Oct 2026");
  });

  it("renders 24-hour shop-local time", () => {
    expect(formatTime(new Date("2026-10-27T09:05:00.000Z"))).toBe("14:05");
  });
});

describe("describeExpectedReady", () => {
  it("reports an upcoming date", () => {
    const info = describeExpectedReady("2026-10-30", "2026-10-27");
    expect(info).toMatchObject({
      daysAway: 3,
      isToday: false,
      isOverdue: false,
      humanDate: "30 Oct",
    });
  });

  it("reports today", () => {
    const info = describeExpectedReady("2026-10-27", "2026-10-27");
    expect(info.isToday).toBe(true);
    expect(info.isOverdue).toBe(false);
  });

  it("reports overdue dates with a negative day count (amber, not red)", () => {
    const info = describeExpectedReady("2026-10-25", "2026-10-27");
    expect(info.isOverdue).toBe(true);
    expect(info.daysAway).toBe(-2);
  });
});

describe("expectedDateFromDays", () => {
  it("turns the owner's day stepper into a date", () => {
    expect(expectedDateFromDays(3, "2026-10-27")).toBe("2026-10-30");
  });
});
