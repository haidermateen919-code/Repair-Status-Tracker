import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

/**
 * First line of defence for the owner area: unauthenticated requests to `/app`
 * are redirected to the login page before any page code runs. Every page and
 * route handler still re-checks the session server-side (PRD §6.7).
 *
 * Only the edge-safe config is imported here; the database-backed provider is
 * never loaded in the Edge runtime.
 */
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  if (request.auth) return NextResponse.next();

  const loginUrl = new URL("/login", request.nextUrl.origin);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/app", "/app/:path*"],
};
