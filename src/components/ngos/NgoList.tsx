"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiErrorResponse, NgosByCountryResponse } from "@/features/discovery/types";
import { NgoCard } from "./NgoCard";
import { RegisterNgoInCountryLink } from "./RegisterNgoInCountryLink";

interface NgoListProps {
  countryCode: string;
  countryName: string;
}

type LoadOutcome =
  | { status: "error"; message: string }
  | { status: "success"; response: NgosByCountryResponse };

type LoadState = LoadOutcome | { status: "loading" };

export async function fetchNgosByCountry(
  countryCode: string,
  signal?: AbortSignal,
): Promise<NgosByCountryResponse> {
  const response = await fetch(`/api/countries/${encodeURIComponent(countryCode)}/ngos`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    let message = `Request failed with HTTP ${response.status}`;
    try {
      const body = (await response.json()) as Partial<ApiErrorResponse>;
      if (body.error?.message) message = body.error.message;
    } catch {
      // Keep the generic message when the body is not JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as NgosByCountryResponse;
}

export function NgoList({ countryCode, countryName }: NgoListProps) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${countryCode}:${attempt}`;
  const [result, setResult] = useState<{ key: string; outcome: LoadOutcome } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchNgosByCountry(countryCode, controller.signal)
      .then((response) =>
        setResult({ key: requestKey, outcome: { status: "success", response } }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          outcome: {
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      });

    return () => controller.abort();
  }, [countryCode, requestKey]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Loading is derived: any result that does not match the current request is stale.
  const state: LoadState =
    result && result.key === requestKey ? result.outcome : { status: "loading" };

  if (state.status === "loading") {
    return (
      <div role="status" aria-live="polite" className="space-y-2">
        <p className="text-xs text-slate-400">Loading NGOs…</p>
        {[0, 1].map((i) => (
          <div key={i} aria-hidden="true" className="h-20 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-100">
        <p>We couldn&apos;t load NGOs for {countryName}. {state.message}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-2 rounded-md bg-white/10 px-2 py-1 font-medium text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          Try again
        </button>
      </div>
    );
  }

  const { data, meta } = state.response;

  if (meta.total === 0) {
    return (
      <div>
        <p className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-slate-400">
          No NGOs are registered as operating in {countryName} yet.
        </p>
        <RegisterNgoInCountryLink countryCode={countryCode} countryName={countryName} hasNgos={false} />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-slate-400">
        {meta.total} {meta.total === 1 ? "organisation" : "organisations"}
      </p>
      <ul className="mt-2 space-y-2">
        {data.map((ngo) => (
          <li key={ngo.id}>
            <NgoCard ngo={ngo} />
          </li>
        ))}
      </ul>
      <RegisterNgoInCountryLink countryCode={countryCode} countryName={countryName} hasNgos />
    </div>
  );
}
