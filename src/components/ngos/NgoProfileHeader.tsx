import type { NgoPublicProfile } from "@/features/ngos/types";
import { NGO_CAUSE_LABELS } from "@/features/ngos/types";
import { countryName } from "@/features/ngos/countries";

export function NgoProfileHeader({ ngo }: { ngo: NgoPublicProfile }) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
      {ngo.logoUrl ? (
        // Remote logo URLs would require next.config images.remotePatterns (shared file).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ngo.logoUrl}
          alt={`${ngo.name} logo`}
          className="h-24 w-24 shrink-0 rounded-xl border border-black/10 object-contain p-2 dark:border-white/15"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-black/5 text-3xl font-semibold dark:border-white/15 dark:bg-white/10"
        >
          {ngo.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{ngo.name}</h1>
          {ngo.yearFounded !== null && (
            <span className="text-sm opacity-70">Founded {ngo.yearFounded}</span>
          )}
        </div>
        <p className="mt-1 text-sm opacity-70">
          Headquartered in {ngo.hqCity ? `${ngo.hqCity}, ` : ""}
          {countryName(ngo.hqCountryCode)}
        </p>
        <p className="mt-3 max-w-2xl text-base">{ngo.shortDescription}</p>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Areas of intervention">
          <li className="rounded-full bg-emerald-600/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
            {NGO_CAUSE_LABELS[ngo.primaryCause]}
          </li>
          {ngo.otherCauses.map((cause) => (
            <li
              key={cause}
              className="rounded-full bg-black/5 px-3 py-1 text-sm dark:bg-white/10"
            >
              {NGO_CAUSE_LABELS[cause]}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
