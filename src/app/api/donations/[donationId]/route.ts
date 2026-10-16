import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { getDonation } from "@/features/donations/service";
import { donationErrorResponse } from "@/features/donations/http";

// GET /api/donations/:donationId — a donation and its status history, for its
// donor or the receiving NGO's representatives (see docs/API_CONTRACTS.md).
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/donations/[donationId]">,
) {
  try {
    await connection();
    const { donationId } = await ctx.params;
    const user = await getSessionUser();
    const donation = await getDonation(user, donationId);
    return Response.json({ data: donation });
  } catch (error) {
    return donationErrorResponse(error);
  }
}
