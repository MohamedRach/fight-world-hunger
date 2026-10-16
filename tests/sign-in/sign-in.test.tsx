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

/** NGO accounts: GET /api/me/ngos returns the NGOs the account manages. */
function mockManagedNgos(ngos: Array<{ id: string }>) {
  const fetchMock = vi.fn().mockResolvedValue(json({ data: ngos }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Individual accounts: GET /api/me/individual-profile returns 200 or 404. */
function mockIndividualProfile(exists: boolean) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      exists
        ? json({ data: { id: "p1" } })
        : json({ error: { code: "NOT_FOUND", message: "No profile" } }, 404),
    );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function signInWith(email: string) {
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: email } });
  fireEvent.submit(input.closest("form")!);
}

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  document.cookie = "dev-user-id=; path=/; max-age=0";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("map sign-in buttons", () => {
  it("offers separate sign-in for individuals and NGOs", () => {
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

describe("individual sign-in", () => {
  it("rejects an invalid email", () => {
    render(<SignInPanel role="individual" currentUserId={null} />);
    signInWith("not-an-email");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("opens the profile when the account exists", async () => {
    const fetchMock = mockIndividualProfile(true);
    render(<SignInPanel role="individual" currentUserId={null} />);
    signInWith("  Alice@Example.org ");

    expect(document.cookie).toContain("dev-user-id=alice%40example.org");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/me"));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/me/individual-profile");
    expect(screen.queryByRole("heading", { name: /don't have an individual account/ })).toBeNull();
  });

  it("explains there is no account and offers to create one", async () => {
    mockIndividualProfile(false);
    render(<SignInPanel role="individual" currentUserId={null} />);
    signInWith("new@example.org");

    expect(
      await screen.findByRole("heading", { name: "You don't have an individual account yet" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/new@example\.org doesn't have an individual profile/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Create my account now" }));
    expect(push).toHaveBeenCalledWith("/me");
  });

  it("redirects to account creation automatically", async () => {
    mockIndividualProfile(false);
    render(<SignInPanel role="individual" currentUserId={null} />);
    signInWith("new@example.org");

    await screen.findByText(/Taking you to account creation/);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/me"), { timeout: 5000 });
  }, 8000);
});

describe("NGO sign-in", () => {
  it("opens the dashboard when the account manages an NGO", async () => {
    const fetchMock = mockManagedNgos([{ id: "ngo-1" }]);
    render(<SignInPanel role="ngo" currentUserId={null} />);
    signInWith("contact@ngo.org");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/me/ngos");
  });

  it("explains there is no NGO account and offers to create one", async () => {
    mockManagedNgos([]);
    render(<SignInPanel role="ngo" currentUserId={null} />);
    signInWith("new@ngo.org");

    expect(
      await screen.findByRole("heading", { name: "You don't have an NGO account yet" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/new@ngo\.org isn't linked to any organization/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Create my NGO account now" }));
    expect(push).toHaveBeenCalledWith("/onboarding");
  });

  it("redirects to NGO registration automatically", async () => {
    mockManagedNgos([]);
    render(<SignInPanel role="ngo" currentUserId={null} />);
    signInWith("new@ngo.org");

    await screen.findByText(/Taking you to NGO registration/);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding"), { timeout: 5000 });
  }, 8000);

  it("keeps the country when the NGO came from the map", async () => {
    mockManagedNgos([]);
    render(
      <SignInPanel role="ngo" currentUserId={null} nextPath="/onboarding?country=KEN" />,
    );
    signInWith("new@ngo.org");

    fireEvent.click(await screen.findByRole("button", { name: "Create my NGO account now" }));
    expect(push).toHaveBeenCalledWith("/onboarding?country=KEN");
  });

  it("checks an already signed-in account too", async () => {
    mockManagedNgos([]);
    render(<SignInPanel role="ngo" currentUserId="demo.donor@example.org" />);
    fireEvent.click(screen.getByRole("button", { name: "Continue as an NGO" }));

    expect(
      await screen.findByRole("heading", { name: "You don't have an NGO account yet" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/demo\.donor@example\.org/)).toBeInTheDocument();
  });

  it("shows an error when the account check fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<SignInPanel role="ngo" currentUserId={null} />);
    signInWith("contact@ngo.org");

    expect(
      await screen.findByText("We couldn't check your account. Please try again."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
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
