import { signIn } from "@/features/accounts/service";
import { startSession } from "@/features/accounts/session";
import { accountErrorResponse, readJson } from "@/features/accounts/http";

// POST /api/auth/sign-in — { email, accountType: "INDIVIDUAL" | "NGO" } (temporary: no password)
export async function POST(request: Request) {
  try {
    const account = await signIn(await readJson(request));
    await startSession(account.id);
    return Response.json({ data: { account } });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
