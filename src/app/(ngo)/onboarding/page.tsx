import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import { countryName, isCountryCode } from "@/features/ngos/countries";
import { NgoOnboardingWizard } from "@/components/ngos/onboarding/NgoOnboardingWizard";


export const metadata: Metadata = {
  title: "Register your NGO",
  description: "Onboard your organization and create its public profile.",
};

export default async function NgoOnboardingPage(props: PageProps<"/onboarding">) {
  const { country } = await props.searchParams;
  const requestedCountry = typeof country === "string" ? country.trim().toUpperCase() : "";
  const initialCountryCode = isCountryCode(requestedCountry) ? requestedCountry : undefined;

  const user = await getSessionUser();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <Link
        href="/map"
        className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100"
      >
        ← Back to the map
      </Link>
      <div className="mt-6">
        {user ? (
          <NgoOnboardingWizard initialCountryCode={initialCountryCode} />
        ) : (
          <section className="rounded-2xl border border-black/10 p-8 dark:border-white/15">
            <h1 className="text-2xl font-bold tracking-tight">
              Register your NGO
              {initialCountryCode ? ` working in ${countryName(initialCountryCode)}` : ""}
            </h1>
            <p className="mt-2 max-w-xl text-sm opacity-80">
              You need to be signed in to register an organization.
            </p>
            <Link
              href={`/sign-in?as=ngo&next=${encodeURIComponent(
                initialCountryCode ? `/onboarding?country=${initialCountryCode}` : "/onboarding",
              )}`}
              className="mt-6 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
            >
              Sign in as an NGO
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
