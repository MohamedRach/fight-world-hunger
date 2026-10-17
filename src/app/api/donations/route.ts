import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { createDonation, DonationServiceError } from "@/features/donations/service";
import { donationErrorResponse, readJsonBody } from "@/features/donations/http";

// POST /api/donations — records a SIMULATED donation for the signed-in
// individual (see docs/API_CONTRACTS.md). No payment is processed.
export async function POST(request: Request): Promise<Response> {
  try {
    await connection();
    const user = await getSessionUser();
    if (user && user.type !== "INDIVIDUAL") {
      throw new DonationServiceError(
        "FORBIDDEN",
        "Only individual accounts can donate. NGO accounts receive donations.",
      );
    }
    const body = await readJsonBody(request);
    const donation = await createDonation(user?.id ?? null, body);
    return Response.json({ data: donation }, { status: 201 });
  } catch (error) {
    return donationErrorResponse(error);
  }
}
