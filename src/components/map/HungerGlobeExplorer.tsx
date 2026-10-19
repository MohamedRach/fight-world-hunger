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

import { ipcPhaseColor, REGION_MODE_COUNTRY_COLOR } from "@/features/fewsnet/source";
import type { RegionClassification, RegionalDataset } from "@/features/fewsnet/types";
import { resolveCountry } from "@/features/geography/country-codes";
import { fetchCountryGeometry } from "@/features/geography/geometry";
import type { ResolvedCountry } from "@/features/geography/types";
import { hungerColor } from "@/features/hunger/color-scale";
import type { HungerDataset } from "@/features/hunger/types";
import { NgoList } from "@/components/ngos/NgoList";
import { CountryCampaignList } from "@/components/campaigns/CountryCampaignList";
import { CountryDetailsSidebar } from "./CountryDetailsSidebar";
import { CountryTooltip } from "./CountryTooltip";
import { GlobeControls } from "./GlobeControls";
import { HungerLegend } from "./HungerLegend";
import { IpcLegend } from "./IpcLegend";
import { RegionTooltip } from "./RegionTooltip";
import { RegionalExplorerPanel } from "./RegionalExplorerPanel";
import {
  altitudeForBbox,
  bboxCenter,
  polygonKey,
  type GlobePolygon,
} from "./globe-polygons";
import { countryKey, useCountrySelection } from "./useCountrySelection";
import { useRegionalData } from "./useRegionalData";
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

interface RegionSelection {
  countryKey: string;
  fnid: string;
}

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
  const [hoveredPolygon, setHoveredPolygon] = useState<GlobePolygon | null>(null);
  const { selected, select, clearSelection } = useCountrySelection();

  // Region mode and region selection are keyed by country so they reset
  // automatically when a different country is selected.
  const [regionModeCountry, setRegionModeCountry] = useState<string | null>(null);
  const [regionSelection, setRegionSelection] = useState<RegionSelection | null>(null);

  const selectedKey = selected ? countryKey(selected) : null;
  const regionMode = selectedKey !== null && regionModeCountry === selectedKey;
  const { state: regionalState, retry: retryRegional } = useRegionalData(
    selected?.code ?? null,
    regionMode,
  );
  const regionalDataset: RegionalDataset | null =
    regionMode &&
    regionalState.status === "ready" &&
    regionalState.availability.status === "available"
      ? regionalState.availability.dataset
      : null;

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

  // Frame the country's regions once they arrive.
  const regionalBboxKey = regionalDataset ? `${regionalDataset.countryCode}:${regionalDataset.analysisDate}` : null;
  useEffect(() => {
    if (!regionalDataset?.bbox || !regionalBboxKey) return;
    globeHandleRef.current?.focusPoint({
      ...bboxCenter(regionalDataset.bbox),
      altitude: altitudeForBbox(regionalDataset.bbox),
    });
    // regionalBboxKey identifies the dataset; the bbox itself is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionalBboxKey]);

  const countryPolygons = useMemo<GlobePolygon[]>(
    () =>
      geometry.status === "ready"
        ? geometry.countries.map((country) => ({ kind: "country", country }))
        : [],
    [geometry],
  );

  const polygons = useMemo<GlobePolygon[]>(() => {
    if (!regionalDataset || !selectedKey) return countryPolygons;
    const others = countryPolygons.filter(
      (polygon) => polygon.kind === "country" && countryKey(polygon.country) !== selectedKey,
    );
    const regions: GlobePolygon[] = regionalDataset.features.map((feature) => ({
      kind: "region",
      feature,
    }));
    return [...others, ...regions];
  }, [countryPolygons, regionalDataset, selectedKey]);

  const colorForPolygon = useCallback(
    (polygon: GlobePolygon) => {
      if (polygon.kind === "region") return ipcPhaseColor(polygon.feature.properties.phase);
      if (regionalDataset) return REGION_MODE_COUNTRY_COLOR;
      const code = polygon.country.code;
      return hungerColor(code ? dataset.observations[code]?.value : null);
    },
    [dataset.observations, regionalDataset],
  );

  const periodLabel = useMemo(() => mostCommonPeriod(dataset), [dataset]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  const handleSelectPolygon = useCallback(
    (polygon: GlobePolygon) => {
      if (polygon.kind === "country") {
        select(polygon.country);
        return;
      }
      if (selectedKey) {
        setRegionSelection({ countryKey: selectedKey, fnid: polygon.feature.properties.fnid });
      }
    },
    [select, selectedKey],
  );

  const handlePickCountry = useCallback(
    (country: ResolvedCountry) => {
      select(country);
      globeHandleRef.current?.focusCountry(country);
    },
    [select],
  );

  const enterRegionMode = useCallback(() => {
    if (selectedKey) setRegionModeCountry(selectedKey);
  }, [selectedKey]);

  const exitRegionMode = useCallback(() => {
    setRegionModeCountry(null);
    setRegionSelection(null);
    if (selected) globeHandleRef.current?.focusCountry(selected);
  }, [selected]);

  const clearRegionSelection = useCallback(() => setRegionSelection(null), []);

  const handleCloseSidebar = useCallback(() => {
    setRegionModeCountry(null);
    setRegionSelection(null);
    clearSelection();
  }, [clearSelection]);

  const selectedRegion: RegionClassification | null =
    regionalDataset && regionSelection && regionSelection.countryKey === selectedKey
      ? (regionalDataset.features.find((f) => f.properties.fnid === regionSelection.fnid)?.properties ?? null)
      : null;

  const selectedObservation =
    selected?.code !== null && selected?.code !== undefined
      ? dataset.observations[selected.code]
      : undefined;

  const hoveredKey = hoveredPolygon ? polygonKey(hoveredPolygon) : null;
  const activeSelectionKey = selectedRegion
    ? `region:${selectedRegion.fnid}`
    : selected && !regionalDataset
      ? `country:${countryKey(selected)}`
      : null;

  const hoveredCountry = hoveredPolygon?.kind === "country" ? hoveredPolygon.country : null;
  const hoveredRegion = hoveredPolygon?.kind === "region" ? hoveredPolygon.feature.properties : null;
  const hoveredObservation =
    hoveredCountry?.code !== null && hoveredCountry?.code !== undefined
      ? dataset.observations[hoveredCountry.code]
      : undefined;

  const ngoNote =
    regionalDataset && selected ? (
      <p className="text-[11px] text-slate-400">
        NGO coverage is recorded at country level only, so this list shows organisations operating
        anywhere in {selected.name}
        {selectedRegion ? `; none are specifically linked to ${selectedRegion.name}` : ""}.
      </p>
    ) : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredPolygon(null)}
        className="relative min-h-[60vh] flex-1 overflow-hidden lg:min-h-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(30,58,138,0.35) 0%, rgba(7,13,26,0) 60%)",
        }}
      >
        {geometry.status === "ready" && size.width > 0 && size.height > 0 ? (
          <WorldHungerGlobe
            handleRef={globeHandleRef}
            polygons={polygons}
            colorForPolygon={colorForPolygon}
            hoveredKey={hoveredKey}
            selectedKey={activeSelectionKey}
            interactionActive={selected !== null}
            onHover={setHoveredPolygon}
            onSelect={handleSelectPolygon}
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
        {regionMode && regionalState.status === "loading" ? (
          <GlobeStatus message={`Loading FEWS NET regions for ${selected?.name ?? "this country"}…`} />
        ) : null}

        {hoveredCountry && geometry.status === "ready" ? (
          <CountryTooltip
            country={hoveredCountry}
            observation={hoveredObservation}
            indicator={dataset.indicator}
            position={pointer}
            bounds={size}
          />
        ) : null}
        {hoveredRegion ? (
          <RegionTooltip region={hoveredRegion} position={pointer} bounds={size} />
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

        {regionalDataset ? (
          <IpcLegend dataset={regionalDataset} className="absolute bottom-4 left-4 z-10 hidden sm:block" />
        ) : (
          <HungerLegend
            dataset={dataset}
            periodLabel={periodLabel}
            className="absolute bottom-4 left-4 z-10 hidden sm:block"
          />
        )}
      </div>

      {selected ? (
        <div className="fixed inset-x-0 bottom-0 z-30 lg:static lg:z-auto lg:flex">
          <CountryDetailsSidebar
            country={selected}
            observation={selectedObservation}
            dataset={dataset}
            onClose={handleCloseSidebar}
            regionalSection={
              selected.code ? (
                <RegionalExplorerPanel
                  countryName={selected.name}
                  regionMode={regionMode}
                  state={regionalState}
                  selectedRegion={selectedRegion}
                  onEnterRegionMode={enterRegionMode}
                  onExitRegionMode={exitRegionMode}
                  onClearRegion={clearRegionSelection}
                  onRetry={retryRegional}
                />
              ) : undefined
            }
            ngoNote={ngoNote}
            campaignsSection={
              selected.code ? (
                <CountryCampaignList countryCode={selected.code} countryName={selected.name} />
              ) : undefined
            }
          >
            {selected.code ? (
              <NgoList countryCode={selected.code} countryName={selected.name} />
            ) : null}
          </CountryDetailsSidebar>
        </div>
      ) : null}

      <details className="border-t border-white/10 bg-slate-950 p-3 text-xs text-slate-300 sm:hidden">
        <summary className="cursor-pointer font-medium text-white">Legend</summary>
        {regionalDataset ? (
          <IpcLegend dataset={regionalDataset} className="mt-2" />
        ) : (
          <HungerLegend dataset={dataset} periodLabel={periodLabel} className="mt-2" />
        )}
      </details>
    </div>
  );
}
