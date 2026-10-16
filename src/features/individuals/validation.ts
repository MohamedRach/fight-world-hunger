import { z } from "zod";
import { NGO_CAUSES } from "@/features/ngos/types";
import { isCountryCode } from "@/features/ngos/countries";

const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isCountryCode, "Select a valid country");

const unique = <T>(values: T[]) => [...new Set(values)];

const individualBaseSchema = z.strictObject({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.email("Enter a valid email address").max(254),
  countryCode: countryCodeSchema.nullish(),
  avatarUrl: z.url("Must be a valid URL (including https://)").max(2048).nullish(),
  bio: z.string().trim().max(500, "Keep it under 500 characters").nullish(),
  preferredCauses: z
    .array(z.enum(NGO_CAUSES, { error: "Select a valid cause" }))
    .max(NGO_CAUSES.length)
    .transform(unique),
  preferredCountryCodes: z
    .array(countryCodeSchema)
    .max(50, "Select up to 50 countries")
    .transform(unique),
  donateAnonymously: z.boolean(),
  contactConsent: z.boolean(),
});

// Defaults only on create: zod applies defaults even inside `.partial()`,
// which would make a PATCH that omits these fields reset them.
export const individualCreateSchema = individualBaseSchema.extend({
  preferredCauses: individualBaseSchema.shape.preferredCauses.default([]),
  preferredCountryCodes: individualBaseSchema.shape.preferredCountryCodes.default([]),
  donateAnonymously: individualBaseSchema.shape.donateAnonymously.default(false),
  contactConsent: individualBaseSchema.shape.contactConsent.default(false),
  acceptPrivacyPolicy: z.literal(true, {
    error: "You must accept the privacy policy to create a profile",
  }),
});

export const individualUpdateSchema = individualBaseSchema.partial();

export type IndividualCreateInput = z.infer<typeof individualCreateSchema>;
export type IndividualUpdateInput = z.infer<typeof individualUpdateSchema>;
