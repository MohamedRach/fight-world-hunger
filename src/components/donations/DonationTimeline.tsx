import { formatDonationDateTime } from "@/features/donations/format";
import {
  DONATION_STATUS_LABELS,
  type DonationActorRole,
  type DonationHistoryEntryView,
} from "@/features/donations/types";
import { DonationStatusBadge } from "./DonationStatusBadge";

const ACTOR_LABELS: Record<DonationActorRole, string> = {
  DONOR: "the donor",
  NGO: "the NGO",
};

/** Status history, oldest first. */
export function DonationTimeline({
  history,
  ngoName,
}: {
  history: DonationHistoryEntryView[];
  ngoName: string;
}) {
  return (
    <ol className="space-y-5 border-l border-black/10 pl-5 dark:border-white/15">
      {history.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute top-1.5 -left-[1.6875rem] h-3 w-3 rounded-full border-2 border-[var(--background)] bg-emerald-600 dark:bg-emerald-400"
          />
          <div className="flex flex-wrap items-center gap-2">
            <DonationStatusBadge status={entry.newStatus} />
            <time dateTime={entry.createdAt} className="text-xs opacity-70">
              {formatDonationDateTime(entry.createdAt)}
            </time>
          </div>
          <p className="mt-1 text-sm">
            {entry.previousStatus === null
              ? "Donation pledged by the donor."
              : `Moved from ${DONATION_STATUS_LABELS[entry.previousStatus].toLowerCase()} to ${DONATION_STATUS_LABELS[entry.newStatus].toLowerCase()} by ${
                  entry.actor === "NGO" ? ngoName : ACTOR_LABELS[entry.actor]
                }.`}
          </p>
          {entry.note && (
            <p className="mt-1 whitespace-pre-line rounded-lg bg-black/5 px-3 py-2 text-sm dark:bg-white/10">
              {entry.note}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
