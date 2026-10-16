import { OBSERVATION_WINDOW_YEARS, UNDERNOURISHMENT_INDICATOR } from "./source";
import type {
  WorldBankCountriesPayload,
  WorldBankIndicatorPayload,
  WorldBankIndicatorRow,
} from "./schema";
import type {
  HungerDataset,
  HungerObservation,
  HungerRetrievalMode,
} from "./types";

const ISO3_PATTERN = /^[A-Z]{3}$/;
const WORLD_BANK_AGGREGATE_REGION = "Aggregates";

export function isValidCountryCode(code: unknown): code is string {
  return typeof code === "string" && ISO3_PATTERN.test(code);
}

/**
 * Builds the human-readable observation period for a given final year.
 * FAO reports country PoU as a three-year average labelled by its last year.
 */
export function formatObservationPeriod(year: number): string {
  const start = year - (OBSERVATION_WINDOW_YEARS - 1);
  return `${start}–${year} (${OBSERVATION_WINDOW_YEARS}-year average)`;
}

function parseYear(date: string): number | null {
  const year = Number.parseInt(date, 10);
  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null;
}

function sanitizeValue(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return value;
}

export function normalizeIndicatorRow(
  row: WorldBankIndicatorRow,
): HungerObservation | null {
  if (!isValidCountryCode(row.countryiso3code)) return null;

  const value = sanitizeValue(row.value);
  const year = value === null ? null : parseYear(row.date);

  return {
    countryCode: row.countryiso3code,
    countryName: row.country.value,
    value,
    unit: UNDERNOURISHMENT_INDICATOR.unit,
    year,
    periodLabel: year === null ? null : formatObservationPeriod(year),
    isBelowReportingFloor:
      value !== null && value <= UNDERNOURISHMENT_INDICATOR.reportingFloor,
  };
}

/** Codes of World Bank "countries" that are actually regional/income aggregates. */
export function collectAggregateCodes(
  countries: WorldBankCountriesPayload,
): Set<string> {
  const codes = new Set<string>();
  for (const country of countries[1] ?? []) {
    if (country.region.value === WORLD_BANK_AGGREGATE_REGION) {
      codes.add(country.id);
    }
  }
  return codes;
}

export interface NormalizeOptions {
  retrievedFrom: HungerRetrievalMode;
  retrievedAt: string;
}

export function normalizeWorldBankPayloads(
  indicator: WorldBankIndicatorPayload,
  countries: WorldBankCountriesPayload,
  options: NormalizeOptions,
): HungerDataset {
  const aggregates = collectAggregateCodes(countries);
  const observations: Record<string, HungerObservation> = {};
  let countriesWithData = 0;

  for (const row of indicator[1] ?? []) {
    if (aggregates.has(row.countryiso3code)) continue;
    const observation = normalizeIndicatorRow(row);
    if (!observation) continue;

    const existing = observations[observation.countryCode];
    if (existing && (existing.year ?? -1) >= (observation.year ?? -1)) continue;

    observations[observation.countryCode] = observation;
  }

  for (const observation of Object.values(observations)) {
    if (observation.value !== null) countriesWithData += 1;
  }

  return {
    indicator: UNDERNOURISHMENT_INDICATOR,
    observations,
    retrievedFrom: options.retrievedFrom,
    retrievedAt: options.retrievedAt,
    providerLastUpdated: indicator[0].lastupdated ?? null,
    countriesWithData,
  };
}
