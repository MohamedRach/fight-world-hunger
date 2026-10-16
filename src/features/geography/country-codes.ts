import type {
  CountryFeature,
  CountryFeatureProperties,
  ResolvedCountry,
} from "./types";

const ISO3_PATTERN = /^[A-Z]{3}$/;
const ISO2_PATTERN = /^[A-Z]{2}$/;

/**
 * Natural Earth `adm0_a3` codes mapped to the identifier used by the data
 * provider. Only territories whose ISO fields are "-99" need an entry.
 */
const PROVIDER_CODE_OVERRIDES: Readonly<Record<string, string>> = {
  KOS: "XKX", // Kosovo – no ISO 3166-1 code; World Bank uses XKX.
};

/**
 * Territories without an ISO code and without a separately reported series.
 * They are rendered as "no data" and never matched by name.
 */
export const UNMATCHED_TERRITORIES: ReadonlySet<string> = new Set(["CYN", "SOL"]);

export function isIso3(code: unknown): code is string {
  return typeof code === "string" && ISO3_PATTERN.test(code);
}

export function isIso2(code: unknown): code is string {
  return typeof code === "string" && ISO2_PATTERN.test(code);
}

/**
 * Resolves the stable identifier for a Natural Earth polygon.
 * Order: ISO_A3 → ISO_A3_EH → explicit provider override → null.
 */
export function resolveCountryCode(
  properties: Pick<CountryFeatureProperties, "iso_a3" | "iso_a3_eh" | "adm0_a3">,
): string | null {
  if (isIso3(properties.iso_a3)) return properties.iso_a3;
  if (isIso3(properties.iso_a3_eh)) return properties.iso_a3_eh;
  return PROVIDER_CODE_OVERRIDES[properties.adm0_a3] ?? null;
}

export function resolveCountry(feature: CountryFeature): ResolvedCountry {
  const { properties } = feature;
  return {
    feature,
    code: resolveCountryCode(properties),
    name: properties.name,
    iso2: isIso2(properties.iso_a2) ? properties.iso_a2 : null,
  };
}
