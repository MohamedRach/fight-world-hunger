import { z } from "zod";
import { ACCOUNT_TYPES } from "./types";

export const accountEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254));

/** The account part of NGO onboarding: who manages the NGO. */
export const ngoAccountSchema = z.strictObject({
  representativeName: z.string().trim().min(2, "Enter your full name").max(120),
  email: accountEmailSchema,
});

export const signInSchema = z.strictObject({
  email: accountEmailSchema,
  accountType: z.enum(ACCOUNT_TYPES),
});

export type NgoAccountInput = z.infer<typeof ngoAccountSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
