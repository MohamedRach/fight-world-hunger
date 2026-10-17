import { z } from "zod";
import { isCountryCode } from "@/features/ngos/countries";
import { HUNGER_ISSUE_IDS } from "@/features/hunger-issues/catalog";
import { CURRENCIES } from "@/features/money";
import { CAMPAIGN_STATUSES } from "./types";

const urlSchema = z.url("Must be a valid URL (including https://)").max(2048);

const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isCountryCode, "Select a valid country");

/** Accepts "YYYY-MM-DD" (what <input type="date"> submits) or an ISO datetime. */
const dateSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date")
  .transform((value) => new Date(value));

const campaignBaseSchema = z.strictObject({
  ngoId: z.string().trim().min(1, "Select the organization running this campaign"),
  title: z
    .string()
    .trim()
    .min(4, "Title must be at least 4 characters")
    .max(120, "Title must be at most 120 characters"),
  summary: z
    .string()
    .trim()
    .min(10, "Summary must be at least 10 characters")
    .max(280, "Summary must be at most 280 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Describe the campaign's purpose in at least 20 characters")
    .max(5000),
  countryCodes: z
    .array(countryCodeSchema)
    .min(1, "Select at least one country this campaign serves")
    .max(50),
  // The campaign's own issues — never copied automatically from the NGO.
  issueTags: z
    .array(z.enum(HUNGER_ISSUE_IDS, { error: "Select a valid world hunger issue" }))
    .min(1, "Select at least one world hunger issue this campaign addresses")
    .max(5, "Keep the campaign focused: select up to 5 issues")
    .transform((values) => [...new Set(values)]),
  goalAmountMinor: z
    .number({ error: "Enter a fundraising goal" })
    .int("The goal must be a whole amount")
    .positive("The fundraising goal must be greater than zero")
    .max(1_000_000_000_00, "That goal is unrealistically large"),
  currency: z.enum(CURRENCIES, { error: "Select a currency" }),
  startDate: dateSchema.nullish(),
  endDate: dateSchema.nullish(),
  imageUrl: urlSchema.nullish(),
  status: z.enum(CAMPAIGN_STATUSES, { error: "Select a campaign status" }),
});

type CampaignBaseValues = Partial<z.infer<typeof campaignBaseSchema>>;

function addCrossFieldIssues(value: CampaignBaseValues, ctx: z.RefinementCtx) {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "The end date cannot be before the start date",
    });
  }
  if (
    value.countryCodes !== undefined &&
    new Set(value.countryCodes).size !== value.countryCodes.length
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["countryCodes"],
      message: "Countries served must not contain duplicates",
    });
  }
}

/**
 * A campaign is created as DRAFT or ACTIVE only: the other statuses describe
 * what later happens to it.
 */
export const campaignCreateSchema = campaignBaseSchema
  .extend({
    status: z.enum(["DRAFT", "ACTIVE"], {
      error: "A new campaign can only be saved as a draft or published as active",
    }),
  })
  .superRefine(addCrossFieldIssues);

/** Content edits. Status changes go through `campaignStatusSchema` instead. */
export const campaignUpdateSchema = campaignBaseSchema
  .omit({ ngoId: true, status: true })
  .partial()
  .superRefine(addCrossFieldIssues);

export const campaignStatusSchema = z.strictObject({
  status: z.enum(CAMPAIGN_STATUSES, { error: "Select a campaign status" }),
});

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
