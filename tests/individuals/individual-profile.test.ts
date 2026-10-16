import { beforeEach, describe, expect, it } from "vitest";
import {
  computeIndividualCompleteness,
  createMyIndividualProfile,
  getMyIndividualProfile,
  IndividualServiceError,
  updateMyIndividualProfile,
} from "@/features/individuals/service";
import { setIndividualRepositoryForTesting } from "@/features/individuals/repository";
import {
  individualCreateSchema,
  individualUpdateSchema,
} from "@/features/individuals/validation";

const ALICE = "alice@example.org";
const BOB = "bob@example.org";

const validInput = {
  fullName: "Alice Martin",
  email: ALICE,
  acceptPrivacyPolicy: true,
};

async function expectError(promise: Promise<unknown>, code: IndividualServiceError["code"]) {
  try {
    await promise;
    expect.unreachable(`expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(IndividualServiceError);
    expect((error as IndividualServiceError).code).toBe(code);
  }
}

beforeEach(() => {
  setIndividualRepositoryForTesting(undefined);
});

describe("individual profile validation", () => {
  it("accepts a minimal profile and applies defaults", () => {
    const result = individualCreateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preferredCauses).toEqual([]);
      expect(result.data.donateAnonymously).toBe(false);
    }
  });

  it("requires accepting the privacy policy", () => {
    expect(
      individualCreateSchema.safeParse({ ...validInput, acceptPrivacyPolicy: false }).success,
    ).toBe(false);
  });

  it("rejects an invalid email and unknown fields", () => {
    expect(individualCreateSchema.safeParse({ ...validInput, email: "nope" }).success).toBe(false);
    expect(individualCreateSchema.safeParse({ ...validInput, role: "ADMIN" }).success).toBe(false);
  });

  it("removes duplicate selections", () => {
    const result = individualCreateSchema.safeParse({
      ...validInput,
      preferredCountryCodes: ["KEN", "ken", "SEN"],
    });
    expect(result.success && result.data.preferredCountryCodes).toEqual(["KEN", "SEN"]);
  });

  it("does not inject defaults into partial updates", () => {
    const result = individualUpdateSchema.safeParse({ bio: "Hello" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ bio: "Hello" });
  });
});

describe("individual profile service", () => {
  it("rejects anonymous users", async () => {
    await expectError(createMyIndividualProfile(null, validInput), "UNAUTHENTICATED");
    await expectError(updateMyIndividualProfile(null, { bio: "x" }), "UNAUTHENTICATED");
  });

  it("creates the profile for the signed-in user only", async () => {
    const created = await createMyIndividualProfile(ALICE, validInput);
    expect(created.fullName).toBe("Alice Martin");
    expect((await getMyIndividualProfile(ALICE))?.id).toBe(created.id);
    expect(await getMyIndividualProfile(BOB)).toBeNull();
  });

  it("never exposes internal fields", async () => {
    const created = await createMyIndividualProfile(ALICE, validInput);
    expect(created).not.toHaveProperty("userId");
    expect(created).not.toHaveProperty("privacyAcceptedAt");
  });

  it("allows only one profile per account", async () => {
    await createMyIndividualProfile(ALICE, validInput);
    await expectError(createMyIndividualProfile(ALICE, validInput), "PROFILE_EXISTS");
  });

  it("rejects invalid input with field errors", async () => {
    try {
      await createMyIndividualProfile(ALICE, { ...validInput, fullName: "" });
      expect.unreachable();
    } catch (error) {
      expect((error as IndividualServiceError).fieldErrors).toHaveProperty("fullName");
    }
  });

  it("updates only the provided fields", async () => {
    await createMyIndividualProfile(ALICE, {
      ...validInput,
      preferredCauses: ["HUNGER_RELIEF"],
      contactConsent: true,
    });
    const updated = await updateMyIndividualProfile(ALICE, { bio: "I give every month." });
    expect(updated.bio).toBe("I give every month.");
    expect(updated.preferredCauses).toEqual(["HUNGER_RELIEF"]);
    expect(updated.contactConsent).toBe(true);
  });

  it("returns not-found when updating a profile that does not exist", async () => {
    await expectError(updateMyIndividualProfile(BOB, { bio: "x" }), "NOT_FOUND");
  });

  it("reports missing optional information", async () => {
    const created = await createMyIndividualProfile(ALICE, validInput);
    const completeness = computeIndividualCompleteness(created);
    expect(completeness.percentage).toBe(0);
    expect(completeness.missing).toContain("Causes you care about");
  });
});
