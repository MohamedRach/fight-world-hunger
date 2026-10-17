import "server-only";
import { fieldErrorsFromZod } from "@/features/ngos/validation";
import { ensureMockDataSeeded } from "@/mocks/seed";
import { getPaymentMethodRepository } from "./repository";
import { paymentMethodCreateSchema } from "./validation";
import { toPaymentMethodView, type PaymentMethod, type PaymentMethodView } from "./types";

export type PaymentServiceErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "LIMIT_REACHED";

export class PaymentServiceError extends Error {
  readonly code: PaymentServiceErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: PaymentServiceErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "PaymentServiceError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Keeps the mock wallet small; also stops runaway submits creating hundreds. */
const MAX_METHODS_PER_USER = 8;

function requireUser(userId: string | null): string {
  if (!userId) {
    throw new PaymentServiceError("UNAUTHENTICATED", "You must be signed in.");
  }
  return userId;
}

/** The signed-in individual's own mock cards. There is no way to read another's. */
export async function getMyPaymentMethods(userId: string | null): Promise<PaymentMethodView[]> {
  if (!userId) return [];
  await ensureMockDataSeeded();
  const methods = await getPaymentMethodRepository().findByOwner(userId);
  return methods.map((method) => toPaymentMethodView(method));
}

export async function addMyPaymentMethod(
  userId: string | null,
  input: unknown,
): Promise<PaymentMethodView> {
  const owner = requireUser(userId);
  await ensureMockDataSeeded();

  const parsed = paymentMethodCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new PaymentServiceError(
      "VALIDATION_ERROR",
      "The submitted card details are invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const data = parsed.data;

  const repo = getPaymentMethodRepository();
  const existing = await repo.findByOwner(owner);
  if (existing.length >= MAX_METHODS_PER_USER) {
    throw new PaymentServiceError(
      "LIMIT_REACHED",
      `You can save up to ${MAX_METHODS_PER_USER} mock cards. Remove one first.`,
    );
  }

  // The first card is always the default; otherwise honour the checkbox.
  const shouldBeDefault = existing.length === 0 || data.makeDefault;

  const created = await repo.create({
    ownerUserId: owner,
    brand: data.brand,
    last4: data.last4,
    holderName: data.holderName,
    expMonth: data.expMonth,
    expYear: data.expYear,
    label: data.label,
    isDefault: shouldBeDefault,
    isDemoSeed: false,
  });
  if (shouldBeDefault) await repo.setDefault(owner, created.id);

  return toPaymentMethodView({ ...created, isDefault: shouldBeDefault });
}

async function requireOwnedMethod(
  userId: string,
  paymentMethodId: string,
): Promise<PaymentMethod> {
  const method = await getPaymentMethodRepository().findById(paymentMethodId);
  if (!method) throw new PaymentServiceError("NOT_FOUND", "That card is not saved on your account.");
  if (method.ownerUserId !== userId) {
    // Do not reveal that the card exists on another account.
    throw new PaymentServiceError("NOT_FOUND", "That card is not saved on your account.");
  }
  return method;
}

export async function setMyDefaultPaymentMethod(
  userId: string | null,
  paymentMethodId: string,
): Promise<PaymentMethodView[]> {
  const owner = requireUser(userId);
  const method = await requireOwnedMethod(owner, paymentMethodId);
  await getPaymentMethodRepository().setDefault(owner, method.id);
  return getMyPaymentMethods(owner);
}

export async function removeMyPaymentMethod(
  userId: string | null,
  paymentMethodId: string,
): Promise<PaymentMethodView[]> {
  const owner = requireUser(userId);
  const method = await requireOwnedMethod(owner, paymentMethodId);

  const repo = getPaymentMethodRepository();
  await repo.delete(method.id);

  // Promote another card so the donor always has a usable default.
  if (method.isDefault) {
    const remaining = await repo.findByOwner(owner);
    if (remaining[0]) await repo.setDefault(owner, remaining[0].id);
  }
  return getMyPaymentMethods(owner);
}

/** Used by the donation flow to check the card belongs to the donor. */
export async function findDonorPaymentMethod(
  userId: string,
  paymentMethodId: string,
): Promise<PaymentMethod | null> {
  const method = await getPaymentMethodRepository().findById(paymentMethodId);
  return method && method.ownerUserId === userId ? method : null;
}
