import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { getSessionUser } from "@/features/ngos/session";
import {
  CampaignServiceError,
  getManagedCampaign,
} from "@/features/campaigns/service";
import { CAMPAIGN_STATUS_LABELS } from "@/features/campaigns/types";
import { getCampaignDonations } from "@/features/donations/service";
import { formatMoney } from "@/features/money";
import { countryName } from "@/features/ngos/countries";
import { CampaignProgress } from "@/components/campaigns/CampaignProgress";
import { CampaignStatusControl } from "@/components/campaigns/CampaignStatusControl";
import { CampaignDonationsTable } from "@/components/donations/CampaignDonationsTable";

export const metadata: Metadata = {
  title: "Campaign",
  description: "Manage a campaign and the donations it received.",
};

interface PageProps {
  params: Promise<{ campaignId: string }>;
}

const primaryLink =
  "mt-6 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950";

function formatDate(date: Date | null): string {
  return date
    ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

export default async function ManageCampaignPage({ params }: PageProps) {
  // Per-user, mutable mock data: render at request time, never prerender.
  await connection();
  const { campaignId } = await params;
  const user = await getSessionUser();

  if (!user || user.type !== "NGO") {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Campaign management</h1>
        <p className="mt-2 text-sm opacity-80">
          Sign in with the NGO account that owns this campaign.
        </p>
        <Link href="/sign-in?as=ngo" className={primaryLink}>
          Sign in as an NGO
        </Link>
      </main>
    );
  }

  let campaign;
  let donations;
  try {
    campaign = await getManagedCampaign(user.id, campaignId);
    donations = await getCampaignDonations(user.id, campaign.id);
  } catch (error) {
    if (error instanceof CampaignServiceError && error.code === "FORBIDDEN") {
      return (
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight">Not your campaign</h1>
          <p className="mt-2 text-sm opacity-80">
            You can only manage campaigns owned by an organization you belong to.
          </p>
          <Link href="/dashboard" className={primaryLink}>
            Back to the dashboard
          </Link>
        </main>
      );
    }
    notFound();
  }

  const counted = donations.filter((donation) => donation.countsTowardRaised).length;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 text-sm">
        <Link
          href="/dashboard"
          className="underline underline-offset-2 opacity-70 hover:opacity-100"
        >
          ← Back to the dashboard
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{campaign.title}</h1>
          <p className="mt-1 text-sm opacity-70">
            {campaign.ngoName} ·{" "}
            {campaign.countryCodes.map((code) => countryName(code)).join(", ")}
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

      <section
        aria-labelledby="campaign-progress-title"
        className="mt-8 rounded-xl border border-black/10 p-6 dark:border-white/15"
      >
        <h2 id="campaign-progress-title" className="font-semibold">
          Fundraising progress
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
            <dd className="text-lg font-semibold tabular-nums">
              {formatMoney(campaign.goalAmountMinor, campaign.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-70">Raised</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {formatMoney(campaign.raisedAmountMinor, campaign.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-70">Remaining</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {formatMoney(campaign.remainingAmountMinor, campaign.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-70">Donations</dt>
            <dd className="text-lg font-semibold tabular-nums">{campaign.donationCount}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs opacity-70">
          {counted} of {campaign.donationCount} donations count towards the total. A donation
          counts once you confirm it; pending, cancelled and rejected donations never do.
        </p>

        <dl className="mt-4 grid gap-2 text-xs opacity-70 sm:grid-cols-2">
          <div className="flex gap-1">
            <dt>Starts:</dt>
            <dd>{formatDate(campaign.startDate)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Ends:</dt>
            <dd>{formatDate(campaign.endDate)}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="campaign-status-title"
        className="mt-6 rounded-xl border border-black/10 p-6 dark:border-white/15"
      >
        <h2 id="campaign-status-title" className="font-semibold">
          Campaign status
        </h2>
        <div className="mt-2">
          <CampaignStatusControl campaignId={campaign.id} status={campaign.status} />
        </div>
      </section>

      <section aria-labelledby="campaign-donations-title" className="mt-6">
        <h2 id="campaign-donations-title" className="font-semibold">
          Donations received
        </h2>
        <p className="mt-1 text-xs opacity-70">
          Status updates tell donors how the supported work is progressing. They are not payment
          confirmations: this build never processes payments.
        </p>
        <div className="mt-3">
          <CampaignDonationsTable donations={donations} />
        </div>
      </section>
    </main>
  );
}
