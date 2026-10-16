import { describe, expect, it } from "vitest";

import {
  collectAggregateCodes,
  formatObservationPeriod,
  isValidCountryCode,
  normalizeIndicatorRow,
  normalizeWorldBankPayloads,
} from "@/features/hunger/normalize";
import type {
  WorldBankCountriesPayload,
  WorldBankIndicatorPayload,
  WorldBankIndicatorRow,
} from "@/features/hunger/schema";
import { loadSnapshotDataset } from "@/features/hunger/server/load-hunger-data";

function row(overrides: Partial<WorldBankIndicatorRow> = {}): WorldBankIndicatorRow {
  return {
    indicator: { id: "SN.ITK.DEFC.ZS", value: "Prevalence of undernourishment (% of population)" },
    country: { id: "KE", value: "Kenya" },
    countryiso3code: "KEN",
    date: "2024",
    value: 34.9,
    obs_status: "",
    ...overrides,
  };
}

const countries: WorldBankCountriesPayload = [
  { page: 1, pages: 1, total: 3 },
  [
    { id: "KEN", iso2Code: "KE", name: "Kenya", region: { id: "SSF", value: "Sub-Saharan Africa" } },
    { id: "AFE", iso2Code: "ZH", name: "Africa Eastern and Southern", region: { id: "NA", value: "Aggregates" } },
    { id: "WLD", iso2Code: "1W", name: "World", region: { id: "NA", value: "Aggregates" } },
  ],
];

describe("isValidCountryCode", () => {
  it("accepts three uppercase letters only", () => {
    expect(isValidCountryCode("KEN")).toBe(true);
    expect(isValidCountryCode("XKX")).toBe(true);
    expect(isValidCountryCode("")).toBe(false);
    expect(isValidCountryCode("ke")).toBe(false);
    expect(isValidCountryCode("KENY")).toBe(false);
    expect(isValidCountryCode(null)).toBe(false);
  });
});

describe("formatObservationPeriod", () => {
  it("labels FAO three-year averages by their final year", () => {
    expect(formatObservationPeriod(2024)).toBe("2022–2024 (3-year average)");
    expect(formatObservationPeriod(2018)).toBe("2016–2018 (3-year average)");
  });
});

describe("normalizeIndicatorRow", () => {
  it("normalises a measured value", () => {
    expect(normalizeIndicatorRow(row())).toEqual({
      countryCode: "KEN",
      countryName: "Kenya",
      value: 34.9,
      unit: "percent",
      year: 2024,
      periodLabel: "2022–2024 (3-year average)",
      isBelowReportingFloor: false,
    });
  });

  it("flags the 2.5% reporting floor instead of treating it as a point estimate", () => {
    const observation = normalizeIndicatorRow(row({ value: 2.5, countryiso3code: "FRA" }));
    expect(observation?.value).toBe(2.5);
    expect(observation?.isBelowReportingFloor).toBe(true);
  });

  it("keeps a null value as missing rather than zero", () => {
    const observation = normalizeIndicatorRow(row({ value: null }));
    expect(observation?.value).toBeNull();
    expect(observation?.year).toBeNull();
    expect(observation?.periodLabel).toBeNull();
    expect(observation?.isBelowReportingFloor).toBe(false);
  });

  it("rejects out-of-range or non-finite values as missing", () => {
    expect(normalizeIndicatorRow(row({ value: -1 }))?.value).toBeNull();
    expect(normalizeIndicatorRow(row({ value: 101 }))?.value).toBeNull();
    expect(normalizeIndicatorRow(row({ value: Number.NaN }))?.value).toBeNull();
  });

  it("drops rows without a usable country code", () => {
    expect(normalizeIndicatorRow(row({ countryiso3code: "" }))).toBeNull();
  });

  it("treats an unparsable date as an unknown period", () => {
    const observation = normalizeIndicatorRow(row({ date: "n/a" }));
    expect(observation?.year).toBeNull();
    expect(observation?.periodLabel).toBeNull();
  });
});

describe("collectAggregateCodes", () => {
  it("returns only World Bank aggregate codes", () => {
    expect([...collectAggregateCodes(countries)].sort()).toEqual(["AFE", "WLD"]);
  });
});

describe("normalizeWorldBankPayloads", () => {
  const indicator: WorldBankIndicatorPayload = [
    { page: 1, pages: 1, total: 4, lastupdated: "2026-10-08" },
    [
      row(),
      row({ country: { id: "ZH", value: "Africa Eastern and Southern" }, countryiso3code: "AFE", value: 26.1 }),
      row({ country: { id: "1W", value: "World" }, countryiso3code: "WLD", value: 8.1 }),
      row({ country: { id: "SO", value: "Somalia" }, countryiso3code: "SOM", value: null }),
    ],
  ];

  it("excludes aggregates, indexes by country code and counts countries with data", () => {
    const dataset = normalizeWorldBankPayloads(indicator, countries, {
      retrievedFrom: "live",
      retrievedAt: "2026-10-16T00:00:00.000Z",
    });

    expect(Object.keys(dataset.observations).sort()).toEqual(["KEN", "SOM"]);
    expect(dataset.countriesWithData).toBe(1);
    expect(dataset.providerLastUpdated).toBe("2026-10-08");
    expect(dataset.retrievedFrom).toBe("live");
    expect(dataset.indicator.id).toBe("SN.ITK.DEFC.ZS");
  });

  it("prefers the most recent observation when a country appears twice", () => {
    const duplicated: WorldBankIndicatorPayload = [
      indicator[0],
      [row({ date: "2020", value: 20 }), row({ date: "2024", value: 34.9 }), row({ date: "2022", value: 30 })],
    ];
    const dataset = normalizeWorldBankPayloads(duplicated, countries, {
      retrievedFrom: "live",
      retrievedAt: "2026-10-16T00:00:00.000Z",
    });
    expect(dataset.observations.KEN?.year).toBe(2024);
    expect(dataset.observations.KEN?.value).toBe(34.9);
  });

  it("handles a null row list", () => {
    const dataset = normalizeWorldBankPayloads([indicator[0], null], countries, {
      retrievedFrom: "snapshot",
      retrievedAt: "2026-10-16T00:00:00.000Z",
    });
    expect(dataset.observations).toEqual({});
    expect(dataset.countriesWithData).toBe(0);
  });
});

describe("committed snapshot", () => {
  it("validates against the schema and yields broad country coverage", () => {
    const dataset = loadSnapshotDataset();
    expect(dataset.retrievedFrom).toBe("snapshot");
    expect(dataset.countriesWithData).toBeGreaterThan(150);
    expect(dataset.observations.WLD).toBeUndefined();
    expect(dataset.observations.KEN?.value).toBeTypeOf("number");
    expect(dataset.observations.FRA?.isBelowReportingFloor).toBe(true);
  });
});
