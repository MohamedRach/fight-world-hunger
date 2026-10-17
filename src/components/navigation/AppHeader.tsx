import Link from "next/link";
import { Suspense } from "react";

import { getSessionUser } from "@/features/ngos/session";
import { AppNavMenu } from "./AppNavMenu";

/**
 * Session-aware navigation, rendered on every page from the root layout.
 *
 * The session is read inside a Suspense boundary so pages such as /map keep
 * their prerendered static shell and only this menu streams in at request
 * time.
 */
async function SessionMenu() {
  const user = await getSessionUser();
  return <AppNavMenu user={user} />;
}

function MenuFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-9 w-[4.5rem] animate-pulse rounded-full border border-white/15 bg-white/5 sm:w-28"
    />
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070d1a]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link
          href="/map"
          className="flex items-center gap-2 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-emerald-950"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM3.5 10c0-.6.08-1.17.23-1.72l1.1 1.1 1.42 1.41v1.42l1.41 1.41.71.71v1.4A6.5 6.5 0 0 1 3.5 10Zm9.9 5.83-.7-2.12 1.41-1.42.71-2.12h1.66a6.5 6.5 0 0 1-3.08 5.66ZM8.6 4.1l.7.7-.7.71-1.42-.7-1.06 1.06 1.77 1.77H9.3l1.06 1.06-2.12 2.12-1.42-1.41-1.41 1.41v1.06l-1.2-1.2A6.5 6.5 0 0 1 8.6 4.1Z" />
            </svg>
          </span>
          <span className="hidden sm:inline">Fight World Hunger</span>
        </Link>

        <Suspense fallback={<MenuFallback />}>
          <SessionMenu />
        </Suspense>
      </div>
    </header>
  );
}
