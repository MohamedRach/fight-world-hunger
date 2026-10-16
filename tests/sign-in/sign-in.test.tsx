import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import { SignInPanel } from "@/components/sign-in/SignInPanel";
import { MapSignInButtons } from "@/components/sign-in/MapSignInButtons";
import { safeNextPath } from "@/components/sign-in/next-path";

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  document.cookie = "dev-user-id=; path=/; max-age=0";
});

function signInWith(email: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.submit(screen.getByLabelText("Email").closest("form")!);
}

describe("map sign-in buttons", () => {
  it("offers both ways to sign in", () => {
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

describe("SignInPanel", () => {
  it("preselects the role chosen on the map", () => {
    render(<SignInPanel initialRole="ngo" currentUserId={null} />);
    expect(screen.getByRole("radio", { name: /As an NGO/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Continue as an NGO" })).toBeInTheDocument();
  });

  it("rejects an invalid email", () => {
    render(<SignInPanel initialRole="individual" currentUserId={null} />);
    signInWith("not-an-email");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("signs an individual in and opens their profile", () => {
    render(<SignInPanel initialRole="individual" currentUserId={null} />);
    signInWith("  Alice@Example.org ");
    expect(document.cookie).toContain("dev-user-id=alice%40example.org");
    expect(push).toHaveBeenCalledWith("/me");
  });

  it("sends an NGO to its dashboard, or back to where it came from", () => {
    const { unmount } = render(<SignInPanel initialRole="ngo" currentUserId={null} />);
    signInWith("ngo@example.org");
    expect(push).toHaveBeenLastCalledWith("/dashboard");
    unmount();

    render(
      <SignInPanel initialRole="ngo" currentUserId={null} nextPath="/onboarding?country=KEN" />,
    );
    signInWith("ngo@example.org");
    expect(push).toHaveBeenLastCalledWith("/onboarding?country=KEN");
  });

  it("lets an already signed-in user switch between spaces", () => {
    render(<SignInPanel initialRole="individual" currentUserId="alice@example.org" />);
    fireEvent.click(screen.getByRole("radio", { name: /As an NGO/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to my NGO space" }));
    expect(push).toHaveBeenCalledWith("/dashboard");
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
