import { z } from "zod";

import { phoneInputSchema } from "./common";

/**
 * `POST /api/public/lookup`.
 * `website` is a honeypot: real users never fill it, bots usually do.
 */
export const lookupSchema = z.strictObject({
  phone: phoneInputSchema,
  website: z.string().max(200).optional(),
});

export type LookupInput = z.infer<typeof lookupSchema>;

/** `GET /api/public/jobs/:token` */
export const publicTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid link");

/** Login payload, validated before any password work happens. */
export const credentialsSchema = z.strictObject({
  email: z.email("Enter a valid email address").max(200),
  password: z.string().min(1, "Password is required").max(200),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
