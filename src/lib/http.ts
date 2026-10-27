import { NextResponse } from "next/server";

import { logError } from "./logger";
import { RateLimitError, ValidationError, toPublicError } from "./errors";
import type { ZodType } from "zod";

/**
 * HTTP plumbing shared by every route handler: JSON parsing with a size cap,
 * same-origin enforcement for cookie-authenticated writes, error mapping and
 * the "never cache" headers used by all customer-facing endpoints.
 */

const MAX_BODY_BYTES = 16 * 1024;

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
};

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<T> {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function jsonError(error: unknown): NextResponse<ApiErrorBody> {
  const publicError = toPublicError(error);

  if (publicError.status >= 500) {
    logError("api.internal_error", error);
  }

  const response = NextResponse.json(
    {
      error: {
        code: publicError.code,
        message: publicError.message,
        ...(publicError.details ? { details: publicError.details } : {}),
      },
    },
    { status: publicError.status },
  );
  response.headers.set("Cache-Control", "no-store");

  if (error instanceof RateLimitError) {
    response.headers.set("Retry-After", String(error.retryAfterSeconds));
  }

  return response;
}

/** Reads a JSON body, rejecting oversized or malformed payloads. */
export async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new ValidationError("Request body too large");
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    throw new ValidationError("Could not read request body");
  }

  if (text.length > MAX_BODY_BYTES) throw new ValidationError("Request body too large");
  if (text.trim().length === 0) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
}

/** Parses with a Zod schema and converts failures into a typed 400. */
export function parseWithSchema<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const details: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "_";
    if (!details[path]) details[path] = issue.message;
  }

  throw new ValidationError("Invalid request", details);
}

/**
 * Defence in depth against CSRF on top of SameSite=Lax cookies: browser
 * requests must come from this origin. Non-browser clients may omit Origin.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ValidationError("Invalid origin");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const requestHost = forwardedHost ?? request.headers.get("host") ?? new URL(request.url).host;

  if (originHost !== requestHost) {
    throw new ValidationError("Cross-origin requests are not allowed");
  }
}

/**
 * Best-effort client IP. Vercel sets `x-forwarded-for` at the edge and strips
 * client-supplied values; self-hosted deployments must do the same (see README).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/** Adds the headers every public (customer-facing) response needs. */
export function withNoIndex<T extends NextResponse>(response: T): T {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function methodNotAllowed(allowed: string[]): NextResponse<ApiErrorBody> {
  const response = NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } },
    { status: 405 },
  );
  response.headers.set("Allow", allowed.join(", "));
  return response;
}
