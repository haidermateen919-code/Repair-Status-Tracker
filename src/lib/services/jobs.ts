import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";

import { PAGE_SIZES } from "../config";
import { getDb, type Database } from "../db";
import { jobEvents, jobs, shops, type JobEventRow, type JobRow } from "../db/schema";
import { expectedDateFromDays } from "../dates";
import {
  JobDeletedError,
  NotFoundError,
  ReopenConfirmationError,
  ValidationError,
} from "../errors";
import { normalisePhone } from "../phone";
import type { CreateJobInput, JobListFilter, UpdateJobInput } from "../schemas/job";
import { generatePublicToken } from "../tokens";
import { ACTIVE_STATUSES, canTransition } from "../status";

/**
 * All job reads and writes. Route handlers never touch tables directly, which
 * keeps shop scoping, transactions and audit rules in one place.
 */

export type JobWithEvents = { job: JobRow; events: JobEventRow[] };
export type JobCounts = { active: number; ready: number; delivered: number };

const JOB_EVENT_LIMIT = PAGE_SIZES.jobEvents;

export async function createJob(
  params: { shopId: string; input: CreateJobInput },
  db: Database = getDb(),
): Promise<JobRow> {
  const { shopId, input } = params;

  const customerPhone = normalisePhone(input.customerPhone);
  if (!customerPhone) throw new ValidationError("Invalid phone number");

  return db.transaction(async (tx) => {
    // Atomic allocation: the UPDATE locks the shop row, so two concurrent
    // saves can never receive the same job number (PRD §6.4).
    const [shop] = await tx
      .update(shops)
      .set({ jobSeq: sql`${shops.jobSeq} + 1` })
      .where(eq(shops.id, shopId))
      .returning({ jobSeq: shops.jobSeq });

    if (!shop) throw new NotFoundError("Shop not found");

    const expectedReadyAt =
      input.expectedReadyAt ??
      (input.estimateDays ? expectedDateFromDays(input.estimateDays) : null);

    const [job] = await tx
      .insert(jobs)
      .values({
        shopId,
        jobNumber: shop.jobSeq,
        publicToken: generatePublicToken(),
        customerName: input.customerName,
        customerPhone,
        itemName: input.itemName,
        issue: input.issue ?? null,
        status: "RECEIVED",
        estimateDays: input.estimateDays ?? null,
        expectedReadyAt,
        internalNote: input.internalNote ?? null,
      })
      .returning();

    if (!job) throw new Error("Job insert returned no row");

    await tx.insert(jobEvents).values({ jobId: job.id, status: "RECEIVED" });

    return job;
  });
}

export async function getJobForOwner(
  params: { shopId: string; jobId: string },
  db: Database = getDb(),
): Promise<JobWithEvents | null> {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, params.jobId), eq(jobs.shopId, params.shopId), isNull(jobs.deletedAt)))
    .limit(1);

  if (!job) return null;

  const events = await listJobEvents(job.id, db);
  return { job, events };
}

export async function listJobEvents(jobId: string, db: Database = getDb()): Promise<JobEventRow[]> {
  return db
    .select()
    .from(jobEvents)
    .where(eq(jobEvents.jobId, jobId))
    .orderBy(desc(jobEvents.createdAt), desc(jobEvents.id))
    .limit(JOB_EVENT_LIMIT);
}

export async function listJobs(
  params: { shopId: string; filter: JobListFilter; query?: string },
  db: Database = getDb(),
): Promise<{ items: JobRow[]; counts: JobCounts }> {
  const { shopId, filter, query } = params;

  const baseConditions: SQL[] = [eq(jobs.shopId, shopId), isNull(jobs.deletedAt)];

  const filterCondition = statusFilterCondition(filter);
  if (filterCondition) baseConditions.push(filterCondition);

  const searchCondition = buildSearchCondition(query);
  if (searchCondition) baseConditions.push(searchCondition);

  const orderBy =
    filter === "ready"
      ? [asc(jobs.statusChangedAt), asc(jobs.jobNumber)]
      : [desc(jobs.createdAt), desc(jobs.jobNumber)];

  const [items, counts] = await Promise.all([
    db
      .select()
      .from(jobs)
      .where(and(...baseConditions))
      .orderBy(...orderBy)
      .limit(PAGE_SIZES.jobs),
    getJobCounts(shopId, db),
  ]);

  return { items, counts };
}

export async function getJobCounts(shopId: string, db: Database = getDb()): Promise<JobCounts> {
  const rows = await db
    .select({ status: jobs.status, total: sql<number>`count(*)::int` })
    .from(jobs)
    .where(
      and(
        eq(jobs.shopId, shopId),
        isNull(jobs.deletedAt),
        inArray(jobs.status, [...ACTIVE_STATUSES, "READY", "DELIVERED"]),
      ),
    )
    .groupBy(jobs.status);

  const counts: JobCounts = { active: 0, ready: 0, delivered: 0 };
  for (const row of rows) {
    if (row.status === "READY") counts.ready += row.total;
    else if (row.status === "DELIVERED") counts.delivered += row.total;
    else counts.active += row.total;
  }
  return counts;
}

function statusFilterCondition(filter: JobListFilter): SQL | undefined {
  switch (filter) {
    case "active":
      return inArray(jobs.status, [...ACTIVE_STATUSES]);
    case "ready":
      return eq(jobs.status, "READY");
    case "delivered":
      return eq(jobs.status, "DELIVERED");
    case "all":
      return undefined;
  }
}

/**
 * Search matches customer name, item, phone (any fragment, including the last
 * four digits) and job number. `limit` is always applied by the caller.
 */
function buildSearchCondition(rawQuery: string | undefined): SQL | undefined {
  const query = rawQuery?.trim();
  if (!query) return undefined;

  const like = `%${escapeLike(query)}%`;
  const conditions: SQL[] = [
    sql`${jobs.customerName} ilike ${like}`,
    sql`${jobs.itemName} ilike ${like}`,
  ];

  const digits = query.replace(/\D/g, "");
  if (digits.length >= 3) {
    // Stored numbers are E.164 (+923001234567); accept "0300…" and "300…" alike.
    const withoutLeadingZero = digits.replace(/^0+/, "");
    conditions.push(sql`${jobs.customerPhone} like ${`%${withoutLeadingZero}%`}`);
  }

  const jobNumberMatch = /^#?\s*(\d{1,6})$/.exec(query);
  if (jobNumberMatch?.[1]) {
    conditions.push(eq(jobs.jobNumber, Number(jobNumberMatch[1])));
  }

  return or(...conditions);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export type UpdateJobParams = {
  shopId: string;
  jobId: string;
  patch: UpdateJobInput;
};

/**
 * Applies a partial update in one transaction. Status changes append an event
 * (at most one, even if the same PATCH is retried) and maintain `deliveredAt`,
 * `statusChangedAt` and the public-note audit trail.
 */
export async function updateJob(
  params: UpdateJobParams,
  db: Database = getDb(),
): Promise<JobWithEvents> {
  const { shopId, jobId, patch } = params;

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.shopId, shopId)))
      .for("update");

    if (!existing) throw new NotFoundError("Job not found");
    if (existing.deletedAt) throw new JobDeletedError();

    const now = new Date();
    const updates: Partial<typeof jobs.$inferInsert> = {};
    let statusChanged = false;
    let noteChanged = false;

    if (patch.status && patch.status !== existing.status) {
      const transition = canTransition(existing.status, patch.status);
      if (!transition.allowed && !patch.confirmReopen) {
        throw new ReopenConfirmationError(transition.reason);
      }

      updates.status = patch.status;
      updates.statusChangedAt = now;
      updates.deliveredAt = patch.status === "DELIVERED" ? now : null;
      statusChanged = true;
    }

    if (patch.expectedReadyAt !== undefined) {
      updates.expectedReadyAt = patch.expectedReadyAt;
    }

    if (patch.estimateDays !== undefined) {
      updates.estimateDays = patch.estimateDays;
      if (patch.expectedReadyAt === undefined) {
        updates.expectedReadyAt =
          patch.estimateDays === null
            ? existing.expectedReadyAt
            : expectedDateFromDays(patch.estimateDays);
      }
    }

    if (patch.publicNote !== undefined && patch.publicNote !== existing.publicNote) {
      updates.publicNote = patch.publicNote;
      noteChanged = true;
    }

    if (patch.internalNote !== undefined) {
      updates.internalNote = patch.internalNote;
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      await tx.update(jobs).set(updates).where(eq(jobs.id, jobId));
    }

    if (statusChanged || noteChanged) {
      await tx.insert(jobEvents).values({
        jobId,
        status: statusChanged ? (patch.status ?? null) : null,
        publicNote: noteChanged ? (patch.publicNote ?? null) : null,
      });
    }

    const [updated] = await tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.shopId, shopId)))
      .limit(1);

    if (!updated) throw new NotFoundError("Job not found");

    const events = await tx
      .select()
      .from(jobEvents)
      .where(eq(jobEvents.jobId, jobId))
      .orderBy(desc(jobEvents.createdAt), desc(jobEvents.id))
      .limit(JOB_EVENT_LIMIT);

    return { job: updated, events };
  });
}

/** Soft delete (PRD §6.4): the row stays, every owner query and the public link stop working. */
export async function softDeleteJob(
  params: { shopId: string; jobId: string },
  db: Database = getDb(),
): Promise<void> {
  const result = await db
    .update(jobs)
    .set({ deletedAt: new Date() })
    .where(and(eq(jobs.id, params.jobId), eq(jobs.shopId, params.shopId), isNull(jobs.deletedAt)))
    .returning({ id: jobs.id });

  if (result.length === 0) {
    const [existing] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.id, params.jobId), eq(jobs.shopId, params.shopId)))
      .limit(1);

    // Deleting an already-deleted job is a no-op; an unknown job is a 404.
    if (!existing) throw new NotFoundError("Job not found");
  }
}
