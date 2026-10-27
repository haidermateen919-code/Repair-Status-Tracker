/**
 * Typed application errors. Services throw these; the HTTP layer maps them to
 * status codes and stable machine-readable codes (see `src/lib/http.ts`).
 */

export type ErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "JOB_DELETED"
  | "REOPEN_REQUIRES_CONFIRMATION"
  | "RATE_LIMITED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request", details?: Record<string, string>) {
    super("VALIDATION_FAILED", 400, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", 401, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super("NOT_FOUND", 404, message);
  }
}

export class JobDeletedError extends AppError {
  constructor(message = "This job was deleted") {
    super("JOB_DELETED", 409, message);
  }
}

export class ReopenConfirmationError extends AppError {
  constructor(message = "Re-opening a finished job requires confirmation") {
    super("REOPEN_REQUIRES_CONFIRMATION", 409, message);
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = "Too many requests") {
    super("RATE_LIMITED", 429, message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Never leak internals to a caller; log the original and return a generic error. */
export function toPublicError(error: unknown): { code: ErrorCode; status: number; message: string; details?: Record<string, string> } {
  if (error instanceof AppError) {
    return { code: error.code, status: error.status, message: error.message, details: error.details };
  }
  return { code: "INTERNAL", status: 500, message: "Something went wrong" };
}
