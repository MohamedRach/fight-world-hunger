import { cacheLife } from "next/cache";
import { ZodError } from "zod";

import { lookupCountryIdentity } from "@/features/geography/server/iso-codes";
import { normalizeRegionalGeoJson } from "../normalize";
import type { RegionalAvailability, RegionalDataset } from "../types";
import {
  FdwRequestError,
  fetchCurrentSituationGeoJson,
  findLatestCurrentSituationDate,
} from "./fdw-client";

export type RegionalLoadErrorCode = "UPSTREAM_UNAVAILABLE" | "UPSTREAM_INVALID_RESPONSE" | "INTERNAL_ERROR";

export class RegionalDataLoadError extends Error {
  constructor(
    readonly code: RegionalLoadErrorCode,
    message: string,
    readonly upstreamStatus: number | null = null,
  ) {
    super(message);
    this.name = "RegionalDataLoadError";
  }
}

interface LoadFailure {
  code: RegionalLoadErrorCode;
  message: string;
  upstreamStatus: number | null;
}

/**
 * Errors thrown inside a `"use cache"` function reach the caller as an opaque
 * Server Components error in production, so cached loaders return failures as
 * values instead. Failures are cached only briefly, which also acts as a
 * circuit breaker against hammering FDW (which throttles bursts with 403s).
 */
type CachedResult<T> = { ok: true; value: T } | { ok: false; failure: LoadFailure };

/**
 * Cache profile for failures: long enough to absorb a burst of retries from
 * many users, short enough that a user's own "Try again" gets a fresh attempt.
 */
const FAILURE_CACHE_LIFE = { stale: 20, revalidate: 20, expire: 60 } as const;

function describeFailure(error: unknown): LoadFailure {
  if (error instanceof FdwRequestError) {
    return { code: "UPSTREAM_UNAVAILABLE", message: error.message, upstreamStatus: error.status };
  }
  if (error instanceof ZodError) {
    return {
      code: "UPSTREAM_INVALID_RESPONSE",
      message: `FEWS NET response failed validation: ${error.issues[0]?.message ?? "unknown issue"}`,
      upstreamStatus: null,
    };
  }
  return {
    code: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unknown error",
    upstreamStatus: null,
  };
}

/**
 * Latest published analysis date per FEWS NET country. FEWS NET publishes
 * Current Situation analyses a few times a year, so hourly revalidation is
 * plenty while still picking up new releases the day they appear.
 */
async function loadLatestAnalysisDate(iso2: string): Promise<CachedResult<string | null>> {
  "use cache";
  cacheLife("hours");
  try {
    return { ok: true, value: await findLatestCurrentSituationDate(iso2) };
  } catch (error) {
    cacheLife(FAILURE_CACHE_LIFE);
    return { ok: false, failure: describeFailure(error) };
  }
}

/**
 * One analysis for one country. The cache key includes the analysis date, so
 * a new FEWS NET release produces a new entry while older ones age out.
 * Cold loads are slow (the FDW GeoJSON extract is ~10 MB and takes 20–60 s);
 * see docs/FEWSNET_REGIONAL_DATA.md for the warm-up procedure.
 */
async function loadAnalysisDataset(
  countryCode: string,
  iso2: string,
  countryName: string,
  analysisDate: string,
): Promise<CachedResult<RegionalDataset>> {
  "use cache";
  cacheLife("days");
  try {
    const { url, geojson } = await fetchCurrentSituationGeoJson(iso2, analysisDate);
    const dataset = normalizeRegionalGeoJson(geojson, {
      countryCode,
      fewsNetCountryCode: iso2,
      countryName,
      analysisDate,
      datasetUrl: url,
      retrievedAt: new Date().toISOString(),
    });
    return { ok: true, value: dataset };
  } catch (error) {
    cacheLife(FAILURE_CACHE_LIFE);
    return { ok: false, failure: describeFailure(error) };
  }
}

function unwrap<T>(result: CachedResult<T>): T {
  if (result.ok) return result.value;
  throw new RegionalDataLoadError(
    result.failure.code,
    result.failure.message,
    result.failure.upstreamStatus,
  );
}

/**
 * Resolves FEWS NET regional acute-food-insecurity data for an application
 * country code (ISO alpha-3). Throws `RegionalDataLoadError` on provider
 * failures so the caller can report a temporary outage distinctly from
 * "no data for this country".
 */
export async function loadRegionalData(countryCode: string): Promise<RegionalAvailability> {
  const identity = await lookupCountryIdentity(countryCode);
  if (!identity) {
    return {
      status: "unsupported",
      countryCode,
      reason: "invalid-country-code",
      message: "This country is not part of the map's country list.",
    };
  }
  if (!identity.iso2) {
    return {
      status: "unsupported",
      countryCode,
      reason: "no-iso2",
      message:
        "FEWS NET identifies countries by ISO alpha-2 code and this territory does not have one.",
    };
  }

  const analysisDate = unwrap(await loadLatestAnalysisDate(identity.iso2));
  if (!analysisDate) {
    return {
      status: "unavailable",
      countryCode,
      fewsNetCountryCode: identity.iso2,
      reason: "no-published-analysis",
      message:
        "FEWS NET has not published a public, area-level acute food insecurity classification for this country in the last 14 months.",
    };
  }

  const dataset = unwrap(
    await loadAnalysisDataset(countryCode, identity.iso2, identity.name, analysisDate),
  );
  if (dataset.features.length === 0) {
    return {
      status: "unavailable",
      countryCode,
      fewsNetCountryCode: identity.iso2,
      reason: "no-polygon-geometry",
      message:
        "FEWS NET published a classification for this country, but none of its analysis units have polygon boundaries that can be drawn.",
    };
  }

  return { status: "available", dataset };
}
