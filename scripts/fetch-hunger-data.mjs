// Refreshes the committed snapshot of FAO's "Prevalence of undernourishment"
// indicator (SDG 2.1.1), retrieved through the World Bank WDI API.
//
// Usage: node scripts/fetch-hunger-data.mjs
//
// The snapshot stores the *raw* API payloads so that the same normalization
// code path (src/features/hunger/normalize.ts) is used for live and snapshot
// data. See docs/HUNGER_GLOBE.md for details.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const INDICATOR_URL =
  "https://api.worldbank.org/v2/country/all/indicator/SN.ITK.DEFC.ZS?format=json&mrnev=1&per_page=400";
const COUNTRIES_URL =
  "https://api.worldbank.org/v2/country?format=json&per_page=400";

const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/features/hunger/data/worldbank-undernourishment.snapshot.json",
);

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "fight-world-hunger/refresh-script" },
  });
  if (!response.ok) {
    throw new Error(`${url} responded with HTTP ${response.status}`);
  }
  return response.json();
}

const [indicator, countries] = await Promise.all([
  fetchJson(INDICATOR_URL),
  fetchJson(COUNTRIES_URL),
]);

for (const [label, payload] of [
  ["indicator", indicator],
  ["countries", countries],
]) {
  if (!Array.isArray(payload) || payload.length !== 2 || payload[0].pages !== 1) {
    throw new Error(
      `Unexpected ${label} payload shape; expected a single page of results.`,
    );
  }
}

const snapshot = {
  fetchedAt: new Date().toISOString(),
  indicatorUrl: INDICATOR_URL,
  countriesUrl: COUNTRIES_URL,
  indicator,
  countries: [
    countries[0],
    countries[1].map((c) => ({
      id: c.id,
      iso2Code: c.iso2Code,
      name: c.name,
      region: { id: c.region.id, value: c.region.value },
    })),
  ],
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(snapshot, null, 2) + "\n");

console.log(
  `Saved ${indicator[1].length} indicator rows and ${countries[1].length} country records to ${outputPath}`,
);
console.log(`World Bank lastupdated: ${indicator[0].lastupdated}`);
