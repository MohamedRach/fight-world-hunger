import "server-only";
import { NgoServiceError, type NgoServiceErrorCode } from "./service";

const STATUS_BY_CODE: Record<NgoServiceErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  DUPLICATE_NGO: 409,
};

export function errorResponse(error: unknown): Response {
  if (error instanceof NgoServiceError) {
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
  console.error("Unexpected error in NGO API:", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new NgoServiceError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
}
