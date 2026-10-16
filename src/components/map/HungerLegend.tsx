import {
  HUNGER_SEVERITY_CLASSES,
  NO_DATA_COLOR,
  NO_DATA_LABEL,
} from "@/features/hunger/color-scale";
import type { HungerDataset } from "@/features/hunger/types";

interface HungerLegendProps {
  dataset: Pick<HungerDataset, "indicator">;
  /** Period shown under the title, e.g. "2022–2024 (3-year average)". */
  periodLabel: string | null;
  className?: string;
}

export function HungerLegend({ dataset, periodLabel, className }: HungerLegendProps) {
  return (
    <section
      aria-labelledby="hunger-legend-title"
      className={`rounded-xl border border-white/10 bg-slate-950/80 p-3 text-xs text-slate-200 shadow-lg backdrop-blur ${className ?? ""}`}
    >
      <h2 id="hunger-legend-title" className="text-sm font-semibold text-white">
        {dataset.indicator.name}
      </h2>
      <p className="mt-0.5 text-[11px] text-slate-400">
        % of population{periodLabel ? ` · ${periodLabel}` : ""}
      </p>

      <ol className="mt-2 space-y-1" aria-label="Colour scale">
        {HUNGER_SEVERITY_CLASSES.map((severityClass) => (
          <li key={severityClass.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3.5 w-5 shrink-0 rounded-sm border border-white/20"
              style={{ backgroundColor: severityClass.color }}
            />
            <span className="tabular-nums">{severityClass.label}</span>
            <span className="text-slate-400">{severityClass.severity}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 pt-1">
          <span
            aria-hidden="true"
            className="h-3.5 w-5 shrink-0 rounded-sm border border-white/20"
            style={{ backgroundColor: NO_DATA_COLOR }}
          />
          <span>{NO_DATA_LABEL}</span>
        </li>
      </ol>

      <p className="mt-2 max-w-[16rem] text-[11px] leading-snug text-slate-400">
        Grey countries have no published estimate; this does not mean zero hunger.
        Values shown as &ldquo;&lt; 2.5%&rdquo; are a reporting floor, not an exact figure.
      </p>
    </section>
  );
}
