import { beforeEach, describe, expect, it } from "vitest";
import {
  AccountServiceError,
  registerIndividual,
  registerNgo,
  signIn,
} from "@/features/accounts/service";
import { setAccountRepositoryForTesting } from "@/features/accounts/repository";
import { setNgoRepositoryForTesting } from "@/features/ngos/repository";
import { setIndividualRepositoryForTesting } from "@/features/individuals/repository";
import { canManageNgo } from "@/features/ngos/service";
import { getMyIndividualProfile } from "@/features/individuals/service";

const individual = {
  fullName: "Alice Martin",
  email: "Alice@Example.org",
  acceptPrivacyPolicy: true,
};

const ngoSignup = {
  account: { representativeName: "Moussa Diop", email: "contact@food-for-all.org" },
  ngo: {
    name: "Food For All",
    shortDescription: "Fighting hunger with local food banks.",
    mission: "We distribute surplus food to families facing food insecurity.",
    primaryCause: "HUNGER_RELIEF",
    hqCountryCode: "SEN",
    operatingCountryCodes: ["SEN"],
  },
};

async function expectCode(promise: Promise<unknown>, code: AccountServiceError["code"]) {
  try {
    await promise;
    expect.unreachable(`expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AccountServiceError);
    expect((error as AccountServiceError).code).toBe(code);
  }
}

beforeEach(() => {
  setAccountRepositoryForTesting(undefined);
  setNgoRepositoryForTesting(undefined);
  setIndividualRepositoryForTesting(undefined);
});

describe("individual sign-up", () => {
  it("creates an individual account with its profile", async () => {
    const { account, profile } = await registerIndividual(individual);
    expect(account).toMatchObject({ email: "alice@example.org", type: "INDIVIDUAL" });
    expect((await getMyIndividualProfile(account.id))?.id).toBe(profile.id);
  });

  it("rejects invalid input", async () => {
    await expectCode(registerIndividual({ ...individual, fullName: "" }), "VALIDATION_ERROR");
  });
});

describe("NGO sign-up (onboarding)", () => {
  it("creates an NGO account that manages the new NGO", async () => {
    const { account, ngo } = await registerNgo(ngoSignup);
    expect(account.type).toBe("NGO");
    expect(await canManageNgo(account.id, ngo.id)).toBe(true);
  });

  it("validates the account and the NGO together", async () => {
    try {
      await registerNgo({ account: { representativeName: "", email: "bad" }, ngo: {} });
      expect.unreachable();
    } catch (error) {
      const fields = Object.keys((error as AccountServiceError).fieldErrors ?? {});
      expect(fields).toEqual(expect.arrayContaining(["representativeName", "email", "name"]));
    }
  });

  it("does not leave an account behind when the NGO is rejected", async () => {
    await registerNgo(ngoSignup);
    const second = {
      account: { representativeName: "Awa Ndiaye", email: "awa@other.org" },
      ngo: ngoSignup.ngo, // same NGO name -> rejected
    };
    await expect(registerNgo(second)).rejects.toThrow();
    await expectCode(signIn({ email: "awa@other.org", accountType: "NGO" }), "ACCOUNT_NOT_FOUND");
  });
});

describe("separate account types", () => {
  it("uses one email for only one type of account", async () => {
    await registerNgo(ngoSignup);
    await expectCode(
      registerIndividual({ ...individual, email: "contact@food-for-all.org" }),
      "EMAIL_TAKEN",
    );
  });

  it("signs in only with the matching account type", async () => {
    await registerIndividual(individual);
    expect((await signIn({ email: "alice@example.org", accountType: "INDIVIDUAL" })).type).toBe(
      "INDIVIDUAL",
    );
    await expectCode(signIn({ email: "alice@example.org", accountType: "NGO" }), "WRONG_ACCOUNT_TYPE");
  });

  it("reports unknown emails", async () => {
    await expectCode(signIn({ email: "nobody@example.org", accountType: "INDIVIDUAL" }), "ACCOUNT_NOT_FOUND");
  });
});
