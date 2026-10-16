import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import {
  getMyIndividualProfile,
  IndividualServiceError,
  updateMyIndividualProfile,
} from "@/features/individuals/service";
import { individualErrorResponse, readJsonBody } from "@/features/individuals/http";

// The signed-in individual's own profile (see docs/API_CONTRACTS.md).
// Profiles are created with the account: POST /api/accounts/individual.
// There is deliberately no endpoint to read another person's profile.

export async function GET() {
  try {
    // Per-user data: never prerender this handler at build time.
    await connection();
    const user = await getSessionUser();
    if (!user) throw new IndividualServiceError("UNAUTHENTICATED", "You must be signed in.");
    const profile = user.type === "INDIVIDUAL" ? await getMyIndividualProfile(user.id) : null;
    if (!profile) {
      throw new IndividualServiceError("NOT_FOUND", "This account has no individual profile.");
    }
    return Response.json({ data: profile });
  } catch (error) {
    return individualErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await readJsonBody(request);
    const userId = user?.type === "INDIVIDUAL" ? user.id : null;
    if (user && !userId) {
      throw new IndividualServiceError("NOT_FOUND", "This account has no individual profile.");
    }
    const profile = await updateMyIndividualProfile(userId, body);
    return Response.json({ data: profile });
  } catch (error) {
    return individualErrorResponse(error);
  }
}
