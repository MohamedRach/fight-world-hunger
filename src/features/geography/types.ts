import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

/** Properties kept by scripts/fetch-country-geometry.mjs from Natural Earth 1:110m. */
export interface CountryFeatureProperties {
  name: string;
  /** Natural Earth ISO 3166-1 alpha-3; "-99" when Natural Earth has none. */
  iso_a3: string;
  /** ISO alpha-3 including "exceptional" homeland assignments (fixes France/Norway). */
  iso_a3_eh: string;
  iso_a2: string;
  /** ISO alpha-2 including "exceptional" homeland assignments (fixes France/Norway). */
  iso_a2_eh?: string;
  adm0_a3: string;
  wb_a3: string;
  continent: string;
  label_lat: number;
  label_lng: number;
}

export type CountryFeature = Feature<Polygon | MultiPolygon, CountryFeatureProperties>;

export interface CountryFeatureCollection
  extends FeatureCollection<Polygon | MultiPolygon, CountryFeatureProperties> {
  source?: string;
  license?: string;
  fetchedAt?: string;
}

/** A polygon resolved to the identifier used to join hunger and NGO data. */
export interface ResolvedCountry {
  feature: CountryFeature;
  /** Stable code for data joins, or null when the territory has no usable code. */
  code: string | null;
  name: string;
  /** ISO 3166-1 alpha-2 when valid, used for flags. */
  iso2: string | null;
}
