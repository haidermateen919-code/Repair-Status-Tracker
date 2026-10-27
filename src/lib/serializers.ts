import type { JobEventRow, JobRow } from "./db/schema";
import type { PublicJob } from "./services/public-jobs";
import { publicJobUrl } from "./urls";
import type {
  JobEventDto,
  JobListItem,
  OwnerJobResponse,
  PublicJobResponse,
} from "@/types/contracts";

/**
 * Row → API contract mapping, shared by route handlers and server components
 * so the JSON from the API and the data rendered on the page can never drift.
 */

export function toJobEventDto(event: JobEventRow): JobEventDto {
  return {
    id: event.id,
    status: event.status,
    publicNote: event.publicNote,
    createdAt: event.createdAt.toISOString(),
  };
}

export function toOwnerJob(
  job: JobRow,
  events: JobEventRow[],
  baseUrl: string,
): OwnerJobResponse {
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    itemName: job.itemName,
    issue: job.issue,
    status: job.status,
    estimateDays: job.estimateDays,
    expectedReadyAt: job.expectedReadyAt,
    publicNote: job.publicNote,
    internalNote: job.internalNote,
    publicToken: job.publicToken,
    publicUrl: publicJobUrl(baseUrl, job.publicToken),
    statusChangedAt: job.statusChangedAt.toISOString(),
    deliveredAt: job.deliveredAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    events: events.map(toJobEventDto),
  };
}

export function toJobListItem(job: JobRow): JobListItem {
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    customerName: job.customerName,
    itemName: job.itemName,
    status: job.status,
    expectedReadyAt: job.expectedReadyAt,
    updatedAt: job.updatedAt.toISOString(),
  };
}

export function toPublicJobResponse(job: PublicJob): PublicJobResponse {
  return {
    jobNumber: job.jobNumber,
    itemName: job.itemName,
    issue: job.issue,
    status: job.status,
    expectedReadyAt: job.expectedReadyAt,
    publicNote: job.publicNote,
    statusChangedAt: job.statusChangedAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    timeline: job.timeline.map((entry) => ({
      status: entry.status,
      publicNote: entry.publicNote,
      at: entry.at.toISOString(),
    })),
    shop: job.shop,
  };
}
