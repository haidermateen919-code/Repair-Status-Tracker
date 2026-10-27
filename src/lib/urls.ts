/**
 * URL builders shared by the owner UI, the WhatsApp share flow and the API
 * contracts. Pure module — unit-tested.
 */

import { phoneToDialDigits } from "./phone";

/** Public status-page path for a token. Never include anything else in the URL. */
export function publicJobPath(token: string): string {
  return `/s/${encodeURIComponent(token)}`;
}

/** Absolute public link handed to the customer. */
export function publicJobUrl(baseUrl: string, token: string): string {
  return `${normaliseBaseUrl(baseUrl)}${publicJobPath(token)}`;
}

export function normaliseBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/**
 * `wa.me` deep link. `WhatsApp` needs the number in international format
 * without `+` and the message URL-encoded (PRD §6.6).
 */
export function whatsappShareUrl(phoneE164: string, message: string): string {
  const digits = phoneToDialDigits(phoneE164);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** `tel:` link for the shop's "Call" button. */
export function telUrl(phone: string): string {
  const digits = phoneToDialDigits(phone);
  return digits.startsWith("92") ? `tel:+${digits}` : `tel:${digits}`;
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Cheap shape check before hitting the database with a URL parameter. */
export function looksLikePublicToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/** Absolute URL for a path on this deployment, tolerant of missing protocol. */
export function absoluteUrl(baseUrl: string, path: string): string {
  return `${normaliseBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}
