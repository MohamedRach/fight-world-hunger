"use client";

import Link from "next/link";

import type { CampaignSummary } from "@/features/campaigns/types";
import { CAMPAIGN_STATUS_LABELS } from "@/features/campaigns/types";
import { hungerIssueShortLabel } from "@/features/hunger-issues/catalog";
import type { CampaignRecommendation } from "@/features/recommendations/types";
import { CampaignProgress } from "./CampaignProgress";

interface CampaignCardProps {
  campaign: CampaignSummary;
  onDonate: (campaign: CampaignSummary) => void;
  /** Shown with a "Recommended for you" treatment. */
  recommendation?: CampaignRecommendation;
  /** True when the suggestion is not personalised to this viewer. */
  genericSuggestion?: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-200",
  PAUSED: "bg-amber-500/15 text-amber-200",
  COMPLETED: "bg-sky-500/15 text-sky-200",
  CANCELLED: "bg-slate-500/20 text-slate-300",
  DRAFT: "bg-slate-500/20 text-slate-300",
};

function formatEndDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Campaign card used in the country sidebar on the map (dark surface). */
export function CampaignCard({
  campaign,
  onDonate,
  recommendation,
  genericSuggestion = false,
}: CampaignCardProps) {
  const endsOn = formatEndDate(campaign.endDate);
  const canDonate = campaign.status === "ACTIVE";

  return (
    <article
      aria-labelledby={`campaign-${campaign.id}-title`}
      className={`rounded-xl border p-3 text-sm text-slate-200 ${
        recommendation
          ? "border-emerald-400/40 bg-emerald-500/[0.07]"
          : "border-white/10 bg-white/5"
      }`}
    >
      {recommendation ? (
        <p className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
            {genericSuggestion ? "Suggested" : "Recommended for you"}
          </span>
          <span className="text-[11px] text-emerald-100/90">{recommendation.explanation}</span>
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <h4 id={`campaign-${campaign.id}-title`} className="font-semibold text-white">
          {campaign.title}
        </h4>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            STATUS_BADGE[campaign.status] ?? STATUS_BADGE.DRAFT
          }`}
        >
          {CAMPAIGN_STATUS_LABELS[campaign.status]}
        </span>
      </div>

      <p className="mt-0.5 text-[11px] text-slate-400">
        by{" "}
        <Link
          href={`/ngos/${campaign.ngo.slug}`}
          className="underline decoration-slate-500 underline-offset-2 hover:text-white"
        >
          {campaign.ngo.name}
        </Link>
        {campaign.isDemoSeed ? (
          <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">
            Demo data
          </span>
        ) : null}
      </p>

      <p className="mt-2 line-clamp-3 text-xs text-slate-300">{campaign.summary}</p>

      {campaign.issueTags.length > 0 ? (
        <ul aria-label="Hunger issues addressed" className="mt-2 flex flex-wrap gap-1">
          {campaign.issueTags.map((tag) => {
            const matched = recommendation?.matchedIssueTags.includes(tag) ?? false;
            return (
              <li
                key={tag}
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  matched
                    ? "bg-emerald-500/25 font-medium text-emerald-100"
                    : "bg-white/10 text-slate-300"
                }`}
              >
                {hungerIssueShortLabel(tag)}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-3">
        <CampaignProgress
          raisedAmountMinor={campaign.raisedAmountMinor}
          goalAmountMinor={campaign.goalAmountMinor}
          progressPercent={campaign.progressPercent}
          currency={campaign.currency}
        />
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
        <div className="flex gap-1">
          <dt>Donations:</dt>
          <dd className="tabular-nums">{campaign.donationCount}</dd>
        </div>
        {endsOn ? (
          <div className="flex gap-1">
            <dt>Ends:</dt>
            <dd>{endsOn}</dd>
          </div>
        ) : null}
        {campaign.countryCodes.length > 1 ? (
          <div className="flex gap-1">
            <dt>Serves:</dt>
            <dd>{campaign.countryCodes.length} countries</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-3">
        {canDonate ? (
          <button
            type="button"
            onClick={() => onDonate(campaign)}
            className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Donate
          </button>
        ) : (
          <p className="text-[11px] text-slate-400">
            {campaign.status === "PAUSED"
              ? "This campaign is paused and is not accepting donations right now."
              : "This campaign is closed to new donations."}
          </p>
        )}
      </div>
    </article>
  );
}
