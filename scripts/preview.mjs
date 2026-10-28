#!/usr/bin/env node
/**
 * One-command, self-healing local/preview start:
 *
 *   1. install dependencies if node_modules is missing
 *   2. create .env if it is missing
 *   3. apply migrations and seed (both idempotent)
 *   4. add demo jobs when the board is empty (skipped once anything exists)
 *   5. start the dev server
 *
 * Useful in ephemeral/sandbox environments where the workspace is rebuilt
 * between sessions, and for anyone cloning the repo for the first time.
 *
 * Usage: npm run preview
 */
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const bin = (name) => join(root, "node_modules", ".bin", name);

function run(command, args, label) {
  console.log(`\n[preview] ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    console.error(`[preview] ${label} failed — fix the error above and re-run "npm run preview".`);
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(join(root, "node_modules", "next"))) {
  run("npm", ["ci"], "installing dependencies (node_modules was missing)");
}

if (!existsSync(join(root, ".env"))) {
  run("node", ["scripts/setup-env.mjs"], "creating .env with a generated owner password");
}

run(bin("tsx"), ["scripts/migrate.ts"], "applying database migrations");
run(bin("tsx"), ["scripts/seed.ts"], "seeding the shop and owner account");
run(bin("tsx"), ["scripts/demo.ts"], "adding demo jobs (only when the board is empty)");

console.log("\n[preview] starting the dev server on http://localhost:3000\n");
const dev = spawn(bin("next"), ["dev"], { stdio: "inherit", env: process.env });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    dev.kill(signal);
    process.exit(0);
  });
}

dev.on("exit", (code) => process.exit(code ?? 0));
