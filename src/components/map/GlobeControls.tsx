"use client";

import { useId } from "react";

import type { ResolvedCountry } from "@/features/geography/types";
import { countryKey } from "./useCountrySelection";

interface GlobeControlsProps {
  countries: ResolvedCountry[];
  selected: ResolvedCountry | null;
  onSelectCountry: (country: ResolvedCountry) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  className?: string;
}

const buttonClass =
  "flex h-9 w-9 items-center justify-center rounded-md bg-slate-950/80 text-lg font-semibold text-white ring-1 ring-white/15 backdrop-blur hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400";

/**
 * Keyboard-accessible alternative to pointer interaction with the WebGL
 * canvas: a country picker plus zoom/reset buttons.
 */
export function GlobeControls({
  countries,
  selected,
  onSelectCountry,
  onZoomIn,
  onZoomOut,
  onReset,
  className,
}: GlobeControlsProps) {
  const selectId = useId();
  const sorted = [...countries].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className={`flex flex-col items-end gap-2 ${className ?? ""}`}>
      <div className="w-56">
        <label htmlFor={selectId} className="sr-only">
          Select a country
        </label>
        <select
          id={selectId}
          value={selected ? countryKey(selected) : ""}
          onChange={(event) => {
            const next = countries.find((c) => countryKey(c) === event.target.value);
            if (next) onSelectCountry(next);
          }}
          className="w-full rounded-md bg-slate-950/80 px-3 py-2 text-sm text-white ring-1 ring-white/15 backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <option value="" disabled>
            Select a country…
          </option>
          {sorted.map((country) => (
            <option key={countryKey(country)} value={countryKey(country)}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
      <div role="group" aria-label="Globe view controls" className="flex gap-1">
        <button type="button" onClick={onZoomIn} aria-label="Zoom in" className={buttonClass}>
          +
        </button>
        <button type="button" onClick={onZoomOut} aria-label="Zoom out" className={buttonClass}>
          −
        </button>
        <button type="button" onClick={onReset} aria-label="Reset view" className={`${buttonClass} text-sm`}>
          ⟲
        </button>
      </div>
    </div>
  );
}
