import { createNgo } from "@/features/ngos/service";
import { getSessionUser } from "@/features/ngos/session";
import { errorResponse, readJsonBody } from "@/features/ngos/http";

// POST /api/ngos — create an NGO profile (see docs/API_CONTRACTS.md)
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await readJsonBody(request);
    const profile = await createNgo(user?.id ?? null, body);
    return Response.json({ data: profile }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
