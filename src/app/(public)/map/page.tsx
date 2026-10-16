import type { Metadata } from "next";

import { HungerGlobeExplorer } from "@/components/map/HungerGlobeExplorer";
import { COUNTRY_GEOMETRY_ATTRIBUTION } from "@/features/geography/geometry";
import { formatRetrievalDate } from "@/features/hunger/format";
import { loadHungerDataset } from "@/features/hunger/server/load-hunger-data";

export const metadata: Metadata = {
  title: "Explore Hunger Around the World",
  description:
    "An interactive 3D globe of the latest published country-level prevalence of undernourishment, with NGOs operating in each country.",
};

export default async function MapPage() {
  const dataset = await loadHungerDataset();

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-[#070d1a] text-slate-100">
      <header className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Explore Hunger Around the World
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              This globe visualises the latest available country-level estimates of
              undernourishment. Hover over a country for its figure, or click it to see the
              organisations working there.
            </p>
          </div>
          <p className="text-[11px] leading-snug text-slate-400 sm:max-w-xs sm:text-right">
            {dataset.indicator.name} ({dataset.indicator.unit}) — {dataset.indicator.producer},
            via {dataset.indicator.distributor}; {dataset.countriesWithData} countries with data;
            retrieved {formatRetrievalDate(dataset.retrievedAt)}
            {dataset.retrievedFrom === "snapshot" ? " (bundled snapshot)" : ""}. Boundaries:{" "}
            <a
              href={COUNTRY_GEOMETRY_ATTRIBUTION.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-slate-500 underline-offset-2 hover:text-white"
            >
              {COUNTRY_GEOMETRY_ATTRIBUTION.name}
            </a>
            . Published estimates, not real-time conditions.
          </p>
        </div>
      </header>

      <HungerGlobeExplorer dataset={dataset} />
    </main>
  );
}
