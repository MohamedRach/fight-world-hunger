import Link from "next/link";

import { CAMPAIGN_STATUS_LABELS, type CampaignWithProgress } from "@/features/campaigns/types";
import { formatMoney } from "@/features/money";
import { CampaignProgress } from "./CampaignProgress";

interface NgoCampaignsPanelProps {
  campaigns: CampaignWithProgress[];
}

/** Campaign summary list shown on an NGO's dashboard card. */
export function NgoCampaignsPanel({ campaigns }: NgoCampaignsPanelProps) {
  if (campaigns.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm opacity-70 dark:border-white/20">
        No campaigns yet. Create one so donors can find you on the map.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {campaigns.map((campaign) => (
        <li
          key={campaign.id}
          className="rounded-lg border border-black/10 p-4 dark:border-white/15"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h4 className="font-medium">
              <Link
                href={`/dashboard/campaigns/${campaign.id}`}
                className="underline-offset-2 hover:underline"
              >
                {campaign.title}
              </Link>
            </h4>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium dark:bg-white/10">
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </span>
          </div>

          <div className="mt-2">
            <CampaignProgress
              tone="light"
              raisedAmountMinor={campaign.raisedAmountMinor}
              goalAmountMinor={campaign.goalAmountMinor}
              progressPercent={campaign.progressPercent}
              currency={campaign.currency}
            />
          </div>

          <p className="mt-1.5 text-xs opacity-70">
            {campaign.donationCount}{" "}
            {campaign.donationCount === 1 ? "donation" : "donations"} ·{" "}
            {formatMoney(campaign.remainingAmountMinor, campaign.currency)} to go
          </p>
        </li>
      ))}
    </ul>
  );
}
