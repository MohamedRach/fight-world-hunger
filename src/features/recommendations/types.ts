import type { HungerIssueId } from "@/features/hunger-issues/catalog";
import type { CampaignSummary } from "@/features/campaigns/types";

/**
 * How a set of recommendations was produced. The UI must not present
 * `fallback` results as if a model had reasoned about them.
 */
export type RecommendationSource = "llm" | "fallback" | "generic";

export type RecommendationReasonCode =
  | "interest_match"
  | "ngo_focus_match"
  | "no_interests"
  | "no_overlap";

/** One recommended campaign, after validation against the candidate set. */
export type CampaignRecommendation = {
  campaignId: string;
  /** 1 = best. Position in the returned list, not a probability. */
  rank: number;
  /** One sentence shown to the donor explaining the match. */
  explanation: string;
  /** Donor interests that matched — always a subset of the donor's own list. */
  matchedInterests: HungerIssueId[];
  /** Campaign tags that matched — always a subset of the campaign's own tags. */
  matchedIssueTags: HungerIssueId[];
};

export type RecommendationSet = {
  source: RecommendationSource;
  /** Non-personalised results (anonymous visitor, or donor with no interests). */
  personalized: boolean;
  recommendations: CampaignRecommendation[];
  /** Short note for the UI, e.g. why results are not personalised. */
  notice: string | null;
  reasonCode: RecommendationReasonCode | null;
};

/** What the country sidebar needs in one request. */
export type CountryRecommendationsResponse = {
  countryCode: string;
  /** Every eligible (donatable) campaign in the country, recommended or not. */
  campaigns: CampaignSummary[];
  /** Campaigns listed but closed to donations, kept separate from the ranking. */
  closedCampaigns: CampaignSummary[];
  recommendations: CampaignRecommendation[];
  source: RecommendationSource;
  personalized: boolean;
  notice: string | null;
};

/** The compact, non-sensitive view of a campaign that is sent to the model. */
export type CampaignCandidate = {
  id: string;
  title: string;
  summary: string;
  issueTags: HungerIssueId[];
  ngoName: string;
  ngoHungerMission: string | null;
  ngoFocusAreas: HungerIssueId[];
  countryCodes: string[];
};
