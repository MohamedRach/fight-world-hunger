import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { countryKey, useCountrySelection } from "@/components/map/useCountrySelection";
import { makeCountry } from "./fixtures";

describe("useCountrySelection", () => {
  const kenya = makeCountry();
  const somalia = makeCountry({ name: "Somalia", iso_a3: "SOM", iso_a3_eh: "SOM", adm0_a3: "SOM", iso_a2: "SO" });

  it("starts with nothing hovered or selected", () => {
    const { result } = renderHook(() => useCountrySelection());
    expect(result.current.hovered).toBeNull();
    expect(result.current.selected).toBeNull();
  });

  it("selects a country, replaces it with another and clears", () => {
    const { result } = renderHook(() => useCountrySelection());

    act(() => result.current.select(kenya));
    expect(result.current.selected?.name).toBe("Kenya");

    act(() => result.current.select(somalia));
    expect(result.current.selected?.name).toBe("Somalia");

    act(() => result.current.clearSelection());
    expect(result.current.selected).toBeNull();
  });

  it("keeps the same object when re-selecting the same country", () => {
    const { result } = renderHook(() => useCountrySelection());
    act(() => result.current.select(kenya));
    const first = result.current.selected;
    act(() => result.current.select({ ...kenya }));
    expect(result.current.selected).toBe(first);
  });

  it("tracks hover independently of selection", () => {
    const { result } = renderHook(() => useCountrySelection());
    act(() => result.current.select(kenya));
    act(() => result.current.hover(somalia));
    expect(result.current.hovered?.name).toBe("Somalia");
    expect(result.current.selected?.name).toBe("Kenya");
    act(() => result.current.hover(null));
    expect(result.current.hovered).toBeNull();
  });

  it("keys polygons by adm0_a3 so code-less territories are still selectable", () => {
    const somaliland = makeCountry({ name: "Somaliland", iso_a3: "-99", iso_a3_eh: "-99", adm0_a3: "SOL", code: null });
    expect(countryKey(somaliland)).toBe("SOL");
    const { result } = renderHook(() => useCountrySelection());
    act(() => result.current.select(somaliland));
    expect(result.current.selected?.code).toBeNull();
  });
});
