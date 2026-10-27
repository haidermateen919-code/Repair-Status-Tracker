/**
 * Date helpers. Expected-ready dates are date-only values ("2026-10-30") so they
 * never drift across timezones; "today" is always evaluated in the shop's
 * timezone (PRD §6.4, assumption A14).
 *
 * Pure module — unit-tested with an injected "now".
 */

import { SHOP_TIMEZONE } from "./config";

/** A calendar date in `YYYY-MM-DD` form. */
export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Shop-local calendar date for a given instant. */
export function todayInShopTimezone(now: Date = new Date()): IsoDate {
  // `en-CA` renders as YYYY-MM-DD, which is exactly what the DB stores.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Adds (or subtracts) whole calendar days to an ISO date. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Whole calendar days from `from` to `to`; positive when `to` is in the future. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}

/** `2026-10-30` → `30 Oct` (adds the year only when it is not the current one). */
export function formatHumanDate(date: IsoDate, today: IsoDate = todayInShopTimezone()): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));

  return date.slice(0, 4) === today.slice(0, 4) ? formatted : `${formatted} ${date.slice(0, 4)}`;
}

/** Full date used on the owner's job detail header, e.g. `27 Oct 2026`. */
export function formatLongDate(value: Date | IsoDate): string {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: typeof value === "string" ? "UTC" : SHOP_TIMEZONE,
  }).format(date);
}

/** Time-of-day for the timeline, e.g. `14:05`. */
export function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: SHOP_TIMEZONE,
  }).format(value);
}

export type ExpectedReadyInfo = {
  date: IsoDate;
  /** Negative once the estimate has passed. */
  daysAway: number;
  isToday: boolean;
  isOverdue: boolean;
  /** e.g. `30 Oct` */
  humanDate: string;
};

/**
 * Everything the UI needs to phrase an expected-ready date. The wording itself
 * lives in `copy.ts`; this only computes facts.
 */
export function describeExpectedReady(
  date: IsoDate,
  today: IsoDate = todayInShopTimezone(),
): ExpectedReadyInfo {
  const daysAway = daysBetween(today, date);
  return {
    date,
    daysAway,
    isToday: daysAway === 0,
    isOverdue: daysAway < 0,
    humanDate: formatHumanDate(date, today),
  };
}

/** Suggest an expected date from the owner's "days from today" stepper. */
export function expectedDateFromDays(
  days: number,
  today: IsoDate = todayInShopTimezone(),
): IsoDate {
  return addDays(today, days);
}
