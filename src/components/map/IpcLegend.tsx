import {
  IPC_NOT_CLASSIFIED_COLOR,
  IPC_NOT_CLASSIFIED_LABEL,
  IPC_PHASES,
  REGION_MODE_COUNTRY_COLOR,
} from "@/features/fewsnet/source";
import type { RegionalDataset } from "@/features/fewsnet/types";

interface IpcLegendProps {
  dataset: RegionalDataset;
  className?: string;
}

/**
 * Categorical legend for FEWS NET IPC-compatible phases. Deliberately separate
 * from the white-to-red undernourishment legend: phases are categories, not a
 * continuous percentage scale.
 */
export function IpcLegend({ dataset, className }: IpcLegendProps) {
  return (
    <section
      aria-labelledby="ipc-legend-title"
      className={`rounded-xl border border-white/10 bg-slate-950/80 p-3 text-xs text-slate-200 shadow-lg backdrop-blur ${className ?? ""}`}
    >
      <h2 id="ipc-legend-title" className="text-sm font-semibold text-white">
        {dataset.countryName}: acute food insecurity
      </h2>
      <p className="mt-0.5 text-[11px] text-slate-400">
        IPC-compatible phase · current situation · {dataset.periodLabel}
      </p>

      <ol className="mt-2 space-y-1" aria-label="IPC phase colours">
        {IPC_PHASES.map((definition) => (
          <li key={definition.phase} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3.5 w-5 shrink-0 rounded-sm border border-white/20"
              style={{ backgroundColor: definition.color }}
            />
            <span className="tabular-nums">Phase {definition.phase}</span>
            <span className="text-slate-300">{definition.name}</span>
            <span className="ml-auto tabular-nums text-slate-400">
              {dataset.summary.byPhase[definition.phase]}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 pt-1">
          <span
            aria-hidden="true"
            className="h-3.5 w-5 shrink-0 rounded-sm border border-white/20"
            style={{ backgroundColor: IPC_NOT_CLASSIFIED_COLOR }}
          />
          <span>{IPC_NOT_CLASSIFIED_LABEL}</span>
          <span className="ml-auto tabular-nums text-slate-400">{dataset.summary.notClassified}</span>
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3.5 w-5 shrink-0 rounded-sm border border-white/20"
            style={{ backgroundColor: REGION_MODE_COUNTRY_COLOR }}
          />
          <span className="text-slate-400">Other countries (muted while exploring regions)</span>
        </li>
      </ol>

      <p className="mt-2 max-w-[17rem] text-[11px] leading-snug text-slate-400">
        Grey areas were not classified or have no data; this is not the same as Phase 1.
        Phases are categories and are not comparable with the national undernourishment percentage.
      </p>
      <p className="mt-1.5 text-[11px] text-slate-300">
        {dataset.attribution.creditLine} —{" "}
        <a
          href={dataset.attribution.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-slate-500 underline-offset-2 hover:text-white"
        >
          fews.net
        </a>
      </p>
    </section>
  );
}
