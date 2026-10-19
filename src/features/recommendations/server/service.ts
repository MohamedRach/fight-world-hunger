import "server-only";
import { getCampaignRepository } from "@/features/campaigns/repository";
import { withProgress } from "@/features/campaigns/service";
import {
  acceptsDonations,
  isPubliclyVisible,
  toCampaignSummary,
  type CampaignSummary,
  type CampaignWithProgress,
} from "@/features/campaigns/types";
import { normalizeIssueIds, sharedIssues, type HungerIssueId } from "@/features/hunger-issues/catalog";
import { getIndividualRepository } from "@/features/individuals/repository";
import { getNgoRepository } from "@/features/ngos/repository";
import { ensureMockDataSeeded } from "@/mocks/seed";
import { fallbackRecommendations } from "../fallback";
import { buildUserPrompt, SYSTEM_PROMPT } from "../prompt";
import type {
  CampaignCandidate,
  CampaignRecommendation,
  CountryRecommendationsResponse,
  RecommendationSource,
} from "../types";
import { isLlmConfigured, LlmUnavailableError, requestLlmRecommendations } from "./llm-client";

export const MAX_RECOMMENDATIONS = 3;

/** Cached per user + country + inputs, so a render loop cannot hammer the provider. */
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { expiresAt: number; value: CountryRecommendationsResponse };

const globalStore = globalThis as unknown as {
  __recommendationCache?: Map<string, CacheEntry>;
};

function cache(): Map<string, CacheEntry> {
  globalStore.__recommendationCache ??= new Map();
  return globalStore.__recommendationCache;
}

/**
 * Cache key covering every input that can change the result: the viewer, the
 * country, their interests, and the candidate campaigns with their tags and
 * status. Editing interests or a campaign tag therefore produces a new key
 * instead of serving stale recommendations.
 */
function cacheKey(
  viewerId: string,
  countryCode: string,
  interests: readonly string[],
  candidates: readonly CampaignCandidate[],
): string {
  const campaignPart = candidates
    .map((candidate) => `${candidate.id}:${candidate.issueTags.join("|")}`)
    .sort()
    .join(",");
  return [viewerId, countryCode, [...interests].sort().join("|"), campaignPart].join("::");
}

function toCandidate(campaign: CampaignWithProgress, ngo: NgoLike | null): CampaignCandidate {
  return {
    id: campaign.id,
    title: campaign.title,
    summary: campaign.summary,
    issueTags: campaign.issueTags,
    ngoName: campaign.ngoName,
    ngoHungerMission: ngo?.hungerMission ?? null,
    ngoFocusAreas: ngo?.hungerFocusAreas ?? [],
    countryCodes: campaign.countryCodes,
  };
}

type NgoLike = { hungerMission: string | null; hungerFocusAreas: HungerIssueId[] };

/**
 * Keeps only recommendations the model was allowed to make:
 *  - the id must be in the candidate set (no invented or out-of-country campaigns)
 *  - no duplicates
 *  - matched interests must be a subset of the donor's interests
 *  - matched tags must be a subset of that campaign's own tags
 * Anything else is dropped rather than shown.
 */
export function validateLlmRecommendations(
  raw: ReadonlyArray<{
    campaignId: string;
    explanation: string;
    matchedInterests: string[];
    matchedIssueTags: string[];
  }>,
  candidates: readonly CampaignCandidate[],
  interests: readonly HungerIssueId[],
  limit: number,
): CampaignRecommendation[] {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const seen = new Set<string>();
  const result: CampaignRecommendation[] = [];

  for (const item of raw) {
    const candidate = byId.get(item.campaignId);
    if (!candidate || seen.has(item.campaignId)) continue;
    seen.add(item.campaignId);

    result.push({
      campaignId: candidate.id,
      rank: result.length + 1,
      explanation: item.explanation.trim().slice(0, 300),
      matchedInterests: sharedIssues(normalizeIssueIds(item.matchedInterests), interests),
      matchedIssueTags: sharedIssues(normalizeIssueIds(item.matchedIssueTags), candidate.issueTags),
    });
    if (result.length >= limit) break;
  }
  return result;
}

async function loadCandidates(countryCode: string): Promise<{
  eligible: CampaignWithProgress[];
  closed: CampaignWithProgress[];
  candidates: CampaignCandidate[];
}> {
  const campaigns = (await getCampaignRepository().findByCountry(countryCode)).filter((campaign) =>
    isPubliclyVisible(campaign.status),
  );
  const withTotals = await withProgress(campaigns);

  const eligible = withTotals.filter((campaign) => acceptsDonations(campaign.status));
  const closed = withTotals.filter((campaign) => !acceptsDonations(campaign.status));

  const ngoRepo = getNgoRepository();
  const ngoIds = [...new Set(eligible.map((campaign) => campaign.ngoId))];
  const ngos = new Map<string, NgoLike>(
    (await Promise.all(ngoIds.map((id) => ngoRepo.findById(id)))).flatMap((ngo) =>
      ngo
        ? [[ngo.id, { hungerMission: ngo.hungerMission, hungerFocusAreas: ngo.hungerFocusAreas }] as const]
        : [],
    ),
  );

  return {
    eligible,
    closed,
    candidates: eligible.map((campaign) => toCandidate(campaign, ngos.get(campaign.ngoId) ?? null)),
  };
}

export type RecommendationViewer = {
  /** Account id, or null for an anonymous visitor. */
  userId: string | null;
  type: "INDIVIDUAL" | "NGO" | null;
};

/**
 * Campaigns in a country plus, for a signed-in donor with interests, up to
 * three personalised recommendations.
 *
 * Order of attempts: cache → LLM (validated) → deterministic fallback. The
 * response always says which one produced it.
 */
export async function getCountryRecommendations(
  countryCode: string,
  viewer: RecommendationViewer,
): Promise<CountryRecommendationsResponse> {
  await ensureMockDataSeeded();

  const { eligible, closed, candidates } = await loadCandidates(countryCode);
  const campaigns = eligible.map(toCampaignSummary);
  const closedCampaigns = closed.map(toCampaignSummary);

  const base = {
    countryCode,
    campaigns,
    closedCampaigns,
  };

  if (candidates.length === 0) {
    return {
      ...base,
      recommendations: [],
      source: "generic" as RecommendationSource,
      personalized: false,
      notice: null,
    };
  }

  // Anonymous visitors and NGO accounts get the plain list, clearly unpersonalised.
  if (!viewer.userId || viewer.type !== "INDIVIDUAL") {
    return {
      ...base,
      recommendations: [],
      source: "generic",
      personalized: false,
      notice: viewer.userId
        ? null
        : "Sign in as an individual and pick the hunger issues you care about to get personalised suggestions.",
    };
  }

  const profile = await getIndividualRepository().findByUserId(viewer.userId);
  const interests = profile?.hungerInterests ?? [];

  if (interests.length === 0) {
    return {
      ...base,
      recommendations: [],
      source: "generic",
      personalized: false,
      notice:
        "Choose the world hunger issues you care about in your profile to get personalised suggestions.",
    };
  }

  const key = cacheKey(viewer.userId, countryCode, interests, candidates);
  const cached = cache().get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const limit = Math.min(MAX_RECOMMENDATIONS, candidates.length);
  let recommendations: CampaignRecommendation[] = [];
  let source: RecommendationSource = "fallback";

  if (isLlmConfigured()) {
    try {
      const raw = await requestLlmRecommendations(
        SYSTEM_PROMPT,
        buildUserPrompt({ interests, countryCode, candidates, limit }),
      );
      const validated = validateLlmRecommendations(raw, candidates, interests, limit);
      if (validated.length > 0) {
        recommendations = validated;
        source = "llm";
      }
    } catch (error) {
      // Log the reason server-side only; the UI just sees fallback results.
      console.warn(
        "[recommendations] LLM unavailable, using deterministic ranking:",
        error instanceof LlmUnavailableError ? error.reason : "unknown",
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations = fallbackRecommendations(candidates, interests, limit);
    source = "fallback";
  }

  // Does anything genuinely overlap, or are we just showing the best of a
  // non-matching set? The UI uses this to avoid overclaiming.
  const anyOverlap = recommendations.some(
    (recommendation) => recommendation.matchedInterests.length > 0,
  );

  const value: CountryRecommendationsResponse = {
    ...base,
    recommendations,
    source,
    personalized: true,
    notice: anyOverlap
      ? null
      : "None of the campaigns here match your selected issues yet — these are simply the active campaigns in this country.",
  };

  cache().set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

/** Exported for the country campaigns endpoint, which shows the same list. */
export function campaignIdsOf(summaries: readonly CampaignSummary[]): Set<string> {
  return new Set(summaries.map((summary) => summary.id));
}
