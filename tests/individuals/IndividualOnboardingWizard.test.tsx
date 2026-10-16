import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { IndividualOnboardingWizard } from "@/components/individuals/IndividualOnboardingWizard";

const continueButton = () => screen.getByRole("button", { name: "Continue" });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("IndividualOnboardingWizard", () => {
  it("prefills the email from the account and requires a name", () => {
    render(<IndividualOnboardingWizard initialEmail="alice@example.org" />);
    expect(screen.getByLabelText(/^Email/)).toHaveValue("alice@example.org");

    fireEvent.click(continueButton());
    expect(screen.getByText("Enter your full name")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "About you" })).toBeInTheDocument();
  });

  it("requires accepting the privacy policy before review", () => {
    render(<IndividualOnboardingWizard initialEmail="alice@example.org" />);
    fireEvent.change(screen.getByLabelText(/^Full name/), { target: { value: "Alice Martin" } });
    fireEvent.click(continueButton());
    fireEvent.click(continueButton()); // interests are optional

    expect(screen.getByRole("heading", { name: "Privacy and communication" })).toBeInTheDocument();
    fireEvent.click(continueButton());
    expect(
      screen.getByText("You must accept the privacy policy to create a profile"),
    ).toBeInTheDocument();
  });

  it("creates the profile and shows a welcome screen", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "p1", fullName: "Alice Martin" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<IndividualOnboardingWizard initialEmail="alice@example.org" />);
    fireEvent.change(screen.getByLabelText(/^Full name/), { target: { value: "Alice Martin" } });
    fireEvent.click(continueButton());
    fireEvent.click(screen.getByRole("checkbox", { name: "Hunger relief" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Kenya" }));
    fireEvent.click(continueButton());
    fireEvent.click(screen.getByRole("checkbox", { name: /I accept the privacy policy/ }));
    fireEvent.click(continueButton());
    fireEvent.click(screen.getByRole("button", { name: "Create my profile" }));

    expect(await screen.findByRole("heading", { name: "Welcome, Alice!" })).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/me/individual-profile");
    expect(JSON.parse(init.body as string)).toMatchObject({
      fullName: "Alice Martin",
      email: "alice@example.org",
      preferredCauses: ["HUNGER_RELIEF"],
      preferredCountryCodes: ["KEN"],
      acceptPrivacyPolicy: true,
    });
  });
});
