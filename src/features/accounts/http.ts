import "server-only";
import { AccountServiceError, type AccountServiceErrorCode } from "./service";
import { NgoServiceError } from "@/features/ngos/service";
import { errorResponse as ngoErrorResponse } from "@/features/ngos/http";
import { IndividualServiceError } from "@/features/individuals/service";
import { individualErrorResponse } from "@/features/individuals/http";

const STATUS_BY_CODE: Record<AccountServiceErrorCode, number> = {
  VALIDATION_ERROR: 400,
  WRONG_ACCOUNT_TYPE: 403,
  ACCOUNT_NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
};

export function accountErrorResponse(error: unknown): Response {
  if (error instanceof AccountServiceError) {
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
  if (error instanceof NgoServiceError) return ngoErrorResponse(error);
  if (error instanceof IndividualServiceError) return individualErrorResponse(error);
  console.error("Unexpected error in accounts API:", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AccountServiceError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
}
