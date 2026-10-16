import { getPublicNgoProfile, updateNgo, NgoServiceError } from "@/features/ngos/service";
import { getSessionUser } from "@/features/ngos/session";
import { errorResponse, readJsonBody } from "@/features/ngos/http";

// GET /api/ngos/:ngoId — public NGO profile (see docs/API_CONTRACTS.md)
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/ngos/[ngoId]">,
) {
  try {
    const { ngoId } = await ctx.params;
    const profile = await getPublicNgoProfile(ngoId);
    if (!profile) {
      throw new NgoServiceError("NOT_FOUND", "NGO not found.");
    }
    return Response.json({ data: profile });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/ngos/:ngoId — update an NGO profile (owner/editor only)
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/ngos/[ngoId]">,
) {
  try {
    const { ngoId } = await ctx.params;
    const user = await getSessionUser();
    const body = await readJsonBody(request);
    const profile = await updateNgo(user?.id ?? null, ngoId, body);
    return Response.json({ data: profile });
  } catch (error) {
    return errorResponse(error);
  }
}
