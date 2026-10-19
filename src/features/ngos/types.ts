import type { HungerIssueId } from "@/features/hunger-issues/catalog";

export const NGO_CAUSES = [
  "HUNGER_RELIEF",
  "EDUCATION",
  "HEALTHCARE",
  "POVERTY_REDUCTION",
  "CLEAN_WATER",
  "DISASTER_RELIEF",
  "ENVIRONMENT",
  "HUMAN_RIGHTS",
  "OTHER",
] as const;

export type NgoCause = (typeof NGO_CAUSES)[number];

export const NGO_CAUSE_LABELS: Record<NgoCause, string> = {
  HUNGER_RELIEF: "Hunger relief",
  EDUCATION: "Education",
  HEALTHCARE: "Healthcare",
  POVERTY_REDUCTION: "Poverty reduction",
  CLEAN_WATER: "Clean water",
  DISASTER_RELIEF: "Disaster relief",
  ENVIRONMENT: "Environment",
  HUMAN_RIGHTS: "Human rights",
  OTHER: "Other",
};

export type NgoVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type NgoMemberRole = "OWNER" | "EDITOR";

export type SocialLinks = {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
};

export type Ngo = {
  id: string;
  slug: string;
  name: string;
  /**
   * World hunger issues this organization works on, from the shared taxonomy
   * (src/features/hunger-issues/catalog.ts). Describes the organization as a
   * whole — each campaign still carries its own `issueTags`.
   */
  hungerFocusAreas: HungerIssueId[];
  /** How the organization tackles hunger: its interventions and approach. */
  hungerMission: string | null;
  logoUrl: string | null;
  shortDescription: string;
  mission: string;
  activitiesDescription: string | null;
  targetBeneficiaries: string | null;
  yearFounded: number | null;
  registrationId: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  socialLinks: SocialLinks | null;
  primaryCause: NgoCause;
  otherCauses: NgoCause[];
  hqCountryCode: string;
  hqCity: string | null;
  operatingCountryCodes: string[];
  projectsSummary: string | null;
  impactSummary: string | null;
  keyAchievements: string[];
  verificationStatus: NgoVerificationStatus;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NgoMembership = {
  id: string;
  userId: string;
  ngoId: string;
  role: NgoMemberRole;
  createdAt: Date;
};

/** Shape returned by public endpoints and pages. Never includes
 * registrationId, verificationStatus, createdByUserId, or memberships. */
export type NgoPublicProfile = Omit<
  Ngo,
  "registrationId" | "verificationStatus" | "createdByUserId" | "createdAt" | "updatedAt"
>;

export function toPublicProfile(ngo: Ngo): NgoPublicProfile {
  return {
    id: ngo.id,
    slug: ngo.slug,
    name: ngo.name,
    hungerFocusAreas: ngo.hungerFocusAreas,
    hungerMission: ngo.hungerMission,
    logoUrl: ngo.logoUrl,
    shortDescription: ngo.shortDescription,
    mission: ngo.mission,
    activitiesDescription: ngo.activitiesDescription,
    targetBeneficiaries: ngo.targetBeneficiaries,
    yearFounded: ngo.yearFounded,
    website: ngo.website,
    contactEmail: ngo.contactEmail,
    contactPhone: ngo.contactPhone,
    socialLinks: ngo.socialLinks,
    primaryCause: ngo.primaryCause,
    otherCauses: ngo.otherCauses,
    hqCountryCode: ngo.hqCountryCode,
    hqCity: ngo.hqCity,
    operatingCountryCodes: ngo.operatingCountryCodes,
    projectsSummary: ngo.projectsSummary,
    impactSummary: ngo.impactSummary,
    keyAchievements: ngo.keyAchievements,
  };
}
