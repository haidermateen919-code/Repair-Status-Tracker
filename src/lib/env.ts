import { z } from "zod";

/**
 * Server environment validation. Parsed lazily so that `next build` and unit
 * tests can import modules without requiring production secrets.
 *
 * A missing AUTH_SECRET produces a clear, actionable error instead of an
 * obscure runtime failure deep inside the auth library.
 */

const serverEnvSchema = z.object({
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 32"),
  DATABASE_URL: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  APP_BASE_URL: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value.replace(/\/+$/, "") : undefined)),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid server environment:\n${details.join("\n")}`);
  }

  cached = parsed.data;
  return cached;
}

/** Used by tests that need to exercise env parsing repeatedly. */
export function resetServerEnvCache(): void {
  cached = null;
}
