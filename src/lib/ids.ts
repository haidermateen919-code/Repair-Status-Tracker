import { randomBytes } from "node:crypto";

/**
 * Opaque, URL-safe identifiers (16 chars ≈ 96 bits) for database rows.
 * Tokens are generated separately with 256 bits of entropy — see `tokens.ts`.
 */
export function createId(): string {
  return randomBytes(12).toString("base64url");
}
