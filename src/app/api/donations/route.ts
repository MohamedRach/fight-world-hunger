import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { createDonation, listDonations } from "@/features/donations/service";
import { donationErrorResponse, readJsonBody } from "@/features/donations/http";

// Donations (see docs/API_CONTRACTS.md).

// GET /api/donations — the donor's own donations, or (NGO accounts, with
// ?ngoId=) the donations an NGO they manage has received.
export async function GET(request: Request) {
  try {
    // Per-user data: never prerender this handler at build time.
    await connection();
    const user = await getSessionUser();
    const query = Object.fromEntries(new URL(request.url).searchParams);
    const { items, total, limit, offset } = await listDonations(user, query);
    return Response.json({ data: items, meta: { total, limit, offset } });
  } catch (error) {
    return donationErrorResponse(error);
  }
}

// POST /api/donations — an individual pledges a donation to an NGO.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await readJsonBody(request);
    const donation = await createDonation(user, body);
    return Response.json({ data: donation }, { status: 201 });
  } catch (error) {
    return donationErrorResponse(error);
  }
}
