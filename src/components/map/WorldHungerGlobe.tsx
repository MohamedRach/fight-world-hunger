"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";

import type { ResolvedCountry } from "@/features/geography/types";
import { countryKey } from "./useCountrySelection";

export interface GlobeViewHandle {
  focusCountry: (country: ResolvedCountry) => void;
  zoomBy: (factor: number) => void;
  resetView: () => void;
}

export interface WorldHungerGlobeProps {
  countries: ResolvedCountry[];
  colorForCountry: (country: ResolvedCountry) => string;
  hovered: ResolvedCountry | null;
  selected: ResolvedCountry | null;
  onHover: (country: ResolvedCountry | null) => void;
  onSelect: (country: ResolvedCountry) => void;
  width: number;
  height: number;
  handleRef?: Ref<GlobeViewHandle>;
}

/** 1×1 PNG of #0f2140; a solid ocean texture without a network request or a `three` import. */
const OCEAN_TEXTURE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPgV3QAAACzAHEcz0MKAAAAAElFTkSuQmCC";
const ATMOSPHERE_COLOR = "#3b82f6";
const DEFAULT_ALTITUDE = 2.2;
const MIN_ALTITUDE = 0.6;
const MAX_ALTITUDE = 4;
const FOCUS_ALTITUDE = 1.6;

const BASE_POLYGON_ALTITUDE = 0.006;
const HOVER_POLYGON_ALTITUDE = 0.02;
const SELECTED_POLYGON_ALTITUDE = 0.035;

const STROKE_DEFAULT = "rgba(255,255,255,0.28)";
const STROKE_ACTIVE = "#ffffff";
const SIDE_COLOR = "rgba(255,255,255,0.12)";

export default function WorldHungerGlobe({
  countries,
  colorForCountry,
  hovered,
  selected,
  onHover,
  onSelect,
  width,
  height,
  handleRef,
}: WorldHungerGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const hoveredKey = hovered ? countryKey(hovered) : null;
  const selectedKey = selected ? countryKey(selected) : null;

  const setAutoRotate = useCallback((enabled: boolean) => {
    const controls = globeRef.current?.controls();
    if (controls) controls.autoRotate = enabled;
  }, []);

  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enablePan = false;
    controls.zoomSpeed = 0.8;

    globe.pointOfView({ lat: 15, lng: 10, altitude: DEFAULT_ALTITUDE }, 0);
  }, []);

  useEffect(() => {
    setAutoRotate(!selected && !hovered);
  }, [hovered, selected, setAutoRotate]);

  useImperativeHandle(
    handleRef,
    () => ({
      focusCountry(country) {
        const { label_lat, label_lng } = country.feature.properties;
        globeRef.current?.pointOfView(
          { lat: label_lat, lng: label_lng, altitude: FOCUS_ALTITUDE },
          900,
        );
      },
      zoomBy(factor) {
        const globe = globeRef.current;
        if (!globe) return;
        const current = globe.pointOfView();
        const altitude = Math.min(
          MAX_ALTITUDE,
          Math.max(MIN_ALTITUDE, current.altitude * factor),
        );
        globe.pointOfView({ ...current, altitude }, 400);
      },
      resetView() {
        globeRef.current?.pointOfView({ lat: 15, lng: 10, altitude: DEFAULT_ALTITUDE }, 900);
      },
    }),
    [],
  );

  const isActive = useCallback(
    (country: ResolvedCountry) => {
      const key = countryKey(country);
      return key === hoveredKey || key === selectedKey;
    },
    [hoveredKey, selectedKey],
  );

  return (
    <Globe
      ref={globeRef}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      globeImageUrl={OCEAN_TEXTURE_DATA_URL}
      showAtmosphere
      atmosphereColor={ATMOSPHERE_COLOR}
      atmosphereAltitude={0.18}
      onGlobeReady={handleGlobeReady}
      polygonsData={countries}
      polygonGeoJsonGeometry={(d) =>
        // globe.gl types GeoJSON geometry loosely; our features are valid GeoJSON.
        (d as ResolvedCountry).feature.geometry as unknown as { type: string; coordinates: number[] }
      }
      polygonCapColor={(d) => colorForCountry(d as ResolvedCountry)}
      polygonSideColor={() => SIDE_COLOR}
      polygonStrokeColor={(d) =>
        isActive(d as ResolvedCountry) ? STROKE_ACTIVE : STROKE_DEFAULT
      }
      polygonAltitude={(d) => {
        const key = countryKey(d as ResolvedCountry);
        if (key === selectedKey) return SELECTED_POLYGON_ALTITUDE;
        if (key === hoveredKey) return HOVER_POLYGON_ALTITUDE;
        return BASE_POLYGON_ALTITUDE;
      }}
      polygonsTransitionDuration={250}
      // The default label accessor reads `name`; the React CountryTooltip replaces it.
      polygonLabel={() => ""}
      onPolygonHover={(polygon) => onHover((polygon as ResolvedCountry | null) ?? null)}
      onPolygonClick={(polygon) => onSelect(polygon as ResolvedCountry)}
    />
  );
}
