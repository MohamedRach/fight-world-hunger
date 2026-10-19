import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import {
  cancelMyDonation,
  updateDonationStatusAsNgo,
  DonationServiceError,
} from "@/features/donations/service";
import { donationErrorResponse, readJsonBody } from "@/features/donations/http";

interface RouteContext {
  params: Promise<{ donationId: string }>;
}

/**
 * PATCH /api/donations/:donationId/status
 *
 * NGO accounts move a received donation through the tracking lifecycle;
 * individuals may only cancel their own still-pending pledge. These are
 * progress statuses — they never represent a payment (see docs/API_CONTRACTS.md).
 */
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    await connection();
    const { donationId } = await context.params;
    const user = await getSessionUser();
    const body = await readJsonBody(request);

    if (!user) {
      throw new DonationServiceError("UNAUTHENTICATED", "You must be signed in.");
    }

    if (user.type === "INDIVIDUAL") {
      const requested = (body as { status?: unknown } | null)?.status;
      if (requested !== "CANCELLED") {
        throw new DonationServiceError(
          "FORBIDDEN",
          "You can only cancel your own pending donation. The organization updates progress.",
        );
      }
      const donation = await cancelMyDonation(user.id, donationId);
      return Response.json({ data: donation });
    }

    const donation = await updateDonationStatusAsNgo(user.id, donationId, body);
    return Response.json({ data: donation });
  } catch (error) {
    return donationErrorResponse(error);
  }
}
