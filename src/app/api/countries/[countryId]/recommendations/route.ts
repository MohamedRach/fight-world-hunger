import { connection } from "next/server";

import { countryCodeSchema } from "@/features/discovery/server/get-ngos-by-country";
import { campaignErrorResponse } from "@/features/campaigns/http";
import { getCountryRecommendations } from "@/features/recommendations/server/service";
import { getSessionUser } from "@/features/ngos/session";

interface RouteContext {
  params: Promise<{ countryId: string }>;
}

/**
 * GET /api/countries/:countryId/recommendations
 *
 * Eligible campaigns for a country plus, for a signed-in donor who has chosen
 * world hunger interests, up to three personalised recommendations.
 *
 * The LLM call happens here on the server: the API key never reaches the
 * browser, and the response says whether the ranking came from the model or
 * the deterministic fallback.
 */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { countryId } = await context.params;

  const parsed = countryCodeSchema.safeParse(countryId);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "INVALID_COUNTRY_CODE",
          message: parsed.error.issues[0]?.message ?? "Invalid country code",
        },
      },
      { status: 400 },
    );
  }

  try {
    // Depends on the signed-in donor: never prerender or share this response.
    await connection();
    const user = await getSessionUser();
    const data = await getCountryRecommendations(parsed.data, {
      userId: user?.id ?? null,
      type: user?.type ?? null,
    });
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return campaignErrorResponse(error);
  }
}
