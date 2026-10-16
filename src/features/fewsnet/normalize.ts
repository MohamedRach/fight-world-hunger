import type { MultiPolygon, Polygon } from "geojson";

import type { FdwIpcPhaseFeature, FdwIpcPhaseGeoJson, FdwIpcPhaseProperties } from "./schema";
import { extendBbox, simplifyPolygonGeometry } from "./simplify";
import { FEWS_NET_ATTRIBUTION } from "./source";
import type {
  IpcPhaseNumber,
  RegionClassification,
  RegionFeature,
  RegionalDataset,
} from "./types";

/** ~1 km at the equator; a good balance for a globe rendered at a few hundred pixels. */
export const DEFAULT_SIMPLIFY_TOLERANCE_DEGREES = 0.01;

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });

export function toIpcPhase(value: number | null): IpcPhaseNumber | null {
  if (value === null || !Number.isInteger(value)) return null;
  return value >= 1 && value <= 5 ? (value as IpcPhaseNumber) : null;
}

function assistanceVariantLabel(flag: boolean | null | undefined): string {
  if (flag === true) return "Allowing for assistance";
  if (flag === false) return "Not allowing for assistance";
  return "Assistance variant not specified";
}

export function normalizeClassification(props: FdwIpcPhaseProperties): RegionClassification {
  return {
    fnid: props.fnid,
    geographicUnitId: props.geographic_unit ?? null,
    name: props.geographic_unit_name,
    fullName: props.geographic_unit_full_name || props.geographic_unit_name,
    unitType: props.unit_type,
    phase: toIpcPhase(props.value),
    rawValue: props.value,
    description: props.description ?? null,
    classificationScale: props.classification_scale,
    scenario: props.scenario,
    scenarioName: props.scenario_name.trim(),
    assistanceVariant: assistanceVariantLabel(props.is_allowing_for_assistance),
    isAllowingForAssistance: props.is_allowing_for_assistance ?? null,
    periodStart: props.projection_start ?? null,
    periodEnd: props.projection_end ?? null,
    reportingDate: props.reporting_date ?? null,
    sourceOrganization: props.source_organization,
    sourceDocument: props.source_document,
    dataUsagePolicy: props.data_usage_policy,
    collectionStatus: props.collection_status ?? null,
    modified: props.modified ?? null,
  };
}

function formatMonth(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : MONTH_FORMATTER.format(parsed);
}

export function formatPeriodLabel(start: string | null, end: string | null): string {
  const startLabel = formatMonth(start);
  const endLabel = formatMonth(end);
  if (startLabel && endLabel && startLabel !== endLabel) return `${startLabel} – ${endLabel}`;
  return startLabel ?? endLabel ?? "Period not stated";
}

/**
 * When FDW publishes both assistance variants for a unit, keep one record per
 * FNID. FEWS NET's standard area series is "Not allowing for assistance", so
 * it is preferred; the alternative is retained in `alternates` for display.
 */
function pickPrimaryRecords(features: FdwIpcPhaseFeature[]): Map<string, FdwIpcPhaseFeature> {
  const byFnid = new Map<string, FdwIpcPhaseFeature>();
  for (const feature of features) {
    const existing = byFnid.get(feature.properties.fnid);
    if (!existing) {
      byFnid.set(feature.properties.fnid, feature);
      continue;
    }
    const existingPreferred = existing.properties.is_allowing_for_assistance === false;
    const candidatePreferred = feature.properties.is_allowing_for_assistance === false;
    if (candidatePreferred && !existingPreferred) {
      byFnid.set(feature.properties.fnid, feature);
    }
  }
  return byFnid;
}

export interface NormalizeRegionalOptions {
  countryCode: string;
  fewsNetCountryCode: string;
  countryName: string;
  analysisDate: string;
  datasetUrl: string;
  retrievedAt: string;
  simplifyTolerance?: number;
}

export function normalizeRegionalGeoJson(
  geojson: FdwIpcPhaseGeoJson,
  options: NormalizeRegionalOptions,
): RegionalDataset {
  const tolerance = options.simplifyTolerance ?? DEFAULT_SIMPLIFY_TOLERANCE_DEGREES;
  const primary = pickPrimaryRecords(geojson.features);

  const features: RegionFeature[] = [];
  const pointUnits: RegionClassification[] = [];
  const scales = new Set<string>();
  const documents = new Set<string>();
  const byPhase: Record<IpcPhaseNumber, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let classified = 0;
  let notClassified = 0;
  let bbox: [number, number, number, number] | null = null;
  let providerLastModified: string | null = null;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  for (const feature of primary.values()) {
    const classification = normalizeClassification(feature.properties);
    scales.add(classification.classificationScale);
    documents.add(classification.sourceDocument);
    if (classification.modified && (!providerLastModified || classification.modified > providerLastModified)) {
      providerLastModified = classification.modified;
    }
    if (classification.periodStart && (!periodStart || classification.periodStart < periodStart)) {
      periodStart = classification.periodStart;
    }
    if (classification.periodEnd && (!periodEnd || classification.periodEnd > periodEnd)) {
      periodEnd = classification.periodEnd;
    }

    const geometry = feature.geometry;
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
      pointUnits.push(classification);
      continue;
    }

    const simplified = simplifyPolygonGeometry(geometry as Polygon | MultiPolygon, tolerance);
    if (!simplified) {
      pointUnits.push(classification);
      continue;
    }

    if (classification.phase !== null) {
      classified += 1;
      byPhase[classification.phase] += 1;
    } else {
      notClassified += 1;
    }
    bbox = extendBbox(bbox, simplified);
    features.push({
      type: "Feature",
      geometry: simplified,
      properties: { kind: "region", ...classification },
    });
  }

  return {
    countryCode: options.countryCode,
    fewsNetCountryCode: options.fewsNetCountryCode,
    countryName: options.countryName,
    indicator: {
      id: "fewsnet-ipc-cs",
      name: "Acute food insecurity (IPC-compatible phase), current situation",
      shortName: "IPC phase",
      description:
        "FEWS NET's IPC-compatible classification of acute food insecurity for its analysis areas. Phases 1–5 describe the severity of current outcomes for the area's population; they are categories, not percentages, and are not comparable with the national prevalence-of-undernourishment indicator.",
      unit: "ipc-phase",
    },
    analysisDate: options.analysisDate,
    periodLabel: formatPeriodLabel(periodStart, periodEnd),
    classificationScales: [...scales].sort(),
    sourceDocuments: [...documents].sort(),
    features,
    pointUnits,
    summary: { classified, notClassified, byPhase },
    bbox,
    providerLastModified,
    retrievedAt: options.retrievedAt,
    attribution: {
      name: FEWS_NET_ATTRIBUTION.name,
      fullName: FEWS_NET_ATTRIBUTION.fullName,
      websiteUrl: FEWS_NET_ATTRIBUTION.websiteUrl,
      policyUrl: FEWS_NET_ATTRIBUTION.policyUrl,
      datasetUrl: options.datasetUrl,
      creditLine: FEWS_NET_ATTRIBUTION.creditLine,
    },
  };
}
