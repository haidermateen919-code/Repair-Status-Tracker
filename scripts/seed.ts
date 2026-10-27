/**
 * Creates (or updates) the single shop and the single owner account.
 * Idempotent: safe to run on every deploy.
 *
 * Usage:
 *   npm run db:seed                       # create if missing, keep existing password
 *   SEED_RESET_PASSWORD=true npm run db:seed   # also reset the owner password
 */
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createDbHandle } from "../src/lib/db";
import { shops, users } from "../src/lib/db/schema";
import { createId } from "../src/lib/ids";
import { hashPassword, isAcceptablePassword } from "../src/lib/password";
import { normalisePhone } from "../src/lib/phone";
import { loadEnvFile } from "./_env";

const seedEnvSchema = z.object({
  SEED_OWNER_EMAIL: z.string().trim().email(),
  SEED_OWNER_PASSWORD: z.string().min(1),
  SEED_OWNER_NAME: z.string().trim().min(1).default("Shop Owner"),
  SHOP_NAME: z.string().trim().min(1),
  SHOP_PHONE: z.string().trim().min(1),
  SHOP_WHATSAPP: z.string().trim().min(1),
  SHOP_ADDRESS: z.string().trim().optional(),
  SHOP_TIMINGS: z.string().trim().optional(),
  SEED_RESET_PASSWORD: z
    .string()
    .optional()
    .transform((value) => value === "true" || value === "1"),
});

async function main(): Promise<void> {
  loadEnvFile();

  const parsed = seedEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Seed environment is incomplete:\n${details.join("\n")}\nSee .env.example.`);
  }

  const env = parsed.data;
  const email = env.SEED_OWNER_EMAIL.toLowerCase();
  const phone = normalisePhone(env.SHOP_PHONE);
  const whatsappPhone = normalisePhone(env.SHOP_WHATSAPP);

  if (!phone) throw new Error("SHOP_PHONE must be a Pakistani phone number, e.g. 03001234567.");
  if (!whatsappPhone) {
    throw new Error("SHOP_WHATSAPP must be a Pakistani phone number, e.g. 03001234567.");
  }
  if (!isAcceptablePassword(env.SEED_OWNER_PASSWORD)) {
    throw new Error("SEED_OWNER_PASSWORD must be at least 12 characters.");
  }

  const handle = createDbHandle();
  console.log(`[seed] driver=${handle.driver}`);

  try {
    await handle.db.transaction(async (tx) => {
      const [existingShop] = await tx.select().from(shops).limit(1);

      const shopId = existingShop?.id ?? createId();

      if (existingShop) {
        await tx
          .update(shops)
          .set({
            name: env.SHOP_NAME,
            phone,
            whatsappPhone,
            address: env.SHOP_ADDRESS ?? null,
            timings: env.SHOP_TIMINGS ?? null,
          })
          .where(eq(shops.id, shopId));
        console.log(`[seed] shop updated: ${env.SHOP_NAME}`);
      } else {
        await tx.insert(shops).values({
          id: shopId,
          name: env.SHOP_NAME,
          phone,
          whatsappPhone,
          address: env.SHOP_ADDRESS ?? null,
          timings: env.SHOP_TIMINGS ?? null,
        });
        console.log(`[seed] shop created: ${env.SHOP_NAME}`);
      }

      const [existingUser] = await tx.select().from(users).where(eq(users.email, email)).limit(1);

      if (!existingUser) {
        await tx.insert(users).values({
          id: createId(),
          shopId,
          email,
          name: env.SEED_OWNER_NAME,
          passwordHash: await hashPassword(env.SEED_OWNER_PASSWORD),
        });
        console.log(`[seed] owner created: ${email}`);
      } else if (env.SEED_RESET_PASSWORD) {
        await tx
          .update(users)
          .set({ passwordHash: await hashPassword(env.SEED_OWNER_PASSWORD) })
          .where(eq(users.id, existingUser.id));
        console.log(`[seed] owner password reset: ${email}`);
      } else {
        console.log(`[seed] owner exists, password unchanged: ${email}`);
      }
    });

    console.log("[seed] done");
  } finally {
    await handle.close();
  }
}

main().catch((error: unknown) => {
  console.error("[seed] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
