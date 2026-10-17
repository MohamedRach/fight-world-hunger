"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, patchJson } from "@/features/api-client";
import {
  DONATION_STATUS_LABELS,
  type CampaignDonationView,
  type DonationStatus,
} from "@/features/donations/types";
import { formatMoney } from "@/features/money";
import { DonationStatusBadge } from "./DonationStatusBadge";

interface CampaignDonationsTableProps {
  donations: CampaignDonationView[];
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Donations received by a campaign, with the progress-status controls the
 * owning NGO is allowed to use.
 *
 * These statuses describe the work, not money: this build never processes
 * payments, so no control here can mark a donation as paid or settled.
 */
export function CampaignDonationsTable({ donations }: CampaignDonationsTableProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(donationId: string, status: DonationStatus) {
    setBusyId(donationId);
    setError(null);
    try {
      await patchJson<CampaignDonationView>(`/api/donations/${donationId}/status`, { status });
      // Refresh so the campaign totals and the donor's view agree.
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (donations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-black/15 p-6 text-sm opacity-70 dark:border-white/20">
        No donations yet. Once the campaign is active and someone donates, it appears here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}

      <ul className="space-y-3">
        {donations.map((donation) => (
          <li
            key={donation.id}
            className="rounded-xl border border-black/10 p-4 dark:border-white/15"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {formatMoney(donation.amountMinor, donation.currency)}
                  <span className="ml-2 text-sm font-normal opacity-70">
                    {donation.donorDisplayName}
                  </span>
                </p>
                <p className="mt-0.5 text-xs opacity-70">
                  {formatDate(donation.createdAt)}
                  {donation.countsTowardRaised
                    ? " · counts towards the total"
                    : " · not counted yet"}
                  {donation.isDemoSeed ? " · demo data" : ""}
                </p>
                {donation.message ? (
                  <p className="mt-2 rounded-lg bg-black/5 p-2 text-xs dark:bg-white/5">
                    “{donation.message}”
                  </p>
                ) : null}
              </div>
              <DonationStatusBadge status={donation.status} />
            </div>

            {donation.allowedNextStatuses.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {donation.allowedNextStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={busyId === donation.id}
                    onClick={() => update(donation.id, status)}
                    className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    {busyId === donation.id
                      ? "Saving…"
                      : `Mark as ${DONATION_STATUS_LABELS[status]}`}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs opacity-60">No further status changes are possible.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
