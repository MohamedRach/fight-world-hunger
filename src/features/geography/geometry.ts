import type { CountryFeatureCollection } from "./types";

export const COUNTRY_GEOMETRY_URL = "/data/countries-110m.geojson";

export const COUNTRY_GEOMETRY_ATTRIBUTION = {
  name: "Natural Earth 1:110m Admin 0 – Countries",
  url: "https://www.naturalearthdata.com/downloads/110m-cultural-vectors/",
  licence: "Public domain",
};

function isFeatureCollection(value: unknown): value is CountryFeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "FeatureCollection" &&
    Array.isArray((value as { features?: unknown }).features)
  );
}

/**
 * Fetches the trimmed country polygons served from /public. Runs in the
 * browser because the polygons are only needed by the WebGL globe.
 */
export async function fetchCountryGeometry(
  signal?: AbortSignal,
): Promise<CountryFeatureCollection> {
  const response = await fetch(COUNTRY_GEOMETRY_URL, { signal });
  if (!response.ok) {
    throw new Error(`Country boundaries request failed with HTTP ${response.status}`);
  }
  const json: unknown = await response.json();
  if (!isFeatureCollection(json) || json.features.length === 0) {
    throw new Error("Country boundaries file is not a valid FeatureCollection");
  }
  return json;
}
