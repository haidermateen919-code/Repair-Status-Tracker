import { copy } from "@/content/copy";
import {
  assertSameOrigin,
  getClientIp,
  jsonError,
  jsonOk,
  methodNotAllowed,
  parseWithSchema,
  readJsonBody,
  withNoIndex,
} from "@/lib/http";
import { LOOKUP_ARTIFICIAL_DELAY_MS, RATE_LIMITS } from "@/lib/config";
import { RateLimitError } from "@/lib/errors";
import { logInfo, logWarn } from "@/lib/logger";
import { normalisePhone } from "@/lib/phone";
import { bucketKey, consumeRateLimit } from "@/lib/rate-limit";
import { lookupSchema } from "@/lib/schemas/public";
import { lookupJobsByPhone } from "@/lib/services/public-jobs";
import { getPrimaryShop } from "@/lib/services/shop";
import type { PublicLookupResponse } from "@/types/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `POST /api/public/lookup` — phone-number fallback (PRD F5b).
 *
 * Defence in depth: per-IP limit, per-number limit, honeypot, a constant
 * artificial delay and a reduced response shape. An unknown number returns an
 * empty list rather than a 404, so the endpoint never confirms whether a
 * number exists.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);

    const ip = getClientIp(request);
    const ipLimit = await consumeRateLimit({
      key: bucketKey("lookup-ip", ip),
      ...RATE_LIMITS.lookupPerIp,
    });

    if (!ipLimit.allowed) {
      throw new RateLimitError(ipLimit.retryAfterSeconds, copy.errors.rateLimited);
    }

    const payload = parseWithSchema(lookupSchema, await readJsonBody(request));

    // Bots fill hidden fields; humans never see them. Fail closed but quietly.
    if (payload.website && payload.website.trim().length > 0) {
      logWarn("lookup.honeypot_triggered");
      await delay(LOOKUP_ARTIFICIAL_DELAY_MS);
      const empty: PublicLookupResponse = { items: [] };
      return withNoIndex(jsonOk(empty));
    }

    const phone = normalisePhone(payload.phone);
    if (!phone) {
      // Schema already validated this; keep the guard for defence in depth.
      await delay(LOOKUP_ARTIFICIAL_DELAY_MS);
      const empty: PublicLookupResponse = { items: [] };
      return withNoIndex(jsonOk(empty));
    }

    const phoneLimit = await consumeRateLimit({
      key: bucketKey("lookup-phone", phone),
      ...RATE_LIMITS.lookupPerPhone,
    });

    if (!phoneLimit.allowed) {
      throw new RateLimitError(phoneLimit.retryAfterSeconds, copy.errors.rateLimited);
    }

    const shop = await getPrimaryShop();
    if (!shop) {
      await delay(LOOKUP_ARTIFICIAL_DELAY_MS);
      const empty: PublicLookupResponse = { items: [] };
      return withNoIndex(jsonOk(empty));
    }

    const items = await lookupJobsByPhone({ shopId: shop.id, phone });

    logInfo("lookup.performed", { resultCount: items.length });

    await delay(LOOKUP_ARTIFICIAL_DELAY_MS);

    const body: PublicLookupResponse = {
      items: items.map((item) => ({
        token: item.token,
        jobNumber: item.jobNumber,
        itemName: item.itemName,
        status: item.status,
        expectedReadyAt: item.expectedReadyAt,
      })),
    };

    return withNoIndex(jsonOk(body));
  } catch (error) {
    return withNoIndex(jsonError(error));
  }
}

export function GET(): Response {
  return methodNotAllowed(["POST"]);
}
