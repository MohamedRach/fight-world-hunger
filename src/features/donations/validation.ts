import { z } from "zod";
import { DONATION_CURRENCIES, DONATION_STATUSES, MINOR_UNITS_PER_MAJOR } from "./types";

export const DONATION_AMOUNT_MIN = 1;
export const DONATION_AMOUNT_MAX = 1_000_000;
export const DONATION_MESSAGE_MAX = 500;
export const DONATION_STATUS_NOTE_MAX = 500;
export const DONATION_LIST_DEFAULT_LIMIT = 50;
export const DONATION_LIST_MAX_LIMIT = 100;

function hasAtMostTwoDecimals(value: number): boolean {
  const scaled = value * MINOR_UNITS_PER_MAJOR;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** Empty strings become null so optional text can be cleared. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform((value) => (value ? value : null));

export const donationCreateSchema = z.strictObject({
  ngoId: z.string().trim().min(1, "Select an NGO to support").max(200),
  amount: z
    .number({ error: "Enter an amount, e.g. 25" })
    .min(DONATION_AMOUNT_MIN, `The minimum donation is ${DONATION_AMOUNT_MIN}`)
    .max(DONATION_AMOUNT_MAX, `The maximum donation is ${DONATION_AMOUNT_MAX.toLocaleString("en-GB")}`)
    .refine(hasAtMostTwoDecimals, "Use at most two decimal places"),
  currency: z.enum(DONATION_CURRENCIES, { error: "Select a supported currency" }),
  message: optionalText(
    DONATION_MESSAGE_MAX,
    `Keep your message under ${DONATION_MESSAGE_MAX} characters`,
  ),
  /** Defaults to the donor's "donate anonymously" profile preference. */
  isAnonymous: z.boolean().optional(),
});

export const donationStatusUpdateSchema = z.strictObject({
  status: z.enum(DONATION_STATUSES, { error: "Select a valid status" }),
  note: optionalText(
    DONATION_STATUS_NOTE_MAX,
    `Keep the note under ${DONATION_STATUS_NOTE_MAX} characters`,
  ),
});

export const donationListQuerySchema = z.object({
  ngoId: z.string().trim().min(1).max(200).optional(),
  status: z.enum(DONATION_STATUSES, { error: "Select a valid status" }).optional(),
  limit: z.coerce
    .number({ error: "limit must be a number" })
    .int()
    .min(1)
    .max(DONATION_LIST_MAX_LIMIT)
    .default(DONATION_LIST_DEFAULT_LIMIT),
  offset: z.coerce.number({ error: "offset must be a number" }).int().min(0).default(0),
});

export type DonationCreateInput = z.infer<typeof donationCreateSchema>;
export type DonationStatusUpdateInput = z.infer<typeof donationStatusUpdateSchema>;
export type DonationListQuery = z.infer<typeof donationListQuerySchema>;

export function toMinorUnits(amount: number): number {
  return Math.round(amount * MINOR_UNITS_PER_MAJOR);
}

export function fromMinorUnits(amountMinor: number): number {
  return amountMinor / MINOR_UNITS_PER_MAJOR;
}
