import Link from "next/link";

import type { NgoSummary } from "@/features/discovery/types";

interface NgoCardProps {
  ngo: NgoSummary;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function NgoCard({ ngo }: NgoCardProps) {
  return (
    <article
      aria-labelledby={`ngo-${ngo.id}-name`}
      className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200"
    >
      <div className="flex items-start gap-3">
        {ngo.logoUrl ? (
          // Logo hosts are not known yet; next/image would require remotePatterns in shared config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ngo.logoUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain p-0.5"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xs font-semibold text-white"
          >
            {initials(ngo.name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h4 id={`ngo-${ngo.id}-name`} className="truncate font-semibold text-white">
            <Link
              href={`/ngos/${ngo.slug}`}
              className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              {ngo.name}
            </Link>
          </h4>
          <p className="mt-0.5 line-clamp-3 text-xs text-slate-300">{ngo.shortDescription}</p>
        </div>
      </div>

      {ngo.causes.length > 0 ? (
        <ul aria-label="Causes" className="mt-2 flex flex-wrap gap-1">
          {ngo.causes.map((cause) => (
            <li
              key={cause}
              className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-200"
            >
              {cause}
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="mt-2 space-y-0.5 text-[11px] text-slate-400">
        <div className="flex gap-1">
          <dt>Operates in:</dt>
          <dd>
            {ngo.operatingCountryCodes.length}{" "}
            {ngo.operatingCountryCodes.length === 1 ? "country" : "countries"}
          </dd>
        </div>
        {ngo.websiteUrl ? (
          <div className="flex gap-1">
            <dt>Website:</dt>
            <dd>
              <a
                href={ngo.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate underline decoration-slate-500 underline-offset-2 hover:text-white"
              >
                {ngo.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
