import "server-only";
import { DonationServiceError, type DonationServiceErrorCode } from "./service";

const STATUS_BY_CODE: Record<DonationServiceErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CAMPAIGN_CLOSED: 409,
  INVALID_TRANSITION: 409,
};

export function donationErrorResponse(error: unknown): Response {
  if (error instanceof DonationServiceError) {
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
  console.error("Unexpected error in donation API:", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new DonationServiceError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
}
