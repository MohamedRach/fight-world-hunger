/**
 * FEWS NET Data Warehouse (FDW) public REST API.
 * Docs: https://help.fews.net/fdw/fews-net-api
 * Usage & attribution: https://help.fews.net/fdp/data-and-information-use-and-attribution-policy
 */
export const FEWS_NET_API_BASE_URL = "https://fdw.fews.net/api";

export const FEWS_NET_ATTRIBUTION = {
  name: "FEWS NET",
  fullName: "Famine Early Warning Systems Network (FEWS NET)",
  websiteUrl: "https://fews.net/",
  dataWarehouseUrl: "https://fdw.fews.net/",
  policyUrl:
    "https://help.fews.net/fdp/data-and-information-use-and-attribution-policy",
  /** Required wording: attribute clearly on the visual/legend and link to the FEWS NET website. */
  creditLine: "Source: FEWS NET acute food insecurity classification",
} as const;

/** Maximum page size accepted by the FDW API; larger values are rejected (HTTP 403). */
export const FEWS_NET_MAX_PAGE_SIZE = 500;

/** How far back to look for a published Current Situation analysis. */
export const FEWS_NET_LOOKBACK_MONTHS = 14;

/**
 * Classification scales accepted for regional display. `IPC31` is FEWS NET's
 * IPC 3.1-compatible scale; `AIPC31` is "IPC 3.1-aligned". Country-level
 * `IPC_HH` (highest household) rows are deliberately excluded because they are
 * not area classifications.
 */
export const FEWS_NET_AREA_CLASSIFICATION_SCALES = ["IPC31", "AIPC31"] as const;

/** FDW scenario code for the current (observed) situation, as opposed to ML1/ML2 projections. */
export const FEWS_NET_CURRENT_SITUATION_SCENARIO = "CS";

export interface IpcPhaseDefinition {
  phase: 1 | 2 | 3 | 4 | 5;
  name: string;
  /** Official IPC Acute Food Insecurity phase colour (IPC Technical Manual 3.1). */
  color: string;
  /** Short official description of household outcomes. */
  summary: string;
}

/**
 * IPC Acute Food Insecurity phases. These are categorical classifications,
 * not percentages, and must never be mapped onto the undernourishment scale.
 */
export const IPC_PHASES: readonly IpcPhaseDefinition[] = [
  {
    phase: 1,
    name: "Minimal",
    color: "#cdfacd",
    summary:
      "Households are able to meet essential food and non-food needs without atypical, unsustainable strategies.",
  },
  {
    phase: 2,
    name: "Stressed",
    color: "#fae61e",
    summary:
      "Households have minimally adequate food consumption but cannot afford some essential non-food expenditures without stress-coping strategies.",
  },
  {
    phase: 3,
    name: "Crisis",
    color: "#e67800",
    summary:
      "Households have food consumption gaps with high or above-usual acute malnutrition, or can only meet minimum food needs by depleting livelihood assets.",
  },
  {
    phase: 4,
    name: "Emergency",
    color: "#c80000",
    summary:
      "Households have large food consumption gaps resulting in very high acute malnutrition and excess mortality, or extreme loss of livelihood assets.",
  },
  {
    phase: 5,
    name: "Famine",
    color: "#640000",
    summary:
      "Households have an extreme lack of food and/or other basic needs even after full employment of coping strategies; starvation, death and destitution are evident.",
  },
];

export const IPC_NOT_CLASSIFIED_COLOR = "#9ca3af";
export const IPC_NOT_CLASSIFIED_LABEL = "Not classified / no data";

/** Muted fill used for other countries while a country's regions are being explored. */
export const REGION_MODE_COUNTRY_COLOR = "#2a3650";

export function ipcPhaseDefinition(phase: number | null | undefined): IpcPhaseDefinition | null {
  if (phase === null || phase === undefined) return null;
  return IPC_PHASES.find((definition) => definition.phase === phase) ?? null;
}

export function ipcPhaseColor(phase: number | null | undefined): string {
  return ipcPhaseDefinition(phase)?.color ?? IPC_NOT_CLASSIFIED_COLOR;
}
