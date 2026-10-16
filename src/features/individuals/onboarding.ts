import { fieldErrorsFromZod } from "@/features/ngos/validation";
import { topLevelField, type FieldErrors } from "@/features/ngos/onboarding";
import { individualCreateSchema, individualUpdateSchema } from "./validation";
import type { IndividualProfileView } from "./types";

/** Raw form state for the individual profile (wizard and edit form). */
export type IndividualDraft = {
  fullName: string;
  email: string;
  countryCode: string;
  avatarUrl: string;
  bio: string;
  preferredCauses: string[];
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
  preferredCauses: [],
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

export const INDIVIDUAL_SECTIONS: readonly IndividualSection[] = [
  {
    id: "about",
    label: "About you",
    title: "About you",
    description: "The basics. Your profile is private — NGOs can't browse it.",
    fields: ["fullName", "email", "countryCode", "avatarUrl", "bio"],
  },
  {
    id: "interests",
    label: "Interests",
    title: "What you care about",
    description: "We'll use this to suggest organizations that match your interests.",
    fields: ["preferredCauses", "preferredCountryCodes"],
  },
  {
    id: "privacy",
    label: "Privacy",
    title: "Privacy and communication",
    description: "You stay in control of how you appear and who can contact you.",
    fields: ["donateAnonymously", "contactConsent", "acceptPrivacyPolicy"],
  },
];

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function commonPayload(draft: IndividualDraft) {
  return {
    fullName: draft.fullName.trim(),
    email: draft.email.trim(),
    countryCode: optional(draft.countryCode),
    avatarUrl: optional(draft.avatarUrl),
    bio: optional(draft.bio),
    preferredCauses: draft.preferredCauses,
    preferredCountryCodes: draft.preferredCountryCodes,
    donateAnonymously: draft.donateAnonymously,
    contactConsent: draft.contactConsent,
  };
}

/** Body for POST /api/me/individual-profile. */
export function draftToCreatePayload(draft: IndividualDraft): Record<string, unknown> {
  return { ...commonPayload(draft), acceptPrivacyPolicy: draft.acceptPrivacyPolicy };
}

/** Body for PATCH /api/me/individual-profile. Cleared optional fields become null. */
export function draftToUpdatePayload(draft: IndividualDraft): Record<string, unknown> {
  const payload = commonPayload(draft);
  return {
    ...payload,
    countryCode: payload.countryCode ?? null,
    avatarUrl: payload.avatarUrl ?? null,
    bio: payload.bio ?? null,
  };
}

export function validateCreateDraft(draft: IndividualDraft): FieldErrors {
  const result = individualCreateSchema.safeParse(draftToCreatePayload(draft));
  return result.success ? {} : fieldErrorsFromZod(result.error);
}

export function validateUpdateDraft(draft: IndividualDraft): FieldErrors {
  const result = individualUpdateSchema.safeParse(draftToUpdatePayload(draft));
  return result.success ? {} : fieldErrorsFromZod(result.error);
}

export function errorsForSection(errors: FieldErrors, sectionIndex: number): FieldErrors {
  const fields = new Set<string>(INDIVIDUAL_SECTIONS[sectionIndex]?.fields ?? []);
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => fields.has(topLevelField(key))),
  );
}

export function firstSectionWithErrors(errors: FieldErrors): number {
  return INDIVIDUAL_SECTIONS.findIndex(
    (_, index) => Object.keys(errorsForSection(errors, index)).length > 0,
  );
}

export function profileToDraft(profile: IndividualProfileView): IndividualDraft {
  return {
    fullName: profile.fullName,
    email: profile.email,
    countryCode: profile.countryCode ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    bio: profile.bio ?? "",
    preferredCauses: profile.preferredCauses,
    preferredCountryCodes: profile.preferredCountryCodes,
    donateAnonymously: profile.donateAnonymously,
    contactConsent: profile.contactConsent,
    acceptPrivacyPolicy: true,
  };
}
