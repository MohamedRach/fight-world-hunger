import type { ResolvedCountry } from "@/features/geography/types";
import { classifyHungerValue } from "@/features/hunger/color-scale";
import { formatHungerValue } from "@/features/hunger/format";
import type { HungerIndicatorMeta, HungerObservation } from "@/features/hunger/types";

interface CountryTooltipProps {
  country: ResolvedCountry;
  observation: HungerObservation | undefined;
  indicator: Pick<HungerIndicatorMeta, "shortName">;
  /** Pointer position relative to the globe container. */
  position: { x: number; y: number };
  /** Container size, used to keep the tooltip inside the viewport. */
  bounds: { width: number; height: number };
}

const TOOLTIP_WIDTH = 230;
const TOOLTIP_HEIGHT = 92;
const OFFSET = 16;

export function CountryTooltip({
  country,
  observation,
  indicator,
  position,
  bounds,
}: CountryTooltipProps) {
  const left =
    position.x + OFFSET + TOOLTIP_WIDTH > bounds.width
      ? position.x - OFFSET - TOOLTIP_WIDTH
      : position.x + OFFSET;
  const top =
    position.y + OFFSET + TOOLTIP_HEIGHT > bounds.height
      ? position.y - OFFSET - TOOLTIP_HEIGHT
      : position.y + OFFSET;

  const severity = classifyHungerValue(observation?.value);
  const hasData = observation !== undefined && observation.value !== null;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 rounded-lg border border-white/10 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur"
      style={{ left, top, width: TOOLTIP_WIDTH }}
    >
      <p className="text-sm font-semibold text-white">{country.name}</p>
      <p className="mt-1 flex items-center gap-2">
        <span className="text-slate-400">{indicator.shortName}</span>
        <span className="font-medium tabular-nums">{formatHungerValue(observation)}</span>
        {severity ? <span className="text-slate-400">({severity.severity})</span> : null}
      </p>
      {hasData && observation.periodLabel ? (
        <p className="text-[11px] text-slate-400">{observation.periodLabel}</p>
      ) : (
        <p className="text-[11px] text-slate-400">
          {country.code
            ? "No published estimate for this country."
            : "Not reported separately in the dataset."}
        </p>
      )}
    </div>
  );
}
