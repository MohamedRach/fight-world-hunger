"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { clearDevSession, setDevSession } from "./dev-session";
import { safeNextPath } from "./next-path";

export type SignInRole = "individual" | "ngo";

export const SIGN_IN_DESTINATION: Record<SignInRole, string> = {
  individual: "/me",
  ngo: "/dashboard",
};

const ROLES: Array<{ value: SignInRole; title: string; description: string }> = [
  {
    value: "individual",
    title: "As an individual",
    description: "Discover NGOs, follow the causes you care about, and support them.",
  },
  {
    value: "ngo",
    title: "As an NGO",
    description: "Register your organization and manage its public profile.",
  },
];

const emailSchema = z.email();

export function SignInPanel({
  initialRole,
  currentUserId,
  nextPath,
}: {
  initialRole: SignInRole;
  currentUserId: string | null;
  /** Where to go after signing in with `initialRole` (validated with safeNextPath). */
  nextPath?: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState<SignInRole>(initialRole);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function goToSpace(selectedRole: SignInRole) {
    const next = selectedRole === initialRole ? safeNextPath(nextPath) : undefined;
    router.push(next ?? SIGN_IN_DESTINATION[selectedRole]);
    router.refresh();
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
    goToSpace(role);
  }

  return (
    <div className="grid gap-6">
      <fieldset>
        <legend className="text-sm font-medium">I want to continue</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {ROLES.map((option) => {
            const selected = role === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors ${
                  selected
                    ? "border-emerald-600 bg-emerald-600/5 ring-1 ring-emerald-600 dark:border-emerald-400 dark:ring-emerald-400"
                    : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selected}
                    onChange={() => setRole(option.value)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  {option.title}
                </span>
                <span className="pl-6 text-sm opacity-70">{option.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {currentUserId ? (
        <div className="rounded-xl border border-black/10 p-5 dark:border-white/15">
          <p className="text-sm">
            You&apos;re signed in as <strong className="break-all">{currentUserId}</strong>.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => goToSpace(role)}
              className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
            >
              {role === "ngo" ? "Continue to my NGO space" : "Continue to my profile"}
            </button>
            <button
              type="button"
              onClick={() => {
                clearDevSession();
                router.refresh();
              }}
              className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Use a different account
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="sign-in-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.org"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "sign-in-email-error" : undefined}
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 aria-[invalid=true]:border-red-600 dark:border-white/20"
            />
            {error && (
              <p id="sign-in-email-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="justify-self-start rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
          >
            {role === "ngo" ? "Continue as an NGO" : "Continue as an individual"}
          </button>
          <p className="text-xs opacity-60">
            One account works for both: you can have an individual profile and manage
            NGOs with the same email.
          </p>
        </form>
      )}

      <p className="rounded-lg border border-dashed border-amber-600/50 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200">
        Development sign-in: no password is checked yet. Real authentication will be
        added by the platform team.
      </p>
    </div>
  );
}
