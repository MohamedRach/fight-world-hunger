import type { CurrencyCode } from "@/features/money";

export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const CAMPAIGN_STATUS_DESCRIPTIONS: Record<CampaignStatus, string> = {
  DRAFT: "Not published. Only your organization can see it.",
  ACTIVE: "Published and open for donations.",
  PAUSED: "Visible, but temporarily not accepting donations.",
  COMPLETED: "Fundraising finished. No new donations.",
  CANCELLED: "Stopped permanently. No new donations.",
};

/**
 * Allowed campaign status transitions. A cancelled or completed campaign is
 * terminal: reopening would misrepresent fundraising history, so it needs an
 * explicit team rule first (TEAM_DEVELOPMENT_GUIDE section 16).
 */
export const CAMPAIGN_STATUS_TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  DRAFT: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["PAUSED", "COMPLETED", "CANCELLED"],
  PAUSED: ["ACTIVE", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionCampaign(from: CampaignStatus, to: CampaignStatus): boolean {
  return CAMPAIGN_STATUS_TRANSITIONS[from].includes(to);
}

/** Only an ACTIVE campaign accepts new donations. */
export function acceptsDonations(status: CampaignStatus): boolean {
  return status === "ACTIVE";
}

/** Campaigns visible to the public; DRAFT is private to the owning NGO. */
export function isPubliclyVisible(status: CampaignStatus): boolean {
  return status !== "DRAFT";
}

export type Campaign = {
  id: string;
  slug: string;
  /** Owning NGO. Every campaign belongs to exactly one existing NGO. */
  ngoId: string;
  title: string;
  /** One-line summary shown on cards. */
  summary: string;
  /** Full description and purpose of the campaign. */
  description: string;
  /** ISO 3166-1 alpha-3 codes of the countries served. Never duplicated per country. */
  countryCodes: string[];
  goalAmountMinor: number;
  currency: CurrencyCode;
  startDate: Date | null;
  endDate: Date | null;
  imageUrl: string | null;
  status: CampaignStatus;
  /** True for the fictional records loaded from src/mocks, so the UI can label them. */
  isDemoSeed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Campaign plus the derived figures every view needs. Computed in one place. */
export type CampaignWithProgress = Campaign & {
  ngoName: string;
  ngoSlug: string;
  raisedAmountMinor: number;
  donationCount: number;
  progressPercent: number;
  remainingAmountMinor: number;
};

/** Public shape returned by the API and rendered on cards. */
export type CampaignSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  countryCodes: string[];
  goalAmountMinor: number;
  raisedAmountMinor: number;
  progressPercent: number;
  donationCount: number;
  currency: CurrencyCode;
  status: CampaignStatus;
  endDate: string | null;
  imageUrl: string | null;
  isDemoSeed: boolean;
  ngo: { id: string; name: string; slug: string };
};

export function toCampaignSummary(campaign: CampaignWithProgress): CampaignSummary {
  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    summary: campaign.summary,
    countryCodes: campaign.countryCodes,
    goalAmountMinor: campaign.goalAmountMinor,
    raisedAmountMinor: campaign.raisedAmountMinor,
    progressPercent: campaign.progressPercent,
    donationCount: campaign.donationCount,
    currency: campaign.currency,
    status: campaign.status,
    endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
    imageUrl: campaign.imageUrl,
    isDemoSeed: campaign.isDemoSeed,
    ngo: { id: campaign.ngoId, name: campaign.ngoName, slug: campaign.ngoSlug },
  };
}

export type CampaignsByCountryResponse = {
  data: CampaignSummary[];
  meta: { countryCode: string; total: number };
};
