"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { resolveCountry } from "@/features/geography/country-codes";
import { fetchCountryGeometry } from "@/features/geography/geometry";
import type { ResolvedCountry } from "@/features/geography/types";
import { hungerColor } from "@/features/hunger/color-scale";
import type { HungerDataset } from "@/features/hunger/types";
import { NgoList } from "@/components/ngos/NgoList";
import { CountryDetailsSidebar } from "./CountryDetailsSidebar";
import { CountryTooltip } from "./CountryTooltip";
import { GlobeControls } from "./GlobeControls";
import { HungerLegend } from "./HungerLegend";
import { useCountrySelection } from "./useCountrySelection";
import type { GlobeViewHandle } from "./WorldHungerGlobe";

const WorldHungerGlobe = dynamic(() => import("./WorldHungerGlobe"), {
  ssr: false,
  loading: () => <GlobeStatus message="Preparing the 3D globe…" />,
});

interface HungerGlobeExplorerProps {
  dataset: HungerDataset;
}

type GeometryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; countries: ResolvedCountry[] };

function GlobeStatus({ message, isError = false }: { message: string; isError?: boolean }) {
  return (
    <div
      role={isError ? "alert" : "status"}
      className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm"
    >
      <p
        className={`rounded-lg px-4 py-3 ring-1 backdrop-blur ${
          isError
            ? "bg-red-500/10 text-red-100 ring-red-400/30"
            : "bg-slate-950/70 text-slate-200 ring-white/10"
        }`}
      >
        {message}
      </p>
    </div>
  );
}

function mostCommonPeriod(dataset: HungerDataset): string | null {
  const counts = new Map<string, number>();
  for (const observation of Object.values(dataset.observations)) {
    if (observation.periodLabel) {
      counts.set(observation.periodLabel, (counts.get(observation.periodLabel) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

export function HungerGlobeExplorer({ dataset }: HungerGlobeExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeHandleRef = useRef<GlobeViewHandle>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [geometry, setGeometry] = useState<GeometryState>({ status: "loading" });
  const { hovered, selected, hover, select, clearSelection } = useCountrySelection();

  useEffect(() => {
    const controller = new AbortController();
    fetchCountryGeometry(controller.signal)
      .then((collection) =>
        setGeometry({ status: "ready", countries: collection.features.map(resolveCountry) }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setGeometry({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      });
    return () => controller.abort();
  }, []);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const colorForCountry = useCallback(
    (country: ResolvedCountry) =>
      hungerColor(country.code ? dataset.observations[country.code]?.value : null),
    [dataset.observations],
  );

  const periodLabel = useMemo(() => mostCommonPeriod(dataset), [dataset]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  const handlePickCountry = useCallback(
    (country: ResolvedCountry) => {
      select(country);
      globeHandleRef.current?.focusCountry(country);
    },
    [select],
  );

  const selectedObservation =
    selected?.code !== null && selected?.code !== undefined
      ? dataset.observations[selected.code]
      : undefined;
  const hoveredObservation =
    hovered?.code !== null && hovered?.code !== undefined
      ? dataset.observations[hovered.code]
      : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => hover(null)}
        className="relative min-h-[60vh] flex-1 overflow-hidden lg:min-h-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(30,58,138,0.35) 0%, rgba(7,13,26,0) 60%)",
        }}
      >
        {geometry.status === "ready" && size.width > 0 && size.height > 0 ? (
          <WorldHungerGlobe
            handleRef={globeHandleRef}
            countries={geometry.countries}
            colorForCountry={colorForCountry}
            hovered={hovered}
            selected={selected}
            onHover={hover}
            onSelect={select}
            width={size.width}
            height={size.height}
          />
        ) : null}

        {geometry.status === "loading" ? (
          <GlobeStatus message="Loading country boundaries…" />
        ) : null}
        {geometry.status === "error" ? (
          <GlobeStatus
            isError
            message={`Country boundaries could not be loaded (${geometry.message}). Reload the page to try again.`}
          />
        ) : null}

        {hovered && geometry.status === "ready" ? (
          <CountryTooltip
            country={hovered}
            observation={hoveredObservation}
            indicator={dataset.indicator}
            position={pointer}
            bounds={size}
          />
        ) : null}

        {geometry.status === "ready" ? (
          <GlobeControls
            className="absolute right-4 top-4 z-10"
            countries={geometry.countries}
            selected={selected}
            onSelectCountry={handlePickCountry}
            onZoomIn={() => globeHandleRef.current?.zoomBy(0.7)}
            onZoomOut={() => globeHandleRef.current?.zoomBy(1 / 0.7)}
            onReset={() => globeHandleRef.current?.resetView()}
          />
        ) : null}

        <HungerLegend
          dataset={dataset}
          periodLabel={periodLabel}
          className="absolute bottom-4 left-4 z-10 hidden sm:block"
        />
      </div>

      {selected ? (
        <div className="fixed inset-x-0 bottom-0 z-30 lg:static lg:z-auto lg:flex">
          <CountryDetailsSidebar
            country={selected}
            observation={selectedObservation}
            dataset={dataset}
            onClose={clearSelection}
          >
            {selected.code ? (
              <NgoList countryCode={selected.code} countryName={selected.name} />
            ) : null}
          </CountryDetailsSidebar>
        </div>
      ) : null}

      <details className="border-t border-white/10 bg-slate-950 p-3 text-xs text-slate-300 sm:hidden">
        <summary className="cursor-pointer font-medium text-white">Legend</summary>
        <HungerLegend dataset={dataset} periodLabel={periodLabel} className="mt-2" />
      </details>
    </div>
  );
}
