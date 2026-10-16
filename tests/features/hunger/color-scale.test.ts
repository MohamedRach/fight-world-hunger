import { describe, expect, it } from "vitest";

import {
  classifyHungerValue,
  HUNGER_SEVERITY_CLASSES,
  hungerColor,
  NO_DATA_COLOR,
} from "@/features/hunger/color-scale";
import { formatHungerValue } from "@/features/hunger/format";

describe("classifyHungerValue", () => {
  it("returns null for missing or invalid values", () => {
    expect(classifyHungerValue(null)).toBeNull();
    expect(classifyHungerValue(undefined)).toBeNull();
    expect(classifyHungerValue(Number.NaN)).toBeNull();
    expect(classifyHungerValue(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("places the 2.5% reporting floor in the lowest class", () => {
    expect(classifyHungerValue(2.5)?.label).toBe("< 2.5%");
    expect(classifyHungerValue(0)?.label).toBe("< 2.5%");
  });

  it("uses FAO's SOFI class boundaries", () => {
    expect(classifyHungerValue(2.6)?.label).toBe("2.5 – 4.9%");
    expect(classifyHungerValue(4.99)?.label).toBe("2.5 – 4.9%");
    expect(classifyHungerValue(5)?.label).toBe("5 – 14.9%");
    expect(classifyHungerValue(14.99)?.label).toBe("5 – 14.9%");
    expect(classifyHungerValue(15)?.label).toBe("15 – 24.9%");
    expect(classifyHungerValue(25)?.label).toBe("25 – 34.9%");
    expect(classifyHungerValue(34.9)?.label).toBe("25 – 34.9%");
    expect(classifyHungerValue(35)?.label).toBe("≥ 35%");
    expect(classifyHungerValue(100)?.label).toBe("≥ 35%");
  });

  it("has contiguous, ascending classes", () => {
    for (let i = 1; i < HUNGER_SEVERITY_CLASSES.length; i += 1) {
      expect(HUNGER_SEVERITY_CLASSES[i].min).toBe(HUNGER_SEVERITY_CLASSES[i - 1].max);
    }
    expect(HUNGER_SEVERITY_CLASSES.at(-1)?.max).toBe(Infinity);
  });
});

describe("hungerColor", () => {
  it("maps missing data to neutral grey, never to the lowest class", () => {
    expect(hungerColor(null)).toBe(NO_DATA_COLOR);
    expect(hungerColor(undefined)).toBe(NO_DATA_COLOR);
    expect(hungerColor(null)).not.toBe(HUNGER_SEVERITY_CLASSES[0].color);
  });

  it("maps values to their class colour from near-white to dark red", () => {
    expect(hungerColor(1)).toBe("#fff5f0");
    expect(hungerColor(18.7)).toBe("#ef5a3c");
    expect(hungerColor(34.9)).toBe("#b81d20");
    expect(hungerColor(56.5)).toBe("#67000d");
  });
});

describe("formatHungerValue", () => {
  it("formats measured, floored and missing values", () => {
    expect(formatHungerValue({ value: 34.94, isBelowReportingFloor: false })).toBe("34.9%");
    expect(formatHungerValue({ value: 2.5, isBelowReportingFloor: true })).toBe("< 2.5%");
    expect(formatHungerValue({ value: null, isBelowReportingFloor: false })).toBe("No data available");
    expect(formatHungerValue(undefined)).toBe("No data available");
  });
});
