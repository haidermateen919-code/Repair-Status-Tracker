/**
 * Minimal, dependency-free `.env` loader for the Node scripts (migrate, seed,
 * purge, password reset). Next.js loads `.env` automatically for the app;
 * scripts do not, so they share this helper.
 *
 * Real values in `process.env` always win over the file.
 */
import { existsSync, readFileSync } from "node:fs";

export function loadEnvFile(path = ".env"): void {
  if (!existsSync(path)) return;

  const contents = readFileSync(path, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
