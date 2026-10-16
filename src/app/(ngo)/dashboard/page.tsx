import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import { computeProfileCompleteness, getManagedNgos } from "@/features/ngos/service";
import { NgoCompletenessCard } from "@/components/ngos/NgoCompletenessCard";
import { SignOutButton } from "@/components/sign-in/SignOutButton";
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/map" className="underline underline-offset-2 opacity-70 hover:opacity-100">
          ← Back to the map
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <span className="break-all opacity-70">{user.email}</span>
            <SignOutButton />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NGO dashboard</h1>
          <p className="mt-1 text-sm opacity-70">
            Manage your organization&apos;s public profile.
          </p>
        </div>
        {user?.type === "NGO" && (
          <Link
            href="/onboarding"
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
          >
            Create NGO profile
          </Link>
        )}
      </div>

      {!user ? (
        <div className="mt-8 rounded-xl border border-black/10 p-6 dark:border-white/15">
          <p className="text-sm opacity-80">Sign in to manage your NGO&apos;s profile.</p>
          <Link
            href="/sign-in?as=ngo"
            className="mt-4 inline-block rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
          >
            Sign in as an NGO
          </Link>
        </div>
      ) : user.type === "INDIVIDUAL" ? (
        <div className="mt-8 rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="font-semibold">This is an individual account</h2>
          <p className="mt-1 text-sm opacity-70">
            The NGO dashboard is for NGO accounts. Individual and NGO accounts are separate.
          </p>
          <Link
            href="/me"
            className="mt-4 inline-block rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
          >
            Go to my profile
          </Link>
        </div>
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
