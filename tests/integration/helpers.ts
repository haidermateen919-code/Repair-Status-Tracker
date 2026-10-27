import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createDbHandle, type Database, type DbHandle } from "@/lib/db";
import { shops, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import type { CreateJobInput } from "@/lib/schemas/job";

/**
 * Integration-test harness: a real Postgres (PGlite, in memory) migrated with
 * the production SQL, plus an isolated shop so every test starts clean.
 */

export const TEST_SHOP_ID = "testshop00000001";
export const TEST_SHOP_ID_2 = "testshop00000002";
export const TEST_TOKEN = "x".repeat(43);

export type TestDatabase = {
  handle: DbHandle;
  db: Database;
  reset: () => Promise<void>;
};

let migrationSql: string | null = null;

function loadMigration(): string {
  if (!migrationSql) {
    migrationSql = readFileSync(join(process.cwd(), "drizzle", "0000_init.sql"), "utf8");
  }
  return migrationSql;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const handle = createDbHandle({ databaseUrl: null, dataDir: "" });
  await handle.exec(loadMigration());

  // Services that are not given a handle explicitly use the app-wide one.
  globalThis.__repairTrackerDb = handle;

  await handle.db.insert(shops).values([
    {
      id: TEST_SHOP_ID,
      name: "Test Shop",
      // Deliberately different from every test customer number, so the PII
      // assertions on public responses are meaningful.
      phone: "+923111111111",
      whatsappPhone: "+923111111111",
      address: "Test address",
      timings: "9am-8pm",
    },
    {
      id: TEST_SHOP_ID_2,
      name: "Other Shop",
      phone: "+923222222222",
      whatsappPhone: "+923222222222",
    },
  ]);

  await handle.db.insert(users).values({
    id: "testuser00000001",
    shopId: TEST_SHOP_ID,
    email: "owner@test.pk",
    passwordHash: await hashPassword("test-password-123"),
  });

  return {
    handle,
    db: handle.db,
    async reset() {
      await handle.exec(`
        DELETE FROM job_events;
        DELETE FROM jobs;
        DELETE FROM rate_limit_events;
        UPDATE shops SET job_seq = 1000;
      `);
    },
  };
}

export function jobInput(overrides: Partial<CreateJobInput> = {}): CreateJobInput {
  return {
    customerName: "Ali Raza",
    customerPhone: "03001234567",
    itemName: "Geyser",
    issue: "heating nahi kar raha",
    estimateDays: 3,
    expectedReadyAt: null,
    internalNote: null,
    ...overrides,
  };
}
