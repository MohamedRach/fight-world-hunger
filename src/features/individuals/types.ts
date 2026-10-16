import type { NgoCause } from "@/features/ngos/types";

/** Profile of an individual (potential donor). Private to its owner. */
export type IndividualProfile = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  countryCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  preferredCauses: NgoCause[];
  preferredCountryCodes: string[];
  donateAnonymously: boolean;
  contactConsent: boolean;
  privacyAcceptedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/** Shape returned to the profile owner — the only person allowed to read it. */
export type IndividualProfileView = {
  id: string;
  fullName: string;
  email: string;
  countryCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  preferredCauses: NgoCause[];
  preferredCountryCodes: string[];
  donateAnonymously: boolean;
  contactConsent: boolean;
};

export function toIndividualProfileView(profile: IndividualProfile): IndividualProfileView {
  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    countryCode: profile.countryCode,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    preferredCauses: profile.preferredCauses,
    preferredCountryCodes: profile.preferredCountryCodes,
    donateAnonymously: profile.donateAnonymously,
    contactConsent: profile.contactConsent,
  };
}
