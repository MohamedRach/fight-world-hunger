import { getSessionUser } from "@/features/ngos/session";
import {
  createMyIndividualProfile,
  getMyIndividualProfile,
  IndividualServiceError,
  updateMyIndividualProfile,
} from "@/features/individuals/service";
import { individualErrorResponse, readJsonBody } from "@/features/individuals/http";

// The signed-in user's own individual profile (see docs/API_CONTRACTS.md).
// There is deliberately no endpoint to read another person's profile.

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) throw new IndividualServiceError("UNAUTHENTICATED", "You must be signed in.");
    const profile = await getMyIndividualProfile(user.id);
    if (!profile) {
      throw new IndividualServiceError("NOT_FOUND", "You don't have an individual profile yet.");
    }
    return Response.json({ data: profile });
  } catch (error) {
    return individualErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await readJsonBody(request);
    const profile = await createMyIndividualProfile(user?.id ?? null, body);
    return Response.json({ data: profile }, { status: 201 });
  } catch (error) {
    return individualErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await readJsonBody(request);
    const profile = await updateMyIndividualProfile(user?.id ?? null, body);
    return Response.json({ data: profile });
  } catch (error) {
    return individualErrorResponse(error);
  }
}
