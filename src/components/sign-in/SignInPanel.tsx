"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { safeNextPath } from "./next-path";
import { SignOutButton } from "./SignOutButton";

export type SignInRole = "individual" | "ngo";

type AccountType = "INDIVIDUAL" | "NGO";

const ROLE: Record<
  SignInRole,
  {
    accountType: AccountType;
    home: string;
    createHref: string;
    createTitle: string;
    createText: string;
    createLabel: string;
    otherRole: SignInRole;
  }
> = {
  individual: {
    accountType: "INDIVIDUAL",
    home: "/me",
    createHref: "/sign-up",
    createTitle: "Create your individual account",
    createText: "Discover NGOs fighting hunger, follow the causes you care about, and support them.",
    createLabel: "Create my account",
    otherRole: "ngo",
  },
  ngo: {
    accountType: "NGO",
    home: "/dashboard",
    createHref: "/onboarding",
    createTitle: "Register your NGO",
    createText:
      "Create your NGO account through our onboarding: tell donors who you are and where you work.",
    createLabel: "Start NGO onboarding",
    otherRole: "individual",
  },
};

export const SIGN_IN_DESTINATION: Record<SignInRole, string> = {
  individual: ROLE.individual.home,
  ngo: ROLE.ngo.home,
};

const primaryButton =
  "inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950";
const secondaryButton =
  "inline-block rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10";

export function SignInPanel({
  role,
  currentAccount,
  nextPath,
}: {
  role: SignInRole;
  currentAccount: { email: string; type: AccountType } | null;
  nextPath?: string;
}) {
  const router = useRouter();
  const config = ROLE[role];
  const next = safeNextPath(nextPath);
  // An NGO that came from "Register an NGO in <country>" keeps its country.
  const createHref =
    role === "ngo" && next?.startsWith("/onboarding") ? next : config.createHref;

  const [email, setEmail] = useState("");
  const [error, setError] = useState<{ message: string; wrongType?: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setError({ message: "Enter your email." });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accountType: config.accountType }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { code: string; message: string } };
        setError({
          message: body.error?.message ?? "Something went wrong. Please try again.",
          wrongType: body.error?.code === "WRONG_ACCOUNT_TYPE",
        });
        return;
      }
      router.push(config.home);
      router.refresh();
    } catch {
      setError({ message: "Could not reach the server. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (currentAccount) {
    const sameType = currentAccount.type === config.accountType;
    return (
      <div className="rounded-2xl border border-black/10 p-6 dark:border-white/15">
        <p className="text-sm">
          You&apos;re signed in as <strong className="break-all">{currentAccount.email}</strong>{" "}
          ({currentAccount.type === "NGO" ? "NGO account" : "individual account"}).
        </p>
        {!sameType && (
          <p className="mt-2 text-sm opacity-80">
            Individual and NGO accounts are separate. Sign out to continue
            {role === "ngo" ? " as an NGO" : " as an individual"}.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {sameType && (
            <Link href={config.home} className={primaryButton}>
              {role === "ngo" ? "Go to my NGO dashboard" : "Go to my profile"}
            </Link>
          )}
          <SignOutButton redirectTo={null} className={secondaryButton} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section
        aria-labelledby="create-account-title"
        className="rounded-2xl border border-emerald-600/40 bg-emerald-600/5 p-6 dark:border-emerald-400/40 dark:bg-emerald-400/10"
      >
        <h2 id="create-account-title" className="text-lg font-semibold">
          {config.createTitle}
        </h2>
        <p className="mt-1 text-sm opacity-80">{config.createText}</p>
        <Link href={createHref} className={`mt-4 ${primaryButton}`}>
          {config.createLabel}
        </Link>
      </section>

      <section
        aria-labelledby="sign-in-title"
        className="rounded-2xl border border-black/10 p-6 dark:border-white/15"
      >
        <h2 id="sign-in-title" className="font-semibold">
          I already have an account
        </h2>
        <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="sign-in-email" className="text-sm font-medium">
              {role === "ngo" ? "NGO account email" : "Email"}
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
          <button type="submit" disabled={submitting} className={secondaryButton}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {error && (
          <div role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
            <p>{error.message}</p>
            {error.wrongType && (
              <Link
                href={`/sign-in?as=${config.otherRole}`}
                className="mt-1 inline-block font-medium underline underline-offset-2"
              >
                {config.otherRole === "ngo" ? "Sign in as an NGO" : "Sign in as an individual"} →
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
