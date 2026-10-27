import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Embedded Postgres (PGlite) is a single-process database: two processes writing
 * the same directory can silently lose data. Servers and scripts therefore take
 * an advisory lock on the data directory and fail loudly instead of corrupting it.
 *
 * This is only used for the PGlite driver. A real Postgres `DATABASE_URL` needs
 * no lock (the server handles concurrency itself).
 */

type LockFile = {
  pid: number;
  owner: string;
  acquiredAt: string;
};

const LOCK_FILE = ".lock.json";

export class DataDirLockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataDirLockedError";
  }
}

function lockPath(dataDir: string): string {
  return join(dataDir, LOCK_FILE);
}

function readLock(dataDir: string): LockFile | null {
  const path = lockPath(dataDir);
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as LockFile;
  } catch {
    // Corrupt lock file: treat as stale.
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Claims the data directory for this process. Returns a release function.
 * Throws `DataDirLockedError` when another live process holds it.
 */
export function acquireDataDirLock(dataDir: string, owner: string): () => void {
  mkdirSync(dataDir, { recursive: true });

  const existing = readLock(dataDir);
  if (existing && existing.pid !== process.pid && isProcessAlive(existing.pid)) {
    throw new DataDirLockedError(
      `The local database in ${dataDir} is already open by ${existing.owner} (pid ${existing.pid}).\n` +
        `Stop that process first — e.g. stop "npm run dev" — or point DATABASE_URL at a real Postgres server.\n` +
        `(Embedded Postgres can only be used by one process at a time.)`,
    );
  }

  const lock: LockFile = { pid: process.pid, owner, acquiredAt: new Date().toISOString() };
  writeFileSync(lockPath(dataDir), JSON.stringify(lock), "utf8");

  return () => {
    const current = readLock(dataDir);
    if (current?.pid === process.pid) {
      rmSync(lockPath(dataDir), { force: true });
    }
  };
}
