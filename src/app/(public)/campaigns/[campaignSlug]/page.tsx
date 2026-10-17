import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getPublicCampaign } from "@/features/campaigns/service";
import { CAMPAIGN_STATUS_DESCRIPTIONS, CAMPAIGN_STATUS_LABELS } from "@/features/campaigns/types";
import { formatMoney } from "@/features/money";
import { countryName } from "@/features/ngos/countries";
import { CampaignProgress } from "@/components/campaigns/CampaignProgress";

interface PageProps {
  params: Promise<{ campaignSlug: string }>;
}

// Static metadata: the campaign title lives in mutable mock data, so reading
// it here would block the static shell from being prerendered.
export const metadata: Metadata = {
  title: "Campaign",
  description: "A fundraising campaign on Fight World Hunger.",
};

function formatDate(date: Date | null): string | null {
  return date
    ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;
}

/** Static shell; the campaign itself streams in because it is runtime data. */
export default function CampaignPage({ params }: PageProps) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 text-sm">
        <Link href="/map" className="underline underline-offset-2 opacity-70 hover:opacity-100">
          ← Back to the map
        </Link>
      </div>
      <Suspense fallback={<CampaignSkeleton />}>
        <CampaignDetails params={params} />
      </Suspense>
    </main>
  );
}

function CampaignSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading campaign" className="animate-pulse space-y-4">
      <div className="h-8 w-2/3 rounded bg-black/10 dark:bg-white/10" />
      <div className="h-4 w-1/3 rounded bg-black/10 dark:bg-white/10" />
      <div className="h-40 rounded-xl bg-black/5 dark:bg-white/5" />
    </div>
  );
}

async function CampaignDetails({ params }: PageProps) {
  const { campaignSlug } = await params;
  const campaign = await getPublicCampaign(campaignSlug);
  if (!campaign) notFound();

  const startsOn = formatDate(campaign.startDate);
  const endsOn = formatDate(campaign.endDate);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{campaign.title}</h1>
          <p className="mt-1 text-sm opacity-70">
            by{" "}
            <Link href={`/ngos/${campaign.ngoSlug}`} className="underline underline-offset-2">
              {campaign.ngoName}
            </Link>
            {campaign.isDemoSeed ? (
              <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-[11px] dark:bg-white/10">
                Demo data
              </span>
            ) : null}
          </p>
        </div>
        <span className="rounded-full bg-black/5 px-3 py-1 text-sm font-medium dark:bg-white/10">
          {CAMPAIGN_STATUS_LABELS[campaign.status]}
        </span>
      </div>

      <p className="mt-4 text-base leading-relaxed">{campaign.summary}</p>

      <section
        aria-labelledby="campaign-progress-title"
        className="mt-8 rounded-xl border border-black/10 p-6 dark:border-white/15"
      >
        <h2 id="campaign-progress-title" className="font-semibold">
          Progress
        </h2>
        <div className="mt-3">
          <CampaignProgress
            tone="light"
            raisedAmountMinor={campaign.raisedAmountMinor}
            goalAmountMinor={campaign.goalAmountMinor}
            progressPercent={campaign.progressPercent}
            currency={campaign.currency}
          />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs opacity-70">Goal</dt>
            <dd className="font-semibold tabular-nums">
              {formatMoney(campaign.goalAmountMinor, campaign.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-70">Raised</dt>
            <dd className="font-semibold tabular-nums">
              {formatMoney(campaign.raisedAmountMinor, campaign.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-70">Donations</dt>
            <dd className="font-semibold tabular-nums">{campaign.donationCount}</dd>
          </div>
          <div>
            <dt className="text-xs opacity-70">Status</dt>
            <dd className="font-semibold">{CAMPAIGN_STATUS_LABELS[campaign.status]}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs opacity-70">
          {CAMPAIGN_STATUS_DESCRIPTIONS[campaign.status]} Donations count towards this total once
          the organization confirms them.
        </p>
      </section>

      <section aria-labelledby="campaign-about-title" className="mt-6">
        <h2 id="campaign-about-title" className="font-semibold">
          About this campaign
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{campaign.description}</p>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex gap-1">
            <dt className="opacity-70">Countries served:</dt>
            <dd>{campaign.countryCodes.map((code) => countryName(code)).join(", ")}</dd>
          </div>
          {startsOn ? (
            <div className="flex gap-1">
              <dt className="opacity-70">Starts:</dt>
              <dd>{startsOn}</dd>
            </div>
          ) : null}
          {endsOn ? (
            <div className="flex gap-1">
              <dt className="opacity-70">Ends:</dt>
              <dd>{endsOn}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <p className="mt-8 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
        <strong className="font-semibold">Simulated donations.</strong> This development build
        does not process payments. To donate, open this campaign&apos;s country on the map.
      </p>

      <Link
        href="/map"
        className="mt-6 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
      >
        Find this campaign on the map
      </Link>
    </>
  );
}
