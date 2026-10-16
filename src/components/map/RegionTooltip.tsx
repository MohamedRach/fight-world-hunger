import { formatPeriodLabel } from "@/features/fewsnet/normalize";
import { ipcPhaseDefinition } from "@/features/fewsnet/source";
import type { RegionClassification } from "@/features/fewsnet/types";

interface RegionTooltipProps {
  region: RegionClassification;
  position: { x: number; y: number };
  bounds: { width: number; height: number };
}

const TOOLTIP_WIDTH = 250;
const TOOLTIP_HEIGHT = 100;
const OFFSET = 16;

export function regionPhaseLabel(region: Pick<RegionClassification, "phase" | "description">): string {
  const definition = ipcPhaseDefinition(region.phase);
  if (definition) return `Phase ${definition.phase} · ${definition.name}`;
  return region.description ? `${region.description} (not classified)` : "Not classified / no data";
}

export function RegionTooltip({ region, position, bounds }: RegionTooltipProps) {
  const left =
    position.x + OFFSET + TOOLTIP_WIDTH > bounds.width
      ? position.x - OFFSET - TOOLTIP_WIDTH
      : position.x + OFFSET;
  const top =
    position.y + OFFSET + TOOLTIP_HEIGHT > bounds.height
      ? position.y - OFFSET - TOOLTIP_HEIGHT
      : position.y + OFFSET;
  const definition = ipcPhaseDefinition(region.phase);

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 rounded-lg border border-white/10 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur"
      style={{ left, top, width: TOOLTIP_WIDTH }}
    >
      <p className="text-sm font-semibold text-white">{region.name}</p>
      {region.fullName !== region.name ? (
        <p className="truncate text-[11px] text-slate-400" title={region.fullName}>
          {region.fullName}
        </p>
      ) : null}
      <p className="mt-1 flex items-center gap-2">
        {definition ? (
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-sm border border-white/20"
            style={{ backgroundColor: definition.color }}
          />
        ) : null}
        <span className="font-medium">{regionPhaseLabel(region)}</span>
      </p>
      <p className="text-[11px] text-slate-400">
        {formatPeriodLabel(region.periodStart, region.periodEnd)} · FEWS NET
      </p>
    </div>
  );
}
