import { NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk, methodNotAllowed, parseWithSchema } from "@/lib/http";
import { publicTokenSchema } from "@/lib/schemas/public";
import { getPublicJobByToken } from "@/lib/services/public-jobs";
import { toPublicJobResponse } from "@/lib/serializers";
import { withNoIndex } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * `GET /api/public/jobs/:token` — the customer's read-only view.
 *
 * Unknown and deleted tokens return the same generic 404 (PRD §7.3), and the
 * response contains no customer PII.
 */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const params = await context.params;
    const token = parseWithSchema(publicTokenSchema, params.token);
    const job = await getPublicJobByToken(token);

    if (!job) throw new NotFoundError("Link not found");

    return withNoIndex(jsonOk(toPublicJobResponse(job)));
  } catch (error) {
    return withNoIndex(jsonError(error));
  }
}

export function POST(): Response {
  return methodNotAllowed(["GET"]);
}
