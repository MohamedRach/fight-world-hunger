import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NgoOnboardingWizard } from "@/components/ngos/onboarding/NgoOnboardingWizard";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const continueButton = () => screen.getByRole("button", { name: "Continue" });

function startWizard() {
  render(<NgoOnboardingWizard />);
  fireEvent.click(screen.getByRole("button", { name: "Start onboarding" }));
}

function fillIdentity() {
  fireEvent.change(screen.getByLabelText(/^NGO name/), { target: { value: "Food For All" } });
  fireEvent.change(screen.getByLabelText(/^Short description/), {
    target: { value: "Fighting hunger with local food banks." },
  });
  fireEvent.change(screen.getByLabelText(/^Mission statement/), {
    target: { value: "We distribute surplus food to families facing food insecurity." },
  });
}

function fillGeography() {
  fireEvent.change(screen.getByLabelText(/^Headquarters country/), { target: { value: "FR" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "France" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Senegal" }));
}

function fillCauses() {
  fireEvent.change(screen.getByLabelText(/^Primary cause/), {
    target: { value: "HUNGER_RELIEF" },
  });
}

/** Walks through every step to the review screen. */
function completeAllSteps() {
  startWizard();
  fillIdentity();
  fireEvent.click(continueButton());
  fillGeography();
  fireEvent.click(continueButton());
  fillCauses();
  fireEvent.click(continueButton());
  fireEvent.click(continueButton()); // contact (optional)
  fireEvent.click(continueButton()); // impact (optional)
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NgoOnboardingWizard", () => {
  it("starts on a welcome screen and opens the first step", () => {
    render(<NgoOnboardingWizard />);
    expect(
      screen.getByRole("heading", { name: "Register your NGO on the platform" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start onboarding" }));
    expect(screen.getByRole("heading", { name: "Organization identity" })).toBeInTheDocument();
  });

  it("blocks progress and shows errors when required fields are empty", () => {
    startWizard();
    fireEvent.click(continueButton());

    expect(
      screen.getByText("Please fix the highlighted fields before continuing."),
    ).toBeInTheDocument();
    expect(screen.getByText("Name must be at least 2 characters")).toBeInTheDocument();
    expect(screen.getByLabelText(/^NGO name/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("heading", { name: "Organization identity" })).toBeInTheDocument();
  });

  it("advances once the step is valid", () => {
    startWizard();
    fillIdentity();
    fireEvent.click(continueButton());
    expect(screen.getByRole("heading", { name: "Where you work" })).toBeInTheDocument();
  });

  it("submits the profile from the review step and shows the success screen", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ data: { id: "ngo-1", slug: "food-for-all", name: "Food For All" } }, 201),
      );
    vi.stubGlobal("fetch", fetchMock);

    completeAllSteps();
    expect(screen.getByRole("heading", { name: "Review and submit" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create NGO profile" }));

    expect(
      await screen.findByRole("heading", { name: "Welcome aboard, Food For All!" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View public profile" })).toHaveAttribute(
      "href",
      "/ngos/food-for-all",
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/ngos");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: "Food For All",
      hqCountryCode: "FR",
      operatingCountryCodes: ["FR", "SN"],
      primaryCause: "HUNGER_RELIEF",
    });
    expect(window.localStorage.getItem("ngo-onboarding-draft:v1")).toBeNull();
  });

  it("returns to the offending step when the server reports a duplicate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "DUPLICATE_NGO",
              message: "An NGO with this name already exists.",
              fieldErrors: { name: ["An NGO with this name already exists."] },
            },
          },
          409,
        ),
      ),
    );

    completeAllSteps();
    fireEvent.click(screen.getByRole("button", { name: "Create NGO profile" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Organization identity" })).toBeInTheDocument(),
    );
    expect(screen.getAllByText("An NGO with this name already exists.").length).toBeGreaterThan(0);
  });

  it("restores progress saved on the device", () => {
    window.localStorage.setItem(
      "ngo-onboarding-draft:v1",
      JSON.stringify({ name: "Saved NGO", mission: "A saved mission statement." }),
    );
    startWizard();

    expect(screen.getByText("We restored the progress saved on this device.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^NGO name/)).toHaveValue("Saved NGO");
  });

  it("prevents choosing the primary cause again as an additional cause", () => {
    startWizard();
    fillIdentity();
    fireEvent.click(continueButton());
    fillGeography();
    fireEvent.click(continueButton());
    fillCauses();

    expect(screen.getByRole("checkbox", { name: "Hunger relief" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Education" })).toBeEnabled();
  });
});
