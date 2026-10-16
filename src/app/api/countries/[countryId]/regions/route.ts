import { NextResponse } from "next/server";

import { countryCodeSchema } from "@/features/discovery/server/get-ngos-by-country";
import type { ApiErrorResponse } from "@/features/discovery/types";
import {
  loadRegionalData,
  RegionalDataLoadError,
} from "@/features/fewsnet/server/load-regional-data";
import type { RegionalDataResponse } from "@/features/fewsnet/types";

interface RouteContext {
  params: Promise<{ countryId: string }>;
}

const USER_FACING_MESSAGES: Record<RegionalDataLoadError["code"], { status: number; message: string }> = {
  UPSTREAM_UNAVAILABLE: {
    status: 503,
    message:
      "FEWS NET's data service did not respond successfully (it is sometimes slow or rate-limits requests). Please try again in a few seconds.",
  },
  UPSTREAM_INVALID_RESPONSE: {
    status: 502,
    message: "FEWS NET returned data in an unexpected format. Regional data is temporarily unavailable.",
  },
  INTERNAL_ERROR: {
    status: 500,
    message: "Unable to load regional data for this country.",
  },
};

/**
 * GET /api/countries/:countryId/regions
 *
 * FEWS NET IPC-compatible acute food insecurity classification for the
 * country's analysis areas (latest published Current Situation). Public data;
 * no authentication. Results are cached server-side (see loader) and are
 * safe to cache briefly at the edge.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<RegionalDataResponse | ApiErrorResponse>> {
  const { countryId } = await context.params;
  const parsed = countryCodeSchema.safeParse(countryId);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_COUNTRY_CODE",
          message: parsed.error.issues[0]?.message ?? "Invalid country code",
        },
      },
      { status: 400 },
    );
  }

  const countryCode = parsed.data;
  try {
    const data = await loadRegionalData(countryCode);
    return NextResponse.json(
      {
        data,
        meta: { countryCode, retrievedAt: new Date().toISOString(), cached: null },
      },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
    );
  } catch (error) {
    if (error instanceof RegionalDataLoadError) {
      console.error("[api/countries/:countryId/regions] FEWS NET load failed", {
        countryCode,
        code: error.code,
        upstreamStatus: error.upstreamStatus,
        message: error.message,
      });
      const { status, message } = USER_FACING_MESSAGES[error.code];
      return NextResponse.json(
        { error: { code: error.code, message } },
        { status, headers: status === 503 ? { "Retry-After": "120" } : undefined },
      );
    }
    console.error("[api/countries/:countryId/regions]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: USER_FACING_MESSAGES.INTERNAL_ERROR.message } },
      { status: 500 },
    );
  }
}
