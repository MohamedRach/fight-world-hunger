import "server-only";
import { getAccountRepository } from "@/features/accounts/repository";
import { getCampaignRepository } from "@/features/campaigns/repository";
import type { CampaignStatus } from "@/features/campaigns/types";
import { getDonationRepository } from "@/features/donations/repository";
import type {
  DonationActorRole,
  DonationStatus,
  DonationStatusEvent,
} from "@/features/donations/types";
import { getIndividualRepository } from "@/features/individuals/repository";
import { getNgoRepository, slugify } from "@/features/ngos/repository";
import type { NgoCause } from "@/features/ngos/types";
import type { HungerIssueId } from "@/features/hunger-issues/catalog";
import { getPaymentMethodRepository } from "@/features/payments/repository";
import type { MockCardBrand } from "@/features/payments/types";
import type { CurrencyCode } from "@/features/money";

import campaignsSeed from "./campaigns.json";
import donationsSeed from "./donations.json";
import individualsSeed from "./individuals.json";
import ngosSeed from "./ngos.json";
import paymentMethodsSeed from "./payment-methods.json";

/**
 * Loads the fictional demo data in src/mocks into the in-memory repositories.
 *
 * Runs at most once per server process and only when the store is empty, so
 * it never overwrites records created through the UI. Entities are linked by
 * the stable `key` fields in the JSON; real ids are generated at runtime.
 *
 * See src/mocks/README.md for the persistence model.
 */

const globalStore = globalThis as unknown as { __mockSeedPromise?: Promise<void> };

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

type NgoSeed = (typeof ngosSeed)[number];
type IndividualSeed = (typeof individualsSeed)[number];
type PaymentMethodSeed = (typeof paymentMethodsSeed)[number];
type CampaignSeed = (typeof campaignsSeed)[number];
type DonationSeed = (typeof donationsSeed)[number];

async function seedNgos(): Promise<Map<string, string>> {
  const accountRepo = getAccountRepository();
  const ngoRepo = getNgoRepository();
  const byKey = new Map<string, string>();

  for (const entry of ngosSeed as NgoSeed[]) {
    const existing = await ngoRepo.findByName(entry.profile.name);
    if (existing) {
      byKey.set(entry.key, existing.id);
      continue;
    }

    const account =
      (await accountRepo.findByEmail(entry.account.email)) ??
      (await accountRepo.create({
        email: entry.account.email,
        type: "NGO",
        displayName: entry.account.representativeName,
      }));

    const profile = entry.profile;
    const ngo = await ngoRepo.create({
      slug: slugify(profile.name),
      name: profile.name,
      hungerFocusAreas: profile.hungerFocusAreas as HungerIssueId[],
      hungerMission: profile.hungerMission,
      logoUrl: null,
      shortDescription: profile.shortDescription,
      mission: profile.mission,
      activitiesDescription: profile.activitiesDescription,
      targetBeneficiaries: profile.targetBeneficiaries,
      yearFounded: profile.yearFounded,
      registrationId: null,
      website: profile.website,
      contactEmail: profile.contactEmail,
      contactPhone: null,
      socialLinks: null,
      primaryCause: profile.primaryCause as NgoCause,
      otherCauses: profile.otherCauses as NgoCause[],
      hqCountryCode: profile.hqCountryCode,
      hqCity: profile.hqCity,
      operatingCountryCodes: profile.operatingCountryCodes,
      projectsSummary: profile.projectsSummary,
      impactSummary: profile.impactSummary,
      keyAchievements: profile.keyAchievements,
      verificationStatus: "PENDING",
      createdByUserId: account.id,
    });
    await ngoRepo.addMembership(account.id, ngo.id, "OWNER");
    byKey.set(entry.key, ngo.id);
  }

  return byKey;
}

async function seedIndividuals(): Promise<Map<string, string>> {
  const accountRepo = getAccountRepository();
  const individualRepo = getIndividualRepository();
  const byKey = new Map<string, string>();

  for (const entry of individualsSeed as IndividualSeed[]) {
    const profile = entry.profile;
    const account =
      (await accountRepo.findByEmail(profile.email)) ??
      (await accountRepo.create({
        email: profile.email,
        type: "INDIVIDUAL",
        displayName: profile.fullName,
      }));

    if (!(await individualRepo.findByUserId(account.id))) {
      await individualRepo.create({
        userId: account.id,
        fullName: profile.fullName,
        email: profile.email,
        countryCode: profile.countryCode,
        avatarUrl: null,
        bio: profile.bio,
        hungerInterests: profile.hungerInterests as HungerIssueId[],
        preferredCountryCodes: profile.preferredCountryCodes,
        donateAnonymously: profile.donateAnonymously,
        contactConsent: profile.contactConsent,
        privacyAcceptedAt: new Date(),
      });
    }
    byKey.set(entry.key, account.id);
  }

  return byKey;
}

async function seedPaymentMethods(individualIds: Map<string, string>): Promise<Map<string, string>> {
  const repo = getPaymentMethodRepository();
  const byKey = new Map<string, string>();

  for (const entry of paymentMethodsSeed as PaymentMethodSeed[]) {
    const ownerUserId = individualIds.get(entry.individualKey);
    if (!ownerUserId) continue;

    const created = await repo.create({
      ownerUserId,
      brand: entry.brand as MockCardBrand,
      last4: entry.last4,
      holderName: entry.holderName,
      expMonth: entry.expMonth,
      expYear: entry.expYear,
      label: entry.label,
      isDefault: entry.isDefault,
      isDemoSeed: true,
    });
    byKey.set(entry.key, created.id);
  }

  return byKey;
}

async function seedCampaigns(ngoIds: Map<string, string>): Promise<Map<string, string>> {
  const repo = getCampaignRepository();
  const byKey = new Map<string, string>();

  for (const entry of campaignsSeed as CampaignSeed[]) {
    const ngoId = ngoIds.get(entry.ngoKey);
    if (!ngoId) continue;

    const created = await repo.create({
      slug: slugify(entry.title),
      ngoId,
      title: entry.title,
      summary: entry.summary,
      description: entry.description,
      countryCodes: entry.countryCodes,
      issueTags: entry.issueTags as HungerIssueId[],
      goalAmountMinor: entry.goalAmountMinor,
      currency: entry.currency as CurrencyCode,
      startDate:
        entry.startDateDaysFromNow === null ? null : daysFromNow(entry.startDateDaysFromNow),
      endDate: entry.endDateDaysFromNow === null ? null : daysFromNow(entry.endDateDaysFromNow),
      imageUrl: null,
      status: entry.status as CampaignStatus,
      isDemoSeed: true,
    });
    byKey.set(entry.key, created.id);
  }

  return byKey;
}

async function seedDonations(
  individualIds: Map<string, string>,
  campaignIds: Map<string, string>,
  paymentMethodIds: Map<string, string>,
): Promise<void> {
  const donationRepo = getDonationRepository();
  const campaignRepo = getCampaignRepository();

  for (const entry of donationsSeed as DonationSeed[]) {
    const donorUserId = individualIds.get(entry.individualKey);
    const campaignId = campaignIds.get(entry.campaignKey);
    const paymentMethodId = paymentMethodIds.get(entry.paymentMethodKey);
    if (!donorUserId || !campaignId || !paymentMethodId) continue;

    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) continue;

    let previous: DonationStatus | null = null;
    const statusHistory: DonationStatusEvent[] = entry.statusFlow.map((step) => {
      const event: DonationStatusEvent = {
        from: previous,
        to: step.to as DonationStatus,
        at: daysFromNow(-step.daysAgo),
        actorRole: step.actorRole as DonationActorRole,
        actorUserId: null,
        note: step.note,
      };
      previous = step.to as DonationStatus;
      return event;
    });

    await donationRepo.create({
      donorUserId,
      campaignId,
      ngoId: campaign.ngoId,
      paymentMethodId,
      amountMinor: entry.amountMinor,
      currency: campaign.currency,
      status: (previous ?? "PENDING") as DonationStatus,
      isAnonymous: entry.isAnonymous,
      message: entry.message,
      statusHistory,
      isDemoSeed: true,
    });
  }
}

async function runSeed(): Promise<void> {
  // Only seed an empty store, so hand-created records are never duplicated.
  if ((await getCampaignRepository().findAll()).length > 0) return;

  const ngoIds = await seedNgos();
  const individualIds = await seedIndividuals();
  const paymentMethodIds = await seedPaymentMethods(individualIds);
  const campaignIds = await seedCampaigns(ngoIds);
  await seedDonations(individualIds, campaignIds, paymentMethodIds);
}

/**
 * Idempotent, concurrency-safe entry point. Every service that reads mock
 * data awaits this first.
 */
export function ensureMockDataSeeded(): Promise<void> {
  globalStore.__mockSeedPromise ??= runSeed().catch((error: unknown) => {
    // Let a later request retry rather than caching a failed seed.
    globalStore.__mockSeedPromise = undefined;
    console.error("[mocks] Failed to seed demo data:", error);
  });
  return globalStore.__mockSeedPromise;
}
