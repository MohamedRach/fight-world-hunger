import { getManagedNgos, NgoServiceError } from "@/features/ngos/service";
import { getSessionUser } from "@/features/ngos/session";
import { errorResponse } from "@/features/ngos/http";

// GET /api/me/ngos — NGOs the signed-in user manages (see docs/API_CONTRACTS.md)
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) throw new NgoServiceError("UNAUTHENTICATED", "You must be signed in.");
    const ngos = await getManagedNgos(user.id);
    return Response.json({
      data: ngos.map((ngo) => ({ id: ngo.id, name: ngo.name, slug: ngo.slug })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
