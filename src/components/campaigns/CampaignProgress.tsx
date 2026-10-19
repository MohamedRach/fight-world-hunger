import { formatMoney, type CurrencyCode } from "@/features/money";

interface CampaignProgressProps {
  raisedAmountMinor: number;
  goalAmountMinor: number;
  progressPercent: number;
  currency: CurrencyCode;
  /** `dark` for the map sidebar, `light` for app pages. */
  tone?: "dark" | "light";
}

/**
 * Shared progress bar so the country list, campaign cards and the NGO
 * dashboard always present the same figures the same way.
 */
export function CampaignProgress({
  raisedAmountMinor,
  goalAmountMinor,
  progressPercent,
  currency,
  tone = "dark",
}: CampaignProgressProps) {
  const trackClass = tone === "dark" ? "bg-white/10" : "bg-black/10 dark:bg-white/10";
  const labelClass = tone === "dark" ? "text-slate-400" : "opacity-70";
  const valueClass = tone === "dark" ? "text-white" : "";

  return (
    <div>
      <div
        className={`h-1.5 w-full overflow-hidden rounded-full ${trackClass}`}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${progressPercent}% of the fundraising goal`}
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className={`mt-1 text-[11px] ${labelClass}`}>
        <span className={`font-semibold tabular-nums ${valueClass}`}>
          {formatMoney(raisedAmountMinor, currency)}
        </span>{" "}
        raised of {formatMoney(goalAmountMinor, currency)} ·{" "}
        <span className="tabular-nums">{progressPercent}%</span>
      </p>
    </div>
  );
}
