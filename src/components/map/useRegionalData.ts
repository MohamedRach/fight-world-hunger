"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiErrorResponse } from "@/features/discovery/types";
import type { RegionalAvailability, RegionalDataResponse } from "@/features/fewsnet/types";

export type RegionalDataState =
  | { status: "idle" }
  | { status: "loading"; countryCode: string }
  | { status: "error"; countryCode: string; message: string; retryable: boolean }
  | { status: "ready"; countryCode: string; availability: RegionalAvailability };

interface RegionalError {
  message: string;
  retryable: boolean;
  attempt: number;
}

async function fetchRegionalData(
  countryCode: string,
  signal: AbortSignal,
): Promise<RegionalAvailability> {
  let response: Response;
  try {
    response = await fetch(`/api/countries/${encodeURIComponent(countryCode)}/regions`, {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    // The browser could not reach our own server (connection dropped, dev
    // server restarted mid-request, offline). Distinct from a FEWS NET outage.
    const networkError = new Error(
      "The connection to the server was interrupted before the regional data arrived. Large countries can take up to a minute on first load; please try again.",
    ) as Error & { retryable?: boolean };
    networkError.retryable = true;
    throw networkError;
  }
  if (!response.ok) {
    let message = `Request failed with HTTP ${response.status}`;
    try {
      const body = (await response.json()) as Partial<ApiErrorResponse>;
      if (body.error?.message) message = body.error.message;
    } catch {
      // Keep the generic message when the body is not JSON.
    }
    const error = new Error(message) as Error & { retryable?: boolean };
    error.retryable = response.status >= 500;
    throw error;
  }
  const body = (await response.json()) as RegionalDataResponse;
  return body.data;
}

/**
 * Loads FEWS NET regional data for a country on demand (only when `enabled`).
 * Successful results are kept per country so switching back does not
 * re-download multi-hundred-kilobyte boundary sets.
 */
export function useRegionalData(countryCode: string | null, enabled: boolean) {
  const [results, setResults] = useState<Record<string, RegionalAvailability>>({});
  const [errors, setErrors] = useState<Record<string, RegionalError>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !countryCode || results[countryCode]) return;

    const controller = new AbortController();
    fetchRegionalData(countryCode, controller.signal)
      .then((availability) =>
        setResults((previous) => ({ ...previous, [countryCode]: availability })),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setErrors((previous) => ({
          ...previous,
          [countryCode]: {
            message: error instanceof Error ? error.message : "Unknown error",
            retryable: (error as { retryable?: boolean }).retryable ?? true,
            attempt,
          },
        }));
      });

    return () => controller.abort();
  }, [countryCode, enabled, attempt, results]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  let state: RegionalDataState = { status: "idle" };
  if (enabled && countryCode) {
    const result = results[countryCode];
    const error = errors[countryCode];
    if (result) {
      state = { status: "ready", countryCode, availability: result };
    } else if (error && error.attempt === attempt) {
      state = { status: "error", countryCode, message: error.message, retryable: error.retryable };
    } else {
      state = { status: "loading", countryCode };
    }
  }

  return { state, retry };
}
