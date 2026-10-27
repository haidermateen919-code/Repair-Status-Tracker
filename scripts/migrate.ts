/**
 * Applies every `drizzle/*.sql` file exactly once, in filename order.
 *
 * Each file runs inside a transaction together with the row that records it in
 * `schema_migrations`, so a crashed migration leaves the database untouched.
 *
 * Usage: npm run db:migrate
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createDbHandle } from "../src/lib/db";
import { loadEnvFile } from "./_env";
import { runScript } from "./_run";

const MIGRATIONS_DIR = join(process.cwd(), "drizzle");
const VERSION_PATTERN = /^[A-Za-z0-9_.-]+$/;

async function main(): Promise<void> {
  loadEnvFile();

  const handle = createDbHandle();
  console.log(`[migrate] driver=${handle.driver}`);

  try {
    await handle.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const appliedRows = await handle.queryRows<{ version: string }>(
      "select version from schema_migrations",
    );
    const applied = new Set(appliedRows.map((row) => row.version));

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (!VERSION_PATTERN.test(file)) throw new Error(`Unsafe migration filename: ${file}`);
      if (applied.has(file)) continue;

      const sqlText = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      // The version is a filename from this repository, validated above.
      await handle.exec(
        `BEGIN;\n${sqlText}\nINSERT INTO schema_migrations (version) VALUES ('${file}');\nCOMMIT;`,
      );
      ran += 1;
      console.log(`[migrate] applied ${file}`);
    }

    console.log(ran === 0 ? "[migrate] up to date" : `[migrate] applied ${ran} migration(s)`);
  } finally {
    await handle.close();
  }
}

runScript("migrate", main);
