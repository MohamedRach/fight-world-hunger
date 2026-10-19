import { countryCodeSchema } from "@/features/discovery/server/get-ngos-by-country";
import { getCampaignsByCountry } from "@/features/campaigns/service";
import { campaignErrorResponse } from "@/features/campaigns/http";
import type { CampaignsByCountryResponse } from "@/features/campaigns/types";

interface RouteContext {
  params: Promise<{ countryId: string }>;
}

// GET /api/countries/:countryId/campaigns — public campaigns serving a country
// (see docs/API_CONTRACTS.md). Drafts are never listed.
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
    const countryCode = parsed.data;
    const campaigns = await getCampaignsByCountry(countryCode);
    const body: CampaignsByCountryResponse = {
      data: campaigns,
      meta: { countryCode, total: campaigns.length },
    };
    // Mock data changes as soon as an NGO edits a campaign: no shared caching.
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return campaignErrorResponse(error);
  }
}
