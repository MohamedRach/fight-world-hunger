import "server-only";
import { PaymentServiceError, type PaymentServiceErrorCode } from "./service";

const STATUS_BY_CODE: Record<PaymentServiceErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  LIMIT_REACHED: 409,
};

export function paymentErrorResponse(error: unknown): Response {
  if (error instanceof PaymentServiceError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        },
      },
      { status: STATUS_BY_CODE[error.code] },
    );
  }
  console.error("Unexpected error in payment method API:", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new PaymentServiceError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
}
