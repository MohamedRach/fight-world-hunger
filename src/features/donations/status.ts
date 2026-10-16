import type { DonationStatus } from "./types";

/**
 * Allowed status transitions. The server enforces these; the UI uses the
 * same table to offer only valid next steps.
 */
export const DONATION_STATUS_TRANSITIONS: Record<DonationStatus, readonly DonationStatus[]> = {
  PENDING: ["CONFIRMED", "REJECTED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

/** The normal path of a donation, used by the progress tracker. */
export const DONATION_PROGRESS_STEPS = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
] as const satisfies readonly DonationStatus[];

export function canTransition(from: DonationStatus, to: DonationStatus): boolean {
  return DONATION_STATUS_TRANSITIONS[from].includes(to);
}

export function allowedNextStatuses(from: DonationStatus): DonationStatus[] {
  return [...DONATION_STATUS_TRANSITIONS[from]];
}

export function isTerminalStatus(status: DonationStatus): boolean {
  return DONATION_STATUS_TRANSITIONS[status].length === 0;
}
