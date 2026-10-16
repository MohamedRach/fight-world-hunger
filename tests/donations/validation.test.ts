import { describe, expect, it } from "vitest";
import {
  donationCreateSchema,
  donationListQuerySchema,
  donationStatusUpdateSchema,
  fromMinorUnits,
  toMinorUnits,
} from "@/features/donations/validation";

const valid = { ngoId: "food-for-all", amount: 25, currency: "USD" };

describe("donationCreateSchema", () => {
  it("accepts a minimal donation and normalizes the message", () => {
    const result = donationCreateSchema.safeParse({ ...valid, message: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBeNull();
      expect(result.data.isAnonymous).toBeUndefined();
    }
  });

  it.each([
    ["below the minimum", 0.5],
    ["above the maximum", 1_000_000.01],
    ["negative", -10],
    ["more than two decimals", 10.005],
    ["not a number", Number.NaN],
  ])("rejects an amount %s", (_label, amount) => {
    const result = donationCreateSchema.safeParse({ ...valid, amount });
    expect(result.success).toBe(false);
  });

  it("accepts amounts with two decimals", () => {
    expect(donationCreateSchema.safeParse({ ...valid, amount: 19.99 }).success).toBe(true);
    expect(donationCreateSchema.safeParse({ ...valid, amount: 0.1 + 0.2 + 1 }).success).toBe(
      true,
    );
  });

  it("rejects amounts sent as strings", () => {
    expect(donationCreateSchema.safeParse({ ...valid, amount: "25" }).success).toBe(false);
  });

  it("rejects unsupported currencies and unknown fields", () => {
    expect(donationCreateSchema.safeParse({ ...valid, currency: "BTC" }).success).toBe(false);
    expect(donationCreateSchema.safeParse({ ...valid, status: "COMPLETED" }).success).toBe(false);
    expect(donationCreateSchema.safeParse({ ...valid, donorUserId: "x" }).success).toBe(false);
  });

  it("limits the message length", () => {
    expect(
      donationCreateSchema.safeParse({ ...valid, message: "a".repeat(501) }).success,
    ).toBe(false);
  });
});

describe("donationStatusUpdateSchema", () => {
  it("requires a known status", () => {
    expect(donationStatusUpdateSchema.safeParse({ status: "CONFIRMED" }).success).toBe(true);
    expect(donationStatusUpdateSchema.safeParse({ status: "SHIPPED" }).success).toBe(false);
    expect(donationStatusUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("limits the note length", () => {
    expect(
      donationStatusUpdateSchema.safeParse({ status: "CONFIRMED", note: "a".repeat(501) })
        .success,
    ).toBe(false);
  });
});

describe("donationListQuerySchema", () => {
  it("applies pagination defaults and coerces query strings", () => {
    expect(donationListQuerySchema.parse({})).toMatchObject({ limit: 50, offset: 0 });
    expect(donationListQuerySchema.parse({ limit: "10", offset: "20" })).toMatchObject({
      limit: 10,
      offset: 20,
    });
  });

  it("rejects out-of-range limits", () => {
    expect(donationListQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(donationListQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});

describe("minor units", () => {
  it("converts without floating point drift", () => {
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    expect(fromMinorUnits(1999)).toBe(19.99);
  });
});
