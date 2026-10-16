import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import { SignInPanel } from "@/components/sign-in/SignInPanel";
import { MapSignInButtons } from "@/components/sign-in/MapSignInButtons";
import { safeNextPath } from "@/components/sign-in/next-path";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function signInWith(email: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("map sign-in buttons", () => {
  it("offers separate entry points for individuals and NGOs", () => {
    render(<MapSignInButtons />);
    expect(screen.getByRole("link", { name: "Sign in as an individual" })).toHaveAttribute(
      "href",
      "/sign-in?as=individual",
    );
    expect(screen.getByRole("link", { name: "Sign in as an NGO" })).toHaveAttribute(
      "href",
      "/sign-in?as=ngo",
    );
  });
});

describe("individual sign-in page", () => {
  it("first offers to create an individual account", () => {
    render(<SignInPanel role="individual" currentAccount={null} />);
    expect(screen.getByRole("link", { name: "Create my account" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("signs an existing individual in", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { account: {} } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SignInPanel role="individual" currentAccount={null} />);
    signInWith("alice@example.org");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/me"));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: "alice@example.org",
      accountType: "INDIVIDUAL",
    });
  });

  it("explains when the email belongs to an NGO account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json(
          {
            error: {
              code: "WRONG_ACCOUNT_TYPE",
              message: "This email belongs to an NGO account. Sign in as an NGO instead.",
            },
          },
          403,
        ),
      ),
    );
    render(<SignInPanel role="individual" currentAccount={null} />);
    signInWith("contact@ngo.org");

    expect(await screen.findByText(/belongs to an NGO account/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign in as an NGO/ })).toHaveAttribute(
      "href",
      "/sign-in?as=ngo",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("shows when no account exists for the email", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json({ error: { code: "ACCOUNT_NOT_FOUND", message: "No account found with this email." } }, 404),
      ),
    );
    render(<SignInPanel role="individual" currentAccount={null} />);
    signInWith("nobody@example.org");
    expect(await screen.findByText("No account found with this email.")).toBeInTheDocument();
  });
});

describe("NGO sign-in page", () => {
  it("first offers the NGO onboarding to create an account", () => {
    render(<SignInPanel role="ngo" currentAccount={null} />);
    expect(screen.getByRole("link", { name: "Start NGO onboarding" })).toHaveAttribute(
      "href",
      "/onboarding",
    );
  });

  it("keeps the country when the NGO came from the map", () => {
    render(<SignInPanel role="ngo" currentAccount={null} nextPath="/onboarding?country=KEN" />);
    expect(screen.getByRole("link", { name: "Start NGO onboarding" })).toHaveAttribute(
      "href",
      "/onboarding?country=KEN",
    );
  });

  it("signs an existing NGO in to its dashboard", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ data: { account: {} } })));
    render(<SignInPanel role="ngo" currentAccount={null} />);
    signInWith("contact@ngo.org");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("does not let an individual account continue as an NGO", () => {
    render(
      <SignInPanel
        role="ngo"
        currentAccount={{ email: "alice@example.org", type: "INDIVIDUAL" }}
      />,
    );
    expect(screen.getByText(/Individual and NGO accounts are separate/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Go to my NGO dashboard" })).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("only allows same-site paths", () => {
    expect(safeNextPath("/onboarding?country=KEN")).toBe("/onboarding?country=KEN");
    expect(safeNextPath("//evil.example")).toBeUndefined();
    expect(safeNextPath("/\\evil.example")).toBeUndefined();
    expect(safeNextPath("https://evil.example")).toBeUndefined();
    expect(safeNextPath(undefined)).toBeUndefined();
  });
});
