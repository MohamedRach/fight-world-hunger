import { NO_DATA_LABEL } from "./color-scale";
import type { HungerObservation } from "./types";

export function formatHungerValue(
  observation: Pick<HungerObservation, "value" | "isBelowReportingFloor"> | null | undefined,
): string {
  if (!observation || observation.value === null) return NO_DATA_LABEL;
  if (observation.isBelowReportingFloor) return "< 2.5%";
  return `${observation.value.toFixed(1)}%`;
}

export function formatRetrievalDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
