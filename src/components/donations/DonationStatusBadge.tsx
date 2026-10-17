import { DONATION_STATUS_LABELS, type DonationStatus } from "@/features/donations/types";

const BADGE_CLASS: Record<DonationStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CONFIRMED: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  IN_PROGRESS: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  COMPLETED: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300",
  CANCELLED: "bg-black/10 opacity-70 dark:bg-white/10",
  REJECTED: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function DonationStatusBadge({ status }: { status: DonationStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASS[status]}`}
    >
      {DONATION_STATUS_LABELS[status]}
    </span>
  );
}
