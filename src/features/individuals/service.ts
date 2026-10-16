import "server-only";
import { fieldErrorsFromZod } from "@/features/ngos/validation";
import { getIndividualRepository } from "./repository";
import { individualCreateSchema, individualUpdateSchema } from "./validation";
import { toIndividualProfileView, type IndividualProfileView } from "./types";

export type IndividualServiceErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "PROFILE_EXISTS";

export class IndividualServiceError extends Error {
  readonly code: IndividualServiceErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: IndividualServiceErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "IndividualServiceError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function requireUser(userId: string | null): string {
  if (!userId) {
    throw new IndividualServiceError("UNAUTHENTICATED", "You must be signed in.");
  }
  return userId;
}

/** The signed-in user's own profile. There is no way to read someone else's. */
export async function getMyIndividualProfile(
  userId: string | null,
): Promise<IndividualProfileView | null> {
  if (!userId) return null;
  const profile = await getIndividualRepository().findByUserId(userId);
  return profile ? toIndividualProfileView(profile) : null;
}

export async function createMyIndividualProfile(
  userId: string | null,
  input: unknown,
): Promise<IndividualProfileView> {
  const owner = requireUser(userId);

  const parsed = individualCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new IndividualServiceError(
      "VALIDATION_ERROR",
      "The submitted profile is invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const repo = getIndividualRepository();
  if (await repo.findByUserId(owner)) {
    throw new IndividualServiceError("PROFILE_EXISTS", "You already have an individual profile.");
  }

  const data = parsed.data;
  const profile = await repo.create({
    userId: owner,
    fullName: data.fullName,
    email: data.email,
    countryCode: data.countryCode ?? null,
    avatarUrl: data.avatarUrl ?? null,
    bio: data.bio ?? null,
    preferredCauses: data.preferredCauses,
    preferredCountryCodes: data.preferredCountryCodes,
    donateAnonymously: data.donateAnonymously,
    contactConsent: data.contactConsent,
    privacyAcceptedAt: new Date(),
  });
  return toIndividualProfileView(profile);
}

export async function updateMyIndividualProfile(
  userId: string | null,
  input: unknown,
): Promise<IndividualProfileView> {
  const owner = requireUser(userId);

  const repo = getIndividualRepository();
  if (!(await repo.findByUserId(owner))) {
    throw new IndividualServiceError("NOT_FOUND", "You don't have an individual profile yet.");
  }

  const parsed = individualUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new IndividualServiceError(
      "VALIDATION_ERROR",
      "The submitted changes are invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const updated = await repo.update(owner, parsed.data);
  return toIndividualProfileView(updated);
}

export type IndividualCompleteness = { percentage: number; missing: string[] };

export function computeIndividualCompleteness(
  profile: IndividualProfileView,
): IndividualCompleteness {
  const checks: Array<[label: string, done: boolean]> = [
    ["Country of residence", profile.countryCode !== null],
    ["Profile photo", profile.avatarUrl !== null],
    ["A few words about you", profile.bio !== null],
    ["Causes you care about", profile.preferredCauses.length > 0],
    ["Countries you want to support", profile.preferredCountryCodes.length > 0],
  ];
  const missing = checks.filter(([, done]) => !done).map(([label]) => label);
  return {
    percentage: Math.round(((checks.length - missing.length) / checks.length) * 100),
    missing,
  };
}
