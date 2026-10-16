import { beforeEach, describe, expect, it } from "vitest";
import {
  createDonation,
  DonationServiceError,
  getDonation,
  listDonations,
  updateDonationStatus,
  type DonationViewer,
} from "@/features/donations/service";
import {
  getDonationRepository,
  setDonationRepositoryForTesting,
} from "@/features/donations/repository";
import { createNgo } from "@/features/ngos/service";
import { setNgoRepositoryForTesting } from "@/features/ngos/repository";
import { createMyIndividualProfile } from "@/features/individuals/service";
import { setIndividualRepositoryForTesting } from "@/features/individuals/repository";
import type { NgoPublicProfile } from "@/features/ngos/types";

const ALICE: DonationViewer = { id: "alice", type: "INDIVIDUAL", displayName: "Alice" };
const BOB: DonationViewer = { id: "bob", type: "INDIVIDUAL", displayName: "Bob" };
const NGO_REP: DonationViewer = { id: "ngo-rep", type: "NGO", displayName: "Nadia" };
const OTHER_NGO_REP: DonationViewer = { id: "other-rep", type: "NGO", displayName: "Omar" };

const ngoInput = {
  name: "Food For All",
  shortDescription: "Fighting hunger with local food banks.",
  mission: "We distribute surplus food to families facing food insecurity.",
  primaryCause: "HUNGER_RELIEF",
  hqCountryCode: "FRA",
  operatingCountryCodes: ["FRA", "SEN"],
};

let ngo: NgoPublicProfile;
let otherNgo: NgoPublicProfile;

async function expectError(promise: Promise<unknown>, code: DonationServiceError["code"]) {
  try {
    await promise;
    expect.unreachable(`expected DonationServiceError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(DonationServiceError);
    expect((error as DonationServiceError).code).toBe(code);
  }
}

function donate(viewer: DonationViewer | null, overrides: Record<string, unknown> = {}) {
  return createDonation(viewer, { ngoId: ngo.id, amount: 25, currency: "EUR", ...overrides });
}

beforeEach(async () => {
  setDonationRepositoryForTesting(undefined);
  setNgoRepositoryForTesting(undefined);
  setIndividualRepositoryForTesting(undefined);
  ngo = await createNgo(NGO_REP.id, ngoInput);
  otherNgo = await createNgo(OTHER_NGO_REP.id, { ...ngoInput, name: "Water For All" });
  await createMyIndividualProfile(ALICE.id, {
    fullName: "Alice Martin",
    email: "alice@example.org",
    acceptPrivacyPolicy: true,
  });
  await createMyIndividualProfile(BOB.id, {
    fullName: "Bob Diallo",
    email: "bob@example.org",
    donateAnonymously: true,
    acceptPrivacyPolicy: true,
  });
});

describe("createDonation", () => {
  it("rejects anonymous visitors and NGO accounts", async () => {
    await expectError(donate(null), "UNAUTHENTICATED");
    await expectError(donate(NGO_REP), "FORBIDDEN");
  });

  it("validates input and the target NGO", async () => {
    await expectError(donate(ALICE, { amount: 0 }), "VALIDATION_ERROR");
    try {
      await donate(ALICE, { ngoId: "does-not-exist" });
      expect.unreachable();
    } catch (error) {
      expect((error as DonationServiceError).code).toBe("VALIDATION_ERROR");
      expect((error as DonationServiceError).fieldErrors).toHaveProperty("ngoId");
    }
  });

  it("creates a pending donation with an initial history entry", async () => {
    const donation = await donate(ALICE, { amount: 19.99, message: "For school meals" });
    expect(donation).toMatchObject({
      status: "PENDING",
      amount: 19.99,
      currency: "EUR",
      message: "For school meals",
      isAnonymous: false,
      donorName: "Alice Martin",
      viewerRole: "DONOR",
      allowedNextStatuses: [],
      ngo: { id: ngo.id, slug: ngo.slug, name: "Food For All" },
    });
    expect(donation.history).toHaveLength(1);
    expect(donation.history[0]).toMatchObject({
      previousStatus: null,
      newStatus: "PENDING",
      actor: "DONOR",
    });
    const stored = await getDonationRepository().findById(donation.id);
    expect(stored?.amountMinor).toBe(1999);
  });

  it("accepts the NGO slug and stores the canonical NGO id", async () => {
    const donation = await donate(ALICE, { ngoId: ngo.slug });
    expect((await getDonationRepository().findById(donation.id))?.ngoId).toBe(ngo.id);
  });

  it("defaults anonymity to the donor's profile preference, overridable per donation", async () => {
    expect((await donate(BOB)).isAnonymous).toBe(true);
    expect((await donate(BOB, { isAnonymous: false })).isAnonymous).toBe(false);
    expect((await donate(ALICE, { isAnonymous: true })).isAnonymous).toBe(true);
  });

  it("ignores attempts to set server-controlled fields", async () => {
    await expectError(donate(ALICE, { status: "COMPLETED" }), "VALIDATION_ERROR");
  });
});

describe("listDonations", () => {
  it("returns only the donor's own donations, newest first", async () => {
    const first = await donate(ALICE);
    const second = await donate(ALICE, { amount: 50 });
    await donate(BOB);
    const result = await listDonations(ALICE, {});
    expect(result.items.map((d) => d.id)).toEqual([second.id, first.id]);
    expect(result.total).toBe(2);
  });

  it("filters by status and NGO, and paginates", async () => {
    const pending = await donate(ALICE);
    const confirmed = await donate(ALICE);
    await updateDonationStatus(NGO_REP, confirmed.id, { status: "CONFIRMED" });
    await createDonation(ALICE, { ngoId: otherNgo.id, amount: 5, currency: "USD" });

    const byStatus = await listDonations(ALICE, { status: "PENDING", ngoId: ngo.slug });
    expect(byStatus.items.map((d) => d.id)).toEqual([pending.id]);

    const page = await listDonations(ALICE, { limit: "1", offset: "1" });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(3);

    const unknownNgo = await listDonations(ALICE, { ngoId: "missing" });
    expect(unknownNgo.items).toEqual([]);
  });

  it("lets NGO representatives list their NGO's donations only", async () => {
    await donate(ALICE);
    await donate(BOB);
    const result = await listDonations(NGO_REP, { ngoId: ngo.id });
    expect(result.total).toBe(2);
    await expectError(listDonations(NGO_REP, { ngoId: otherNgo.id }), "FORBIDDEN");
    await expectError(listDonations(NGO_REP, {}), "VALIDATION_ERROR");
    await expectError(listDonations(NGO_REP, { ngoId: "missing" }), "NOT_FOUND");
    await expectError(listDonations(null, {}), "UNAUTHENTICATED");
  });

  it("hides anonymous donors' names from the NGO", async () => {
    await donate(BOB);
    await donate(ALICE);
    const result = await listDonations(NGO_REP, { ngoId: ngo.id });
    expect(result.items.map((d) => d.donorName)).toEqual(["Alice Martin", null]);
    const own = await listDonations(BOB, {});
    expect(own.items[0].donorName).toBe("Bob Diallo");
  });
});

describe("getDonation", () => {
  it("is visible to its donor and to the receiving NGO only", async () => {
    const donation = await donate(ALICE);
    expect((await getDonation(ALICE, donation.id)).viewerRole).toBe("DONOR");
    const asNgo = await getDonation(NGO_REP, donation.id);
    expect(asNgo.viewerRole).toBe("NGO");
    expect(asNgo.allowedNextStatuses).toEqual(["CONFIRMED", "REJECTED"]);

    await expectError(getDonation(BOB, donation.id), "NOT_FOUND");
    await expectError(getDonation(OTHER_NGO_REP, donation.id), "NOT_FOUND");
    await expectError(getDonation(null, donation.id), "UNAUTHENTICATED");
    await expectError(getDonation(ALICE, "missing"), "NOT_FOUND");
  });
});

describe("updateDonationStatus", () => {
  it("lets the receiving NGO walk the full lifecycle and records history", async () => {
    const donation = await donate(ALICE);
    await updateDonationStatus(NGO_REP, donation.id, { status: "CONFIRMED" });
    await updateDonationStatus(NGO_REP, donation.id, {
      status: "IN_PROGRESS",
      note: "Buying rice",
    });
    const done = await updateDonationStatus(NGO_REP, donation.id, {
      status: "COMPLETED",
      note: "  120 meals served  ",
    });

    expect(done.status).toBe("COMPLETED");
    expect(done.allowedNextStatuses).toEqual([]);
    expect(
      done.history.map((entry) => [entry.previousStatus, entry.newStatus, entry.actor]),
    ).toEqual([
      [null, "PENDING", "DONOR"],
      ["PENDING", "CONFIRMED", "NGO"],
      ["CONFIRMED", "IN_PROGRESS", "NGO"],
      ["IN_PROGRESS", "COMPLETED", "NGO"],
    ]);
    expect(done.history.at(-1)?.note).toBe("120 meals served");

    // The donor sees the same progress.
    const seenByDonor = await getDonation(ALICE, donation.id);
    expect(seenByDonor.status).toBe("COMPLETED");
    expect(seenByDonor.history).toHaveLength(4);
  });

  it("records the acting representative in the history", async () => {
    const donation = await donate(ALICE);
    await updateDonationStatus(NGO_REP, donation.id, { status: "CONFIRMED" });
    const [, entry] = await getDonationRepository().findHistory(donation.id);
    expect(entry.changedByUserId).toBe(NGO_REP.id);
    expect(entry.changedByRole).toBe("NGO");
  });

  it("rejects invalid transitions without changing anything", async () => {
    const donation = await donate(ALICE);
    await expectError(
      updateDonationStatus(NGO_REP, donation.id, { status: "COMPLETED" }),
      "INVALID_STATUS_TRANSITION",
    );
    await expectError(
      updateDonationStatus(NGO_REP, donation.id, { status: "PENDING" }),
      "INVALID_STATUS_TRANSITION",
    );
    await updateDonationStatus(NGO_REP, donation.id, { status: "REJECTED" });
    await expectError(
      updateDonationStatus(NGO_REP, donation.id, { status: "CONFIRMED" }),
      "INVALID_STATUS_TRANSITION",
    );
    const current = await getDonation(ALICE, donation.id);
    expect(current.status).toBe("REJECTED");
    expect(current.history).toHaveLength(2);
  });

  it("only allows the receiving NGO to update the status", async () => {
    const donation = await donate(ALICE);
    await expectError(
      updateDonationStatus(ALICE, donation.id, { status: "CONFIRMED" }),
      "FORBIDDEN",
    );
    await expectError(
      updateDonationStatus(OTHER_NGO_REP, donation.id, { status: "CONFIRMED" }),
      "NOT_FOUND",
    );
    await expectError(
      updateDonationStatus(BOB, donation.id, { status: "CONFIRMED" }),
      "NOT_FOUND",
    );
    await expectError(
      updateDonationStatus(null, donation.id, { status: "CONFIRMED" }),
      "UNAUTHENTICATED",
    );
    expect((await getDonation(ALICE, donation.id)).status).toBe("PENDING");
  });

  it("validates the update body", async () => {
    const donation = await donate(ALICE);
    await expectError(
      updateDonationStatus(NGO_REP, donation.id, { status: "SHIPPED" }),
      "VALIDATION_ERROR",
    );
    await expectError(
      updateDonationStatus(NGO_REP, donation.id, { status: "CONFIRMED", note: "a".repeat(501) }),
      "VALIDATION_ERROR",
    );
  });

  it("reports a conflict when the status changed concurrently", async () => {
    const donation = await donate(ALICE);
    const repo = getDonationRepository();
    const original = repo.findById.bind(repo);
    // Simulate another representative confirming between the read and the write.
    repo.findById = async (id) => {
      const snapshot = await original(id);
      await repo.updateStatus(id, {
        expectedStatus: "PENDING",
        newStatus: "CONFIRMED",
        note: null,
        changedByUserId: "someone-else",
        changedByRole: "NGO",
      });
      return snapshot;
    };
    await expectError(
      updateDonationStatus(NGO_REP, donation.id, { status: "REJECTED" }),
      "STATUS_CONFLICT",
    );
    repo.findById = original;
    const current = await getDonation(ALICE, donation.id);
    expect(current.status).toBe("CONFIRMED");
    expect(current.history).toHaveLength(2);
  });
});
