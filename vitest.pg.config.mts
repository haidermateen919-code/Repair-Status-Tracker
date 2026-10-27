import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Runs the integration suite against a real PostgreSQL (DATABASE_URL) instead of
 * the embedded database, so the production driver and real concurrency behaviour
 * are exercised too. CI: start a Postgres service and run
 * `DATABASE_URL=… vitest run --config vitest.pg.config.mts`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    sequence: { concurrent: false },
    reporters: ["default"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
