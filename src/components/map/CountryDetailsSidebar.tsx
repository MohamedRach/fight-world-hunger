"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { ResolvedCountry } from "@/features/geography/types";
import { classifyHungerValue, hungerColor } from "@/features/hunger/color-scale";
import { formatHungerValue, formatRetrievalDate } from "@/features/hunger/format";
import type { HungerDataset, HungerObservation } from "@/features/hunger/types";

interface CountryDetailsSidebarProps {
  country: ResolvedCountry;
  observation: HungerObservation | undefined;
  dataset: HungerDataset;
  onClose: () => void;
  /** NGO list for the selected country. */
  children?: ReactNode;
}

function CountryFlag({ iso2, name }: { iso2: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // next/image needs a remotePatterns entry in the shared next.config.ts;
    // a plain <img> avoids touching shared config for a 40px flag.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w80/${iso2.toLowerCase()}.png`}
      width={40}
      height={30}
      alt={`Flag of ${name}`}
      className="h-[30px] w-10 rounded-sm object-cover ring-1 ring-white/20"
      onError={() => setFailed(true)}
    />
  );
}

export function CountryDetailsSidebar({
  country,
  observation,
  dataset,
  onClose,
  children,
}: CountryDetailsSidebarProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const severity = classifyHungerValue(observation?.value);
  const hasData = observation !== undefined && observation.value !== null;
  const { indicator } = dataset;

  useEffect(() => {
    headingRef.current?.focus();
  }, [country]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <aside
      aria-labelledby="country-details-title"
      className="flex h-full max-h-[75vh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur lg:max-h-none lg:w-[400px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0"
    >
      <header className="flex items-start gap-3 border-b border-white/10 p-4">
        {country.iso2 ? <CountryFlag iso2={country.iso2} name={country.name} /> : null}
        <div className="min-w-0 flex-1">
          <h2
            id="country-details-title"
            ref={headingRef}
            tabIndex={-1}
            className="truncate text-lg font-semibold text-white outline-none"
          >
            {country.name}
          </h2>
          <p className="text-xs text-slate-400">{country.feature.properties.continent}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close country details"
          className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <section aria-labelledby="country-hunger-title">
          <h3 id="country-hunger-title" className="text-sm font-semibold text-white">
            {indicator.name}
          </h3>

          <div className="mt-2 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-10 w-3 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: hungerColor(observation?.value) }}
            />
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">
                {formatHungerValue(observation)}
              </p>
              <p className="text-xs text-slate-400">
                {hasData
                  ? `of population · ${observation.periodLabel ?? "period unknown"}${severity ? ` · ${severity.severity}` : ""}`
                  : country.code
                    ? "No published estimate for this country."
                    : "This territory is not reported separately in the dataset."}
              </p>
            </div>
          </div>

          {observation?.isBelowReportingFloor ? (
            <p className="mt-2 text-xs text-slate-400">
              The provider publishes 2.5% as a floor: the actual prevalence is below 2.5%.
            </p>
          ) : null}

          <p className="mt-3 text-xs leading-relaxed text-slate-300">{indicator.description}</p>

          <dl className="mt-3 space-y-1 text-[11px] text-slate-400">
            <div className="flex gap-1">
              <dt className="shrink-0">Source:</dt>
              <dd>
                {indicator.producer}, via{" "}
                <a
                  href={indicator.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-slate-500 underline-offset-2 hover:text-white"
                >
                  {indicator.distributor}
                </a>{" "}
                (
                <a
                  href={indicator.licenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-slate-500 underline-offset-2 hover:text-white"
                >
                  {indicator.licence}
                </a>
                )
              </dd>
            </div>
            <div className="flex gap-1">
              <dt className="shrink-0">Retrieved:</dt>
              <dd>
                {formatRetrievalDate(dataset.retrievedAt)}
                {dataset.retrievedFrom === "snapshot" ? " (bundled snapshot)" : ""}
                {dataset.providerLastUpdated
                  ? ` · provider update ${dataset.providerLastUpdated}`
                  : ""}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="country-ngos-title">
          <h3 id="country-ngos-title" className="text-sm font-semibold text-white">
            NGOs operating in {country.name}
          </h3>
          <div className="mt-2">
            {country.code ? (
              children
            ) : (
              <p className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-slate-400">
                NGO lookup is unavailable because this territory has no ISO country code.
              </p>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
