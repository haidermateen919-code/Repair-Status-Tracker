/**
 * Application-wide constants. Anything a future deploy might need to tune lives
 * here (or in env vars) rather than being scattered through components.
 */

/** All date maths is shop-local. Changing the shop's city = changing this one line. */
export const SHOP_TIMEZONE = "Asia/Karachi";

/** First job number handed out by `Shop.jobSeq` (PRD §6.4). */
export const JOB_SEQUENCE_START = 1000;

/** Server-side length caps (PRD §7.2 rule 9). Also enforced in the Zod schemas. */
export const LIMITS = {
  customerName: 80,
  customerPhone: 20,
  itemName: 60,
  issue: 300,
  publicNote: 300,
  internalNote: 300,
  searchQuery: 80,
  estimateDaysMin: 1,
  estimateDaysMax: 30,
} as const;

/** Fixed list sizes so no query is ever unbounded (PRD §7.6 rule 32). */
export const PAGE_SIZES = {
  jobs: 100,
  jobEvents: 20,
  lookupResults: 10,
} as const;

/** Abuse limits (PRD §7.4). */
export const RATE_LIMITS = {
  lookupPerIp: { limit: 10, windowSeconds: 15 * 60 },
  lookupPerPhone: { limit: 30, windowSeconds: 60 * 60 },
  loginPerIp: { limit: 5, windowSeconds: 15 * 60 },
  loginPerEmail: { limit: 5, windowSeconds: 15 * 60 },
} as const;

/** Artificial, constant delay on the public phone lookup (PRD §7.4 rule 18). */
export const LOOKUP_ARTIFICIAL_DELAY_MS = 150;

/** Retention windows documented in README (PRD §7.7). Purge script uses these. */
export const RETENTION = {
  deliveredMonths: 24,
  cancelledDays: 90,
} as const;

/** Session lifetime: the owner should not retype a password every morning. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Failed logins are counted per IP *and* per email; the address is only ever
 * stored as a hash inside the rate-limit bucket key.
 */
export const LOGIN_FAILURE_MESSAGE_DELAY_MS = 300;
