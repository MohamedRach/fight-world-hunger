import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NgoList } from "@/components/ngos/NgoList";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Register-an-NGO call-to-action in the country NGO list", () => {
  it("invites the first registration when a country has no NGOs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ data: [], meta: { countryCode: "KEN", total: 0 } })),
    );
    render(<NgoList countryCode="KEN" countryName="Kenya" />);

    const link = await screen.findByRole("link", { name: /Register an NGO in Kenya/ });
    expect(link).toHaveAttribute("href", "/onboarding?country=KEN");
    expect(screen.getByText(/Be the first to register/)).toBeInTheDocument();
  });

  it("stays available below existing NGOs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: [
            {
              id: "1",
              name: "Alpha Relief",
              slug: "alpha-relief",
              logoUrl: null,
              shortDescription: "Food distribution in arid regions.",
              causes: ["Hunger relief"],
              operatingCountryCodes: ["KEN"],
              websiteUrl: null,
            },
          ],
          meta: { countryCode: "KEN", total: 1 },
        }),
      ),
    );
    render(<NgoList countryCode="KEN" countryName="Kenya" />);

    expect(await screen.findByRole("link", { name: "Alpha Relief" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Register an NGO in Kenya/ })).toHaveAttribute(
      "href",
      "/onboarding?country=KEN",
    );
  });
});
