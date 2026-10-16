import { registerIndividual } from "@/features/accounts/service";
import { startSession } from "@/features/accounts/session";
import { accountErrorResponse, readJson } from "@/features/accounts/http";

// POST /api/accounts/individual — create an individual account + profile, and sign in.
export async function POST(request: Request) {
  try {
    const { account, profile } = await registerIndividual(await readJson(request));
    await startSession(account.id);
    return Response.json({ data: { account, profile } }, { status: 201 });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
