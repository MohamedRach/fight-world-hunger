import { z } from "zod";
import { HUNGER_ISSUE_IDS } from "@/features/hunger-issues/catalog";
import { NGO_CAUSES } from "./types";
import { isCountryCode } from "./countries";

const CURRENT_YEAR = new Date().getFullYear();

const urlSchema = z.url("Must be a valid URL (including https://)").max(2048);

const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isCountryCode, "Select a valid country");

const causeSchema = z.enum(NGO_CAUSES, { error: "Select a cause" });

export const socialLinksSchema = z.strictObject({
  twitter: urlSchema.optional(),
  facebook: urlSchema.optional(),
  instagram: urlSchema.optional(),
  linkedin: urlSchema.optional(),
});

const ngoBaseSchema = z.strictObject({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  hungerFocusAreas: z
    .array(z.enum(HUNGER_ISSUE_IDS, { error: "Select a valid world hunger issue" }))
    .max(HUNGER_ISSUE_IDS.length)
    .transform((values) => [...new Set(values)]),
  hungerMission: z
    .string()
    .trim()
    .min(10, "Describe how you tackle hunger in at least 10 characters")
    .max(2000)
    .nullish(),
  logoUrl: urlSchema.nullish(),
  shortDescription: z
    .string()
    .trim()
    .min(10, "Short description must be at least 10 characters")
    .max(280, "Short description must be at most 280 characters"),
  mission: z
    .string()
    .trim()
    .min(10, "Mission must be at least 10 characters")
    .max(2000),
  activitiesDescription: z.string().trim().max(5000).nullish(),
  targetBeneficiaries: z.string().trim().max(1000).nullish(),
  yearFounded: z
    .number({ error: "Enter a valid year, e.g. 2010" })
    .int("Year founded must be a whole number")
    .min(1800, "Year founded must be 1800 or later")
    .max(CURRENT_YEAR, "Year founded cannot be in the future")
    .nullish(),
  registrationId: z.string().trim().min(2).max(100).nullish(),
  website: urlSchema.nullish(),
  contactEmail: z.email("Must be a valid email").nullish(),
  contactPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ().-]{6,25}$/, "Must be a valid phone number")
    .nullish(),
  socialLinks: socialLinksSchema.nullish(),
  primaryCause: causeSchema,
  otherCauses: z.array(causeSchema).max(NGO_CAUSES.length),
  hqCountryCode: countryCodeSchema,
  hqCity: z.string().trim().max(120).nullish(),
  operatingCountryCodes: z
    .array(countryCodeSchema)
    .min(1, "Select at least one country of operation"),
  projectsSummary: z.string().trim().max(5000).nullish(),
  impactSummary: z.string().trim().max(5000).nullish(),
  keyAchievements: z.array(z.string().trim().min(1).max(300)).max(20),
});

type NgoBaseValues = Partial<z.infer<typeof ngoBaseSchema>>;

function addCrossFieldIssues(value: NgoBaseValues, ctx: z.RefinementCtx) {
  if (
    value.primaryCause !== undefined &&
    value.otherCauses !== undefined &&
    value.otherCauses.includes(value.primaryCause)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["otherCauses"],
      message: "Other causes must not repeat the primary cause",
    });
  }
  if (
    value.operatingCountryCodes !== undefined &&
    new Set(value.operatingCountryCodes).size !== value.operatingCountryCodes.length
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["operatingCountryCodes"],
      message: "Countries of operation must not contain duplicates",
    });
  }
}

// Defaults live only on the create schema: zod applies defaults even inside
// `.partial()`, which would make a PATCH that omits these fields wipe them.
export const ngoCreateSchema = ngoBaseSchema
  .extend({
    otherCauses: ngoBaseSchema.shape.otherCauses.default([]),
    keyAchievements: ngoBaseSchema.shape.keyAchievements.default([]),
    // Defaults to empty so existing callers stay valid; the onboarding form
    // asks for at least one (see `requireHungerFocusAreas` in ./onboarding.ts).
    hungerFocusAreas: ngoBaseSchema.shape.hungerFocusAreas.default([]),
  })
  .superRefine(addCrossFieldIssues);

export const ngoUpdateSchema = ngoBaseSchema.partial().superRefine(addCrossFieldIssues);

export type NgoCreateInput = z.infer<typeof ngoCreateSchema>;
export type NgoUpdateInput = z.infer<typeof ngoUpdateSchema>;

export function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
