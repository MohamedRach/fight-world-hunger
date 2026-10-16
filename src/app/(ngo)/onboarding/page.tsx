import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import { isCountryCode } from "@/features/ngos/countries";
import { NgoOnboardingWizard } from "@/components/ngos/onboarding/NgoOnboardingWizard";
import { SignOutButton } from "@/components/sign-in/SignOutButton";

export const metadata: Metadata = {
  title: "Register your NGO",
  description: "Create your NGO account and your organization's public profile.",
};

export default async function NgoOnboardingPage(props: PageProps<"/onboarding">) {
  const { country } = await props.searchParams;
  const requestedCountry = typeof country === "string" ? country.trim().toUpperCase() : "";
  const initialCountryCode = isCountryCode(requestedCountry) ? requestedCountry : undefined;

  const user = await getSessionUser();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/map" className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100">
        ← Back to the map
      </Link>
      <div className="mt-6">
        {user?.type === "INDIVIDUAL" ? (
          <section className="rounded-2xl border border-black/10 p-8 text-center dark:border-white/15">
            <h1 className="text-2xl font-bold tracking-tight">This is an individual account</h1>
            <p className="mx-auto mt-2 max-w-md text-sm opacity-80">
              You&apos;re signed in as <strong className="break-all">{user.email}</strong>.
              Individual and NGO accounts are separate: sign out to register an NGO.
            </p>
            <div className="mt-6 flex justify-center">
              <SignOutButton redirectTo={null} />
            </div>
          </section>
        ) : (
          // Not signed in: the onboarding creates the NGO account too.
          <NgoOnboardingWizard initialCountryCode={initialCountryCode} requireAccount={!user} />
        )}
      </div>
    </main>
  );
}
