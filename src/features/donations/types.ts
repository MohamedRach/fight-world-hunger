import type { CurrencyCode } from "@/features/money";
import type { CampaignStatus } from "@/features/campaigns/types";

/**
 * Donation lifecycle from TEAM_DEVELOPMENT_GUIDE section 8:
 * PENDING → CONFIRMED → IN_PROGRESS → COMPLETED, plus the exceptional
 * terminal states CANCELLED (by the donor) and REJECTED (by the NGO).
 *
 * IMPORTANT: this application simulates donations. No payment is taken and no
 * status means money has actually moved; see DONATION_STATUS_DESCRIPTIONS.
 */
export const DONATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;

export type DonationStatus = (typeof DONATION_STATUSES)[number];

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

export const DONATION_STATUS_DESCRIPTIONS: Record<DonationStatus, string> = {
  PENDING: "Pledge recorded. The organization has not acknowledged it yet. No payment has been taken.",
  CONFIRMED: "The organization has acknowledged your pledge. This is not a payment confirmation.",
  IN_PROGRESS: "The organization reports that the supported work is under way.",
  COMPLETED: "The organization reports that the supported work is finished.",
  CANCELLED: "You cancelled this pledge before it was acknowledged.",
  REJECTED: "The organization could not accept this pledge.",
};

/** Who performed a status change. */
export type DonationActorRole = "DONOR" | "NGO" | "SYSTEM";

export type DonationStatusEvent = {
  from: DonationStatus | null;
  to: DonationStatus;
  at: Date;
  actorRole: DonationActorRole;
  /** Account id of the actor; null for SYSTEM. */
  actorUserId: string | null;
  note: string | null;
};

export type Donation = {
  id: string;
  /** Account id of the donating individual. */
  donorUserId: string;
  campaignId: string;
  /** Denormalised from the campaign; must always equal the campaign's NGO. */
  ngoId: string;
  /** Mock payment method belonging to the donor. */
  paymentMethodId: string;
  amountMinor: number;
  currency: CurrencyCode;
  status: DonationStatus;
  isAnonymous: boolean;
  message: string | null;
  statusHistory: DonationStatusEvent[];
  isDemoSeed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Transitions allowed by role. Donors may only withdraw a pledge that has not
 * been acknowledged; NGOs drive the rest. Nothing here settles a payment.
 */
export const DONATION_TRANSITIONS: Record<
  DonationStatus,
  { ngo: readonly DonationStatus[]; donor: readonly DonationStatus[] }
> = {
  PENDING: { ngo: ["CONFIRMED", "REJECTED"], donor: ["CANCELLED"] },
  CONFIRMED: { ngo: ["IN_PROGRESS", "COMPLETED", "REJECTED"], donor: [] },
  IN_PROGRESS: { ngo: ["COMPLETED"], donor: [] },
  COMPLETED: { ngo: [], donor: [] },
  CANCELLED: { ngo: [], donor: [] },
  REJECTED: { ngo: [], donor: [] },
};

export function allowedDonationTransitions(
  from: DonationStatus,
  role: "NGO" | "DONOR",
): readonly DonationStatus[] {
  return role === "NGO" ? DONATION_TRANSITIONS[from].ngo : DONATION_TRANSITIONS[from].donor;
}

export function canTransitionDonation(
  from: DonationStatus,
  to: DonationStatus,
  role: "NGO" | "DONOR",
): boolean {
  return allowedDonationTransitions(from, role).includes(to);
}

/**
 * THE single rule for a campaign's raised total.
 *
 * A pledge counts once the NGO has acknowledged it (CONFIRMED, IN_PROGRESS or
 * COMPLETED). PENDING pledges are not yet acknowledged, and CANCELLED or
 * REJECTED ones never count, so neither can inflate the total. Every view
 * (cards, country list, campaign page, dashboard) uses this function.
 */
export function countsTowardRaised(status: DonationStatus): boolean {
  return status === "CONFIRMED" || status === "IN_PROGRESS" || status === "COMPLETED";
}

/** A donor's view of their own donation, enriched for the tracking page. */
export type DonationView = {
  id: string;
  amountMinor: number;
  currency: CurrencyCode;
  status: DonationStatus;
  isAnonymous: boolean;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  countsTowardRaised: boolean;
  isDemoSeed: boolean;
  campaign: {
    id: string;
    slug: string;
    title: string;
    status: CampaignStatus;
    countryCodes: string[];
  };
  ngo: { id: string; name: string; slug: string };
  paymentMethod: { id: string; brand: string; last4: string; label: string } | null;
  history: Array<{
    from: DonationStatus | null;
    to: DonationStatus;
    at: string;
    actorRole: DonationActorRole;
    note: string | null;
  }>;
};

/** An NGO's view of a donation it received. Donor identity is limited. */
export type CampaignDonationView = {
  id: string;
  amountMinor: number;
  currency: CurrencyCode;
  status: DonationStatus;
  createdAt: string;
  updatedAt: string;
  countsTowardRaised: boolean;
  /** "Anonymous donor" when the donor chose anonymity. */
  donorDisplayName: string;
  message: string | null;
  isDemoSeed: boolean;
  allowedNextStatuses: DonationStatus[];
};
