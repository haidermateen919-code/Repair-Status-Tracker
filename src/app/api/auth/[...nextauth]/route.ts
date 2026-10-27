import type { NextRequest } from "next/server";

import { handlers } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";

// argon2 and Postgres need the Node runtime; the Edge middleware only reads the JWT.
export const runtime = "nodejs";

function assertConfigured(): void {
  // Fail loudly and early on a misconfigured deployment instead of at login time.
  getServerEnv();
}

export function GET(request: NextRequest): Promise<Response> {
  assertConfigured();
  return handlers.GET(request);
}

export function POST(request: NextRequest): Promise<Response> {
  assertConfigured();
  return handlers.POST(request);
}
