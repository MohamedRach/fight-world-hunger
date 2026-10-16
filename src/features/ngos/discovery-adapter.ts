import "server-only";
import type { NgoRepository as DiscoveryNgoRepository } from "@/features/discovery/server/ngo-repository";
import type { NgoSummary } from "@/features/discovery/types";
import { getNgoRepository } from "./repository";
import { NGO_CAUSE_LABELS, type Ngo } from "./types";

/**
 * Maps an NGO profile to the `NgoSummary` contract consumed by the map and
 * discovery feature (Developer 2). Only public fields are exposed.
 */
export function toNgoSummary(ngo: Ngo): NgoSummary {
  return {
    id: ngo.id,
    name: ngo.name,
    slug: ngo.slug,
    logoUrl: ngo.logoUrl,
    shortDescription: ngo.shortDescription,
    causes: [ngo.primaryCause, ...ngo.otherCauses].map((cause) => NGO_CAUSE_LABELS[cause]),
    operatingCountryCodes: ngo.operatingCountryCodes,
    websiteUrl: ngo.website,
  };
}

/**
 * Implements the discovery feature's `NgoRepository` on top of NGO profiles,
 * so NGOs created through onboarding appear on the map.
 *
 * Listing rule: every profile is listed regardless of `verificationStatus`,
 * consistent with public profile pages. The NGO verification process is
 * still an open team decision (TEAM_DEVELOPMENT_GUIDE §16); once agreed,
 * enforce it here.
 */
export const ngoProfileDiscoveryRepository: DiscoveryNgoRepository = {
  async findByOperatingCountry(countryCode: string): Promise<NgoSummary[]> {
    const ngos = await getNgoRepository().findByOperatingCountry(countryCode);
    return ngos.map(toNgoSummary);
  },
};
