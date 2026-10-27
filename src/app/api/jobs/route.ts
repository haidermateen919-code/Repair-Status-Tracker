import { getBaseUrl } from "@/lib/base-url";
import { requireOwnerApi } from "@/lib/auth";
import { jsonError, jsonOk, methodNotAllowed, parseWithSchema, readJsonBody, assertSameOrigin } from "@/lib/http";
import { logInfo } from "@/lib/logger";
import { createJobSchema, listJobsQuerySchema } from "@/lib/schemas/job";
import { createJob, listJobs } from "@/lib/services/jobs";
import { publicJobUrl } from "@/lib/urls";
import type { CreateJobResponse, JobListResponse } from "@/types/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `GET /api/jobs?status=active|ready|delivered|all&q=` (owner only). */
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireOwnerApi();
    const url = new URL(request.url);

    const query = parseWithSchema(listJobsQuerySchema, {
      status: url.searchParams.get("status") ?? "active",
      q: url.searchParams.get("q") ?? undefined,
    });

    const { items, counts } = await listJobs({
      shopId: session.shopId,
      filter: query.status,
      query: query.q,
    });

    const body: JobListResponse = {
      items: items.map((job) => ({
        id: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        itemName: job.itemName,
        status: job.status,
        expectedReadyAt: job.expectedReadyAt,
        updatedAt: job.updatedAt.toISOString(),
      })),
      counts,
    };

    return jsonOk(body);
  } catch (error) {
    return jsonError(error);
  }
}

/** `POST /api/jobs` — creates a job, allocates its number and a public token. */
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireOwnerApi();
    assertSameOrigin(request);

    const payload = parseWithSchema(createJobSchema, await readJsonBody(request));
    const job = await createJob({ shopId: session.shopId, input: payload });

    logInfo("job.created", { jobId: job.id, jobNumber: job.jobNumber });

    const body: CreateJobResponse = {
      id: job.id,
      jobNumber: job.jobNumber,
      status: job.status,
      publicToken: job.publicToken,
      publicUrl: publicJobUrl(getBaseUrl(request), job.publicToken),
      createdAt: job.createdAt.toISOString(),
    };

    return jsonOk(body, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export function PUT(): Response {
  return methodNotAllowed(["GET", "POST"]);
}

export function DELETE(): Response {
  return methodNotAllowed(["GET", "POST"]);
}
