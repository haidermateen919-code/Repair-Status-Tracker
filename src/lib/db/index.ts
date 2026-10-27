import { mkdirSync } from "node:fs";
import { basename, dirname } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";

import { acquireDataDirLock } from "./lock";
import * as schema from "./schema";

/**
 * One database abstraction over two Postgres drivers:
 *
 * - `DATABASE_URL` set  → node-postgres (`pg`) against Neon/managed Postgres.
 * - `DATABASE_URL` empty → embedded PGlite (a real Postgres in WASM) in
 *   `.data/pglite`, which makes local development and CI zero-setup.
 *
 * Both expose the same Drizzle query builder and SQL dialect, so services never
 * know which one is running.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export type TransactionHandle = {
  queryRows: <T>(sqlText: string, params?: unknown[]) => Promise<T[]>;
};

export type DbHandle = {
  db: Database;
  /** Runs a multi-statement SQL script (used by the migration runner). */
  exec: (sqlText: string) => Promise<void>;
  /** Parameterised single-statement query returning rows (scripts only). */
  queryRows: <T>(sqlText: string, params?: unknown[]) => Promise<T[]>;
  /**
   * Runs `fn` inside a transaction on a single connection. Required whenever a
   * read and a write must be atomic under concurrency (e.g. the rate limiter).
   */
  transaction: <T>(fn: (tx: TransactionHandle) => Promise<T>) => Promise<T>;
  driver: "pglite" | "pg";
  close: () => Promise<void>;
};

export type CreateDbOptions = {
  databaseUrl?: string | null;
  /** PGlite data directory. Omit for an in-memory database (tests). */
  dataDir?: string;
};

export const DEFAULT_PGLITE_DIR = ".data/pglite";

export function createDbHandle(options: CreateDbOptions = {}): DbHandle {
  const databaseUrl =
    options.databaseUrl === undefined
      ? (process.env.DATABASE_URL ?? "")
      : (options.databaseUrl ?? "");

  if (databaseUrl.trim().length > 0) {
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    return {
      db: drizzleNodePg(pool, { schema }) as unknown as Database,
      driver: "pg",
      async exec(sqlText: string) {
        const client = await pool.connect();
        try {
          await client.query(sqlText);
        } finally {
          client.release();
        }
      },
      async queryRows<T>(sqlText: string, params: unknown[] = []) {
        const result = await pool.query(sqlText, params);
        return result.rows as T[];
      },
      async transaction<T>(fn: (tx: TransactionHandle) => Promise<T>) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await fn({
            queryRows: async <R>(sqlText: string, params: unknown[] = []) =>
              (await client.query(sqlText, params)).rows as R[],
          });
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK").catch(() => undefined);
          throw error;
        } finally {
          client.release();
        }
      },
      async close() {
        await pool.end();
      },
    };
  }

  // `PGLITE_DIR` lets tests/CI run an isolated embedded database.
  const dataDir =
    options.dataDir === undefined
      ? process.env.PGLITE_DIR?.trim() || DEFAULT_PGLITE_DIR
      : options.dataDir;
  if (dataDir.length > 0) {
    // PGlite creates the leaf directory but not its parents.
    mkdirSync(dirname(dataDir), { recursive: true });
  }

  // In-memory databases (tests) need no lock; on-disk ones do.
  const releaseLock =
    dataDir.length > 0 ? acquireDataDirLock(dataDir, basename(process.argv[1] ?? "app")) : null;

  const pglite = new PGlite(dataDir);

  return {
    db: drizzlePglite(pglite, { schema }) as unknown as Database,
    driver: "pglite",
    async exec(sqlText: string) {
      await pglite.exec(sqlText);
    },
    async queryRows<T>(sqlText: string, params: unknown[] = []) {
      const result = await pglite.query<T>(sqlText, params);
      return result.rows;
    },
    // PGlite is single-connection, so a transaction is simply BEGIN/COMMIT on it.
    async transaction<T>(fn: (tx: TransactionHandle) => Promise<T>) {
      await pglite.exec("BEGIN");
      try {
        const result = await fn({
          queryRows: async <R>(sqlText: string, params: unknown[] = []) =>
            (await pglite.query<R>(sqlText, params)).rows,
        });
        await pglite.exec("COMMIT");
        return result;
      } catch (error) {
        await pglite.exec("ROLLBACK").catch(() => undefined);
        throw error;
      }
    },
    async close() {
      await pglite.close();
      releaseLock?.();
    },
  };
}

declare global {
  // `var` is required for a globalThis augmentation.
  var __repairTrackerDb: DbHandle | undefined;
}

/** Shared handle for the running server (survives dev hot reloads). */
export function getDbHandle(): DbHandle {
  if (!globalThis.__repairTrackerDb) {
    globalThis.__repairTrackerDb = createDbHandle();
  }
  return globalThis.__repairTrackerDb;
}

/** The Drizzle client used by every service. */
export function getDb(): Database {
  return getDbHandle().db;
}
