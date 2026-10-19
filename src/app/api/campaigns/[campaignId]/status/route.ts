import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { updateCampaignStatus } from "@/features/campaigns/service";
import { campaignErrorResponse, readJsonBody } from "@/features/campaigns/http";
import { toCampaignSummary } from "@/features/campaigns/types";

interface RouteContext {
  params: Promise<{ campaignId: string }>;
}

// PATCH /api/campaigns/:campaignId/status — the owning NGO moves a campaign
// through its lifecycle (see docs/API_CONTRACTS.md).
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    await connection();
    const { campaignId } = await context.params;
    const user = await getSessionUser();
    const body = await readJsonBody(request);
    const campaign = await updateCampaignStatus(user?.id ?? null, campaignId, body);
    return Response.json({ data: toCampaignSummary(campaign) });
  } catch (error) {
    return campaignErrorResponse(error);
  }
}
