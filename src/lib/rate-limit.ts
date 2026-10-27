import { createHash } from "node:crypto";

import { getDbHandle } from "./db";
import { logWarn } from "./logger";

/**
 * Sliding-window rate limiter backed by Postgres (PRD §6.2 explicitly allows
 * this instead of Upstash). Each bucket stores only a hash of the identifier,
 * so neither IP addresses nor phone numbers are kept in plain text.
 */

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export type RateLimitRule = {
  /** Namespaced identifier, e.g. `lookup:ip:1.2.3.4`. Hashed before storage. */
  key: string;
  limit: number;
  windowSeconds: number;
};

/** Hashed, namespaced bucket key. Keeps identifiers out of the database. */
export function bucketKey(namespace: string, identifier: string): string {
  const digest = createHash("sha256").update(`${namespace}:${identifier}`).digest("hex");
  return `${namespace}:${digest}`;
}

/**
 * Atomically counts the current window and records the attempt only when the
 * limit has not been reached. Returns whether the caller may proceed.
 */
export async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = rule;
  const handle = getDbHandle();

  const inserted = await handle.queryRows<{ id: number }>(
    `insert into rate_limit_events (bucket)
     select $1
     where (
       select count(*) from rate_limit_events
       where bucket = $1 and created_at > now() - make_interval(secs => $2)
     ) < $3
     returning id`,
    [key, windowSeconds, limit],
  );

  if (inserted.length > 0) {
    void pruneOldEvents();
    return { allowed: true, remaining: Math.max(0, limit - 1) };
  }

  const [oldest] = await handle.queryRows<{ retry_after: string }>(
    `select ceil(extract(epoch from (min(created_at) + make_interval(secs => $2) - now())))::text as retry_after
     from rate_limit_events
     where bucket = $1 and created_at > now() - make_interval(secs => $2)`,
    [key, windowSeconds],
  );

  const retryAfterSeconds = Math.max(1, Number(oldest?.retry_after ?? windowSeconds));

  logWarn("rate_limit.blocked", { bucket: key.split(":")[0], retryAfterSeconds });

  return { allowed: false, retryAfterSeconds };
}

/** Checks the window without recording an attempt (used before password checks). */
export async function isRateLimited(rule: RateLimitRule): Promise<boolean> {
  const handle = getDbHandle();
  const [row] = await handle.queryRows<{ count: string }>(
    `select count(*)::text as count from rate_limit_events
     where bucket = $1 and created_at > now() - make_interval(secs => $2)`,
    [rule.key, rule.windowSeconds],
  );

  return Number(row?.count ?? 0) >= rule.limit;
}

/** Records one attempt, e.g. a failed login. */
export async function recordRateLimitEvent(key: string): Promise<void> {
  const handle = getDbHandle();
  await handle.queryRows(`insert into rate_limit_events (bucket) values ($1)`, [key]);
  void pruneOldEvents();
}

/**
 * Old rows are useless once every window has passed. Pruning runs
 * probabilistically so no request pays for it in the common case.
 */
async function pruneOldEvents(): Promise<void> {
  if (Math.random() > 0.02) return;
  try {
    await getDbHandle().queryRows(
      `delete from rate_limit_events where created_at < now() - interval '1 day'`,
    );
  } catch (error) {
    logWarn("rate_limit.prune_failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}
