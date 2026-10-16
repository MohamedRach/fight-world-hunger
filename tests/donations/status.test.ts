import { describe, expect, it } from "vitest";
import {
  DONATION_STATUS_TRANSITIONS,
  allowedNextStatuses,
  canTransition,
  isTerminalStatus,
} from "@/features/donations/status";
import { DONATION_STATUSES } from "@/features/donations/types";

describe("donation status transitions", () => {
  it("follows the agreed lifecycle", () => {
    expect(allowedNextStatuses("PENDING")).toEqual(["CONFIRMED", "REJECTED"]);
    expect(allowedNextStatuses("CONFIRMED")).toEqual(["IN_PROGRESS", "CANCELLED"]);
    expect(allowedNextStatuses("IN_PROGRESS")).toEqual(["COMPLETED", "CANCELLED"]);
  });

  it("treats completed, rejected and cancelled as terminal", () => {
    for (const status of ["COMPLETED", "REJECTED", "CANCELLED"] as const) {
      expect(isTerminalStatus(status)).toBe(true);
      expect(allowedNextStatuses(status)).toEqual([]);
    }
    expect(isTerminalStatus("PENDING")).toBe(false);
  });

  it("rejects skipping steps, going backwards, and staying put", () => {
    expect(canTransition("PENDING", "IN_PROGRESS")).toBe(false);
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
    expect(canTransition("IN_PROGRESS", "CONFIRMED")).toBe(false);
    expect(canTransition("CONFIRMED", "CONFIRMED")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
  });

  it("never allows a transition back to PENDING", () => {
    for (const status of DONATION_STATUSES) {
      expect(DONATION_STATUS_TRANSITIONS[status]).not.toContain("PENDING");
    }
  });

  it("returns a copy that callers cannot use to mutate the rules", () => {
    allowedNextStatuses("PENDING").push("COMPLETED");
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
  });
});
