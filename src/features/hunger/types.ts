export type HungerUnit = "percent";

export interface HungerIndicatorMeta {
  /** Provider indicator identifier, e.g. World Bank "SN.ITK.DEFC.ZS". */
  id: string;
  /** Human-readable indicator name. */
  name: string;
  /** Short name used in compact UI such as tooltips. */
  shortName: string;
  unit: HungerUnit;
  /** Plain-language explanation of what the indicator measures. */
  description: string;
  /** Organisation that produces the underlying estimates. */
  producer: string;
  /** Organisation whose API/download the application reads from. */
  distributor: string;
  sourceUrl: string;
  methodologyUrl: string;
  licence: string;
  licenceUrl: string;
  /**
   * Values at or below this threshold are published as a floor, not a point
   * estimate ("<2.5%"). See the World Bank / FAO indicator notes.
   */
  reportingFloor: number;
}

export interface HungerObservation {
  /** ISO 3166-1 alpha-3 code, or the provider's code for territories without one (e.g. XKX). */
  countryCode: string;
  countryName: string;
  /** Indicator value in `unit`, or null when the provider has no observation. */
  value: number | null;
  unit: HungerUnit;
  /** Final year of the observation period, or null when unknown. */
  year: number | null;
  /** Human-readable observation period, e.g. "2022–2024 (3-year average)". */
  periodLabel: string | null;
  /** True when the published value is a floor ("<2.5%") rather than an estimate. */
  isBelowReportingFloor: boolean;
}

export type HungerRetrievalMode = "live" | "snapshot";

export interface HungerDataset {
  indicator: HungerIndicatorMeta;
  /** Observations keyed by `countryCode`. */
  observations: Record<string, HungerObservation>;
  /** Whether data came from the provider API at request time or the committed snapshot. */
  retrievedFrom: HungerRetrievalMode;
  /** ISO timestamp of when the data was retrieved from the provider. */
  retrievedAt: string;
  /** Provider's own "last updated" date (YYYY-MM-DD) when available. */
  providerLastUpdated: string | null;
  /** Count of countries/territories with a usable numeric value. */
  countriesWithData: number;
}
