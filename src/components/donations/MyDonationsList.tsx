"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ApiError, patchJson } from "@/features/api-client";
import {
  DONATION_STATUS_DESCRIPTIONS,
  DONATION_STATUS_LABELS,
  DONATION_STATUSES,
  type DonationStatus,
  type DonationView,
} from "@/features/donations/types";
import { formatMoney } from "@/features/money";
import { DonationStatusBadge } from "./DonationStatusBadge";

interface MyDonationsListProps {
  initialDonations: DonationView[];
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function MyDonationsList({ initialDonations }: MyDonationsListProps) {
  const [donations, setDonations] = useState(initialDonations);
  const [filter, setFilter] = useState<DonationStatus | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const result = new Map<DonationStatus | "ALL", number>([["ALL", donations.length]]);
    for (const donation of donations) {
      result.set(donation.status, (result.get(donation.status) ?? 0) + 1);
    }
    return result;
  }, [donations]);

  const visible = filter === "ALL" ? donations : donations.filter((d) => d.status === filter);

  async function cancel(donationId: string) {
    setBusyId(donationId);
    setError(null);
    try {
      const updated = await patchJson<DonationView>(`/api/donations/${donationId}/status`, {
        status: "CANCELLED",
      });
      setDonations((previous) =>
        previous.map((donation) => (donation.id === updated.id ? updated : donation)),
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (donations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-8 text-center dark:border-white/20">
        <h2 className="font-semibold">No donations yet</h2>
        <p className="mx-auto mt-1 max-w-md text-sm opacity-70">
          Pick a country on the map, choose a campaign and make a simulated donation. It will
          appear here so you can follow its progress.
        </p>
        <Link
          href="/map"
          className="mt-5 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
        >
          Explore campaigns on the map
        </Link>
      </div>
    );
  }

  const filters: Array<DonationStatus | "ALL"> = [
    "ALL",
    ...DONATION_STATUSES.filter((status) => (counts.get(status) ?? 0) > 0),
  ];

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Filter donations by status" className="flex flex-wrap gap-2">
        {filters.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === option
                ? "border-emerald-600 bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950"
                : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            }`}
          >
            {option === "ALL" ? "All" : DONATION_STATUS_LABELS[option]} ({counts.get(option) ?? 0})
          </button>
        ))}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-6 text-sm opacity-70 dark:border-white/20">
          No donations with this status.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((donation) => {
            const isExpanded = expandedId === donation.id;
            return (
              <li
                key={donation.id}
                className="rounded-xl border border-black/10 p-4 dark:border-white/15"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">
                      <Link
                        href={`/campaigns/${donation.campaign.slug}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {donation.campaign.title}
                      </Link>
                    </h3>
                    <p className="mt-0.5 text-sm opacity-70">
                      <Link
                        href={`/ngos/${donation.ngo.slug}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {donation.ngo.name}
                      </Link>
                      {" · "}
                      {formatDate(donation.createdAt)}
                      {donation.isDemoSeed ? (
                        <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-[11px] dark:bg-white/10">
                          Demo data
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">
                      {formatMoney(donation.amountMinor, donation.currency)}
                    </p>
                    <DonationStatusBadge status={donation.status} />
                  </div>
                </div>

                <p className="mt-2 text-xs opacity-70">
                  {DONATION_STATUS_DESCRIPTIONS[donation.status]}
                </p>

                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
                  <div className="flex gap-1">
                    <dt>Counts towards the campaign total:</dt>
                    <dd>{donation.countsTowardRaised ? "Yes" : "Not yet"}</dd>
                  </div>
                  {donation.paymentMethod ? (
                    <div className="flex gap-1">
                      <dt>Card:</dt>
                      <dd>
                        {donation.paymentMethod.brand} ••{donation.paymentMethod.last4}
                      </dd>
                    </div>
                  ) : null}
                  {donation.isAnonymous ? (
                    <div className="flex gap-1">
                      <dt>Visibility:</dt>
                      <dd>Anonymous</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : donation.id)}
                    aria-expanded={isExpanded}
                    className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    {isExpanded ? "Hide progress" : "View progress"}
                  </button>
                  {donation.status === "PENDING" ? (
                    <button
                      type="button"
                      disabled={busyId === donation.id}
                      onClick={() => cancel(donation.id)}
                      className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      {busyId === donation.id ? "Cancelling…" : "Cancel pledge"}
                    </button>
                  ) : null}
                </div>

                {isExpanded ? (
                  <ol className="mt-4 space-y-3 border-l border-black/10 pl-4 dark:border-white/15">
                    {donation.history.map((event, index) => (
                      <li key={`${event.to}-${event.at}-${index}`} className="relative">
                        <span
                          aria-hidden="true"
                          className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400"
                        />
                        <p className="text-sm font-medium">
                          {DONATION_STATUS_LABELS[event.to]}
                          <span className="ml-2 text-xs font-normal opacity-60">
                            {formatDate(event.at)} ·{" "}
                            {event.actorRole === "NGO"
                              ? "by the organization"
                              : event.actorRole === "DONOR"
                                ? "by you"
                                : "automatic"}
                          </span>
                        </p>
                        {event.note ? (
                          <p className="mt-0.5 text-xs opacity-70">{event.note}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
