import {
  fdwIpcPhaseGeoJsonSchema,
  fdwPagedResponseSchema,
  type FdwIpcPhaseGeoJson,
} from "../schema";
import {
  FEWS_NET_API_BASE_URL,
  FEWS_NET_AREA_CLASSIFICATION_SCALES,
  FEWS_NET_CURRENT_SITUATION_SCENARIO,
  FEWS_NET_LOOKBACK_MONTHS,
} from "../source";

/** Narrow metadata probes normally take 0.4–3 s; the GeoJSON extract 3–60 s depending on FDW load. */
const PROBE_TIMEOUT_MS = 45_000;
const GEOJSON_TIMEOUT_MS = 120_000;
const USER_AGENT = "fight-world-hunger/1.0 (+https://github.com/MohamedRach/fight-world-hunger)";

export class FdwRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly url: string,
  ) {
    super(message);
    this.name = "FdwRequestError";
  }
}

function buildUrl(pathname: string, params: Array<[string, string]>): string {
  const url = new URL(`${FEWS_NET_API_BASE_URL}/${pathname}`);
  for (const [key, value] of params) url.searchParams.append(key, value);
  return url.toString();
}

/** Statuses FDW returns under load; worth one retry after a short pause. */
const TRANSIENT_STATUSES = new Set([403, 408, 425, 429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = 2_500;

function isTransient(error: FdwRequestError): boolean {
  return error.status === null || TRANSIENT_STATUSES.has(error.status);
}

async function fetchOnce(url: string, accept: string, timeoutMs: number): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: accept, "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? `FDW did not respond within ${Math.round(timeoutMs / 1000)}s`
        : error instanceof Error
          ? error.message
          : "Network error";
    throw new FdwRequestError(message, null, url);
  }
  if (!response.ok) {
    throw new FdwRequestError(`FDW responded with HTTP ${response.status}`, response.status, url);
  }
  try {
    return await response.json();
  } catch {
    // FDW occasionally serves an HTML error page with a 200 status when overloaded.
    throw new FdwRequestError("FDW returned a non-JSON body", null, url);
  }
}

async function fetchWithTimeout(url: string, accept: string, timeoutMs: number): Promise<unknown> {
  try {
    return await fetchOnce(url, accept, timeoutMs);
  } catch (error) {
    if (!(error instanceof FdwRequestError) || !isTransient(error)) throw error;
    console.warn(`[fewsnet] transient failure, retrying once: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return fetchOnce(url, accept, timeoutMs);
  }
}

function currentSituationParams(iso2: string): Array<[string, string]> {
  return [
    ["country_code", iso2],
    ["scenario", FEWS_NET_CURRENT_SITUATION_SCENARIO],
    ...FEWS_NET_AREA_CLASSIFICATION_SCALES.map(
      (scale): [string, string] => ["classification_scale", scale],
    ),
    ["collection_status", "Published"],
  ];
}

function firstOfMonthMonthsAgo(monthsAgo: number, now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  return date.toISOString().slice(0, 10);
}

function lastDayOfMonth(firstOfMonth: string): string {
  const [year, month] = firstOfMonth.split("-").map(Number);
  // Day 0 of the next month is the last day of this month.
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

interface ProbeResult {
  count: number;
  reportingDate: string | null;
}

/** Counts Current Situation rows whose validity period starts within one calendar month. */
async function probeMonth(iso2: string, firstOfMonth: string): Promise<ProbeResult> {
  const url = buildUrl("ipcphase.json", [
    ...currentSituationParams(iso2),
    ["start_date", firstOfMonth],
    ["end_date", lastDayOfMonth(firstOfMonth)],
    ["fields", "simple"],
    ["page_size", "1"],
  ]);
  const json = await fetchWithTimeout(url, "application/json", PROBE_TIMEOUT_MS);
  const page = fdwPagedResponseSchema.parse(json);
  const first = page.results[0];
  const reportingDate =
    typeof first?.reporting_date === "string"
      ? first.reporting_date
      : typeof first?.projection_start === "string"
        ? first.projection_start
        : null;
  return { count: page.count, reportingDate };
}

/**
 * Finds the most recent published Current Situation area analysis for a
 * country within the look-back window.
 *
 * FDW cannot sort results, rejects offsets ≥ 1000, and wide date windows are
 * slow server-side (they count tens of thousands of historical rows). The
 * latest analysis is therefore located by probing one calendar month at a
 * time, newest first; each probe is a single-row request. Countries FEWS NET
 * covers typically resolve in 1–5 probes, uncovered countries in 14 cheap ones.
 */
export async function findLatestCurrentSituationDate(
  iso2: string,
  now: Date = new Date(),
): Promise<string | null> {
  for (let monthsAgo = 0; monthsAgo <= FEWS_NET_LOOKBACK_MONTHS; monthsAgo += 1) {
    const probe = await probeMonth(iso2, firstOfMonthMonthsAgo(monthsAgo, now));
    if (probe.count > 0 && probe.reportingDate) return probe.reportingDate;
  }
  return null;
}

export function buildCurrentSituationGeoJsonUrl(iso2: string, collectionDate: string): string {
  return buildUrl("ipcphase.geojson", [
    ...currentSituationParams(iso2),
    ["collection_date", collectionDate],
  ]);
}

/**
 * Fetches the full, unpaginated GeoJSON extract for one analysis. This is the
 * only FDW representation that returns every analysis unit in one response
 * (the JSON list caps at 1000 rows), and it includes the boundary geometry.
 */
export async function fetchCurrentSituationGeoJson(
  iso2: string,
  collectionDate: string,
): Promise<{ url: string; geojson: FdwIpcPhaseGeoJson }> {
  const url = buildCurrentSituationGeoJsonUrl(iso2, collectionDate);
  // FDW returns 406 for an explicit GeoJSON media type; the extension selects the format.
  const json = await fetchWithTimeout(url, "*/*", GEOJSON_TIMEOUT_MS);
  return { url, geojson: fdwIpcPhaseGeoJsonSchema.parse(json) };
}
