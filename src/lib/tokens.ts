import { randomBytes } from "node:crypto";

/**
 * The customer's public token: 32 random bytes, base64url-encoded (43 chars,
 * 256 bits of entropy). It is a bearer capability, so it must never be derived
 * from the job id or number and never be logged in full (PRD §7.3).
 */
export function generatePublicToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Safe representation for logs: enough to correlate, useless to an attacker. */
export function redactToken(token: string): string {
  if (token.length <= 8) return "…";
  return `${token.slice(0, 4)}…${token.slice(-2)}`;
}
