/**
 * One-shot production provisioning: applies migrations, creates/updates the
 * shop and owner, then verifies the result. Safe to re-run (everything is
 * idempotent), which is what makes it usable from CI on every deploy.
 *
 * Usage: DATABASE_URL=… npm run provision
 */
import { loadEnvFile } from "./_env";
import { runScript } from "./_run";

runScript("provision", async () => {
  loadEnvFile();

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      "DATABASE_URL is not set. Production provisioning must target a real Postgres server.",
    );
  }

  const { execFileSync } = await import("node:child_process");

  const step = (label: string, script: string) => {
    console.log(`\n[provision] ${label}`);
    execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", script], {
      stdio: "inherit",
      env: process.env,
    });
  };

  step("applying migrations", "scripts/migrate.ts");
  step("seeding the shop and owner", "scripts/seed.ts");

  const { createDbHandle } = await import("../src/lib/db");
  const { shops } = await import("../src/lib/db/schema");
  const { users } = await import("../src/lib/db/schema");
  const { jobs } = await import("../src/lib/db/schema");
  const { sql } = await import("drizzle-orm");

  const handle = createDbHandle();
  try {
    const [shop] = await handle.db.select().from(shops).limit(1);
    const [owner] = await handle.db.select({ email: users.email }).from(users).limit(1);
    const [count] = await handle.db.select({ total: sql<number>`count(*)::int` }).from(jobs);

    if (!shop || !owner)
      throw new Error("Provisioning finished but the shop or owner row is missing.");

    console.log("\n[provision] ready");
    console.log(`  driver : ${handle.driver}`);
    console.log(`  shop   : ${shop.name} (${shop.phone})`);
    console.log(`  owner  : ${owner.email}`);
    console.log(`  jobs   : ${count?.total ?? 0}`);
    console.log(`  next # : ${shop.jobSeq + 1}`);
  } finally {
    await handle.close();
  }
});
