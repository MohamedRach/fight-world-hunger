import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import {
  removeMyPaymentMethod,
  setMyDefaultPaymentMethod,
  PaymentServiceError,
} from "@/features/payments/service";
import { paymentErrorResponse, readJsonBody } from "@/features/payments/http";
import { paymentMethodUpdateSchema } from "@/features/payments/validation";

interface RouteContext {
  params: Promise<{ paymentMethodId: string }>;
}

function requireIndividual(user: { id: string; type: string } | null): string {
  if (!user) throw new PaymentServiceError("UNAUTHENTICATED", "You must be signed in.");
  if (user.type !== "INDIVIDUAL") {
    throw new PaymentServiceError("FORBIDDEN", "Saved cards belong to individual accounts.");
  }
  return user.id;
}

// PATCH — make this mock card the default.
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    await connection();
    const userId = requireIndividual(await getSessionUser());
    const { paymentMethodId } = await context.params;

    const parsed = paymentMethodUpdateSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new PaymentServiceError(
        "VALIDATION_ERROR",
        "Only the default flag can be changed on a saved card.",
      );
    }

    return Response.json({ data: await setMyDefaultPaymentMethod(userId, paymentMethodId) });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

// DELETE — remove a mock card from the wallet.
export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  try {
    await connection();
    const userId = requireIndividual(await getSessionUser());
    const { paymentMethodId } = await context.params;
    return Response.json({ data: await removeMyPaymentMethod(userId, paymentMethodId) });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}
