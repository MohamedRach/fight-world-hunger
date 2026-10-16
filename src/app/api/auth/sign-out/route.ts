import { endSession } from "@/features/accounts/session";

// POST /api/auth/sign-out
export async function POST() {
  await endSession();
  return new Response(null, { status: 204 });
}
