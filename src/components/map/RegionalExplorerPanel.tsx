"use client";

import { formatPeriodLabel } from "@/features/fewsnet/normalize";
import { ipcPhaseDefinition } from "@/features/fewsnet/source";
import type { RegionClassification, RegionalDataset } from "@/features/fewsnet/types";
import { formatRetrievalDate } from "@/features/hunger/format";
import { regionPhaseLabel } from "./RegionTooltip";
import type { RegionalDataState } from "./useRegionalData";

interface RegionalExplorerPanelProps {
  countryName: string;
  regionMode: boolean;
  state: RegionalDataState;
  selectedRegion: RegionClassification | null;
  onEnterRegionMode: () => void;
  onExitRegionMode: () => void;
  onClearRegion: () => void;
  onRetry: () => void;
}

const primaryButton =
  "rounded-md bg-sky-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";
const secondaryButton =
  "rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400";

function Attribution({ dataset }: { dataset: RegionalDataset }) {
  return (
    <p className="text-[11px] leading-snug text-slate-400">
      {dataset.attribution.creditLine}.{" "}
      <a
        href={dataset.attribution.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-slate-500 underline-offset-2 hover:text-white"
      >
        {dataset.attribution.fullName}
      </a>
      {" · "}
      <a
        href={dataset.attribution.datasetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-slate-500 underline-offset-2 hover:text-white"
      >
        dataset extract
      </a>
      {" · "}
      <a
        href={dataset.attribution.policyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-slate-500 underline-offset-2 hover:text-white"
      >
        usage policy
      </a>
      . FEWS NET does not endorse this platform. Retrieved {formatRetrievalDate(dataset.retrievedAt)}
      {dataset.providerLastModified
        ? `; provider record updated ${dataset.providerLastModified.slice(0, 10)}`
        : ""}
      .
    </p>
  );
}

function SelectedRegion({
  region,
  onClear,
}: {
  region: RegionClassification;
  onClear: () => void;
}) {
  const definition = ipcPhaseDefinition(region.phase);
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{region.name}</p>
          {region.fullName !== region.name ? (
            <p className="text-[11px] text-slate-400">{region.fullName}</p>
          ) : null}
        </div>
        <button type="button" onClick={onClear} className={secondaryButton}>
          Deselect
        </button>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-10 w-3 rounded-full ring-1 ring-white/20"
          style={{ backgroundColor: definition?.color ?? "#9ca3af" }}
        />
        <div>
          <p className="text-lg font-bold text-white">{regionPhaseLabel(region)}</p>
          <p className="text-xs text-slate-400">
            {region.scenarioName} · {formatPeriodLabel(region.periodStart, region.periodEnd)}
          </p>
        </div>
      </div>
      {definition ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-300">{definition.summary}</p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          FEWS NET did not assign an IPC phase to this area for this period
          {region.description ? ` (“${region.description}”)` : ""}. This does not indicate low severity.
        </p>
      )}

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
        <dt>Unit type</dt>
        <dd className="text-slate-300">{region.unitType}</dd>
        <dt>FNID</dt>
        <dd className="font-mono text-slate-300">{region.fnid}</dd>
        <dt>Scale</dt>
        <dd className="text-slate-300">{region.classificationScale}</dd>
        <dt>Series</dt>
        <dd className="text-slate-300">{region.assistanceVariant}</dd>
        <dt>Source</dt>
        <dd className="text-slate-300">
          {region.sourceOrganization}, {region.sourceDocument}
        </dd>
        <dt>Usage policy</dt>
        <dd className="text-slate-300">{region.dataUsagePolicy}</dd>
      </dl>
    </div>
  );
}

export function RegionalExplorerPanel({
  countryName,
  regionMode,
  state,
  selectedRegion,
  onEnterRegionMode,
  onExitRegionMode,
  onClearRegion,
  onRetry,
}: RegionalExplorerPanelProps) {
  if (!regionMode) {
    return (
      <div className="space-y-2">
        <p className="text-xs leading-relaxed text-slate-300">
          FEWS NET publishes IPC-compatible acute food insecurity classifications for the
          analysis areas of the countries it monitors. Availability and reporting periods differ
          by country.
        </p>
        <button type="button" onClick={onEnterRegionMode} className={primaryButton}>
          Explore regions in {countryName}
        </button>
      </div>
    );
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div role="status" aria-live="polite" className="space-y-2">
        <p className="text-xs text-slate-300">Loading FEWS NET regional data for {countryName}…</p>
        <p className="text-[11px] text-slate-400">
          The first load for a country can take up to a minute while boundaries are fetched from
          FEWS NET and simplified.
        </p>
        <div aria-hidden="true" className="h-16 animate-pulse rounded-lg bg-white/5" />
        <button type="button" onClick={onExitRegionMode} className={secondaryButton}>
          Back to country view
        </button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div role="alert" className="space-y-2 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-100">
        <p>Regional data could not be loaded. {state.message}</p>
        <div className="flex gap-2">
          {state.retryable ? (
            <button type="button" onClick={onRetry} className={secondaryButton}>
              Try again
            </button>
          ) : null}
          <button type="button" onClick={onExitRegionMode} className={secondaryButton}>
            Back to country view
          </button>
        </div>
      </div>
    );
  }

  const { availability } = state;

  if (availability.status !== "available") {
    return (
      <div className="space-y-2">
        <p className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-slate-300">
          {availability.message}
        </p>
        <p className="text-[11px] text-slate-400">
          Checked FEWS NET for IPC-compatible current-situation classifications (scales IPC 3.1 /
          IPC 3.1-aligned). Country-level undernourishment data above remains available.
        </p>
        <button type="button" onClick={onExitRegionMode} className={secondaryButton}>
          Back to country view
        </button>
      </div>
    );
  }

  const { dataset } = availability;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-300">
          <span className="font-semibold text-white">{dataset.features.length}</span> analysis areas ·{" "}
          {dataset.summary.classified} classified · {dataset.summary.notClassified} not classified
          {dataset.pointUnits.length > 0
            ? ` · ${dataset.pointUnits.length} point-based units (e.g. IDP camps) not drawn`
            : ""}
        </p>
        <button type="button" onClick={onExitRegionMode} className={secondaryButton}>
          Back to country view
        </button>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
        <dt>Indicator</dt>
        <dd className="text-slate-300">{dataset.indicator.name}</dd>
        <dt>Period</dt>
        <dd className="text-slate-300">{dataset.periodLabel}</dd>
        <dt>Analysis date</dt>
        <dd className="text-slate-300">{dataset.analysisDate}</dd>
        <dt>Scale</dt>
        <dd className="text-slate-300">{dataset.classificationScales.join(", ")}</dd>
        <dt>Document</dt>
        <dd className="text-slate-300">{dataset.sourceDocuments.join("; ")}</dd>
      </dl>

      <p className="text-xs leading-relaxed text-slate-300">{dataset.indicator.description}</p>

      {selectedRegion ? (
        <SelectedRegion region={selectedRegion} onClear={onClearRegion} />
      ) : (
        <p className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-slate-400">
          Hover over an area on the globe for its phase, or click it for details.
        </p>
      )}

      <Attribution dataset={dataset} />
    </div>
  );
}
