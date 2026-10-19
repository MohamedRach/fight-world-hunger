import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CountryCampaignList } from "@/components/campaigns/CountryCampaignList";
import { getJson } from "@/features/api-client";
import type { CountryRecommendationsResponse } from "@/features/recommendations/types";

vi.mock("@/features/api-client", () => ({ getJson: vi.fn() }));

function deferredResponse() {
  let resolve!: (value: CountryRecommendationsResponse) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<CountryRecommendationsResponse>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeResponse(
  source: CountryRecommendationsResponse["source"] = "llm",
): CountryRecommendationsResponse {
  return {
    countryCode: "KEN",
    source,
    personalized: source !== "generic",
    notice: null,
    campaigns: [{
      id: "school-meals",
      slug: "school-meals",
      title: "School meals in Kenya",
      summary: "Daily nutritious meals for children.",
      countryCodes: ["KEN"],
      issueTags: ["school_meals"],
      goalAmountMinor: 100000,
      raisedAmountMinor: 10000,
      progressPercent: 10,
      donationCount: 2,
      currency: "EUR",
      status: "ACTIVE",
      endDate: null,
      imageUrl: null,
      isDemoSeed: true,
      ngo: { id: "ngo-1", name: "Meals NGO", slug: "meals-ngo" },
    }],
    closedCampaigns: [],
    recommendations: [{
      campaignId: "school-meals",
      rank: 1,
      explanation: "Matches your interest in school meals.",
      matchedInterests: ["school_meals"],
      matchedIssueTags: ["school_meals"],
    }],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(getJson).mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CountryCampaignList recommendation loading", () => {
  it("shows an accessible illustrative workflow while waiting and clears its timer on unmount", () => {
    vi.mocked(getJson).mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<CountryCampaignList countryCode="KEN" countryName="Kenya" />);

    expect(screen.getByRole("status", {
      name: "Finding campaign recommendations for Kenya",
    })).toBeInTheDocument();
    expect(screen.getByText(/Illustrative matching workflow, not live AI reasoning/)).toBeInTheDocument();
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    const initialClass = steps[0].className;
    act(() => { vi.advanceTimersByTime(1600); });
    expect(steps[0].className).not.toBe(initialClass);
    expect(steps[1].className).toBe(initialClass);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(vi.mocked(getJson).mock.calls[0][1]?.aborted).toBe(true);
  });

  it.each([
    ["llm", "AI-assisted matches"],
    ["fallback", "Interest-based matches · no AI model used"],
    ["generic", "General suggestions · not personalised"],
  ] as const)("immediately replaces the loader with honestly labelled %s results", async (source, label) => {
    const clearTimer = vi.spyOn(globalThis, "clearInterval");
    const request = deferredResponse();
    vi.mocked(getJson).mockReturnValue(request.promise);
    render(<CountryCampaignList countryCode="KEN" countryName="Kenya" />);

    await act(async () => { request.resolve(makeResponse(source)); });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "School meals in Kenya" })).toBeInTheDocument();
    expect(clearTimer).toHaveBeenCalledTimes(1);
  });

  it("shows an error and restarts the workflow on retry", async () => {
    const request = deferredResponse();
    vi.mocked(getJson).mockReturnValueOnce(request.promise);
    render(<CountryCampaignList countryCode="KEN" countryName="Kenya" />);
    await act(async () => { request.reject(new Error("Request failed")); });

    expect(screen.getByRole("alert")).toHaveTextContent("Request failed");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);

    vi.mocked(getJson).mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("status")).toHaveTextContent("Finding ways to help in Kenya");
    expect(getJson).toHaveBeenCalledTimes(2);
  });

  it("resets the workflow and cancels the old request when the country changes", () => {
    vi.mocked(getJson).mockReturnValue(new Promise(() => {}));
    const { rerender } = render(<CountryCampaignList countryCode="KEN" countryName="Kenya" />);
    const initialClass = screen.getAllByRole("listitem")[0].className;
    act(() => { vi.advanceTimersByTime(1600); });
    rerender(<CountryCampaignList countryCode="ETH" countryName="Ethiopia" />);

    expect(screen.getByRole("status")).toHaveTextContent("Finding ways to help in Ethiopia");
    expect(screen.getAllByRole("listitem")[0].className).toBe(initialClass);
    expect(vi.mocked(getJson).mock.calls[0][1]?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
  });
});
