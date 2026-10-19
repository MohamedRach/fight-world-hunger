import {
  hungerIssueShortLabel,
  sharedIssues,
  type HungerIssueId,
} from "@/features/hunger-issues/catalog";
import type { CampaignCandidate, CampaignRecommendation } from "./types";

/**
 * Deterministic ranking used when the LLM is unavailable, unconfigured, slow
 * or returns something invalid.
 *
 * Scoring, highest first:
 *   3 points per donor interest matching a campaign issue tag (the strongest
 *     signal: the campaign itself says it addresses that issue)
 *   1 point per donor interest matching the owning NGO's focus areas
 *     (weaker: it describes the organization, not this campaign)
 * Ties break on the number of matched tags, then on title, so the order is
 * stable between calls.
 *
 * Results are deliberately labelled `fallback` by the caller so the UI never
 * claims they came from a model.
 */
export const INTEREST_TAG_POINTS = 3;
export const NGO_FOCUS_POINTS = 1;

export type ScoredCandidate = {
  candidate: CampaignCandidate;
  score: number;
  matchedInterests: HungerIssueId[];
  matchedIssueTags: HungerIssueId[];
  matchedNgoFocus: HungerIssueId[];
};

export function scoreCandidate(
  candidate: CampaignCandidate,
  interests: readonly HungerIssueId[],
): ScoredCandidate {
  const matchedIssueTags = sharedIssues(candidate.issueTags, interests);
  const matchedNgoFocus = sharedIssues(candidate.ngoFocusAreas, interests).filter(
    (issue) => !matchedIssueTags.includes(issue),
  );
  const matchedInterests = [...matchedIssueTags, ...matchedNgoFocus];

  return {
    candidate,
    score:
      matchedIssueTags.length * INTEREST_TAG_POINTS + matchedNgoFocus.length * NGO_FOCUS_POINTS,
    matchedInterests,
    matchedIssueTags,
    matchedNgoFocus,
  };
}

function explain(scored: ScoredCandidate): string {
  const { matchedIssueTags, matchedNgoFocus, candidate } = scored;

  if (matchedIssueTags.length > 0) {
    const labels = matchedIssueTags.map(hungerIssueShortLabel);
    const list =
      labels.length === 1
        ? labels[0]
        : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
    return `Works on ${list}, which you follow.`;
  }
  if (matchedNgoFocus.length > 0) {
    return `${candidate.ngoName} works on ${hungerIssueShortLabel(matchedNgoFocus[0])}, which you follow.`;
  }
  return "An active campaign in this country, shown because none matched your interests directly.";
}

export function rankCandidates(
  candidates: readonly CampaignCandidate[],
  interests: readonly HungerIssueId[],
): ScoredCandidate[] {
  return candidates
    .map((candidate) => scoreCandidate(candidate, interests))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.matchedIssueTags.length !== a.matchedIssueTags.length) {
        return b.matchedIssueTags.length - a.matchedIssueTags.length;
      }
      return a.candidate.title.localeCompare(b.candidate.title);
    });
}

/**
 * Top `limit` campaigns by deterministic score. Campaigns with no overlap at
 * all are only included when there are too few matches to fill the list, and
 * their explanation says so rather than inventing a connection.
 */
export function fallbackRecommendations(
  candidates: readonly CampaignCandidate[],
  interests: readonly HungerIssueId[],
  limit: number,
): CampaignRecommendation[] {
  return rankCandidates(candidates, interests)
    .slice(0, limit)
    .map((scored, index) => ({
      campaignId: scored.candidate.id,
      rank: index + 1,
      explanation: explain(scored),
      matchedInterests: scored.matchedInterests,
      matchedIssueTags: scored.matchedIssueTags,
    }));
}
