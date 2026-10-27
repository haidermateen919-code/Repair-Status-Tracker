/**
 * Shared entry-point wrapper for the maintenance scripts: one place that turns
 * failures into readable terminal output (including the "database is in use"
 * case) and sets a non-zero exit code.
 */
import { DataDirLockedError } from "../src/lib/db/lock";

export function runScript(name: string, main: () => Promise<void>): void {
  main().catch((error: unknown) => {
    if (error instanceof DataDirLockedError) {
      console.error(`\n${error.message}\n`);
    } else {
      console.error(`[${name}] failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exitCode = 1;
  });
}
