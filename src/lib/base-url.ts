import { normaliseBaseUrl } from "./urls";

/**
 * Absolute origin used to build customer-facing links.
 *
 * `APP_BASE_URL` wins when configured (recommended in production, e.g. a custom
 * domain). Otherwise the request's forwarded headers are used, which is what
 * Vercel and most reverse proxies provide. Host values are validated so a
 * spoofed header can never inject a foreign origin into a shared link.
 */
const HOST_PATTERN = /^[a-z0-9.\-:[\]]+$/i;

export function getBaseUrl(request: Request): string {
  const fromHeaders = getBaseUrlFromHeaders(request.headers);
  if (fromHeaders) return fromHeaders;

  // No usable Host header (rare, e.g. HTTP/1.0 clients): fall back to the URL.
  return new URL(request.url).origin;
}

/** Same resolution logic for server components, which only have `headers()`. */
export function getBaseUrlFromHeaders(headers: Headers): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return normaliseBaseUrl(configured);

  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto === "https" || forwardedProto === "http" ? forwardedProto : "http";

  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? headers.get("host") ?? "";

  if (host && HOST_PATTERN.test(host)) {
    return `${proto}://${host}`;
  }

  return "";
}
