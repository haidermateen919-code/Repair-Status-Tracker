import NextAuth, { type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";

import { authConfig } from "./auth.config";
import { RATE_LIMITS } from "./config";
import { UnauthorizedError } from "./errors";
import { getClientIp } from "./http";
import { logInfo, logWarn } from "./logger";
import { isAcceptablePassword, simulatePasswordCheck, verifyPassword } from "./password";
import { bucketKey, isRateLimited, recordRateLimitEvent } from "./rate-limit";
import { credentialsSchema } from "./schemas/public";
import { findUserByEmail } from "./services/users";

/**
 * Auth.js with a single Credentials account (PRD §6.7).
 *
 * - argon2id hashes, never plaintext
 * - 30-day JWT session in an httpOnly, SameSite=Lax cookie
 * - failed logins rate-limited per IP and per email
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "Owner",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        // Auth.js adds `csrfToken`/`callbackUrl` to this object; only take the
        // two fields we validate, so the strict schema stays strict.
        const parsed = credentialsSchema.safeParse({
          email: typeof credentials?.email === "string" ? credentials.email : "",
          password: typeof credentials?.password === "string" ? credentials.password : "",
        });
        if (!parsed.success) {
          logWarn("auth.invalid_payload");
          return null;
        }

        const email = parsed.data.email.trim().toLowerCase();
        const ip = getClientIp(request);
        const ipBucket = bucketKey("login-ip", ip);
        const emailBucket = bucketKey("login-email", email);

        const [ipLimited, emailLimited] = await Promise.all([
          isRateLimited({ key: ipBucket, ...RATE_LIMITS.loginPerIp }),
          isRateLimited({ key: emailBucket, ...RATE_LIMITS.loginPerEmail }),
        ]);

        if (ipLimited || emailLimited) {
          logWarn("auth.rate_limited", { reason: ipLimited ? "ip" : "email" });
          return null;
        }

        const user = await findUserByEmail(email);

        if (!user) {
          await simulatePasswordCheck(parsed.data.password);
          await Promise.all([recordRateLimitEvent(ipBucket), recordRateLimitEvent(emailBucket)]);
          logWarn("auth.failed", { reason: "unknown_email" });
          return null;
        }

        if (!isAcceptablePassword(parsed.data.password)) {
          await Promise.all([recordRateLimitEvent(ipBucket), recordRateLimitEvent(emailBucket)]);
          logWarn("auth.failed", { reason: "invalid_password_shape" });
          return null;
        }

        const valid = await verifyPassword(user.passwordHash, parsed.data.password);
        if (!valid) {
          await Promise.all([recordRateLimitEvent(ipBucket), recordRateLimitEvent(emailBucket)]);
          logWarn("auth.failed", { reason: "wrong_password" });
          return null;
        }

        logInfo("auth.succeeded", { userId: user.id });
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? "Shop Owner",
          shopId: user.shopId,
        };
      },
    }),
  ],
});

export type OwnerSession = {
  userId: string;
  shopId: string;
  email: string;
  name: string | null;
};

function toOwnerSession(session: Session | null): OwnerSession | null {
  const user = session?.user;
  if (!user?.id || !user.shopId) return null;
  return {
    userId: user.id,
    shopId: user.shopId,
    email: user.email ?? "",
    name: user.name ?? null,
  };
}

/** Session for server components; `null` when logged out. */
export async function getOwnerSession(): Promise<OwnerSession | null> {
  // `auth()` is overloaded (session read vs. middleware factory); with no
  // arguments it always resolves to the session.
  const session = (await auth()) as Session | null;
  return toOwnerSession(session);
}

/**
 * The single authorisation helper every owner page and route handler goes
 * through (PRD §6.7), so adding staff/permissions later is a one-file change.
 */
export async function requireOwner(): Promise<OwnerSession> {
  const session = await getOwnerSession();
  if (!session) redirect("/login");
  return session;
}

/** Same check for API routes: throws a 401 instead of redirecting. */
export async function requireOwnerApi(): Promise<OwnerSession> {
  const session = await getOwnerSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
