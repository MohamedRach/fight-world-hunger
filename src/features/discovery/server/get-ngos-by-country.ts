import { z } from "zod";

import { getNgoRepository, type NgoRepository } from "./ngo-repository";
import type { NgosByCountryResponse } from "../types";

export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "countryCode must be a 3-letter ISO 3166-1 alpha-3 code");

export class InvalidCountryCodeError extends Error {
  readonly code = "INVALID_COUNTRY_CODE";

  constructor(message: string) {
    super(message);
    this.name = "InvalidCountryCodeError";
  }
}

export async function getNgosByCountry(
  rawCountryCode: string,
  repository: NgoRepository = getNgoRepository(),
): Promise<NgosByCountryResponse> {
  const parsed = countryCodeSchema.safeParse(rawCountryCode);
  if (!parsed.success) {
    throw new InvalidCountryCodeError(parsed.error.issues[0]?.message ?? "Invalid country code");
  }

  const countryCode = parsed.data;
  const data = await repository.findByOperatingCountry(countryCode);

  return {
    data,
    meta: { countryCode, total: data.length },
  };
}
