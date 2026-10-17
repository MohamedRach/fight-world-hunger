import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { createCampaign, CampaignServiceError } from "@/features/campaigns/service";
import { campaignErrorResponse, readJsonBody } from "@/features/campaigns/http";
import { toCampaignSummary } from "@/features/campaigns/types";

// POST /api/campaigns — an NGO account creates a campaign for an organization
// it manages (see docs/API_CONTRACTS.md).
export async function POST(request: Request): Promise<Response> {
  try {
    await connection();
    const user = await getSessionUser();
    if (user && user.type !== "NGO") {
      throw new CampaignServiceError(
        "FORBIDDEN",
        "Only NGO accounts can create campaigns.",
      );
    }
    const body = await readJsonBody(request);
    const campaign = await createCampaign(user?.id ?? null, body);
    return Response.json({ data: toCampaignSummary(campaign) }, { status: 201 });
  } catch (error) {
    return campaignErrorResponse(error);
  }
}
