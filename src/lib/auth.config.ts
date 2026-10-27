import type { NextAuthConfig } from "next-auth";

import { SESSION_MAX_AGE_SECONDS } from "./config";

/**
 * Edge-safe half of the auth configuration: session shape and JWT/session
 * projection only. It deliberately imports nothing that needs Node, so the
 * middleware can verify the cookie without a database round-trip.
 *
 * The Credentials provider (argon2 + Postgres) lives in `auth.ts`, which is
 * only ever loaded in the Node runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 24 * 60 * 60,
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.shopId = user.shopId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.userId === "string" && typeof token.shopId === "string") {
        session.user.id = token.userId;
        session.user.shopId = token.shopId;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
