/**
 * Severity classes for prevalence of undernourishment (% of population).
 *
 * The thresholds follow the classification FAO uses for country PoU maps in
 * "The State of Food Security and Nutrition in the World" (SOFI):
 * <2.5, 2.5–<5, 5–<15, 15–<25, 25–<35 and ≥35 percent. Values published at
 * the 2.5 reporting floor fall into the lowest class.
 */
export interface HungerSeverityClass {
  /** Inclusive lower bound in percent. */
  min: number;
  /** Exclusive upper bound in percent; `Infinity` for the open top class. */
  max: number;
  label: string;
  severity: string;
  color: string;
}

export const HUNGER_SEVERITY_CLASSES: readonly HungerSeverityClass[] = [
  { min: 0, max: 2.5, label: "< 2.5%", severity: "Very low", color: "#fff5f0" },
  { min: 2.5, max: 5, label: "2.5 – 4.9%", severity: "Low", color: "#fcd0c0" },
  { min: 5, max: 15, label: "5 – 14.9%", severity: "Moderately low", color: "#fb9a7b" },
  { min: 15, max: 25, label: "15 – 24.9%", severity: "Moderately high", color: "#ef5a3c" },
  { min: 25, max: 35, label: "25 – 34.9%", severity: "High", color: "#b81d20" },
  { min: 35, max: Infinity, label: "≥ 35%", severity: "Very high", color: "#67000d" },
];

export const NO_DATA_COLOR = "#4b5563";
export const NO_DATA_LABEL = "No data available";

export const REPORTING_FLOOR_CLASS_INDEX = 0;

/**
 * Returns the severity class for a value, or null for missing/invalid values.
 * Missing data is deliberately *not* treated as zero.
 */
export function classifyHungerValue(
  value: number | null | undefined,
): HungerSeverityClass | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  if (value <= HUNGER_SEVERITY_CLASSES[REPORTING_FLOOR_CLASS_INDEX].max) {
    return HUNGER_SEVERITY_CLASSES[REPORTING_FLOOR_CLASS_INDEX];
  }
  for (const severityClass of HUNGER_SEVERITY_CLASSES) {
    if (value >= severityClass.min && value < severityClass.max) {
      return severityClass;
    }
  }
  return null;
}

export function hungerColor(value: number | null | undefined): string {
  return classifyHungerValue(value)?.color ?? NO_DATA_COLOR;
}
