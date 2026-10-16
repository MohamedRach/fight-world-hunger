import { NextResponse } from "next/server";

import {
  getNgosByCountry,
  InvalidCountryCodeError,
} from "@/features/discovery/server/get-ngos-by-country";
import type { ApiErrorResponse, NgosByCountryResponse } from "@/features/discovery/types";

interface RouteContext {
  params: Promise<{ countryId: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<NgosByCountryResponse | ApiErrorResponse>> {
  const { countryId } = await context.params;

  try {
    const result = await getNgosByCountry(countryId);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    if (error instanceof InvalidCountryCodeError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 400 },
      );
    }
    console.error("[api/countries/:countryId/ngos]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to load NGOs for this country." } },
      { status: 500 },
    );
  }
}
