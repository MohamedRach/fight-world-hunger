import { cacheLife } from "next/cache";

import snapshotJson from "../data/worldbank-undernourishment.snapshot.json";
import { normalizeWorldBankPayloads } from "../normalize";
import {
  hungerSnapshotSchema,
  worldBankCountriesPayloadSchema,
  worldBankIndicatorPayloadSchema,
} from "../schema";
import { WORLD_BANK_COUNTRIES_URL, WORLD_BANK_INDICATOR_URL } from "../source";
import type { HungerDataset } from "../types";

const REQUEST_TIMEOUT_MS = 10_000;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${url} responded with HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Normalises the committed snapshot (raw provider payloads saved by
 * scripts/fetch-hunger-data.mjs). Exported for tests and for the fallback path.
 */
export function loadSnapshotDataset(): HungerDataset {
  const snapshot = hungerSnapshotSchema.parse(snapshotJson);
  return normalizeWorldBankPayloads(snapshot.indicator, snapshot.countries, {
    retrievedFrom: "snapshot",
    retrievedAt: snapshot.fetchedAt,
  });
}

async function fetchLiveDataset(): Promise<HungerDataset> {
  const [indicatorJson, countriesJson] = await Promise.all([
    fetchJson(WORLD_BANK_INDICATOR_URL),
    fetchJson(WORLD_BANK_COUNTRIES_URL),
  ]);

  const indicator = worldBankIndicatorPayloadSchema.parse(indicatorJson);
  const countries = worldBankCountriesPayloadSchema.parse(countriesJson);

  if (indicator[0].pages !== 1 || countries[0].pages !== 1) {
    throw new Error("World Bank API returned paginated results; expected a single page.");
  }
  if (!indicator[1] || indicator[1].length === 0) {
    throw new Error("World Bank API returned no indicator rows.");
  }

  return normalizeWorldBankPayloads(indicator, countries, {
    retrievedFrom: "live",
    retrievedAt: new Date().toISOString(),
  });
}

/**
 * Loads the latest published prevalence-of-undernourishment estimates.
 *
 * Tries the World Bank API first and caches a successful result for days
 * (the series is updated a few times per year). On any network, HTTP or
 * validation failure it falls back to the committed snapshot and keeps the
 * cache short so the live source is retried soon.
 */
export async function loadHungerDataset(): Promise<HungerDataset> {
  "use cache";
  cacheLife("days");

  try {
    return await fetchLiveDataset();
  } catch (error) {
    cacheLife("minutes");
    console.warn(
      "[hunger] Falling back to snapshot dataset:",
      error instanceof Error ? error.message : error,
    );
    return loadSnapshotDataset();
  }
}
