import { registerNgo } from "@/features/accounts/service";
import { startSession } from "@/features/accounts/session";
import { accountErrorResponse, readJson } from "@/features/accounts/http";

// POST /api/accounts/ngo — create an NGO account + its first NGO profile, and sign in.
export async function POST(request: Request) {
  try {
    const { account, ngo } = await registerNgo(await readJson(request));
    await startSession(account.id);
    return Response.json({ data: { account, ngo } }, { status: 201 });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
