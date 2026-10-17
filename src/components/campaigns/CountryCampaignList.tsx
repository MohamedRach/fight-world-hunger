"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import { getJson } from "@/features/api-client";
import type { CampaignSummary } from "@/features/campaigns/types";
import type {
  CampaignRecommendation,
  CountryRecommendationsResponse,
} from "@/features/recommendations/types";
import { DonateDialog } from "@/components/donations/DonateDialog";
import { CampaignCard } from "./CampaignCard";

interface CountryCampaignListProps {
  countryCode: string;
  countryName: string;
}

type LoadOutcome =
  | { status: "error"; message: string }
  | { status: "success"; response: CountryRecommendationsResponse };

type LoadState = LoadOutcome | { status: "loading" };

/**
 * Campaigns serving the selected country, with the donor's top matches first.
 *
 * One request returns both the eligible campaigns and the ranking, so the
 * list and the recommendations can never disagree, and a campaign is never
 * rendered twice.
 */
export function CountryCampaignList({ countryCode, countryName }: CountryCampaignListProps) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${countryCode}:${attempt}`;
  const [result, setResult] = useState<{ key: string; outcome: LoadOutcome } | null>(null);
  const [donating, setDonating] = useState<CampaignSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getJson<CountryRecommendationsResponse>(
      `/api/countries/${encodeURIComponent(countryCode)}/recommendations`,
      controller.signal,
    )
      .then((response) => setResult({ key: requestKey, outcome: { status: "success", response } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          outcome: {
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      });

    return () => controller.abort();
  }, [countryCode, requestKey]);

  // Loading is derived: any result that does not match the current request is stale.
  const state: LoadState =
    result && result.key === requestKey ? result.outcome : { status: "loading" };

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  let content: ReactNode;
  if (state.status === "loading") {
    content = (
      <div role="status" aria-live="polite" className="space-y-2">
        <p className="text-xs text-slate-400">Loading campaigns…</p>
        {[0, 1].map((index) => (
          <div key={index} aria-hidden="true" className="h-24 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  } else if (state.status === "error") {
    content = (
      <div
        role="alert"
        className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-100"
      >
        <p>We couldn&apos;t load campaigns for {countryName}. {state.message}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-2 rounded-md bg-white/10 px-2 py-1 font-medium text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          Try again
        </button>
      </div>
    );
  } else {
    content = (
      <CampaignSections
        response={state.response}
        countryName={countryName}
        onDonate={setDonating}
      />
    );
  }

  return (
    <div>
      {content}
      {/* Rendered outside the states above so reloading the list after a
          donation does not unmount the dialog and lose its confirmation. */}
      {donating ? (
        <DonateDialog
          campaign={donating}
          onClose={() => setDonating(null)}
          onDonated={reload}
        />
      ) : null}
    </div>
  );
}

function CampaignSections({
  response,
  countryName,
  onDonate,
}: {
  response: CountryRecommendationsResponse;
  countryName: string;
  onDonate: (campaign: CampaignSummary) => void;
}) {
  const { campaigns, closedCampaigns, recommendations, personalized, notice } = response;

  if (campaigns.length === 0 && closedCampaigns.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-slate-400">
        No campaigns are running in {countryName} yet. Organizations can create one from their
        dashboard.
      </p>
    );
  }

  const byId = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const recommendationById = new Map<string, CampaignRecommendation>(
    recommendations.map((recommendation) => [recommendation.campaignId, recommendation]),
  );

  // A recommended campaign appears only in the recommended block.
  const recommended = recommendations
    .map((recommendation) => byId.get(recommendation.campaignId))
    .filter((campaign): campaign is CampaignSummary => campaign !== undefined);
  const recommendedIds = new Set(recommended.map((campaign) => campaign.id));
  const others = campaigns.filter((campaign) => !recommendedIds.has(campaign.id));

  return (
    <div className="space-y-4">
      {recommended.length > 0 ? (
        <section aria-labelledby="recommended-campaigns-title">
          <h4
            id="recommended-campaigns-title"
            className="text-xs font-semibold uppercase tracking-wide text-emerald-200"
          >
            {personalized ? "Recommended for you" : "Suggested campaigns"}
          </h4>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {personalized
              ? "These campaigns best match your interests in fighting world hunger."
              : "A general starting point — not personalised to you."}
          </p>
          <ul className="mt-2 space-y-2">
            {recommended.map((campaign) => (
              <li key={campaign.id}>
                <CampaignCard
                  campaign={campaign}
                  onDonate={onDonate}
                  recommendation={recommendationById.get(campaign.id)}
                  genericSuggestion={!personalized}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {notice ? (
        <p className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-[11px] text-slate-300">
          {notice}{" "}
          <Link
            href="/me/edit"
            className="underline decoration-slate-500 underline-offset-2 hover:text-white"
          >
            Update your interests
          </Link>
        </p>
      ) : null}

      {others.length > 0 ? (
        <section aria-labelledby="other-campaigns-title">
          <h4
            id="other-campaigns-title"
            className="text-xs font-semibold uppercase tracking-wide text-slate-300"
          >
            {recommended.length > 0 ? "More campaigns" : "Campaigns"} in {countryName}
          </h4>
          <ul className="mt-2 space-y-2">
            {others.map((campaign) => (
              <li key={campaign.id}>
                <CampaignCard campaign={campaign} onDonate={onDonate} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {closedCampaigns.length > 0 ? (
        <section aria-labelledby="closed-campaigns-title">
          <h4
            id="closed-campaigns-title"
            className="text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Closed to donations
          </h4>
          <ul className="mt-2 space-y-2">
            {closedCampaigns.map((campaign) => (
              <li key={campaign.id}>
                <CampaignCard campaign={campaign} onDonate={onDonate} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
