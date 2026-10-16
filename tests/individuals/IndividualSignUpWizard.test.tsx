import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { IndividualSignUpWizard } from "@/components/individuals/IndividualSignUpWizard";

const continueButton = () => screen.getByRole("button", { name: "Continue" });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("IndividualSignUpWizard", () => {
  it("requires a name and an email", () => {
    render(<IndividualSignUpWizard />);
    fireEvent.click(continueButton());
    expect(screen.getByText("Enter your full name")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
  });

  it("creates the individual account", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { profile: { fullName: "Alice Martin" } } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<IndividualSignUpWizard />);
    fireEvent.change(screen.getByLabelText(/^Full name/), { target: { value: "Alice Martin" } });
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "alice@example.org" } });
    fireEvent.click(continueButton());
    fireEvent.click(screen.getByRole("checkbox", { name: "Hunger relief" }));
    fireEvent.click(continueButton());
    fireEvent.click(continueButton());
    expect(
      screen.getByText("You must accept the privacy policy to create a profile"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /I accept the privacy policy/ }));
    fireEvent.click(continueButton());
    fireEvent.click(screen.getByRole("button", { name: "Create my account" }));

    expect(await screen.findByRole("heading", { name: "Welcome, Alice!" })).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/accounts/individual");
    expect(JSON.parse(init.body as string)).toMatchObject({
      fullName: "Alice Martin",
      email: "alice@example.org",
      preferredCauses: ["HUNGER_RELIEF"],
      acceptPrivacyPolicy: true,
    });
  });
});
