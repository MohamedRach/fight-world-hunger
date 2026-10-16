import { readFile } from "node:fs/promises";
import path from "node:path";

import { resolveCountry } from "../country-codes";
import type { CountryFeatureCollection } from "../types";

interface CountryIdentity {
  iso3: string;
  iso2: string | null;
  name: string;
}

let indexPromise: Promise<Map<string, CountryIdentity>> | null = null;

/**
 * Builds an ISO alpha-3 → alpha-2 index from the committed Natural Earth file
 * so that server code shares the client's country identifiers. Read once per
 * server process.
 */
async function buildIndex(): Promise<Map<string, CountryIdentity>> {
  const filePath = path.join(process.cwd(), "public", "data", "countries-110m.geojson");
  const raw = await readFile(filePath, "utf8");
  const collection = JSON.parse(raw) as CountryFeatureCollection;
  const index = new Map<string, CountryIdentity>();
  for (const feature of collection.features) {
    const resolved = resolveCountry(feature);
    if (resolved.code) {
      index.set(resolved.code, { iso3: resolved.code, iso2: resolved.iso2, name: resolved.name });
    }
  }
  return index;
}

export async function lookupCountryIdentity(iso3: string): Promise<CountryIdentity | null> {
  indexPromise ??= buildIndex().catch((error: unknown) => {
    indexPromise = null;
    throw error;
  });
  const index = await indexPromise;
  return index.get(iso3) ?? null;
}
