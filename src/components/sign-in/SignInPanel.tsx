"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { clearDevSession, setDevSession } from "./dev-session";
import { safeNextPath } from "./next-path";

export type SignInRole = "individual" | "ngo";

export const SIGN_IN_DESTINATION: Record<SignInRole, string> = {
  individual: "/me",
  ngo: "/dashboard",
};

/** Seconds before a user without an account is sent to account creation. */
export const ACCOUNT_CREATION_REDIRECT_SECONDS = 3;

type RoleAccount = {
  /** Resolves whether the signed-in user already has an account for this role. */
  hasAccount: () => Promise<boolean>;
  createHref: string;
  noAccountTitle: string;
  noAccountText: (email: string) => string;
  redirectText: string;
  createLabel: string;
};

const ROLE_ACCOUNTS: Record<SignInRole, RoleAccount> = {
  individual: {
    async hasAccount() {
      const response = await fetch("/api/me/individual-profile", { cache: "no-store" });
      if (response.status === 404) return false;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    },
    createHref: "/me",
    noAccountTitle: "You don't have an individual account yet",
    noAccountText: (email) =>
      `${email} doesn't have an individual profile. Create your free account to discover and support NGOs fighting hunger.`,
    redirectText: "Taking you to account creation",
    createLabel: "Create my account now",
  },
  ngo: {
    async hasAccount() {
      const response = await fetch("/api/me/ngos", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { data: unknown[] };
      return body.data.length > 0;
    },
    createHref: "/onboarding",
    noAccountTitle: "You don't have an NGO account yet",
    noAccountText: (email) =>
      `${email} isn't linked to any organization. Create your NGO account to appear on the hunger map and receive support from donors.`,
    redirectText: "Taking you to NGO registration",
    createLabel: "Create my NGO account now",
  },
};

const emailSchema = z.email();

type Status = "idle" | "checking" | "no-account";

export function SignInPanel({
  role,
  currentUserId,
  nextPath,
}: {
  role: SignInRole;
  currentUserId: string | null;
  /** Where to go after signing in (validated with safeNextPath). */
  nextPath?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [accountEmail, setAccountEmail] = useState<string | null>(currentUserId);
  const [secondsLeft, setSecondsLeft] = useState(ACCOUNT_CREATION_REDIRECT_SECONDS);

  const account = ROLE_ACCOUNTS[role];
  const next = safeNextPath(nextPath);
  // An NGO that came from "Register an NGO in <country>" keeps its country.
  const createHref =
    role === "ngo" && next?.startsWith("/onboarding") ? next : account.createHref;

  useEffect(() => {
    if (status !== "no-account") return;
    if (secondsLeft === 0) {
      router.push(createHref);
      router.refresh();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, secondsLeft, createHref, router]);

  async function proceed() {
    setStatus("checking");
    try {
      if (!(await account.hasAccount())) {
        setSecondsLeft(ACCOUNT_CREATION_REDIRECT_SECONDS);
        setStatus("no-account");
        return;
      }
      router.push(next ?? SIGN_IN_DESTINATION[role]);
      router.refresh();
    } catch {
      setStatus("idle");
      setError("We couldn't check your account. Please try again.");
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!emailSchema.safeParse(normalized).success) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setDevSession(normalized);
    setAccountEmail(normalized);
    void proceed();
  }

  function useDifferentAccount() {
    clearDevSession();
    setAccountEmail(null);
    setEmail("");
    setError(null);
    setStatus("idle");
    router.refresh();
  }

  const primaryButton =
    "rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950";
  const secondaryButton =
    "rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";

  if (status === "no-account") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald-600/40 bg-emerald-600/5 p-6 dark:border-emerald-400/40 dark:bg-emerald-400/10"
      >
        <h2 className="text-xl font-semibold">{account.noAccountTitle}</h2>
        <p className="mt-2 break-words text-sm opacity-80">
          {account.noAccountText(accountEmail ?? "This account")}
        </p>
        <p className="mt-4 text-sm font-medium">
          {account.redirectText} in {secondsLeft} second{secondsLeft === 1 ? "" : "s"}…
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              router.push(createHref);
              router.refresh();
            }}
            className={primaryButton}
          >
            {account.createLabel}
          </button>
          <button type="button" onClick={useDifferentAccount} className={secondaryButton}>
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  const continueLabel = role === "ngo" ? "Continue as an NGO" : "Continue as an individual";

  return (
    <div className="grid gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-600/40 bg-red-600/5 px-4 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {accountEmail ? (
        <div className="rounded-xl border border-black/10 p-5 dark:border-white/15">
          <p className="text-sm">
            You&apos;re signed in as <strong className="break-all">{accountEmail}</strong>.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void proceed()}
              disabled={status === "checking"}
              className={primaryButton}
            >
              {status === "checking" ? "Checking your account…" : continueLabel}
            </button>
            <button type="button" onClick={useDifferentAccount} className={secondaryButton}>
              Use a different account
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="sign-in-email" className="text-sm font-medium">
              {role === "ngo" ? "Organization email" : "Email"}
            </label>
            <input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={role === "ngo" ? "contact@your-ngo.org" : "you@example.org"}
              aria-invalid={error ? true : undefined}
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 aria-[invalid=true]:border-red-600 dark:border-white/20"
            />
          </div>
          <button
            type="submit"
            disabled={status === "checking"}
            className={`justify-self-start ${primaryButton}`}
          >
            {status === "checking" ? "Checking your account…" : continueLabel}
          </button>
        </form>
      )}

      <p className="rounded-lg border border-dashed border-amber-600/50 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200">
        Development sign-in: no password is checked yet. Real authentication will be
        added by the platform team.
      </p>
    </div>
  );
}
