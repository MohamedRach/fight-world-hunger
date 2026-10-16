"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton({
  className,
  redirectTo = "/map",
}: {
  className?: string;
  /** Where to go after signing out; null stays on the current page. */
  redirectTo?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      setPending(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={pending}
      className={
        className ??
        "rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
