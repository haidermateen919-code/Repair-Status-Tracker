import { getBaseUrl } from "@/lib/base-url";
import { requireOwnerApi } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  methodNotAllowed,
  parseWithSchema,
  readJsonBody,
} from "@/lib/http";
import { logInfo } from "@/lib/logger";
import { jobIdParamSchema, updateJobSchema } from "@/lib/schemas/job";
import { getJobForOwner, softDeleteJob, updateJob } from "@/lib/services/jobs";
import { toOwnerJob } from "@/lib/serializers";
import type { OwnerJobResponse } from "@/types/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** `GET /api/jobs/:id` — full job including events and the public URL. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const session = await requireOwnerApi();
    const { id } = parseWithSchema(jobIdParamSchema, await context.params);

    const result = await getJobForOwner({ shopId: session.shopId, jobId: id });
    if (!result) throw new NotFoundError("Job not found");

    const body: OwnerJobResponse = toOwnerJob(result.job, result.events, getBaseUrl(request));
    return jsonOk(body);
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * `PATCH /api/jobs/:id` — partial update. Status changes are idempotent and
 * re-opening a finished job requires `confirmReopen: true`.
 */
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const session = await requireOwnerApi();
    assertSameOrigin(request);

    const { id } = parseWithSchema(jobIdParamSchema, await context.params);
    const patch = parseWithSchema(updateJobSchema, await readJsonBody(request));

    const result = await updateJob({ shopId: session.shopId, jobId: id, patch });

    logInfo("job.updated", {
      jobId: result.job.id,
      status: result.job.status,
      fields: Object.keys(patch).join(","),
    });

    const body: OwnerJobResponse = toOwnerJob(result.job, result.events, getBaseUrl(request));
    return jsonOk(body);
  } catch (error) {
    return jsonError(error);
  }
}

/** `DELETE /api/jobs/:id` — soft delete; the public link stops working. */
export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  try {
    const session = await requireOwnerApi();
    assertSameOrigin(request);

    const { id } = parseWithSchema(jobIdParamSchema, await context.params);
    await softDeleteJob({ shopId: session.shopId, jobId: id });

    logInfo("job.deleted", { jobId: id });
    return jsonOk({ ok: true }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}

export function POST(): Response {
  return methodNotAllowed(["GET", "PATCH", "DELETE"]);
}
