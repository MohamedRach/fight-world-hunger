import "server-only";
import { IndividualServiceError, type IndividualServiceErrorCode } from "./service";

const STATUS_BY_CODE: Record<IndividualServiceErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  PROFILE_EXISTS: 409,
};

export function individualErrorResponse(error: unknown): Response {
  if (error instanceof IndividualServiceError) {
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
  console.error("Unexpected error in individual profile API:", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new IndividualServiceError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
}
