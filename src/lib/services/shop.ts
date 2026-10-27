import { asc, eq } from "drizzle-orm";

import { getDb, type Database } from "../db";
import { shops, type ShopRow } from "../db/schema";

/**
 * The shop profile. v1 has exactly one shop; every public page renders these
 * values and nothing about them is hardcoded in the UI layer (PRD §6.7).
 */
export async function getShopById(shopId: string, db: Database = getDb()): Promise<ShopRow | null> {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
  return shop ?? null;
}

/**
 * Used by public pages, which have no session to derive the shop from.
 * v1 has exactly one shop; ordering by (createdAt, id) keeps the choice
 * deterministic even if a second row ever appears.
 */
export async function getPrimaryShop(db: Database = getDb()): Promise<ShopRow | null> {
  const [shop] = await db
    .select()
    .from(shops)
    .orderBy(asc(shops.createdAt), asc(shops.id))
    .limit(1);
  return shop ?? null;
}
