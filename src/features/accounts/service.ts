import "server-only";
import { fieldErrorsFromZod, ngoCreateSchema } from "@/features/ngos/validation";
import { createNgo } from "@/features/ngos/service";
import type { NgoPublicProfile } from "@/features/ngos/types";
import { individualCreateSchema } from "@/features/individuals/validation";
import { createMyIndividualProfile } from "@/features/individuals/service";
import type { IndividualProfileView } from "@/features/individuals/types";
import { getAccountRepository } from "./repository";
import { ngoAccountSchema, signInSchema } from "./validation";
import { toSessionAccount, type AccountType, type SessionAccount } from "./types";

export type AccountServiceErrorCode =
  | "VALIDATION_ERROR"
  | "EMAIL_TAKEN"
  | "ACCOUNT_NOT_FOUND"
  | "WRONG_ACCOUNT_TYPE";

export class AccountServiceError extends Error {
  readonly code: AccountServiceErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(code: AccountServiceErrorCode, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "AccountServiceError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

async function ensureEmailAvailable(email: string) {
  const existing = await getAccountRepository().findByEmail(email);
  if (existing) {
    const message =
      existing.type === "NGO"
        ? "This email is already used by an NGO account."
        : "This email is already used by an individual account.";
    throw new AccountServiceError("EMAIL_TAKEN", message, { email: [message] });
  }
}

/** Individual sign-up: creates the individual account and its profile. */
export async function registerIndividual(
  input: unknown,
): Promise<{ account: SessionAccount; profile: IndividualProfileView }> {
  const parsed = individualCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new AccountServiceError(
      "VALIDATION_ERROR",
      "Some information is invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const email = parsed.data.email.toLowerCase();
  await ensureEmailAvailable(email);

  const repo = getAccountRepository();
  const account = await repo.create({ email, type: "INDIVIDUAL", displayName: parsed.data.fullName });
  try {
    const profile = await createMyIndividualProfile(account.id, { ...asRecord(input), email });
    return { account: toSessionAccount(account), profile };
  } catch (error) {
    await repo.delete(account.id);
    throw error;
  }
}

/** NGO onboarding: creates the NGO account and its NGO profile together. */
export async function registerNgo(
  input: unknown,
): Promise<{ account: SessionAccount; ngo: NgoPublicProfile }> {
  const body = asRecord(input);
  const accountResult = ngoAccountSchema.safeParse(body.account);
  const ngoResult = ngoCreateSchema.safeParse(body.ngo);
  if (!accountResult.success || !ngoResult.success) {
    throw new AccountServiceError("VALIDATION_ERROR", "Some information is invalid.", {
      ...(accountResult.success ? {} : fieldErrorsFromZod(accountResult.error)),
      ...(ngoResult.success ? {} : fieldErrorsFromZod(ngoResult.error)),
    });
  }
  await ensureEmailAvailable(accountResult.data.email);

  const repo = getAccountRepository();
  const account = await repo.create({
    email: accountResult.data.email,
    type: "NGO",
    displayName: accountResult.data.representativeName,
  });
  try {
    const ngo = await createNgo(account.id, body.ngo);
    return { account: toSessionAccount(account), ngo };
  } catch (error) {
    await repo.delete(account.id);
    throw error;
  }
}

const SIGN_IN_AS: Record<AccountType, string> = {
  INDIVIDUAL: "an individual",
  NGO: "an NGO",
};

/** TEMPORARY sign-in by email (no password) for the requested account type. */
export async function signIn(input: unknown): Promise<SessionAccount> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    throw new AccountServiceError(
      "VALIDATION_ERROR",
      "Enter a valid email address.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const account = await getAccountRepository().findByEmail(parsed.data.email);
  if (!account) {
    throw new AccountServiceError("ACCOUNT_NOT_FOUND", "No account found with this email.");
  }
  if (account.type !== parsed.data.accountType) {
    throw new AccountServiceError(
      "WRONG_ACCOUNT_TYPE",
      `This email belongs to ${account.type === "NGO" ? "an NGO" : "an individual"} account. Sign in as ${SIGN_IN_AS[account.type]} instead.`,
    );
  }
  return toSessionAccount(account);
}
