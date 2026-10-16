import { beforeEach, describe, expect, it } from "vitest";
import {
  canManageNgo,
  computeProfileCompleteness,
  createNgo,
  getManagedNgos,
  getPublicNgoProfile,
  NgoServiceError,
  updateNgo,
} from "@/features/ngos/service";
import { setNgoRepositoryForTesting } from "@/features/ngos/repository";

const OWNER = "user-owner";
const STRANGER = "user-stranger";

const validInput = {
  name: "Food For All",
  shortDescription: "Fighting hunger with local food banks.",
  mission: "We distribute surplus food to families facing food insecurity.",
  primaryCause: "HUNGER_RELIEF",
  hqCountryCode: "FR",
  operatingCountryCodes: ["FR", "SN"],
  registrationId: "REG-123",
};

async function expectServiceError(
  promise: Promise<unknown>,
  code: NgoServiceError["code"],
) {
  try {
    await promise;
    expect.unreachable(`expected NgoServiceError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(NgoServiceError);
    expect((error as NgoServiceError).code).toBe(code);
  }
}

beforeEach(() => {
  setNgoRepositoryForTesting(undefined);
});

describe("createNgo", () => {
  it("rejects anonymous users", async () => {
    await expectServiceError(createNgo(null, validInput), "UNAUTHENTICATED");
  });

  it("rejects invalid input with field errors", async () => {
    try {
      await createNgo(OWNER, { ...validInput, name: "" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(NgoServiceError);
      expect((error as NgoServiceError).code).toBe("VALIDATION_ERROR");
      expect((error as NgoServiceError).fieldErrors).toHaveProperty("name");
    }
  });

  it("creates a profile and makes the creator an owner", async () => {
    const profile = await createNgo(OWNER, validInput);
    expect(profile.name).toBe("Food For All");
    expect(profile.slug).toBe("food-for-all");
    expect(await canManageNgo(OWNER, profile.id)).toBe(true);
    expect(await canManageNgo(STRANGER, profile.id)).toBe(false);
  });

  it("never exposes private fields in the returned profile", async () => {
    const profile = await createNgo(OWNER, validInput);
    expect(profile).not.toHaveProperty("registrationId");
    expect(profile).not.toHaveProperty("verificationStatus");
    expect(profile).not.toHaveProperty("createdByUserId");
  });

  it("rejects a duplicate NGO name", async () => {
    await createNgo(OWNER, validInput);
    await expectServiceError(
      createNgo(STRANGER, { ...validInput, registrationId: "REG-999" }),
      "DUPLICATE_NGO",
    );
  });

  it("rejects a duplicate registration identifier", async () => {
    await createNgo(OWNER, validInput);
    await expectServiceError(
      createNgo(STRANGER, { ...validInput, name: "Another Name" }),
      "DUPLICATE_NGO",
    );
  });
});

describe("getPublicNgoProfile", () => {
  it("returns null for an unknown id", async () => {
    expect(await getPublicNgoProfile("does-not-exist")).toBeNull();
  });

  it("resolves by id and by slug", async () => {
    const created = await createNgo(OWNER, validInput);
    expect((await getPublicNgoProfile(created.id))?.name).toBe("Food For All");
    expect((await getPublicNgoProfile("food-for-all"))?.name).toBe("Food For All");
  });
});

describe("updateNgo", () => {
  it("rejects anonymous users", async () => {
    const created = await createNgo(OWNER, validInput);
    await expectServiceError(
      updateNgo(null, created.id, { hqCity: "Paris" }),
      "UNAUTHENTICATED",
    );
  });

  it("rejects users without a membership", async () => {
    const created = await createNgo(OWNER, validInput);
    await expectServiceError(
      updateNgo(STRANGER, created.id, { hqCity: "Paris" }),
      "FORBIDDEN",
    );
  });

  it("returns not-found for an unknown NGO", async () => {
    await expectServiceError(
      updateNgo(OWNER, "missing-ngo", { hqCity: "Paris" }),
      "NOT_FOUND",
    );
  });

  it("rejects invalid changes", async () => {
    const created = await createNgo(OWNER, validInput);
    await expectServiceError(
      updateNgo(OWNER, created.id, { website: "not a url" }),
      "VALIDATION_ERROR",
    );
  });

  it("applies valid changes from an authorized owner", async () => {
    const created = await createNgo(OWNER, validInput);
    const updated = await updateNgo(OWNER, created.id, {
      hqCity: "Paris",
      impactSummary: "Served 10,000 meals in 2025.",
    });
    expect(updated.hqCity).toBe("Paris");
    expect(updated.impactSummary).toBe("Served 10,000 meals in 2025.");
    expect(updated.name).toBe("Food For All");
  });

  it("rejects renaming to another NGO's name", async () => {
    await createNgo(OWNER, validInput);
    const second = await createNgo(OWNER, {
      ...validInput,
      name: "Water For All",
      registrationId: "REG-456",
    });
    await expectServiceError(
      updateNgo(OWNER, second.id, { name: "Food For All" }),
      "DUPLICATE_NGO",
    );
  });
});

describe("getManagedNgos", () => {
  it("returns only the user's NGOs", async () => {
    await createNgo(OWNER, validInput);
    await createNgo(STRANGER, {
      ...validInput,
      name: "Water For All",
      registrationId: "REG-456",
    });
    const managed = await getManagedNgos(OWNER);
    expect(managed.map((ngo) => ngo.name)).toEqual(["Food For All"]);
    expect(await getManagedNgos(null)).toEqual([]);
  });
});

describe("computeProfileCompleteness", () => {
  it("reports missing optional fields", async () => {
    await createNgo(OWNER, validInput);
    const [ngo] = await getManagedNgos(OWNER);
    const completeness = computeProfileCompleteness(ngo);
    expect(completeness.percentage).toBeLessThan(100);
    expect(completeness.missing).toContain("Logo");
    expect(completeness.missing).not.toContain("Registration identifier");
  });
});
