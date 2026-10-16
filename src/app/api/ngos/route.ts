import { createNgo, NgoServiceError } from "@/features/ngos/service";
import { getSessionUser } from "@/features/ngos/session";
import { errorResponse, readJsonBody } from "@/features/ngos/http";

// POST /api/ngos — an NGO account registers an additional NGO (see docs/API_CONTRACTS.md).
// First-time NGO registration goes through POST /api/accounts/ngo.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (user && user.type !== "NGO") {
      throw new NgoServiceError(
        "FORBIDDEN",
        "Only NGO accounts can register organizations. Individual accounts can't.",
      );
    }
    const body = await readJsonBody(request);
    const profile = await createNgo(user?.id ?? null, body);
    return Response.json({ data: profile }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
