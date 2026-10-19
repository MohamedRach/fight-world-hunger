"use client";

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";

import type { ResolvedCountry } from "@/features/geography/types";
import { polygonGeometry, polygonKey, type GlobePolygon } from "./globe-polygons";

export interface GlobeViewHandle {
  focusCountry: (country: ResolvedCountry) => void;
  focusPoint: (target: { lat: number; lng: number; altitude: number }) => void;
  zoomBy: (factor: number) => void;
  resetView: () => void;
}

export interface WorldHungerGlobeProps {
  polygons: GlobePolygon[];
  colorForPolygon: (polygon: GlobePolygon) => string;
  hoveredKey: string | null;
  selectedKey: string | null;
  /** Pauses auto-rotation, e.g. while a country or region is being explored. */
  interactionActive: boolean;
  onHover: (polygon: GlobePolygon | null) => void;
  onSelect: (polygon: GlobePolygon) => void;
  width: number;
  height: number;
  handleRef?: Ref<GlobeViewHandle>;
}

/** 1×1 PNG of #0f2140; a solid ocean texture without a network request or a `three` import. */
const OCEAN_TEXTURE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPgV3QAAACzAHEcz0MKAAAAAElFTkSuQmCC";
const ATMOSPHERE_COLOR = "#3b82f6";
const DEFAULT_ALTITUDE = 2.2;
const MIN_ALTITUDE = 0.2;
const MAX_ALTITUDE = 4;
const FOCUS_ALTITUDE = 1.6;

const BASE_POLYGON_ALTITUDE = 0.006;
const REGION_POLYGON_ALTITUDE = 0.01;
const HOVER_POLYGON_ALTITUDE = 0.02;
const SELECTED_POLYGON_ALTITUDE = 0.035;

const STROKE_DEFAULT = "rgba(255,255,255,0.28)";
const STROKE_REGION = "rgba(255,255,255,0.45)";
const STROKE_ACTIVE = "#ffffff";
const SIDE_COLOR = "rgba(255,255,255,0.12)";

export default function WorldHungerGlobe({
  polygons,
  colorForPolygon,
  hoveredKey,
  selectedKey,
  interactionActive,
  onHover,
  onSelect,
  width,
  height,
  handleRef,
}: WorldHungerGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [rendererKey, setRendererKey] = useState(0);

  useLayoutEffect(() => {
    // Activity preserves this component, but react-globe.gl disposes its
    // renderer when hidden. A new key gives it a fresh instance on return.
    return () => setRendererKey((key) => key + 1);
  }, []);

  const setAutoRotate = useCallback((enabled: boolean) => {
    const controls = globeRef.current?.controls();
    if (controls) controls.autoRotate = enabled;
  }, []);

  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls();
    controls.autoRotate = !interactionActive && hoveredKey === null;
    controls.autoRotateSpeed = 0.35;
    controls.enablePan = false;
    controls.zoomSpeed = 0.8;

    globe.pointOfView({ lat: 15, lng: 10, altitude: DEFAULT_ALTITUDE }, 0);
  }, [hoveredKey, interactionActive]);

  useEffect(() => {
    setAutoRotate(!interactionActive && hoveredKey === null);
  }, [hoveredKey, interactionActive, setAutoRotate]);

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
      focusPoint(target) {
        globeRef.current?.pointOfView(
          { ...target, altitude: Math.min(MAX_ALTITUDE, Math.max(MIN_ALTITUDE, target.altitude)) },
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

  return (
    <Globe
      key={rendererKey}
      ref={globeRef}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      globeImageUrl={OCEAN_TEXTURE_DATA_URL}
      showAtmosphere
      atmosphereColor={ATMOSPHERE_COLOR}
      atmosphereAltitude={0.18}
      onGlobeReady={handleGlobeReady}
      polygonsData={polygons}
      polygonGeoJsonGeometry={(d) =>
        // globe.gl types GeoJSON geometry loosely; our features are valid GeoJSON.
        polygonGeometry(d as GlobePolygon) as unknown as { type: string; coordinates: number[] }
      }
      polygonCapColor={(d) => colorForPolygon(d as GlobePolygon)}
      polygonSideColor={() => SIDE_COLOR}
      polygonStrokeColor={(d) => {
        const polygon = d as GlobePolygon;
        const key = polygonKey(polygon);
        if (key === hoveredKey || key === selectedKey) return STROKE_ACTIVE;
        return polygon.kind === "region" ? STROKE_REGION : STROKE_DEFAULT;
      }}
      polygonAltitude={(d) => {
        const polygon = d as GlobePolygon;
        const key = polygonKey(polygon);
        if (key === selectedKey) return SELECTED_POLYGON_ALTITUDE;
        if (key === hoveredKey) return HOVER_POLYGON_ALTITUDE;
        return polygon.kind === "region" ? REGION_POLYGON_ALTITUDE : BASE_POLYGON_ALTITUDE;
      }}
      polygonsTransitionDuration={250}
      // The default label accessor reads `name`; the React tooltips replace it.
      polygonLabel={() => ""}
      onPolygonHover={(polygon) => onHover((polygon as GlobePolygon | null) ?? null)}
      onPolygonClick={(polygon) => onSelect(polygon as GlobePolygon)}
    />
  );
}
