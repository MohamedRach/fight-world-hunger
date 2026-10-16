import { getSessionUser } from "@/features/ngos/session";
import { updateDonationStatus } from "@/features/donations/service";
import { donationErrorResponse, readJsonBody } from "@/features/donations/http";

// PATCH /api/donations/:donationId/status — the receiving NGO moves a donation
// to its next status (see docs/API_CONTRACTS.md).
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/donations/[donationId]/status">,
) {
  try {
    const { donationId } = await ctx.params;
    const user = await getSessionUser();
    const body = await readJsonBody(request);
    const donation = await updateDonationStatus(user, donationId, body);
    return Response.json({ data: donation });
  } catch (error) {
    return donationErrorResponse(error);
  }
}
