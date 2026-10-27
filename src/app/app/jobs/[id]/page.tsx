import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { JobDetailPanel } from "@/components/job/job-detail-panel";
import { copy } from "@/content/copy";
import { requireOwner } from "@/lib/auth";
import { getBaseUrlFromHeaders } from "@/lib/base-url";
import { todayInShopTimezone } from "@/lib/dates";
import { rowIdSchema } from "@/lib/schemas/common";
import { getJobForOwner } from "@/lib/services/jobs";
import { getShopById } from "@/lib/services/shop";
import { toOwnerJob } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await requireOwner();

  const { id } = await params;
  const parsedId = rowIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const [result, shop, requestHeaders, query] = await Promise.all([
    getJobForOwner({ shopId: session.shopId, jobId: parsedId.data }),
    getShopById(session.shopId),
    headers(),
    searchParams,
  ]);

  if (!result || !shop) notFound();

  const baseUrl = getBaseUrlFromHeaders(requestHeaders);
  const initialJob = toOwnerJob(result.job, result.events, baseUrl);

  return (
    <main>
      <h1 className="sr-only">{copy.jobDetail.jobNumber(result.job.jobNumber)}</h1>
      <JobDetailPanel
        initialJob={initialJob}
        today={todayInShopTimezone()}
        shop={{ name: shop.name, phone: shop.phone }}
        justCreated={query.created === "1"}
      />
    </main>
  );
}
