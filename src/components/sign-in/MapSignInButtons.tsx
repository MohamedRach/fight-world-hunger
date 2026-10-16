import Link from "next/link";

/** Entry points shown in the map header (dark theme). */
export function MapSignInButtons() {
  return (
    <nav aria-label="Sign in" className="mt-4 flex flex-wrap gap-3">
      <Link
        href="/sign-in?as=individual"
        className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 1 1 14 0H3Z" />
        </svg>
        Sign in as an individual
      </Link>
      <Link
        href="/sign-in?as=ngo"
        className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M3 17V7l7-4 7 4v10h-4v-5H7v5H3Z" />
        </svg>
        Sign in as an NGO
      </Link>
    </nav>
  );
}
