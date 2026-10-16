/**
 * Public summary of an NGO as consumed by discovery surfaces (map sidebar,
 * listings). This is the interface the NGO-profile feature (Developer 3) is
 * expected to satisfy once the NGO entity exists; see docs/API_CONTRACTS.md.
 */
export interface NgoSummary {
  id: string;
  name: string;
  /** URL-safe identifier used in `/ngos/[slug]`. */
  slug: string;
  logoUrl: string | null;
  shortDescription: string;
  /** Mission/cause categories, e.g. "Food security". */
  causes: string[];
  /** ISO 3166-1 alpha-3 codes of the countries where the NGO operates. */
  operatingCountryCodes: string[];
  websiteUrl: string | null;
}

export interface NgosByCountryResponse {
  data: NgoSummary[];
  meta: {
    countryCode: string;
    total: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
