/**
 * Pakistani phone number handling (PRD §6.5). All customer numbers are stored
 * normalised to E.164 (`+923001234567`) and only formatted for display.
 *
 * Pure module — unit-tested.
 */

/** Pakistan country calling code, without the plus. */
const PK_DIAL_CODE = "92";

/** `+92` + mobile prefix `3xx` + 7 subscriber digits. */
const PK_MOBILE_E164 = /^\+923\d{9}$/;

/**
 * Accepts the shapes people actually type:
 * `03001234567`, `3001234567`, `+923001234567`, `923001234567`, `0092 300 1234567`,
 * with spaces, dashes, dots or parentheses anywhere.
 *
 * Returns E.164 (`+923001234567`) or `null` when the input cannot be a Pakistani
 * mobile number.
 */
export function normalisePhone(input: string): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 40) return null;

  // Strip everything that is not a digit or a leading plus.
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return null;

  let national: string;

  if (hasPlus) {
    if (!digits.startsWith(PK_DIAL_CODE)) return null;
    national = digits.slice(PK_DIAL_CODE.length);
  } else if (digits.startsWith(`00${PK_DIAL_CODE}`)) {
    national = digits.slice(`00${PK_DIAL_CODE}`.length);
  } else if (digits.startsWith(PK_DIAL_CODE) && digits.length >= 12) {
    national = digits.slice(PK_DIAL_CODE.length);
  } else {
    national = digits;
  }

  // Local form: 03xxxxxxxxx or 3xxxxxxxxx
  if (national.startsWith("0")) national = national.slice(1);

  const e164 = `+${PK_DIAL_CODE}${national}`;
  return PK_MOBILE_E164.test(e164) ? e164 : null;
}

/**
 * Friendly local display, e.g. `+923001234567` → `0300 1234567`.
 * Falls back to the input untouched if it is not a normalised PK number.
 */
export function formatPhone(e164: string): string {
  const normalised = normalisePhone(e164);
  if (!normalised) return e164;
  const national = normalised.slice(`+${PK_DIAL_CODE}`.length); // 3001234567
  return `0${national.slice(0, 3)} ${national.slice(3)}`;
}

/** Digits-only form for `wa.me` / `tel:` links, e.g. `923001234567`. */
export function phoneToDialDigits(e164: string): string {
  return e164.replace(/\D/g, "");
}

/** Last four digits — enough for the owner's search, never enough to identify alone. */
export function phoneLastFour(e164: string): string {
  return e164.replace(/\D/g, "").slice(-4);
}
