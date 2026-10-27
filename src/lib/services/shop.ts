import { eq } from "drizzle-orm";

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

/** Used by public pages, which have no session to derive the shop from. */
export async function getPrimaryShop(db: Database = getDb()): Promise<ShopRow | null> {
  const [shop] = await db.select().from(shops).orderBy(shops.createdAt).limit(1);
  return shop ?? null;
}
