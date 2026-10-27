import { z } from "zod";

import { isIsoDate } from "../dates";
import { normalisePhone } from "../phone";

/** Opaque row id produced by `createId()` (12 random bytes, base64url). */
export const rowIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16}$/, "Invalid id");

/** Date-only string. Rejects impossible dates such as 2026-02-31. */
export const isoDateSchema = z
  .string()
  .trim()
  .refine((value) => isIsoDate(value), "Use a real date in YYYY-MM-DD form");

/** Customer phone in any accepted local/international shape (PRD §6.5). */
export const phoneInputSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .max(40, "Phone number is too long")
  .refine((value) => normalisePhone(value) !== null, "Enter a valid Pakistani mobile number");

/**
 * Optional free text where `""` means "clear this field" and `undefined` means
 * "leave it alone".
 */
export function nullableText(max: number) {
  return (
    z
      .string()
      .trim()
      .max(max, `Must be ${max} characters or fewer`)
      .nullable()
      .transform((value) => {
        if (value === null) return null;
        return value.length === 0 ? null : value;
      })
      // Optionality is re-applied after the transform so `z.infer` knows the
      // field may be absent (undefined = "leave unchanged").
      .optional()
  );
}

/** Integer within a range, with empty strings treated as "not provided". */
export function optionalInt(min: number, max: number) {
  return z.preprocess(
    (value) => {
      if (value === "" || value === null) return undefined;
      return value;
    },
    z.coerce
      .number()
      .int(`Must be a whole number`)
      .min(min, `Must be at least ${min}`)
      .max(max, `Must be at most ${max}`)
      .optional(),
  );
}
