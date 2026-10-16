import Link from "next/link";
import { formatDonationAmount, formatDonationDate } from "@/features/donations/format";
import type { DonationView } from "@/features/donations/types";
import { DonationStatusBadge } from "./DonationStatusBadge";

/**
 * Donations as rows linking to their tracking page.
 * `perspective` decides the secondary line: the NGO for donors, the donor for NGOs.
 */
export function DonationList({
  donations,
  perspective,
}: {
  donations: DonationView[];
  perspective: "DONOR" | "NGO";
}) {
  return (
    <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/15 dark:border-white/15">
      {donations.map((donation) => {
        const title =
          perspective === "DONOR"
            ? donation.ngo.name
            : (donation.donorName ?? "Anonymous donor");
        return (
          <li key={donation.id}>
            <Link
              href={`/donations/${donation.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{title}</p>
                <p className="text-sm opacity-70">
                  <time dateTime={donation.createdAt}>
                    {formatDonationDate(donation.createdAt)}
                  </time>
                  {perspective === "DONOR" && donation.isAnonymous ? " · Anonymous" : ""}
                </p>
              </div>
              <span className="font-semibold tabular-nums">
                {formatDonationAmount(donation.amount, donation.currency)}
              </span>
              <DonationStatusBadge status={donation.status} />
              <span className="sr-only">View tracking</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
