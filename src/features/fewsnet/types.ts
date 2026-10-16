import type { Feature, MultiPolygon, Polygon } from "geojson";

export type IpcPhaseNumber = 1 | 2 | 3 | 4 | 5;

/** FDW geographic unit types that carry area classifications. */
export type FewsNetUnitType = string;

export interface RegionClassification {
  /** FEWS NET geographic unit identifier (FNID), the join key for geometry and data. */
  fnid: string;
  /** FDW internal geographic unit id. */
  geographicUnitId: number | null;
  name: string;
  /** Hierarchical name, e.g. "Northwestern Pastoral Zone, Nakalale, Turkana North, Turkana, Kenya". */
  fullName: string;
  /** FDW unit type code, e.g. "fsc_admin", "fsc_admin_lhz", "idp_camp". */
  unitType: FewsNetUnitType;
  /** IPC phase 1–5 when the provider value is a valid phase; otherwise null. */
  phase: IpcPhaseNumber | null;
  /** Provider's raw numeric value (kept for non-phase codes such as "not analysed"). */
  rawValue: number | null;
  /** Provider description, e.g. "Crisis", "Not Analyzed". */
  description: string | null;
  classificationScale: string;
  scenario: string;
  scenarioName: string;
  /** FEWS NET data-series variant label: "Allowing for assistance" / "Not allowing for assistance". */
  assistanceVariant: string;
  isAllowingForAssistance: boolean | null;
  /** Validity window of the classification (YYYY-MM-DD). */
  periodStart: string | null;
  periodEnd: string | null;
  reportingDate: string | null;
  sourceOrganization: string;
  sourceDocument: string;
  dataUsagePolicy: string;
  collectionStatus: string | null;
  /** Provider record modification timestamp when present. */
  modified: string | null;
}

export interface RegionFeatureProperties extends RegionClassification {
  kind: "region";
}

export type RegionFeature = Feature<Polygon | MultiPolygon, RegionFeatureProperties>;

export interface RegionalDataset {
  /** ISO 3166-1 alpha-3 of the country as used by this application. */
  countryCode: string;
  /** ISO 3166-1 alpha-2 as used by FEWS NET. */
  fewsNetCountryCode: string;
  countryName: string;
  indicator: {
    id: "fewsnet-ipc-cs";
    name: string;
    shortName: string;
    description: string;
    unit: "ipc-phase";
  };
  /** Analysis date used as the FDW `collection_date` filter (YYYY-MM-DD). */
  analysisDate: string;
  /** Human-readable validity period of the classification. */
  periodLabel: string;
  classificationScales: string[];
  sourceDocuments: string[];
  /** Polygon/multipolygon analysis units with their classification. */
  features: RegionFeature[];
  /** Units that only have point geometry (e.g. IDP camps) and are not drawn. */
  pointUnits: RegionClassification[];
  /** Counts for the legend. */
  summary: {
    classified: number;
    notClassified: number;
    byPhase: Record<IpcPhaseNumber, number>;
  };
  /** [west, south, east, north] of the drawn features. */
  bbox: [number, number, number, number] | null;
  /** Latest `modified` timestamp among records, when available. */
  providerLastModified: string | null;
  retrievedAt: string;
  attribution: {
    name: string;
    fullName: string;
    websiteUrl: string;
    policyUrl: string;
    /** Deep link to the extract used, for users who want the raw data. */
    datasetUrl: string;
    creditLine: string;
  };
}

export type RegionalAvailability =
  | { status: "available"; dataset: RegionalDataset }
  | {
      status: "unavailable";
      countryCode: string;
      fewsNetCountryCode: string;
      reason: "no-published-analysis" | "no-polygon-geometry";
      message: string;
    }
  | {
      status: "unsupported";
      countryCode: string;
      reason: "no-iso2" | "invalid-country-code";
      message: string;
    };

export interface RegionalDataResponse {
  data: RegionalAvailability;
  meta: {
    countryCode: string;
    retrievedAt: string;
    /** Whether this response was served from the server cache rather than a fresh provider call. */
    cached: boolean | null;
  };
}
