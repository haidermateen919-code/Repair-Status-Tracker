import { ListChecks, Plus, SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { JobCard } from "@/components/job-card";
import { SearchFilters } from "@/components/search-filters";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { requireOwner } from "@/lib/auth";
import { todayInShopTimezone } from "@/lib/dates";
import { JOB_LIST_FILTERS, type JobListFilter } from "@/lib/schemas/job";
import { listJobs } from "@/lib/services/jobs";

export const dynamic = "force-dynamic";

function parseFilter(value: string | string[] | undefined): JobListFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  return JOB_LIST_FILTERS.includes(candidate as JobListFilter)
    ? (candidate as JobListFilter)
    : "active";
}

function parseQuery(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (candidate ?? "").slice(0, 80);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOwner();
  const params = await searchParams;

  const filter = parseFilter(params.status);
  const query = parseQuery(params.q);
  const today = todayInShopTimezone();

  const { items, counts } = await listJobs({
    shopId: session.shopId,
    filter,
    query: query || undefined,
  });

  const isSearching = query.trim().length > 0;

  return (
    <main className="flex flex-col gap-4">
      <div>
        <h1 className="text-title text-ink">{copy.dashboard.title}</h1>
        <p className="mt-1 text-small text-ink-muted">
          {copy.dashboard.counts(counts.active, counts.ready)}
        </p>
      </div>

      <SearchFilters filter={filter} query={query} counts={counts} />

      {items.length === 0 ? (
        isSearching ? (
          <EmptyState
            icon={SearchX}
            title={copy.dashboard.noResultsTitle}
            body={copy.dashboard.noResultsBody}
            action={
              <Button asChild variant="secondary" size="md">
                <Link href="/app">{copy.dashboard.noResultsClear}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ListChecks}
            title={emptyTitle(filter)}
            body={emptyBody(filter)}
            action={
              filter === "active" ? (
                <Button asChild size="lg">
                  <Link href="/app/jobs/new">{copy.dashboard.newJob}</Link>
                </Button>
              ) : null
            }
          />
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((job) => (
            <li key={job.id}>
              <JobCard
                today={today}
                job={{
                  id: job.id,
                  jobNumber: job.jobNumber,
                  customerName: job.customerName,
                  itemName: job.itemName,
                  status: job.status,
                  expectedReadyAt: job.expectedReadyAt,
                  updatedAt: job.updatedAt.toISOString(),
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Thumb-reachable primary action on phones, inline button on wider screens. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-background p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
        <Button asChild size="lg" className="w-full">
          <Link href="/app/jobs/new">
            <Plus aria-hidden="true" className="h-5 w-5" />
            {copy.dashboard.newJob}
          </Link>
        </Button>
      </div>

      <div className="hidden md:block">
        <Button asChild size="lg">
          <Link href="/app/jobs/new">
            <Plus aria-hidden="true" className="h-5 w-5" />
            {copy.dashboard.newJob}
          </Link>
        </Button>
      </div>
    </main>
  );
}

function emptyTitle(filter: JobListFilter): string {
  switch (filter) {
    case "ready":
      return copy.dashboard.emptyReadyTitle;
    case "delivered":
      return copy.dashboard.emptyDeliveredTitle;
    default:
      return copy.dashboard.emptyTitle;
  }
}

function emptyBody(filter: JobListFilter): string {
  switch (filter) {
    case "ready":
      return copy.dashboard.emptyReadyBody;
    case "delivered":
      return copy.dashboard.emptyDeliveredBody;
    default:
      return copy.dashboard.emptyBody;
  }
}
