import { eq } from "drizzle-orm";

import { getDb, type Database } from "../db";
import { users, type UserRow } from "../db/schema";

/** Owner account lookups. Only the auth layer may call these. */
export async function findUserByEmail(
  email: string,
  db: Database = getDb(),
): Promise<UserRow | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return user ?? null;
}

export async function updatePasswordHash(
  params: { userId: string; passwordHash: string },
  db: Database = getDb(),
): Promise<void> {
  await db
    .update(users)
    .set({ passwordHash: params.passwordHash })
    .where(eq(users.id, params.userId));
}
