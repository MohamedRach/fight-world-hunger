import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import {
  addMyPaymentMethod,
  getMyPaymentMethods,
  PaymentServiceError,
} from "@/features/payments/service";
import { paymentErrorResponse, readJsonBody } from "@/features/payments/http";

/**
 * The signed-in individual's MOCK cards (see docs/API_CONTRACTS.md).
 * Only display metadata is accepted and returned — never a full card number
 * or CVV. There is deliberately no endpoint to read another person's cards.
 */

function requireIndividual(user: { id: string; type: string } | null): string {
  if (!user) throw new PaymentServiceError("UNAUTHENTICATED", "You must be signed in.");
  if (user.type !== "INDIVIDUAL") {
    throw new PaymentServiceError(
      "FORBIDDEN",
      "Saved cards belong to individual accounts.",
    );
  }
  return user.id;
}

export async function GET(): Promise<Response> {
  try {
    // Per-user data: never prerender this handler at build time.
    await connection();
    const userId = requireIndividual(await getSessionUser());
    return Response.json({ data: await getMyPaymentMethods(userId) });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    await connection();
    const userId = requireIndividual(await getSessionUser());
    const body = await readJsonBody(request);
    const method = await addMyPaymentMethod(userId, body);
    return Response.json({ data: method }, { status: 201 });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}
