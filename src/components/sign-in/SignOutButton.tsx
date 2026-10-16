"use client";

import { useRouter } from "next/navigation";
import { clearDevSession } from "./dev-session";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        clearDevSession();
        router.push("/sign-in");
        router.refresh();
      }}
      className={
        className ??
        "rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
      }
    >
      Sign out
    </button>
  );
}
