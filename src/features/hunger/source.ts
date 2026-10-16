import type { HungerIndicatorMeta } from "./types";

/**
 * FAO SDG indicator 2.1.1 – Prevalence of undernourishment – as distributed
 * by the World Bank World Development Indicators API (source organisation:
 * FAO). See docs/HUNGER_GLOBE.md for the rationale.
 */
export const UNDERNOURISHMENT_INDICATOR: HungerIndicatorMeta = {
  id: "SN.ITK.DEFC.ZS",
  name: "Prevalence of undernourishment",
  shortName: "Undernourishment",
  unit: "percent",
  description:
    "The share of the population whose habitual food consumption is insufficient to provide the dietary energy needed for a normal, active and healthy life (FAO SDG indicator 2.1.1). Country values are three-year averages; values published as 2.5% mean the prevalence is below 2.5%.",
  producer: "Food and Agriculture Organization of the United Nations (FAO)",
  distributor: "World Bank, World Development Indicators",
  sourceUrl:
    "https://data.worldbank.org/indicator/SN.ITK.DEFC.ZS",
  methodologyUrl:
    "https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/2.1.1-prevalence-of-undernourishment/en",
  licence: "CC BY 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  reportingFloor: 2.5,
};

export const WORLD_BANK_INDICATOR_URL =
  "https://api.worldbank.org/v2/country/all/indicator/SN.ITK.DEFC.ZS?format=json&mrnev=1&per_page=400";

export const WORLD_BANK_COUNTRIES_URL =
  "https://api.worldbank.org/v2/country?format=json&per_page=400";

/** FAO publishes country-level PoU as a three-year moving average labelled by its final year. */
export const OBSERVATION_WINDOW_YEARS = 3;
