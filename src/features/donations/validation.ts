import { z } from "zod";
import { DONATION_STATUSES } from "./types";

export const donationCreateSchema = z.strictObject({
  campaignId: z.string().trim().min(1, "Choose a campaign"),
  paymentMethodId: z.string().trim().min(1, "Select a saved card"),
  /**
   * Minor units (cents). The dialog converts the decimal the donor types, so
   * a non-numeric or zero amount never reaches this schema as a number.
   */
  amountMinor: z
    .number({ error: "Enter a donation amount" })
    .int("Enter an amount with at most 2 decimals")
    .positive("The donation amount must be greater than zero")
    .max(1_000_000_00, "That amount is above the simulated donation limit"),
  isAnonymous: z.boolean().default(false),
  message: z.string().trim().max(500, "Message must be at most 500 characters").nullish(),
  /**
   * Idempotency key: a second submit of the same dialog returns the first
   * donation instead of creating a duplicate.
   */
  requestId: z.string().trim().min(8).max(100).optional(),
});

export const donationStatusSchema = z.strictObject({
  status: z.enum(DONATION_STATUSES, { error: "Select a donation status" }),
  note: z.string().trim().max(300, "Note must be at most 300 characters").nullish(),
});

export type DonationCreateInput = z.infer<typeof donationCreateSchema>;
export type DonationStatusInput = z.infer<typeof donationStatusSchema>;
