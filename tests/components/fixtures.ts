import type { CountryFeature, ResolvedCountry } from "@/features/geography/types";
import { UNDERNOURISHMENT_INDICATOR } from "@/features/hunger/source";
import type { HungerDataset, HungerObservation } from "@/features/hunger/types";

export function makeCountry(
  overrides: Partial<CountryFeature["properties"]> & { code?: string | null } = {},
): ResolvedCountry {
  const { code, ...props } = overrides;
  const properties: CountryFeature["properties"] = {
    name: "Kenya",
    iso_a3: "KEN",
    iso_a3_eh: "KEN",
    iso_a2: "KE",
    adm0_a3: "KEN",
    wb_a3: "KEN",
    continent: "Africa",
    label_lat: 0.6,
    label_lng: 37.8,
    ...props,
  };
  return {
    feature: {
      type: "Feature",
      properties,
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
    },
    code: code === undefined ? properties.iso_a3 : code,
    name: properties.name,
    iso2: /^[A-Z]{2}$/.test(properties.iso_a2) ? properties.iso_a2 : null,
  };
}

export const kenyaObservation: HungerObservation = {
  countryCode: "KEN",
  countryName: "Kenya",
  value: 34.9,
  unit: "percent",
  year: 2024,
  periodLabel: "2022–2024 (3-year average)",
  isBelowReportingFloor: false,
};

export function makeDataset(observations: HungerObservation[] = [kenyaObservation]): HungerDataset {
  return {
    indicator: UNDERNOURISHMENT_INDICATOR,
    observations: Object.fromEntries(observations.map((o) => [o.countryCode, o])),
    retrievedFrom: "snapshot",
    retrievedAt: "2026-10-16T10:00:00.000Z",
    providerLastUpdated: "2026-10-08",
    countriesWithData: observations.filter((o) => o.value !== null).length,
  };
}
