import type { RegionFeature } from "@/features/fewsnet/types";
import type { ResolvedCountry } from "@/features/geography/types";
import { countryKey } from "./useCountrySelection";

/** A polygon drawn on the globe: either a country or a FEWS NET analysis area. */
export type GlobePolygon =
  | { kind: "country"; country: ResolvedCountry }
  | { kind: "region"; feature: RegionFeature };

export function polygonKey(polygon: GlobePolygon): string {
  return polygon.kind === "country"
    ? `country:${countryKey(polygon.country)}`
    : `region:${polygon.feature.properties.fnid}`;
}

export function polygonGeometry(polygon: GlobePolygon) {
  return polygon.kind === "country" ? polygon.country.feature.geometry : polygon.feature.geometry;
}

/** Rough camera altitude (globe radii) that frames a lon/lat bounding box. */
export function altitudeForBbox(bbox: [number, number, number, number]): number {
  const [west, south, east, north] = bbox;
  const span = Math.max(east - west, north - south);
  return Math.max(0.25, Math.min(2.2, span / 25));
}

export function bboxCenter(bbox: [number, number, number, number]): { lat: number; lng: number } {
  const [west, south, east, north] = bbox;
  return { lat: (south + north) / 2, lng: (west + east) / 2 };
}
