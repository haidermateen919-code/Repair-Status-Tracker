import type { DefaultSession } from "next-auth";

/** Session shape used by the whole owner area (PRD §6.7). */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      shopId: string;
    } & DefaultSession["user"];
  }

  interface User {
    shopId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    shopId?: string;
  }
}
