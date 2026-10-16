"use client";

import { useCallback, useState } from "react";

import type { ResolvedCountry } from "@/features/geography/types";

/** Stable key for a polygon, independent of whether it has a data code. */
export function countryKey(country: ResolvedCountry): string {
  return country.feature.properties.adm0_a3;
}

export interface CountrySelection {
  hovered: ResolvedCountry | null;
  selected: ResolvedCountry | null;
  hover: (country: ResolvedCountry | null) => void;
  select: (country: ResolvedCountry) => void;
  clearSelection: () => void;
}

export function useCountrySelection(): CountrySelection {
  const [hovered, setHovered] = useState<ResolvedCountry | null>(null);
  const [selected, setSelected] = useState<ResolvedCountry | null>(null);

  const hover = useCallback((country: ResolvedCountry | null) => {
    setHovered((previous) => {
      if (previous === country) return previous;
      if (previous && country && countryKey(previous) === countryKey(country)) {
        return previous;
      }
      return country;
    });
  }, []);

  const select = useCallback((country: ResolvedCountry) => {
    setSelected((previous) =>
      previous && countryKey(previous) === countryKey(country) ? previous : country,
    );
  }, []);

  const clearSelection = useCallback(() => setSelected(null), []);

  return { hovered, selected, hover, select, clearSelection };
}
