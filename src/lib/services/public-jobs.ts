import { and, desc, eq, isNull } from "drizzle-orm";

import { PAGE_SIZES } from "../config";
import { getDb, type Database } from "../db";
import { jobEvents, jobs, shops } from "../db/schema";
import type { JobStatus } from "../status";

/**
 * Read models for the two customer-facing surfaces. These shapes are the only
 * data allowed to leave the building without a session: no customer name, no
 * phone number, no internal notes, no ids other than the token in the URL
 * (PRD §6.6, §7.3).
 */

export type PublicTimelineEntry = {
  status: JobStatus | null;
  publicNote: string | null;
  at: Date;
};

export type PublicShop = {
  name: string;
  address: string | null;
  timings: string | null;
  phone: string;
  whatsappPhone: string;
};

export type PublicJob = {
  jobNumber: number;
  itemName: string;
  issue: string | null;
  status: JobStatus;
  expectedReadyAt: string | null;
  publicNote: string | null;
  statusChangedAt: Date;
  updatedAt: Date;
  timeline: PublicTimelineEntry[];
  shop: PublicShop;
};

export type LookupItem = {
  token: string;
  jobNumber: number;
  itemName: string;
  status: JobStatus;
  expectedReadyAt: string | null;
};

/**
 * Deleted and unknown tokens return `null` identically, so the caller can show
 * one generic "this link no longer works" page (PRD §7.3 rule 14).
 */
export async function getPublicJobByToken(
  token: string,
  db: Database = getDb(),
): Promise<PublicJob | null> {
  const [row] = await db
    .select({
      jobId: jobs.id,
      jobNumber: jobs.jobNumber,
      itemName: jobs.itemName,
      issue: jobs.issue,
      status: jobs.status,
      expectedReadyAt: jobs.expectedReadyAt,
      publicNote: jobs.publicNote,
      statusChangedAt: jobs.statusChangedAt,
      updatedAt: jobs.updatedAt,
      shopName: shops.name,
      shopAddress: shops.address,
      shopTimings: shops.timings,
      shopPhone: shops.phone,
      shopWhatsapp: shops.whatsappPhone,
    })
    .from(jobs)
    .innerJoin(shops, eq(jobs.shopId, shops.id))
    .where(and(eq(jobs.publicToken, token), isNull(jobs.deletedAt)))
    .limit(1);

  if (!row) return null;

  const events = await db
    .select({
      status: jobEvents.status,
      publicNote: jobEvents.publicNote,
      at: jobEvents.createdAt,
    })
    .from(jobEvents)
    .where(eq(jobEvents.jobId, row.jobId))
    .orderBy(desc(jobEvents.createdAt))
    .limit(PAGE_SIZES.jobEvents);

  return {
    jobNumber: row.jobNumber,
    itemName: row.itemName,
    issue: row.issue,
    status: row.status,
    expectedReadyAt: row.expectedReadyAt,
    publicNote: row.publicNote,
    statusChangedAt: row.statusChangedAt,
    updatedAt: row.updatedAt,
    // Note-only events (status === null) are shown as "note updated" in the UI.
    timeline: events.map((event) => ({
      status: event.status,
      publicNote: event.publicNote,
      at: event.at,
    })),
    shop: {
      name: row.shopName,
      address: row.shopAddress,
      timings: row.shopTimings,
      phone: row.shopPhone,
      whatsappPhone: row.shopWhatsapp,
    },
  };
}

/**
 * Phone-number fallback (PRD F5b). Deliberately reduced: no fault text, no
 * notes, no customer name. Always returns a list (empty when nothing matches)
 * so the endpoint is not an oracle for which numbers exist.
 */
export async function lookupJobsByPhone(
  params: { shopId: string; phone: string },
  db: Database = getDb(),
): Promise<LookupItem[]> {
  return db
    .select({
      token: jobs.publicToken,
      jobNumber: jobs.jobNumber,
      itemName: jobs.itemName,
      status: jobs.status,
      expectedReadyAt: jobs.expectedReadyAt,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.shopId, params.shopId),
        eq(jobs.customerPhone, params.phone),
        isNull(jobs.deletedAt),
      ),
    )
    .orderBy(desc(jobs.createdAt), desc(jobs.jobNumber))
    .limit(PAGE_SIZES.lookupResults);
}
