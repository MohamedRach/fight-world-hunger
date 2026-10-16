"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * TEMPORARY DEV-ONLY control — lets the team exercise NGO profile management
 * before Developer 1's authentication exists. It sets the `dev-user-id`
 * cookie read by the session stub (src/features/ngos/session.ts).
 * Remove together with the stub once real auth lands.
 */
export function DevUserSwitcher({ currentUserId }: { currentUserId: string | null }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function signIn(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = userId.trim();
    if (!trimmed) {
      setError("Enter a user ID first, e.g. user-1.");
      return;
    }
    setError(null);
    document.cookie = `dev-user-id=${encodeURIComponent(trimmed)}; path=/; max-age=86400; samesite=lax`;
    router.refresh();
  }

  function signOut() {
    document.cookie = "dev-user-id=; path=/; max-age=0";
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-dashed border-amber-600/50 bg-amber-500/5 p-4 text-sm">
      <p className="font-medium text-amber-800 dark:text-amber-300">
        Temporary development sign-in
      </p>
      <p className="mt-1 opacity-70">
        Authentication is not implemented yet (Developer 1). Enter any user ID
        to act as that user while testing.
      </p>
      {currentUserId ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span>
            Signed in as <code className="font-mono">{currentUserId}</code>
          </span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-full border border-black/15 px-4 py-1.5 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      ) : (
        <form onSubmit={signIn} className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="dev-user-id" className="sr-only">
            Development user ID
          </label>
          <input
            id="dev-user-id"
            type="text"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="e.g. user-1"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "dev-user-id-error" : undefined}
            className="rounded-lg border border-black/15 bg-transparent px-3 py-1.5 outline-none focus:border-emerald-600 dark:border-white/20"
          />
          <button
            type="submit"
            className="rounded-full bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
          >
            Sign in
          </button>
          {error && (
            <p id="dev-user-id-error" role="alert" className="w-full text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
