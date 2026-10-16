import { describe, expect, it } from "vitest";
import {
  fieldErrorsFromZod,
  ngoCreateSchema,
  ngoUpdateSchema,
} from "@/features/ngos/validation";

const validInput = {
  name: "Food For All",
  shortDescription: "Fighting hunger with local food banks.",
  mission: "We distribute surplus food to families facing food insecurity.",
  primaryCause: "HUNGER_RELIEF",
  hqCountryCode: "FRA",
  operatingCountryCodes: ["FRA", "SEN"],
};

describe("ngoCreateSchema", () => {
  it("accepts a minimal valid profile", () => {
    const result = ngoCreateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.otherCauses).toEqual([]);
      expect(result.data.keyAchievements).toEqual([]);
    }
  });

  it("rejects a missing name", () => {
    const result = ngoCreateSchema.safeParse({ ...validInput, name: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short short description", () => {
    const result = ngoCreateSchema.safeParse({ ...validInput, shortDescription: "Hi" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid contact email", () => {
    const result = ngoCreateSchema.safeParse({ ...validInput, contactEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid website URL", () => {
    const result = ngoCreateSchema.safeParse({ ...validInput, website: "not a url" });
    expect(result.success).toBe(false);
  });

  it("rejects a year founded in the future", () => {
    const result = ngoCreateSchema.safeParse({
      ...validInput,
      yearFounded: new Date().getFullYear() + 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown country code", () => {
    const result = ngoCreateSchema.safeParse({ ...validInput, hqCountryCode: "XXX" });
    expect(result.success).toBe(false);
  });

  it("normalizes lowercase country codes", () => {
    const result = ngoCreateSchema.safeParse({ ...validInput, hqCountryCode: "fra" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.hqCountryCode).toBe("FRA");
  });

  it("rejects an empty list of operating countries", () => {
    const result = ngoCreateSchema.safeParse({ ...validInput, operatingCountryCodes: [] });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate operating countries", () => {
    const result = ngoCreateSchema.safeParse({
      ...validInput,
      operatingCountryCodes: ["FRA", "FRA"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects the primary cause repeated in other causes", () => {
    const result = ngoCreateSchema.safeParse({
      ...validInput,
      otherCauses: ["HUNGER_RELIEF"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = ngoCreateSchema.safeParse({ ...validInput, isAdmin: true });
    expect(result.success).toBe(false);
  });

  it("produces field-keyed errors", () => {
    const result = ngoCreateSchema.safeParse({ ...validInput, contactEmail: "nope" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsFromZod(result.error);
      expect(Object.keys(errors)).toContain("contactEmail");
    }
  });
});

describe("ngoUpdateSchema", () => {
  it("accepts a partial update", () => {
    const result = ngoUpdateSchema.safeParse({ mission: "A new, longer mission statement." });
    expect(result.success).toBe(true);
  });

  it("still validates provided fields", () => {
    const result = ngoUpdateSchema.safeParse({ website: "not a url" });
    expect(result.success).toBe(false);
  });

  it("still enforces cross-field rules when both fields are provided", () => {
    const result = ngoUpdateSchema.safeParse({
      primaryCause: "EDUCATION",
      otherCauses: ["EDUCATION"],
    });
    expect(result.success).toBe(false);
  });
});
