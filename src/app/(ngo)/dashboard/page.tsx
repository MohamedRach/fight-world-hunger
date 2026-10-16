import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import { computeProfileCompleteness, getManagedNgos } from "@/features/ngos/service";
import { NgoCompletenessCard } from "@/components/ngos/NgoCompletenessCard";
import { DevUserSwitcher } from "@/components/ngos/DevUserSwitcher";
import { countryName } from "@/features/ngos/countries";

export const metadata: Metadata = {
  title: "NGO dashboard",
  description: "Manage your organization's profile.",
};

export default async function NgoDashboardPage() {
  const user = await getSessionUser();
  const ngos = await getManagedNgos(user?.id ?? null);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NGO dashboard</h1>
          <p className="mt-1 text-sm opacity-70">
            Manage your organization&apos;s public profile.
          </p>
        </div>
        {user && (
          <Link
            href="/onboarding"
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
          >
            Create NGO profile
          </Link>
        )}
      </div>

      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6">
          <DevUserSwitcher currentUserId={user?.id ?? null} />
        </div>
      )}

      {!user ? (
        <p className="mt-8 rounded-xl border border-black/10 p-6 text-sm opacity-80 dark:border-white/15">
          Sign in to manage your NGO&apos;s profile.
        </p>
      ) : ngos.length === 0 ? (
        <div className="mt-8 rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="font-semibold">No NGO profile yet</h2>
          <p className="mt-1 text-sm opacity-70">
            You are not managing any organization. Create a profile to tell
            donors about your mission, activities, and impact.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-block rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
          >
            Create NGO profile
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6">
          {ngos.map((ngo) => (
            <section
              key={ngo.id}
              aria-label={ngo.name}
              className="grid gap-4 rounded-xl border border-black/10 p-6 dark:border-white/15 md:grid-cols-[1fr_minmax(16rem,20rem)]"
            >
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">{ngo.name}</h2>
                <p className="mt-1 text-sm opacity-70">
                  Headquartered in {countryName(ngo.hqCountryCode)} · Operating in{" "}
                  {ngo.operatingCountryCodes.length}{" "}
                  {ngo.operatingCountryCodes.length === 1 ? "country" : "countries"}
                </p>
                <p className="mt-3 text-sm">{ngo.shortDescription}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/ngos/${ngo.id}/edit`}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
                  >
                    Edit profile
                  </Link>
                  <Link
                    href={`/ngos/${ngo.slug}`}
                    className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    Preview public profile
                  </Link>
                </div>
              </div>
              <NgoCompletenessCard completeness={computeProfileCompleteness(ngo)} />
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
