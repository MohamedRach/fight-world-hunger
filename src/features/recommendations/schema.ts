import { z } from "zod";
import { HUNGER_ISSUE_IDS } from "@/features/hunger-issues/catalog";

/**
 * Shape the model must return. Anything else is rejected and the caller falls
 * back to the deterministic ranking, so malformed output can never reach the UI.
 *
 * Ids are validated against the candidate set separately (see service.ts):
 * schema validity alone does not prove the model stayed inside the allow-list.
 */
export const llmRecommendationSchema = z.object({
  campaignId: z.string().min(1),
  explanation: z.string().trim().min(1).max(300),
  matchedInterests: z.array(z.enum(HUNGER_ISSUE_IDS)).max(12).default([]),
  matchedIssueTags: z.array(z.enum(HUNGER_ISSUE_IDS)).max(12).default([]),
});

export const llmRecommendationsPayloadSchema = z.object({
  recommendations: z.array(llmRecommendationSchema).max(10),
});

export type LlmRecommendation = z.infer<typeof llmRecommendationSchema>;

/** JSON Schema handed to the provider so it returns structured output. */
export const LLM_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["recommendations"],
  properties: {
    recommendations: {
      type: "array",
      description: "Recommended campaigns, best first.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["campaignId", "explanation", "matchedInterests", "matchedIssueTags"],
        properties: {
          campaignId: {
            type: "string",
            description: "Must be one of the provided candidate campaign ids.",
          },
          explanation: {
            type: "string",
            description:
              "One short sentence, addressed to the donor, explaining the match. No markdown.",
          },
          matchedInterests: {
            type: "array",
            items: { type: "string", enum: [...HUNGER_ISSUE_IDS] },
            description: "Donor interest ids that justify this recommendation.",
          },
          matchedIssueTags: {
            type: "array",
            items: { type: "string", enum: [...HUNGER_ISSUE_IDS] },
            description: "Campaign issue tag ids that justify this recommendation.",
          },
        },
      },
    },
  },
} as const;
