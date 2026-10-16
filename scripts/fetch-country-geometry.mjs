// Downloads Natural Earth 1:110m "Admin 0 – Countries" boundaries (public
// domain) and writes a trimmed GeoJSON to public/data/countries-110m.geojson.
//
// Usage: node scripts/fetch-country-geometry.mjs
//
// Only the properties needed for identification are kept and coordinates are
// rounded to 4 decimals (~11 m) to keep the client download small.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/data/countries-110m.geojson",
);

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`${SOURCE_URL} responded with HTTP ${response.status}`);
}
const source = await response.json();

const round = (n) => Math.round(n * 1e4) / 1e4;
const roundDeep = (coords) =>
  typeof coords[0] === "number" ? coords.map(round) : coords.map(roundDeep);

const features = source.features.map((feature) => {
  const p = feature.properties;
  return {
    type: "Feature",
    properties: {
      name: p.ADMIN,
      iso_a3: p.ISO_A3,
      iso_a3_eh: p.ISO_A3_EH,
      iso_a2: p.ISO_A2,
      iso_a2_eh: p.ISO_A2_EH,
      adm0_a3: p.ADM0_A3,
      wb_a3: p.WB_A3,
      continent: p.CONTINENT,
      label_lat: round(p.LABEL_Y),
      label_lng: round(p.LABEL_X),
    },
    geometry: {
      type: feature.geometry.type,
      coordinates: roundDeep(feature.geometry.coordinates),
    },
  };
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  JSON.stringify({
    type: "FeatureCollection",
    source: SOURCE_URL,
    license: "Natural Earth — public domain (https://www.naturalearthdata.com/about/terms-of-use/)",
    fetchedAt: new Date().toISOString(),
    features,
  }),
);

console.log(`Saved ${features.length} country features to ${outputPath}`);
