import { AlertTriangle, MapPin, Phone, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/auto-refresh";
import { StatusChip } from "@/components/status-chip";
import { Timeline } from "@/components/timeline";
import { WhatsappShareButton } from "@/components/whatsapp-share-button";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { copy } from "@/content/copy";
import {
  describeExpectedReady,
  formatLongDate,
  formatTime,
  todayInShopTimezone,
} from "@/lib/dates";
import { cn } from "@/lib/cn";
import { publicTokenSchema } from "@/lib/schemas/public";
import { getPublicJobByToken } from "@/lib/services/public-jobs";
import { STATUS_THEME } from "@/lib/status";
import { buildTimelineItems } from "@/lib/timeline";
import { telUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${copy.publicStatus.title} — ${copy.app.name}`,
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The customer's one link (PRD F5a). No login, no PII, and the status block is
 * above the fold on a 360px phone: English status word + Roman Urdu reassurance
 * + expected date, all in the first screenful.
 */
export default async function PublicStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsedToken = publicTokenSchema.safeParse(token);
  if (!parsedToken.success) notFound();

  const job = await getPublicJobByToken(parsedToken.data);
  if (!job) notFound();

  const today = todayInShopTimezone();
  const expected = job.expectedReadyAt ? describeExpectedReady(job.expectedReadyAt, today) : null;
  const theme = STATUS_THEME[job.status];
  const timelineItems = buildTimelineItems(job.timeline, "customer");

  const whatsappMessage = `Assalam-o-alaikum, meri repair #${job.jobNumber} (${job.itemName}) ke bare mein poochna hai.`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Store aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-muted" />
          <span className="truncate text-body font-semibold text-ink">{job.shop.name}</span>
        </div>
        <span className="shrink-0 text-small text-ink-muted">
          {copy.publicStatus.jobNumber(job.jobNumber)}
        </span>
      </header>

      {/* Status block: the answer to "meri cheez theek hui ya nahi?" */}
      <section
        aria-labelledby="current-status"
        className={cn("rounded-card border p-5", theme.panelClassName)}
      >
        <h2 id="current-status" className="text-small font-medium uppercase tracking-wide">
          {copy.publicStatus.statusLabel}
        </h2>
        <div className="mt-1 flex items-center gap-2">
          <StatusChip status={job.status} />
        </div>
        <p lang="ur-Latn" className="mt-3 text-status font-semibold text-ink">
          {copy.status[job.status].customerMessage}
        </p>

        {expected ? (
          <div className="mt-3 text-body text-ink">
            {expected.isOverdue ? (
              <>
                <p className="font-medium">
                  {copy.publicStatus.expectedLabel}: {expected.humanDate}
                </p>
                <p className="mt-1 flex items-start gap-2 rounded-card bg-status-soft-waiting-for-part px-3 py-2 text-small font-medium text-status-waiting-for-part">
                  <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span lang="ur-Latn">
                    {expected.isToday
                      ? copy.publicStatus.overdueToday
                      : copy.publicStatus.overdueNote(Math.abs(expected.daysAway))}
                  </span>
                </p>
              </>
            ) : expected.isToday ? (
              <p className="font-medium">{copy.publicStatus.expectedToday}</p>
            ) : expected.daysAway === 1 ? (
              <p className="font-medium">{copy.publicStatus.expectedSoon(expected.humanDate)}</p>
            ) : (
              <p className="font-medium">
                {copy.publicStatus.expectedDays(expected.humanDate, expected.daysAway)}
              </p>
            )}
          </div>
        ) : null}
      </section>

      <Card>
        <CardBody className="flex flex-col gap-2">
          <dl className="grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1 text-small">
            <dt className="text-ink-muted">{copy.publicStatus.itemLabel}</dt>
            <dd className="text-ink">{job.itemName}</dd>
            <dt className="text-ink-muted">{copy.publicStatus.issueLabel}</dt>
            <dd lang="ur-Latn" className="text-ink">
              {job.issue ?? copy.common.none}
            </dd>
          </dl>
          <p className="text-small text-ink-muted">
            {copy.publicStatus.updatedAt(
              `${formatLongDate(job.updatedAt)} · ${formatTime(job.updatedAt)}`,
            )}
          </p>
        </CardBody>
      </Card>

      {job.publicNote ? (
        <Card>
          <CardBody className="flex flex-col gap-1">
            <p className="text-small font-medium uppercase tracking-wide text-ink-muted">
              {copy.publicStatus.noteLabel}
            </p>
            <p lang="ur-Latn" className="text-body text-ink">
              {job.publicNote}
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3">
          <h2 className="text-body font-semibold text-ink">{copy.publicStatus.timelineTitle}</h2>
          <Timeline items={timelineItems} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <h2 className="text-body font-semibold text-ink">{copy.publicStatus.shopTitle}</h2>
          {job.shop.address ? (
            <p className="flex items-start gap-2 text-small text-ink-muted">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{job.shop.address}</span>
            </p>
          ) : null}
          {job.shop.timings ? (
            <p className="text-small text-ink-muted">
              {copy.publicStatus.shopTimings}: {job.shop.timings}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <WhatsappShareButton
              phone={job.shop.whatsappPhone}
              message={whatsappMessage}
              label={copy.publicStatus.whatsappShop}
              className="w-full sm:w-auto"
            />
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
              <a href={telUrl(job.shop.phone)}>
                <Phone aria-hidden="true" className="h-4 w-4" />
                {copy.publicStatus.callShop}
              </a>
            </Button>
          </div>
        </CardBody>
      </Card>

      <p className="text-center text-small text-ink-muted">
        <Link href="/track" className="font-medium text-accent underline-offset-4 hover:underline">
          {copy.publicStatus.lostLink}
        </Link>
      </p>

      <AutoRefresh />
    </main>
  );
}
