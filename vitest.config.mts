import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Unit and integration tests run in Node. Integration tests spin up an
 * in-memory PGlite database per suite, so no external services are required.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // PGlite compiles Postgres to WASM on first use; give each suite room.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    sequence: { concurrent: false },
    reporters: ["default"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
