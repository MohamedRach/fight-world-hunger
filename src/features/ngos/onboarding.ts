import {
  fieldErrorsFromZod,
  ngoCreateSchema,
  type NgoCreateInput,
} from "./validation";

/**
 * NGO onboarding wizard logic. Client-safe (no server imports) and built on
 * the same `ngoCreateSchema` used by POST /api/ngos, so the wizard and the
 * API can never disagree on validation rules.
 */

export type FieldErrors = Record<string, string[]>;

export const SOCIAL_KEYS = ["twitter", "facebook", "instagram", "linkedin"] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export const SOCIAL_LABELS: Record<SocialKey, string> = {
  twitter: "Twitter / X",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

/** Raw form state: every input is kept as typed (strings / string arrays). */
export type OnboardingDraft = {
  name: string;
  logoUrl: string;
  yearFounded: string;
  registrationId: string;
  shortDescription: string;
  mission: string;
  hungerMission: string;
  hungerFocusAreas: string[];
  hqCountryCode: string;
  hqCity: string;
  operatingCountryCodes: string[];
  primaryCause: string;
  otherCauses: string[];
  activitiesDescription: string;
  targetBeneficiaries: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  socialLinks: Record<SocialKey, string>;
  projectsSummary: string;
  impactSummary: string;
  /** One achievement per line. */
  keyAchievements: string;
};

export const EMPTY_DRAFT: OnboardingDraft = {
  name: "",
  logoUrl: "",
  yearFounded: "",
  registrationId: "",
  shortDescription: "",
  mission: "",
  hungerMission: "",
  hungerFocusAreas: [],
  hqCountryCode: "",
  hqCity: "",
  operatingCountryCodes: [],
  primaryCause: "",
  otherCauses: [],
  activitiesDescription: "",
  targetBeneficiaries: "",
  website: "",
  contactEmail: "",
  contactPhone: "",
  socialLinks: { twitter: "", facebook: "", instagram: "", linkedin: "" },
  projectsSummary: "",
  impactSummary: "",
  keyAchievements: "",
};

export type OnboardingStep = {
  id: "identity" | "geography" | "causes" | "contact" | "impact";
  /** Short label for the progress indicator. */
  label: string;
  title: string;
  description: string;
  fields: readonly (keyof NgoCreateInput)[];
};

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "identity",
    label: "Identity",
    title: "Organization identity",
    description: "Tell donors who you are and what drives your organization.",
    fields: ["name", "logoUrl", "yearFounded", "registrationId", "shortDescription", "mission"],
  },
  {
    id: "geography",
    label: "Geography",
    title: "Where you work",
    description: "Your headquarters and every country where you run activities.",
    fields: ["hqCountryCode", "hqCity", "operatingCountryCodes"],
  },
  {
    id: "causes",
    label: "Causes",
    title: "Areas of intervention",
    description: "The causes you address and the people you serve.",
    fields: ["hungerFocusAreas", "hungerMission", "primaryCause", "otherCauses", "activitiesDescription", "targetBeneficiaries"],
  },
  {
    id: "contact",
    label: "Contact",
    title: "Contact and links",
    description: "Public channels donors can use to learn more or reach you.",
    fields: ["website", "contactEmail", "contactPhone", "socialLinks"],
  },
  {
    id: "impact",
    label: "Impact",
    title: "Impact and transparency",
    description: "Your projects and results. Only share information you can substantiate.",
    fields: ["projectsSummary", "impactSummary", "keyAchievements"],
  },
];

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Converts the wizard draft into the POST /api/ngos request body. */
export function draftToPayload(draft: OnboardingDraft): Record<string, unknown> {
  const socialLinks: Partial<Record<SocialKey, string>> = {};
  for (const key of SOCIAL_KEYS) {
    const url = optional(draft.socialLinks[key]);
    if (url) socialLinks[key] = url;
  }
  const year = optional(draft.yearFounded);

  return {
    name: draft.name.trim(),
    logoUrl: optional(draft.logoUrl),
    shortDescription: draft.shortDescription.trim(),
    mission: draft.mission.trim(),
    hungerMission: optional(draft.hungerMission),
    hungerFocusAreas: draft.hungerFocusAreas,
    activitiesDescription: optional(draft.activitiesDescription),
    targetBeneficiaries: optional(draft.targetBeneficiaries),
    yearFounded: year === undefined ? undefined : Number(year),
    registrationId: optional(draft.registrationId),
    website: optional(draft.website),
    contactEmail: optional(draft.contactEmail),
    contactPhone: optional(draft.contactPhone),
    socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    primaryCause: draft.primaryCause,
    otherCauses: draft.otherCauses,
    hqCountryCode: draft.hqCountryCode,
    hqCity: optional(draft.hqCity),
    operatingCountryCodes: draft.operatingCountryCodes,
    projectsSummary: optional(draft.projectsSummary),
    impactSummary: optional(draft.impactSummary),
    keyAchievements: draft.keyAchievements
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

export function validateDraft(draft: OnboardingDraft): FieldErrors {
  const result = ngoCreateSchema.safeParse(draftToPayload(draft));
  const errors = result.success ? {} : fieldErrorsFromZod(result.error);

  // The form asks for at least one focus area even though the stored schema
  // tolerates an empty list: it is what donors are matched against.
  if (draft.hungerFocusAreas.length === 0) {
    return {
      ...errors,
      hungerFocusAreas: ["Select at least one world hunger issue your organization works on"],
    };
  }
  return errors;
}

/** `operatingCountryCodes.0` → `operatingCountryCodes`. */
export function topLevelField(errorKey: string): string {
  return errorKey.split(".")[0];
}

/** Errors that belong to the fields of one step (index into ONBOARDING_STEPS). */
export function errorsForStep(errors: FieldErrors, stepIndex: number): FieldErrors {
  const fields = new Set<string>(ONBOARDING_STEPS[stepIndex]?.fields ?? []);
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => fields.has(topLevelField(key))),
  );
}

/** Index of the first step containing an error, or -1. */
export function firstStepWithErrors(errors: FieldErrors): number {
  return ONBOARDING_STEPS.findIndex(
    (_, index) => Object.keys(errorsForStep(errors, index)).length > 0,
  );
}

/** First error message for a field, including nested keys (e.g. array items). */
export function errorFor(errors: FieldErrors, field: string): string | undefined {
  if (errors[field]?.length) return errors[field][0];
  const nestedKey = Object.keys(errors).find((key) => key.startsWith(`${field}.`));
  return nestedKey ? errors[nestedKey][0] : undefined;
}

/** Rebuilds a draft from untrusted storage, dropping anything malformed. */
export function sanitizeDraft(value: unknown): OnboardingDraft {
  const source =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const text = (key: string): string =>
    typeof source[key] === "string" ? (source[key] as string) : "";
  const list = (key: string): string[] =>
    Array.isArray(source[key])
      ? (source[key] as unknown[]).filter((item): item is string => typeof item === "string")
      : [];
  const socialSource =
    typeof source.socialLinks === "object" && source.socialLinks !== null
      ? (source.socialLinks as Record<string, unknown>)
      : {};
  const socialLinks = Object.fromEntries(
    SOCIAL_KEYS.map((key) => [
      key,
      typeof socialSource[key] === "string" ? (socialSource[key] as string) : "",
    ]),
  ) as Record<SocialKey, string>;

  return {
    name: text("name"),
    logoUrl: text("logoUrl"),
    yearFounded: text("yearFounded"),
    registrationId: text("registrationId"),
    shortDescription: text("shortDescription"),
    mission: text("mission"),
    hungerMission: text("hungerMission"),
    hungerFocusAreas: list("hungerFocusAreas"),
    hqCountryCode: text("hqCountryCode"),
    hqCity: text("hqCity"),
    operatingCountryCodes: list("operatingCountryCodes"),
    primaryCause: text("primaryCause"),
    otherCauses: list("otherCauses"),
    activitiesDescription: text("activitiesDescription"),
    targetBeneficiaries: text("targetBeneficiaries"),
    website: text("website"),
    contactEmail: text("contactEmail"),
    contactPhone: text("contactPhone"),
    socialLinks,
    projectsSummary: text("projectsSummary"),
    impactSummary: text("impactSummary"),
    keyAchievements: text("keyAchievements"),
  };
}
