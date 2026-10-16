/**
 * Donation domain types, shared by the server and the tracking UI.
 * The lifecycle and its meaning are documented in docs/DATABASE_SCHEMA.md.
 */

export const DONATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const;

export type DonationStatus = (typeof DONATION_STATUSES)[number];

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** What each status means for a pledge (no payment is processed). */
export const DONATION_STATUS_DESCRIPTIONS: Record<DonationStatus, string> = {
  PENDING: "Pledge received. Waiting for the NGO to confirm it.",
  CONFIRMED: "The NGO has accepted the pledge and will put it to use.",
  IN_PROGRESS: "The NGO is using the donation in its programs.",
  COMPLETED: "The NGO has finished using the donation.",
  REJECTED: "The NGO declined the pledge.",
  CANCELLED: "The donation was stopped before it was completed.",
};

export const DONATION_CURRENCIES = ["USD", "EUR", "GBP"] as const;

export type DonationCurrency = (typeof DONATION_CURRENCIES)[number];

export const DONATION_CURRENCY_LABELS: Record<DonationCurrency, string> = {
  USD: "USD — US dollar",
  EUR: "EUR — Euro",
  GBP: "GBP — British pound",
};

/** All supported currencies have two decimal places (cents/pence). */
export const MINOR_UNITS_PER_MAJOR = 100;

/** Who performed an action on a donation. Never exposes the user id. */
export type DonationActorRole = "DONOR" | "NGO";

export type Donation = {
  id: string;
  donorUserId: string;
  /** Snapshot of the donor's name when the donation was made. */
  donorName: string;
  ngoId: string;
  /** Integer amount in minor units (e.g. cents) to avoid float rounding. */
  amountMinor: number;
  currency: DonationCurrency;
  message: string | null;
  isAnonymous: boolean;
  status: DonationStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type DonationStatusHistoryEntry = {
  id: string;
  donationId: string;
  /** null for the entry recording the donation's creation. */
  previousStatus: DonationStatus | null;
  newStatus: DonationStatus;
  note: string | null;
  changedByUserId: string;
  changedByRole: DonationActorRole;
  createdAt: Date;
};

export type DonationNgoSummary = { id: string; slug: string; name: string };

/** A donation as returned to an authorized viewer (its donor or the NGO). */
export type DonationView = {
  id: string;
  ngo: DonationNgoSummary;
  amount: number;
  currency: DonationCurrency;
  message: string | null;
  isAnonymous: boolean;
  /** null when an NGO views an anonymous donation. */
  donorName: string | null;
  status: DonationStatus;
  createdAt: string;
  updatedAt: string;
};

export type DonationHistoryEntryView = {
  id: string;
  previousStatus: DonationStatus | null;
  newStatus: DonationStatus;
  note: string | null;
  actor: DonationActorRole;
  createdAt: string;
};

export type DonationDetail = DonationView & {
  history: DonationHistoryEntryView[];
  /** How the current user relates to this donation. */
  viewerRole: DonationActorRole;
  /** Statuses the viewer may move the donation to (empty for donors). */
  allowedNextStatuses: DonationStatus[];
};

export type DonationList = {
  items: DonationView[];
  total: number;
  limit: number;
  offset: number;
};
