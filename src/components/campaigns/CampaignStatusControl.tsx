"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, patchJson } from "@/features/api-client";
import {
  CAMPAIGN_STATUS_DESCRIPTIONS,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_TRANSITIONS,
  type CampaignStatus,
  type CampaignSummary,
} from "@/features/campaigns/types";

interface CampaignStatusControlProps {
  campaignId: string;
  status: CampaignStatus;
}

/** Lets the owning NGO move a campaign through its lifecycle. */
export function CampaignStatusControl({ campaignId, status }: CampaignStatusControlProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<CampaignStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const next = CAMPAIGN_STATUS_TRANSITIONS[status];

  async function change(to: CampaignStatus) {
    setBusy(to);
    setError(null);
    try {
      await patchJson<CampaignSummary>(`/api/campaigns/${campaignId}/status`, { status: to });
      // Re-render the server page so every figure and badge stays consistent.
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <p className="text-xs opacity-70">{CAMPAIGN_STATUS_DESCRIPTIONS[status]}</p>

      {next.length === 0 ? (
        <p className="mt-2 text-xs opacity-70">
          This is a final status: the campaign can no longer change state.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {next.map((option) => (
            <button
              key={option}
              type="button"
              disabled={busy !== null}
              onClick={() => change(option)}
              className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
            >
              {busy === option ? "Saving…" : `Mark as ${CAMPAIGN_STATUS_LABELS[option]}`}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
