import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NgoList } from "@/components/ngos/NgoList";
import type { NgosByCountryResponse } from "@/features/discovery/types";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const twoNgos: NgosByCountryResponse = {
  data: [
    {
      id: "1",
      name: "Alpha Relief",
      slug: "alpha-relief",
      logoUrl: null,
      shortDescription: "Food distribution in arid regions.",
      causes: ["Food security", "Water"],
      operatingCountryCodes: ["KEN", "SOM"],
      websiteUrl: "https://alpha.example.org",
    },
    {
      id: "2",
      name: "Beta Nutrition",
      slug: "beta-nutrition",
      logoUrl: "https://cdn.example.org/beta.png",
      shortDescription: "Child nutrition programmes.",
      causes: [],
      operatingCountryCodes: ["KEN"],
      websiteUrl: null,
    },
  ],
  meta: { countryCode: "KEN", total: 2 },
};

describe("NgoList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a loading state, then renders the NGOs returned for the country", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(twoNgos));
    vi.stubGlobal("fetch", fetchMock);

    render(<NgoList countryCode="KEN" countryName="Kenya" />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading NGOs…");

    expect(await screen.findByText("2 organisations")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/countries/KEN/ngos", expect.anything());

    expect(screen.getByRole("link", { name: "Alpha Relief" })).toHaveAttribute("href", "/ngos/alpha-relief");
    expect(screen.getByText("Food distribution in arid regions.")).toBeInTheDocument();
    expect(screen.getByText("Food security")).toBeInTheDocument();
    expect(screen.getByText("2 countries")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "alpha.example.org" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("Beta Nutrition")).toBeInTheDocument();
    expect(screen.getByText("1 country")).toBeInTheDocument();
  });

  it("renders an explicit empty state when no NGO operates in the country", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ data: [], meta: { countryCode: "FRA", total: 0 } })),
    );

    render(<NgoList countryCode="FRA" countryName="France" />);

    expect(await screen.findByText("No NGOs are registered as operating in France yet.")).toBeInTheDocument();
  });

  it("renders an error state with the API message and allows retrying", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: "INTERNAL_ERROR", message: "Unable to load NGOs for this country." } }, 500),
      )
      .mockResolvedValueOnce(jsonResponse({ data: [], meta: { countryCode: "KEN", total: 0 } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<NgoList countryCode="KEN" countryName="Kenya" />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We couldn't load NGOs for Kenya. Unable to load NGOs for this country.");

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/No NGOs are registered/)).toBeInTheDocument();
  });

  it("handles network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    render(<NgoList countryCode="KEN" countryName="Kenya" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to fetch");
  });

  it("refetches when the country changes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(twoNgos))
      .mockResolvedValueOnce(jsonResponse({ data: [], meta: { countryCode: "SOM", total: 0 } }));
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(<NgoList countryCode="KEN" countryName="Kenya" />);
    expect(await screen.findByText("2 organisations")).toBeInTheDocument();

    rerender(<NgoList countryCode="SOM" countryName="Somalia" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading NGOs…");
    expect(await screen.findByText(/operating in Somalia yet/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/countries/SOM/ngos", expect.anything());
  });
});
