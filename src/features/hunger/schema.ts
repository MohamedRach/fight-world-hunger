import { z } from "zod";

const pageMetaSchema = z.object({
  page: z.number(),
  pages: z.number(),
  total: z.number(),
  lastupdated: z.string().optional(),
});

export const worldBankIndicatorRowSchema = z.object({
  indicator: z.object({ id: z.string(), value: z.string() }),
  country: z.object({ id: z.string(), value: z.string() }),
  countryiso3code: z.string(),
  date: z.string(),
  value: z.number().nullable(),
  obs_status: z.string().optional(),
});

export const worldBankIndicatorPayloadSchema = z.tuple([
  pageMetaSchema,
  z.array(worldBankIndicatorRowSchema).nullable(),
]);

export const worldBankCountryRowSchema = z.object({
  id: z.string(),
  iso2Code: z.string(),
  name: z.string(),
  region: z.object({ id: z.string(), value: z.string() }),
});

export const worldBankCountriesPayloadSchema = z.tuple([
  pageMetaSchema,
  z.array(worldBankCountryRowSchema).nullable(),
]);

export const hungerSnapshotSchema = z.object({
  fetchedAt: z.string(),
  indicatorUrl: z.string(),
  countriesUrl: z.string(),
  indicator: worldBankIndicatorPayloadSchema,
  countries: worldBankCountriesPayloadSchema,
});

export type WorldBankIndicatorRow = z.infer<typeof worldBankIndicatorRowSchema>;
export type WorldBankIndicatorPayload = z.infer<typeof worldBankIndicatorPayloadSchema>;
export type WorldBankCountryRow = z.infer<typeof worldBankCountryRowSchema>;
export type WorldBankCountriesPayload = z.infer<typeof worldBankCountriesPayloadSchema>;
