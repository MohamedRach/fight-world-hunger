"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { getJson } from "@/features/api-client";
import type { CampaignSummary } from "@/features/campaigns/types";
import { DonateDialog } from "@/components/donations/DonateDialog";
import { CampaignCard } from "./CampaignCard";

interface CountryCampaignListProps {
  countryCode: string;
  countryName: string;
}

type LoadOutcome =
  | { status: "error"; message: string }
  | { status: "success"; campaigns: CampaignSummary[] };

type LoadState = LoadOutcome | { status: "loading" };

/**
 * Campaigns serving the selected country, loaded on demand from the mock
 * data layer. Mirrors `NgoList` so the sidebar behaves consistently.
 */
export function CountryCampaignList({ countryCode, countryName }: CountryCampaignListProps) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${countryCode}:${attempt}`;
  const [result, setResult] = useState<{ key: string; outcome: LoadOutcome } | null>(null);
  const [donating, setDonating] = useState<CampaignSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getJson<CampaignSummary[]>(
      `/api/countries/${encodeURIComponent(countryCode)}/campaigns`,
      controller.signal,
    )
      .then((campaigns) =>
        setResult({ key: requestKey, outcome: { status: "success", campaigns } }),
      )
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
  } else if (state.campaigns.length === 0) {
    content = (
      <p className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-slate-400">
        No campaigns are running in {countryName} yet. Organizations can create one from their
        dashboard.
      </p>
    );
  } else {
    const { campaigns } = state;
    content = (
      <div>
        <p className="text-xs text-slate-400">
          {campaigns.length} {campaigns.length === 1 ? "campaign" : "campaigns"}
        </p>
        <ul className="mt-2 space-y-2">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <CampaignCard campaign={campaign} onDonate={setDonating} />
            </li>
          ))}
        </ul>
      </div>
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
          // Refresh so the progress bar reflects the new donation immediately.
          onDonated={reload}
        />
      ) : null}
    </div>
  );
}
