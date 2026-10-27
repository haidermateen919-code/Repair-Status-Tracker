import Link from "next/link";

import { StatusChip } from "@/components/status-chip";
import { copy } from "@/content/copy";
import { describeExpectedReady } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { isActiveStatus } from "@/lib/status";
import type { JobListItem } from "@/types/contracts";

/**
 * One job row. Cards, never tables (PRD §5.2). The whole card is a single link
 * so it is easy to hit one-handed on a 360px screen.
 */
export function JobCard({ job, today }: { job: JobListItem; today: string }) {
  const expected = job.expectedReadyAt ? describeExpectedReady(job.expectedReadyAt, today) : null;
  const showOverdue = expected?.isOverdue && isActiveStatus(job.status);

  return (
    <Link
      href={`/app/jobs/${job.id}`}
      className="block rounded-card border border-line bg-background p-4 transition-colors hover:border-accent focus-visible:border-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-small text-ink-muted">{copy.dashboard.jobNumber(job.jobNumber)}</p>
          <p className="truncate text-body font-semibold text-ink">{job.customerName}</p>
          <p className="truncate text-small text-ink-muted">{job.itemName}</p>
        </div>
        <StatusChip status={job.status} size="sm" className="shrink-0" />
      </div>

      <p
        className={cn(
          "mt-2 text-small",
          showOverdue ? "font-medium text-status-waiting-for-part" : "text-ink-muted",
        )}
      >
        {expected
          ? `${copy.dashboard.expectedPrefix} ${expected.humanDate}`
          : `${copy.dashboard.expectedPrefix} ${copy.dashboard.expectedMissing}`}
        {showOverdue && expected
          ? ` · ${copy.jobDetail.overdue(Math.abs(expected.daysAway))}`
          : null}
      </p>
    </Link>
  );
}
