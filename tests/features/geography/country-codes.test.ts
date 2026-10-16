import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  isIso2,
  isIso3,
  resolveCountry,
  resolveCountryCode,
  UNMATCHED_TERRITORIES,
} from "@/features/geography/country-codes";
import type { CountryFeature, CountryFeatureCollection } from "@/features/geography/types";
import { loadSnapshotDataset } from "@/features/hunger/server/load-hunger-data";

function feature(props: Partial<CountryFeature["properties"]>): CountryFeature {
  return {
    type: "Feature",
    properties: {
      name: "Test",
      iso_a3: "-99",
      iso_a3_eh: "-99",
      iso_a2: "-99",
      adm0_a3: "TST",
      wb_a3: "-99",
      continent: "Nowhere",
      label_lat: 0,
      label_lng: 0,
      ...props,
    },
    geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
  };
}

describe("resolveCountryCode", () => {
  it("uses ISO_A3 when present", () => {
    expect(resolveCountryCode({ iso_a3: "KEN", iso_a3_eh: "KEN", adm0_a3: "KEN" })).toBe("KEN");
  });

  it("falls back to ISO_A3_EH for Natural Earth's -99 entries (France, Norway)", () => {
    expect(resolveCountryCode({ iso_a3: "-99", iso_a3_eh: "FRA", adm0_a3: "FRA" })).toBe("FRA");
    expect(resolveCountryCode({ iso_a3: "-99", iso_a3_eh: "NOR", adm0_a3: "NOR" })).toBe("NOR");
  });

  it("maps Kosovo to the provider code XKX", () => {
    expect(resolveCountryCode({ iso_a3: "-99", iso_a3_eh: "-99", adm0_a3: "KOS" })).toBe("XKX");
  });

  it("returns null for territories without any usable code", () => {
    expect(resolveCountryCode({ iso_a3: "-99", iso_a3_eh: "-99", adm0_a3: "CYN" })).toBeNull();
    expect(resolveCountryCode({ iso_a3: "-99", iso_a3_eh: "-99", adm0_a3: "SOL" })).toBeNull();
  });

  it("never matches on names", () => {
    expect(resolveCountryCode({ iso_a3: "-99", iso_a3_eh: "-99", adm0_a3: "ZZZ" })).toBeNull();
  });
});

describe("resolveCountry", () => {
  it("exposes a valid alpha-2 code for flags and null otherwise", () => {
    expect(resolveCountry(feature({ iso_a3: "KEN", iso_a2: "KE" })).iso2).toBe("KE");
    expect(resolveCountry(feature({ iso_a3: "TWN", iso_a2: "CN-TW" })).iso2).toBeNull();
    expect(isIso2("KE")).toBe(true);
    expect(isIso2("CN-TW")).toBe(false);
    expect(isIso3("XKX")).toBe(true);
  });
});

describe("committed geometry joined with committed hunger snapshot", () => {
  const collection = JSON.parse(
    readFileSync(resolve(process.cwd(), "public/data/countries-110m.geojson"), "utf8"),
  ) as CountryFeatureCollection;
  const resolved = collection.features.map(resolveCountry);
  const dataset = loadSnapshotDataset();

  it("resolves every polygon except the known unmatched territories", () => {
    const unresolved = resolved.filter((c) => c.code === null).map((c) => c.feature.properties.adm0_a3);
    expect(new Set(unresolved)).toEqual(UNMATCHED_TERRITORIES);
  });

  it("produces unique codes per polygon", () => {
    const codes = resolved.map((c) => c.code).filter((c): c is string => c !== null);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("matches the large majority of polygons to a hunger observation by code", () => {
    const matched = resolved.filter((c) => c.code !== null && dataset.observations[c.code]);
    expect(matched.length).toBeGreaterThan(resolved.length * 0.85);
    expect(dataset.observations.FRA).toBeDefined();
  });

  it("leaves resolved countries without a published series as no-data (e.g. Kosovo)", () => {
    const kosovo = resolved.find((c) => c.feature.properties.adm0_a3 === "KOS");
    expect(kosovo?.code).toBe("XKX");
    expect(dataset.observations.XKX).toBeUndefined();
  });
});
