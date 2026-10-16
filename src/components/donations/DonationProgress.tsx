import { DONATION_PROGRESS_STEPS } from "@/features/donations/status";
import {
  DONATION_STATUS_DESCRIPTIONS,
  DONATION_STATUS_LABELS,
  type DonationStatus,
} from "@/features/donations/types";

/** Where the donation is on its normal path; stopped donations say so instead. */
export function DonationProgress({ status }: { status: DonationStatus }) {
  if (status === "REJECTED" || status === "CANCELLED") {
    return (
      <div className="rounded-lg border border-red-600/30 bg-red-600/5 px-4 py-3 text-sm text-red-700 dark:border-red-400/30 dark:text-red-300">
        <p className="font-medium">{DONATION_STATUS_LABELS[status]}</p>
        <p className="mt-0.5">{DONATION_STATUS_DESCRIPTIONS[status]}</p>
      </div>
    );
  }

  const current = DONATION_PROGRESS_STEPS.indexOf(status);
  return (
    <div>
      <p className="mb-2 text-sm font-medium sm:hidden">
        Step {current + 1} of {DONATION_PROGRESS_STEPS.length}: {DONATION_STATUS_LABELS[status]}
      </p>
      <ol className="flex gap-2" aria-label="Donation progress">
        {DONATION_PROGRESS_STEPS.map((step, index) => {
          const reached = index <= current;
          const active = index === current;
          return (
            <li
              key={step}
              className="flex min-w-0 flex-1 flex-col gap-1.5"
              aria-current={active ? "step" : undefined}
            >
              <div
                className={`h-1 rounded-full ${
                  reached ? "bg-emerald-600 dark:bg-emerald-400" : "bg-black/10 dark:bg-white/10"
                }`}
                aria-hidden="true"
              />
              <span
                className={`hidden truncate text-xs sm:block ${active ? "font-semibold" : reached ? "" : "opacity-60"}`}
              >
                {DONATION_STATUS_LABELS[step]}
                <span className="sr-only">
                  {active ? " (current)" : reached ? " (done)" : " (not yet)"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm opacity-80">{DONATION_STATUS_DESCRIPTIONS[status]}</p>
    </div>
  );
}
