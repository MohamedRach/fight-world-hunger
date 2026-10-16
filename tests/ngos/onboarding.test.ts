import { describe, expect, it } from "vitest";
import {
  EMPTY_DRAFT,
  ONBOARDING_STEPS,
  draftToPayload,
  errorFor,
  errorsForStep,
  firstStepWithErrors,
  sanitizeDraft,
  validateDraft,
  type OnboardingDraft,
} from "@/features/ngos/onboarding";
import { ngoCreateSchema } from "@/features/ngos/validation";

const stepIndex = (id: string) => ONBOARDING_STEPS.findIndex((step) => step.id === id);

const validDraft: OnboardingDraft = {
  ...EMPTY_DRAFT,
  name: "Food For All",
  shortDescription: "Fighting hunger with local food banks.",
  mission: "We distribute surplus food to families facing food insecurity.",
  hqCountryCode: "FR",
  operatingCountryCodes: ["FR", "SN"],
  primaryCause: "HUNGER_RELIEF",
};

describe("onboarding step validation", () => {
  it("flags only the required identity fields on an empty draft", () => {
    const identityErrors = errorsForStep(validateDraft(EMPTY_DRAFT), stepIndex("identity"));
    expect(Object.keys(identityErrors).sort()).toEqual(["mission", "name", "shortDescription"]);
  });

  it("lets a valid identity step pass while later steps are still incomplete", () => {
    const draft = { ...EMPTY_DRAFT, ...pick(validDraft, ["name", "shortDescription", "mission"]) };
    const errors = validateDraft(draft);
    expect(errorsForStep(errors, stepIndex("identity"))).toEqual({});
    expect(Object.keys(errorsForStep(errors, stepIndex("geography"))).sort()).toEqual([
      "hqCountryCode",
      "operatingCountryCodes",
    ]);
    expect(firstStepWithErrors(errors)).toBe(stepIndex("geography"));
  });

  it("accepts a complete minimal draft", () => {
    const errors = validateDraft(validDraft);
    expect(errors).toEqual({});
    expect(firstStepWithErrors(errors)).toBe(-1);
  });

  it("rejects a non-numeric year on the identity step", () => {
    const errors = validateDraft({ ...validDraft, yearFounded: "abc" });
    expect(errorFor(errorsForStep(errors, stepIndex("identity")), "yearFounded")).toBeDefined();
  });

  it("maps nested social-link errors to the contact step", () => {
    const draft = {
      ...validDraft,
      socialLinks: { ...EMPTY_DRAFT.socialLinks, twitter: "not a url" },
    };
    const contactErrors = errorsForStep(validateDraft(draft), stepIndex("contact"));
    expect(errorFor(contactErrors, "socialLinks.twitter")).toBeDefined();
    expect(firstStepWithErrors(validateDraft(draft))).toBe(stepIndex("contact"));
  });
});

describe("draftToPayload", () => {
  it("produces a payload accepted by the API schema", () => {
    expect(ngoCreateSchema.safeParse(draftToPayload(validDraft)).success).toBe(true);
  });

  it("trims text, omits empty optionals, and converts typed values", () => {
    const payload = draftToPayload({
      ...validDraft,
      name: "  Food For All  ",
      yearFounded: "2010",
      hqCity: "   ",
      socialLinks: { ...EMPTY_DRAFT.socialLinks, linkedin: "https://linkedin.com/company/x" },
      keyAchievements: "First achievement\n\n  Second achievement  \n",
    });
    expect(payload.name).toBe("Food For All");
    expect(payload.yearFounded).toBe(2010);
    expect(payload.hqCity).toBeUndefined();
    expect(payload.website).toBeUndefined();
    expect(payload.socialLinks).toEqual({ linkedin: "https://linkedin.com/company/x" });
    expect(payload.keyAchievements).toEqual(["First achievement", "Second achievement"]);
  });

  it("omits social links entirely when none are filled", () => {
    expect(draftToPayload(validDraft).socialLinks).toBeUndefined();
  });
});

describe("sanitizeDraft", () => {
  it("returns an empty draft for non-object input", () => {
    expect(sanitizeDraft(null)).toEqual(EMPTY_DRAFT);
    expect(sanitizeDraft("garbage")).toEqual(EMPTY_DRAFT);
  });

  it("drops malformed values and unknown keys", () => {
    const draft = sanitizeDraft({
      name: 42,
      mission: "Valid mission",
      operatingCountryCodes: ["FR", 3, null],
      socialLinks: { twitter: "https://x.com/ngo", evil: "https://evil.example" },
      isAdmin: true,
    });
    expect(draft.name).toBe("");
    expect(draft.mission).toBe("Valid mission");
    expect(draft.operatingCountryCodes).toEqual(["FR"]);
    expect(draft.socialLinks).toEqual({ ...EMPTY_DRAFT.socialLinks, twitter: "https://x.com/ngo" });
    expect(draft).not.toHaveProperty("isAdmin");
  });
});

function pick<T extends object, K extends keyof T>(source: T, keys: K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<T, K>;
}
