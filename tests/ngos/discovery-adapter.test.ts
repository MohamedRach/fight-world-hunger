import { beforeEach, describe, expect, it } from "vitest";
import { createNgo } from "@/features/ngos/service";
import { setNgoRepositoryForTesting } from "@/features/ngos/repository";
import { ngoProfileDiscoveryRepository } from "@/features/ngos/discovery-adapter";
import { getNgosByCountry } from "@/features/discovery/server/get-ngos-by-country";

const input = {
  name: "Food For All",
  shortDescription: "Fighting hunger with local food banks.",
  mission: "We distribute surplus food to families facing food insecurity.",
  primaryCause: "HUNGER_RELIEF",
  otherCauses: ["EDUCATION"],
  hqCountryCode: "FRA",
  operatingCountryCodes: ["FRA", "SEN"],
  registrationId: "REG-123",
  website: "https://example.org",
};

beforeEach(() => {
  setNgoRepositoryForTesting(undefined);
});

describe("ngoProfileDiscoveryRepository", () => {
  it("returns NGO profiles operating in a country as discovery summaries", async () => {
    await createNgo("user-1", input);

    const results = await ngoProfileDiscoveryRepository.findByOperatingCountry("SEN");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: "Food For All",
      slug: "food-for-all",
      causes: ["Hunger relief", "Education"],
      operatingCountryCodes: ["FRA", "SEN"],
      websiteUrl: "https://example.org",
    });
  });

  it("does not expose private fields", async () => {
    await createNgo("user-1", input);
    const [summary] = await ngoProfileDiscoveryRepository.findByOperatingCountry("FRA");
    expect(summary).not.toHaveProperty("registrationId");
    expect(summary).not.toHaveProperty("verificationStatus");
    expect(summary).not.toHaveProperty("createdByUserId");
  });

  it("returns nothing for countries without NGOs", async () => {
    await createNgo("user-1", input);
    expect(await ngoProfileDiscoveryRepository.findByOperatingCountry("KEN")).toEqual([]);
  });

  it("is the default source for the map's country lookup", async () => {
    await createNgo("user-1", input);
    const response = await getNgosByCountry("sen");
    expect(response.meta).toEqual({ countryCode: "SEN", total: 1 });
    expect(response.data[0].name).toBe("Food For All");
  });
});
