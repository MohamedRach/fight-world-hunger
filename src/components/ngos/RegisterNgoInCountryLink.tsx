import Link from "next/link";

/** Call-to-action shown in the map's country sidebar, below the NGO list. */
export function RegisterNgoInCountryLink({
  countryCode,
  countryName,
  hasNgos,
}: {
  countryCode: string;
  countryName: string;
  hasNgos: boolean;
}) {
  return (
    <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3">
      <p className="text-xs text-slate-300">
        {hasNgos
          ? `Does your organisation also work in ${countryName}?`
          : `Is your organisation working in ${countryName}? Be the first to register.`}
      </p>
      <Link
        href={`/onboarding?country=${encodeURIComponent(countryCode)}`}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <span aria-hidden="true">+</span>
        Register an NGO in {countryName}
      </Link>
    </div>
  );
}
