import { fieldErrorsFromZod } from "@/features/ngos/validation";
import { topLevelField, type FieldErrors } from "@/features/ngos/onboarding";
import { individualCreateSchema, individualUpdateSchema } from "./validation";
import type { IndividualProfileView } from "./types";

/** Raw form state for individual sign-up and profile editing. */
export type IndividualDraft = {
  fullName: string;
  email: string;
  countryCode: string;
  avatarUrl: string;
  bio: string;
  hungerInterests: string[];
  preferredCountryCodes: string[];
  donateAnonymously: boolean;
  contactConsent: boolean;
  acceptPrivacyPolicy: boolean;
};

export const EMPTY_INDIVIDUAL_DRAFT: IndividualDraft = {
  fullName: "",
  email: "",
  countryCode: "",
  avatarUrl: "",
  bio: "",
  hungerInterests: [],
  preferredCountryCodes: [],
  donateAnonymously: false,
  contactConsent: false,
  acceptPrivacyPolicy: false,
};

export type IndividualSectionId = "about" | "interests" | "privacy";

export type IndividualSection = {
  id: IndividualSectionId;
  label: string;
  title: string;
  description: string;
  fields: readonly (keyof IndividualDraft)[];
};

const INTERESTS: IndividualSection = {
  id: "interests",
  label: "Interests",
  title: "What you care about",
  description: "We'll use this to suggest organizations that match your interests.",
  fields: ["hungerInterests", "preferredCountryCodes"],
};

const PRIVACY: IndividualSection = {
  id: "privacy",
  label: "Privacy",
  title: "Privacy and communication",
  description: "You stay in control of how you appear and who can contact you.",
  fields: ["donateAnonymously", "contactConsent", "acceptPrivacyPolicy"],
};

/** Individual sign-up steps (the email identifies the new account). */
export const SIGNUP_SECTIONS: readonly IndividualSection[] = [
  {
    id: "about",
    label: "About you",
    title: "About you",
    description: "The basics. Your profile is private — NGOs can't browse it.",
    fields: ["fullName", "email", "countryCode", "avatarUrl", "bio"],
  },
  INTERESTS,
  PRIVACY,
];

/** Sections of the edit form (the account email isn't editable). */
export const INDIVIDUAL_SECTIONS: readonly IndividualSection[] = [
  {
    id: "about",
    label: "About you",
    title: "About you",
    description: "The basics. Your profile is private — NGOs can't browse it.",
    fields: ["fullName", "countryCode", "avatarUrl", "bio"],
  },
  INTERESTS,
  PRIVACY,
];

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function profilePayload(draft: IndividualDraft) {
  return {
    fullName: draft.fullName.trim(),
    countryCode: optional(draft.countryCode),
    avatarUrl: optional(draft.avatarUrl),
    bio: optional(draft.bio),
    hungerInterests: draft.hungerInterests,
    preferredCountryCodes: draft.preferredCountryCodes,
    donateAnonymously: draft.donateAnonymously,
    contactConsent: draft.contactConsent,
  };
}

/** Body for POST /api/accounts/individual. */
export function draftToSignupPayload(draft: IndividualDraft): Record<string, unknown> {
  return {
    ...profilePayload(draft),
    email: draft.email.trim(),
    acceptPrivacyPolicy: draft.acceptPrivacyPolicy,
  };
}

/** Body for PATCH /api/me/individual-profile. Cleared optional fields become null. */
export function draftToUpdatePayload(draft: IndividualDraft): Record<string, unknown> {
  const payload = profilePayload(draft);
  return {
    ...payload,
    countryCode: payload.countryCode ?? null,
    avatarUrl: payload.avatarUrl ?? null,
    bio: payload.bio ?? null,
  };
}

/**
 * The onboarding form asks for at least one world hunger interest, even
 * though the stored schema tolerates an empty list: without interests the
 * donor gets no personalised recommendations, which is the point of the
 * product.
 */
function requireHungerInterests(draft: IndividualDraft, errors: FieldErrors): FieldErrors {
  if (draft.hungerInterests.length > 0) return errors;
  return {
    ...errors,
    hungerInterests: ["Select at least one world hunger issue you care about"],
  };
}

export function validateSignupDraft(draft: IndividualDraft): FieldErrors {
  const result = individualCreateSchema.safeParse(draftToSignupPayload(draft));
  return requireHungerInterests(draft, result.success ? {} : fieldErrorsFromZod(result.error));
}

export function validateUpdateDraft(draft: IndividualDraft): FieldErrors {
  const result = individualUpdateSchema.safeParse(draftToUpdatePayload(draft));
  return requireHungerInterests(draft, result.success ? {} : fieldErrorsFromZod(result.error));
}

export function errorsForSection(
  errors: FieldErrors,
  sections: readonly IndividualSection[],
  index: number,
): FieldErrors {
  const fields = new Set<string>(sections[index]?.fields ?? []);
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => fields.has(topLevelField(key))),
  );
}

export function firstSectionWithErrors(
  errors: FieldErrors,
  sections: readonly IndividualSection[],
): number {
  return sections.findIndex(
    (_, index) => Object.keys(errorsForSection(errors, sections, index)).length > 0,
  );
}

export function profileToDraft(profile: IndividualProfileView): IndividualDraft {
  return {
    fullName: profile.fullName,
    email: profile.email,
    countryCode: profile.countryCode ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    bio: profile.bio ?? "",
    hungerInterests: profile.hungerInterests,
    preferredCountryCodes: profile.preferredCountryCodes,
    donateAnonymously: profile.donateAnonymously,
    contactConsent: profile.contactConsent,
    acceptPrivacyPolicy: true,
  };
}
