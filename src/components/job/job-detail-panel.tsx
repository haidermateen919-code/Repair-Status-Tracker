"use client";

import { ChevronLeft, Phone, Share2 } from "lucide-react";
import Link from "next/link";

import { DeleteJob } from "@/components/job/delete-job";
import { ExpectedDateControl } from "@/components/job/expected-date-control";
import { NoteEditors } from "@/components/job/note-editors";
import { SharePanel, type ShareShopInfo } from "@/components/job/share-panel";
import { StatusSelector } from "@/components/job/status-selector";
import { StatusChip } from "@/components/status-chip";
import { Timeline } from "@/components/timeline";
import { Card, CardBody } from "@/components/ui/card";
import { copy } from "@/content/copy";
import { useJobUpdate } from "@/hooks/use-job-update";
import { formatLongDate } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { telUrl } from "@/lib/urls";
import { buildTimelineItems } from "@/lib/timeline";
import type { OwnerJobResponse } from "@/types/contracts";

/**
 * The interactive half of the job screen. All persistence flows through one
 * optimistic `useJobUpdate` hook, so every section behaves identically on
 * success, failure and offline.
 */
export function JobDetailPanel({
  initialJob,
  today,
  shop,
  justCreated,
}: {
  initialJob: OwnerJobResponse;
  today: string;
  shop: ShareShopInfo;
  justCreated: boolean;
}) {
  const { job, patch, pending } = useJobUpdate(initialJob);

  const timelineItems = buildTimelineItems(
    job.events.map((event) => ({
      status: event.status,
      publicNote: event.publicNote,
      at: new Date(event.createdAt),
    })),
    "owner",
  );

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/app"
        className="inline-flex h-11 items-center gap-1 self-start text-small font-medium text-accent"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        {copy.jobDetail.backToJobs}
      </Link>

      {justCreated ? (
        <div
          role="status"
          className="rounded-card border border-status-ready/30 bg-status-soft-ready p-4 text-status-ready"
        >
          <p className="flex items-center gap-2 text-body font-semibold">
            <Share2 aria-hidden="true" className="h-4 w-4" />
            {copy.newJob.created(job.jobNumber)}
          </p>
          <p className="mt-1 text-small">{copy.jobDetail.shareHint}</p>
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-small text-ink-muted">{copy.jobDetail.jobNumber(job.jobNumber)}</p>
              <h1 className="text-title text-ink">{job.customerName}</h1>
            </div>
            <StatusChip status={job.status} />
          </div>

          <a
            href={telUrl(job.customerPhone)}
            className="inline-flex min-h-touch items-center gap-2 text-body font-medium text-accent"
          >
            <Phone aria-hidden="true" className="h-4 w-4" />
            {formatPhone(job.customerPhone)}
          </a>

          <dl className="grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1 text-small">
            <dt className="text-ink-muted">{copy.jobDetail.itemLabel}</dt>
            <dd className="text-ink">{job.itemName}</dd>
            <dt className="text-ink-muted">{copy.jobDetail.issueLabel}</dt>
            <dd lang="ur-Latn" className="text-ink">
              {job.issue ?? copy.jobDetail.issueMissing}
            </dd>
            <dt className="text-ink-muted">{copy.jobDetail.createdLabel}</dt>
            <dd className="text-ink">{formatLongDate(new Date(job.createdAt))}</dd>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <StatusSelector job={job} pending={pending} onPatch={patch} />
          <ExpectedDateControl job={job} today={today} pending={pending} onPatch={patch} />
          <NoteEditors job={job} pending={pending} onPatch={patch} />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SharePanel job={job} shop={shop} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <h2 className="text-body font-semibold text-ink">{copy.jobDetail.timelineTitle}</h2>
          {timelineItems.length === 0 ? (
            <p className="text-small text-ink-muted">{copy.jobDetail.timelineEmpty}</p>
          ) : (
            <Timeline items={timelineItems} />
          )}
        </CardBody>
      </Card>

      <DeleteJob job={job} />
    </div>
  );
}
