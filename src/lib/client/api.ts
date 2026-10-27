/** Browser-side fetch wrapper that turns API errors into typed exceptions. */

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(code: string, status: number, message: string, details?: Record<string, string>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError("NETWORK", 0, "Network request failed");
  }

  if (response.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = body as {
      error?: { code?: string; message?: string; details?: Record<string, string> };
    } | null;
    throw new ApiClientError(
      errorBody?.error?.code ?? "INTERNAL",
      response.status,
      errorBody?.error?.message ?? "Request failed",
      errorBody?.error?.details,
    );
  }

  return body as T;
}
