/**
 * Retention job (PRD §7.7). Deletes jobs whose life has ended and whose
 * retention window has passed:
 *
 *   - soft-deleted jobs           → purged immediately (already invisible)
 *   - cancelled jobs              → purged after 90 days
 *   - delivered jobs              → purged after 24 months
 *
 * Related `job_events` rows are removed by the database's ON DELETE CASCADE.
 * Run manually or from a scheduler:  npm run db:purge
 * Add `--dry-run` to see what would be deleted.
 */
import { RETENTION } from "../src/lib/config";
import { createDbHandle } from "../src/lib/db";
import { loadEnvFile } from "./_env";
import { runScript } from "./_run";

const dryRun = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  loadEnvFile();

  const handle = createDbHandle();
  console.log(`[purge] driver=${handle.driver}${dryRun ? " (dry run)" : ""}`);

  try {
    const candidates = await handle.queryRows<{ id: string; job_number: number; reason: string }>(
      `select id, job_number, reason from (
         select id, job_number, 'soft-deleted' as reason
           from jobs where deleted_at is not null
         union all
         select id, job_number, 'cancelled' as reason
           from jobs
          where status = 'CANCELLED'
            and deleted_at is null
            and coalesce(status_changed_at, created_at) < now() - make_interval(days => $1)
         union all
         select id, job_number, 'delivered' as reason
           from jobs
          where status = 'DELIVERED'
            and deleted_at is null
            and coalesce(delivered_at, status_changed_at, created_at) < now() - make_interval(months => $2)
       ) candidates
       order by job_number`,
      [RETENTION.cancelledDays, RETENTION.deliveredMonths],
    );

    if (candidates.length === 0) {
      console.log("[purge] nothing to delete");
    } else {
      for (const job of candidates) {
        console.log(`[purge] #${job.job_number} (${job.reason})`);
      }

      if (!dryRun) {
        const ids = candidates.map((job) => job.id);
        await handle.queryRows(`delete from jobs where id = any($1::text[])`, [ids]);
      }
    }

    const prunedEvents = await handle.queryRows<{ count: string }>(
      `with deleted as (
         delete from rate_limit_events where created_at < now() - interval '2 days' returning 1
       ) select count(*)::text as count from deleted`,
    );
    console.log(`[purge] removed ${prunedEvents[0]?.count ?? "0"} expired rate-limit rows`);
    console.log(dryRun ? "[purge] dry run complete" : "[purge] done");
  } finally {
    await handle.close();
  }
}

runScript("purge", main);
