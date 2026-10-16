import Link from "next/link";
import type { IndividualProfileView } from "@/features/individuals/types";
import type { IndividualCompleteness } from "@/features/individuals/service";
import { NGO_CAUSE_LABELS } from "@/features/ngos/types";
import { countryName } from "@/features/ngos/countries";
import { NgoSection } from "@/components/ngos/NgoSection";
import { NgoCompletenessCard } from "@/components/ngos/NgoCompletenessCard";

const chip = "rounded-full bg-black/5 px-3 py-1 text-sm dark:bg-white/10";

export function IndividualProfileOverview({
  profile,
  completeness,
}: {
  profile: IndividualProfileView;
  completeness: IndividualCompleteness;
}) {
  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {profile.avatarUrl ? (
          // Remote photo URLs would need next.config images.remotePatterns (shared file).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full border border-black/10 object-cover dark:border-white/15"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-2xl font-semibold text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200"
          >
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{profile.fullName}</h1>
          <p className="text-sm opacity-70">
            {profile.email}
            {profile.countryCode ? ` · ${countryName(profile.countryCode)}` : ""}
          </p>
        </div>
        <Link
          href="/me/edit"
          className="self-start rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 sm:self-center dark:bg-emerald-500 dark:text-emerald-950"
        >
          Edit profile
        </Link>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_minmax(16rem,20rem)]">
        <div className="grid gap-6">
          {profile.bio && (
            <NgoSection title="Why I give">
              <p className="whitespace-pre-line">{profile.bio}</p>
            </NgoSection>
          )}
          <NgoSection title="My interests">
            <h3 className="font-medium">Causes</h3>
            {profile.preferredCauses.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Causes I care about">
                {profile.preferredCauses.map((cause) => (
                  <li key={cause} className={chip}>
                    {NGO_CAUSE_LABELS[cause]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-60">No causes selected yet.</p>
            )}
            <h3 className="pt-2 font-medium">Countries</h3>
            {profile.preferredCountryCodes.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Countries I want to support">
                {profile.preferredCountryCodes.map((code) => (
                  <li key={code} className={chip}>
                    {countryName(code)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-60">No countries selected yet.</p>
            )}
          </NgoSection>
          <NgoSection title="Privacy">
            <ul className="space-y-1 text-sm">
              <li>
                {profile.donateAnonymously
                  ? "✓ I donate anonymously by default"
                  : "My name is shown on my donations"}
              </li>
              <li>
                {profile.contactConsent
                  ? "✓ NGOs I support may contact me"
                  : "NGOs may not contact me"}
              </li>
            </ul>
          </NgoSection>
        </div>
        <NgoCompletenessCard
          completeness={completeness}
          missingIntro="Complete your profile to get better NGO suggestions:"
        />
      </div>
    </div>
  );
}
