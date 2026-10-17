import { z } from "zod";
import { MOCK_CARD_BRANDS } from "./types";

const CURRENT_YEAR = new Date().getFullYear();

/**
 * SECURITY: only the last four digits are accepted. There is deliberately no
 * field for a full card number or a CVV/CVC, so neither can reach the server,
 * the logs or the mock store.
 */
export const paymentMethodCreateSchema = z.strictObject({
  brand: z.enum(MOCK_CARD_BRANDS, { error: "Select a card brand" }),
  last4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter exactly 4 digits — the last 4 of a test card, never a real number"),
  holderName: z
    .string()
    .trim()
    .min(2, "Enter the cardholder name")
    .max(120, "Cardholder name must be at most 120 characters"),
  expMonth: z
    .number({ error: "Select an expiry month" })
    .int()
    .min(1, "Month must be between 1 and 12")
    .max(12, "Month must be between 1 and 12"),
  expYear: z
    .number({ error: "Enter an expiry year" })
    .int()
    .min(CURRENT_YEAR, "The card has already expired")
    .max(CURRENT_YEAR + 20, "Expiry year is too far in the future"),
  label: z.string().trim().min(1, "Give this card a name").max(60),
  makeDefault: z.boolean().default(false),
});

export const paymentMethodUpdateSchema = z.strictObject({
  makeDefault: z.literal(true, { error: "Only the default flag can be changed" }),
});

export type PaymentMethodCreateInput = z.infer<typeof paymentMethodCreateSchema>;
