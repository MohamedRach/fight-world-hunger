import { DONATION_STATUS_LABELS, type DonationStatus } from "@/features/donations/types";

const STYLES: Record<DonationStatus, string> = {
  PENDING: "bg-black/5 dark:bg-white/10",
  CONFIRMED:
    "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  IN_PROGRESS:
    "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  COMPLETED: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
  REJECTED: "bg-red-600/10 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  CANCELLED: "bg-red-600/10 text-red-700 dark:bg-red-400/15 dark:text-red-300",
};

export function DonationStatusBadge({ status }: { status: DonationStatus }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STYLES[status]}`}
    >
      {DONATION_STATUS_LABELS[status]}
    </span>
  );
}
