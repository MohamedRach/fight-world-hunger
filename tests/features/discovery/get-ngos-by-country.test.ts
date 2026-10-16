import { describe, expect, it } from "vitest";

import {
  getNgosByCountry,
  InvalidCountryCodeError,
} from "@/features/discovery/server/get-ngos-by-country";
import {
  getNgoRepository,
  InMemoryNgoRepository,
} from "@/features/discovery/server/ngo-repository";
import type { NgoSummary } from "@/features/discovery/types";

const ngos: NgoSummary[] = [
  {
    id: "1",
    name: "Alpha Relief",
    slug: "alpha-relief",
    logoUrl: null,
    shortDescription: "Food distribution.",
    causes: ["Food security"],
    operatingCountryCodes: ["KEN", "SOM"],
    websiteUrl: "https://example.org",
  },
  {
    id: "2",
    name: "Beta Nutrition",
    slug: "beta-nutrition",
    logoUrl: null,
    shortDescription: "Child nutrition programmes.",
    causes: ["Nutrition"],
    operatingCountryCodes: ["SOM"],
    websiteUrl: null,
  },
];

describe("getNgosByCountry", () => {
  const repository = new InMemoryNgoRepository(ngos);

  it("returns NGOs registered as operating in the country, in every country they list", async () => {
    const kenya = await getNgosByCountry("KEN", repository);
    expect(kenya.data.map((n) => n.id)).toEqual(["1"]);
    expect(kenya.meta).toEqual({ countryCode: "KEN", total: 1 });

    const somalia = await getNgosByCountry("SOM", repository);
    expect(somalia.data.map((n) => n.id)).toEqual(["1", "2"]);
    expect(somalia.meta.total).toBe(2);
  });

  it("returns an empty, well-formed response when no NGO operates there", async () => {
    const result = await getNgosByCountry("FRA", repository);
    expect(result).toEqual({ data: [], meta: { countryCode: "FRA", total: 0 } });
  });

  it("normalises lower-case and padded codes", async () => {
    const result = await getNgosByCountry(" ken ", repository);
    expect(result.meta.countryCode).toBe("KEN");
    expect(result.data).toHaveLength(1);
  });

  it("rejects malformed codes instead of querying with them", async () => {
    await expect(getNgosByCountry("bad1", repository)).rejects.toBeInstanceOf(InvalidCountryCodeError);
    await expect(getNgosByCountry("", repository)).rejects.toBeInstanceOf(InvalidCountryCodeError);
    await expect(getNgosByCountry("KE; DROP TABLE", repository)).rejects.toBeInstanceOf(
      InvalidCountryCodeError,
    );
  });

  it("uses an empty repository by default until the NGO data layer exists", async () => {
    const result = await getNgosByCountry("KEN", getNgoRepository());
    expect(result.data).toEqual([]);
  });
});
