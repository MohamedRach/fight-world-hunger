import "server-only";
import { fieldErrorsFromZod } from "@/features/ngos/validation";
import { getNgoRepository } from "@/features/ngos/repository";
import { canManageNgo } from "@/features/ngos/service";
import { getCampaignRepository } from "@/features/campaigns/repository";
import { acceptsDonations } from "@/features/campaigns/types";
import { getIndividualRepository } from "@/features/individuals/repository";
import { findDonorPaymentMethod } from "@/features/payments/service";
import { getPaymentMethodRepository } from "@/features/payments/repository";
import { ensureMockDataSeeded } from "@/mocks/seed";
import { getDonationRepository } from "./repository";
import { donationCreateSchema, donationStatusSchema } from "./validation";
import {
  allowedDonationTransitions,
  canTransitionDonation,
  countsTowardRaised,
  type CampaignDonationView,
  type Donation,
  type DonationStatus,
  type DonationStatusEvent,
  type DonationView,
} from "./types";

export type DonationServiceErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CAMPAIGN_CLOSED"
  | "INVALID_TRANSITION";

export class DonationServiceError extends Error {
  readonly code: DonationServiceErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: DonationServiceErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "DonationServiceError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function statusEvent(
  from: DonationStatus | null,
  to: DonationStatus,
  actorRole: DonationStatusEvent["actorRole"],
  actorUserId: string | null,
  note: string | null,
): DonationStatusEvent {
  return { from, to, at: new Date(), actorRole, actorUserId, note };
}

/**
 * Records a simulated donation.
 *
 * NOTHING IS CHARGED: no payment provider is called, and the selected mock
 * card is only referenced so the donor can see which card they picked. The
 * donation starts as PENDING until the NGO acknowledges it.
 */
export async function createDonation(
  userId: string | null,
  input: unknown,
): Promise<DonationView> {
  if (!userId) {
    throw new DonationServiceError(
      "UNAUTHENTICATED",
      "You must be signed in as an individual to donate.",
    );
  }
  await ensureMockDataSeeded();

  const parsed = donationCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new DonationServiceError(
      "VALIDATION_ERROR",
      "The donation could not be submitted.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const data = parsed.data;

  const donationRepo = getDonationRepository();

  // Guard against double submits (double click, retried request).
  if (data.requestId) {
    const existing = await donationRepo.findByRequestId(userId, data.requestId);
    if (existing) return toDonationView(existing);
  }

  const campaign = await getCampaignRepository().findById(data.campaignId);
  if (!campaign) {
    throw new DonationServiceError("NOT_FOUND", "That campaign no longer exists.");
  }
  if (!acceptsDonations(campaign.status)) {
    throw new DonationServiceError(
      "CAMPAIGN_CLOSED",
      `"${campaign.title}" is not accepting donations right now.`,
    );
  }

  // The card must belong to this donor — never trust the id from the browser.
  const paymentMethod = await findDonorPaymentMethod(userId, data.paymentMethodId);
  if (!paymentMethod) {
    throw new DonationServiceError(
      "VALIDATION_ERROR",
      "Select one of your saved cards.",
      { paymentMethodId: ["That card is not saved on your account."] },
    );
  }

  // Honour the donor's profile-level anonymity preference as the default.
  const profile = await getIndividualRepository().findByUserId(userId);
  const isAnonymous = data.isAnonymous || (profile?.donateAnonymously ?? false);

  const donation = await donationRepo.create(
    {
      donorUserId: userId,
      campaignId: campaign.id,
      // Denormalised from the campaign so donation and campaign never disagree.
      ngoId: campaign.ngoId,
      paymentMethodId: paymentMethod.id,
      amountMinor: data.amountMinor,
      currency: campaign.currency,
      status: "PENDING",
      isAnonymous,
      message: data.message ?? null,
      statusHistory: [
        statusEvent(null, "PENDING", "DONOR", userId, "Simulated donation recorded."),
      ],
      isDemoSeed: false,
    },
    data.requestId,
  );

  return toDonationView(donation);
}

async function toDonationView(donation: Donation): Promise<DonationView> {
  const [campaign, ngo, paymentMethod] = await Promise.all([
    getCampaignRepository().findById(donation.campaignId),
    getNgoRepository().findById(donation.ngoId),
    getPaymentMethodRepository().findById(donation.paymentMethodId),
  ]);

  return {
    id: donation.id,
    amountMinor: donation.amountMinor,
    currency: donation.currency,
    status: donation.status,
    isAnonymous: donation.isAnonymous,
    message: donation.message,
    createdAt: donation.createdAt.toISOString(),
    updatedAt: donation.updatedAt.toISOString(),
    countsTowardRaised: countsTowardRaised(donation.status),
    isDemoSeed: donation.isDemoSeed,
    campaign: {
      id: donation.campaignId,
      slug: campaign?.slug ?? donation.campaignId,
      title: campaign?.title ?? "Unknown campaign",
      status: campaign?.status ?? "CANCELLED",
      countryCodes: campaign?.countryCodes ?? [],
    },
    ngo: {
      id: donation.ngoId,
      name: ngo?.name ?? "Unknown organization",
      slug: ngo?.slug ?? donation.ngoId,
    },
    paymentMethod: paymentMethod
      ? {
          id: paymentMethod.id,
          brand: paymentMethod.brand,
          last4: paymentMethod.last4,
          label: paymentMethod.label,
        }
      : null,
    history: donation.statusHistory.map((event) => ({
      from: event.from,
      to: event.to,
      at: event.at.toISOString(),
      actorRole: event.actorRole,
      note: event.note,
    })),
  };
}

/** The signed-in donor's own donations. Never returns anyone else's. */
export async function getMyDonations(userId: string | null): Promise<DonationView[]> {
  if (!userId) return [];
  await ensureMockDataSeeded();
  const donations = await getDonationRepository().findByDonor(userId);
  return Promise.all(donations.map(toDonationView));
}

export async function getMyDonation(
  userId: string | null,
  donationId: string,
): Promise<DonationView> {
  if (!userId) {
    throw new DonationServiceError("UNAUTHENTICATED", "You must be signed in.");
  }
  await ensureMockDataSeeded();
  const donation = await getDonationRepository().findById(donationId);
  if (!donation || donation.donorUserId !== userId) {
    // Same message either way: do not reveal that another donor's record exists.
    throw new DonationServiceError("NOT_FOUND", "Donation not found.");
  }
  return toDonationView(donation);
}

/** Donations received by a campaign, for the owning NGO's dashboard. */
export async function getCampaignDonations(
  userId: string | null,
  campaignId: string,
): Promise<CampaignDonationView[]> {
  await ensureMockDataSeeded();
  const campaign = await getCampaignRepository().findById(campaignId);
  if (!campaign) throw new DonationServiceError("NOT_FOUND", "Campaign not found.");
  if (!(await canManageNgo(userId, campaign.ngoId))) {
    throw new DonationServiceError(
      "FORBIDDEN",
      "You are not authorized to view this campaign's donations.",
    );
  }

  const donations = await getDonationRepository().findByCampaign(campaignId);
  const individualRepo = getIndividualRepository();

  return Promise.all(
    donations.map(async (donation) => {
      // Anonymous donors are never named to the NGO.
      let donorDisplayName = "Anonymous donor";
      if (!donation.isAnonymous) {
        const profile = await individualRepo.findByUserId(donation.donorUserId);
        donorDisplayName = profile?.fullName ?? "Donor";
      }
      return {
        id: donation.id,
        amountMinor: donation.amountMinor,
        currency: donation.currency,
        status: donation.status,
        createdAt: donation.createdAt.toISOString(),
        updatedAt: donation.updatedAt.toISOString(),
        countsTowardRaised: countsTowardRaised(donation.status),
        donorDisplayName,
        message: donation.message,
        isDemoSeed: donation.isDemoSeed,
        allowedNextStatuses: [...allowedDonationTransitions(donation.status, "NGO")],
      };
    }),
  );
}

/**
 * Status update driven by the NGO that received the donation.
 *
 * These are PROGRESS statuses only. An NGO cannot mark a donation as paid or
 * financially settled: this build never processes payments, and the labels in
 * DONATION_STATUS_DESCRIPTIONS say so explicitly.
 */
export async function updateDonationStatusAsNgo(
  userId: string | null,
  donationId: string,
  input: unknown,
): Promise<CampaignDonationView> {
  if (!userId) {
    throw new DonationServiceError("UNAUTHENTICATED", "You must be signed in.");
  }
  await ensureMockDataSeeded();

  const repo = getDonationRepository();
  const donation = await repo.findById(donationId);
  if (!donation) throw new DonationServiceError("NOT_FOUND", "Donation not found.");

  if (!(await canManageNgo(userId, donation.ngoId))) {
    throw new DonationServiceError(
      "FORBIDDEN",
      "You are not authorized to update this donation.",
    );
  }

  const parsed = donationStatusSchema.safeParse(input);
  if (!parsed.success) {
    throw new DonationServiceError(
      "VALIDATION_ERROR",
      "The submitted status is invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const next = parsed.data.status;

  if (!canTransitionDonation(donation.status, next, "NGO")) {
    throw new DonationServiceError(
      "INVALID_TRANSITION",
      `A ${donation.status.toLowerCase()} donation cannot become ${next.toLowerCase()}.`,
      { status: ["This status change is not allowed."] },
    );
  }

  const updated = await repo.update(donation.id, {
    status: next,
    statusHistory: [
      ...donation.statusHistory,
      statusEvent(donation.status, next, "NGO", userId, parsed.data.note ?? null),
    ],
  });

  const [view] = await Promise.all([
    (async (): Promise<CampaignDonationView> => {
      let donorDisplayName = "Anonymous donor";
      if (!updated.isAnonymous) {
        const profile = await getIndividualRepository().findByUserId(updated.donorUserId);
        donorDisplayName = profile?.fullName ?? "Donor";
      }
      return {
        id: updated.id,
        amountMinor: updated.amountMinor,
        currency: updated.currency,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        countsTowardRaised: countsTowardRaised(updated.status),
        donorDisplayName,
        message: updated.message,
        isDemoSeed: updated.isDemoSeed,
        allowedNextStatuses: [...allowedDonationTransitions(updated.status, "NGO")],
      };
    })(),
  ]);
  return view;
}

/** A donor may withdraw their own pledge while it is still PENDING. */
export async function cancelMyDonation(
  userId: string | null,
  donationId: string,
): Promise<DonationView> {
  if (!userId) {
    throw new DonationServiceError("UNAUTHENTICATED", "You must be signed in.");
  }
  await ensureMockDataSeeded();

  const repo = getDonationRepository();
  const donation = await repo.findById(donationId);
  if (!donation || donation.donorUserId !== userId) {
    throw new DonationServiceError("NOT_FOUND", "Donation not found.");
  }
  if (!canTransitionDonation(donation.status, "CANCELLED", "DONOR")) {
    throw new DonationServiceError(
      "INVALID_TRANSITION",
      "Only a pending donation can be cancelled. Contact the organization instead.",
    );
  }

  const updated = await repo.update(donation.id, {
    status: "CANCELLED",
    statusHistory: [
      ...donation.statusHistory,
      statusEvent(donation.status, "CANCELLED", "DONOR", userId, "Cancelled by the donor."),
    ],
  });
  return toDonationView(updated);
}
