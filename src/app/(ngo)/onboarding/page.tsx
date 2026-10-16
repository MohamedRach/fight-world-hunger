import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import { NgoOnboardingWizard } from "@/components/ngos/onboarding/NgoOnboardingWizard";

export const metadata: Metadata = {
  title: "Register your NGO",
  description: "Onboard your organization and create its public profile.",
};

export default async function NgoOnboardingPage() {
  const user = await getSessionUser();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      {user ? (
        <NgoOnboardingWizard />
      ) : (
        <section className="rounded-2xl border border-black/10 p-8 text-center dark:border-white/15">
          <h1 className="text-2xl font-bold tracking-tight">Register your NGO</h1>
          <p className="mx-auto mt-2 max-w-md text-sm opacity-80">
            You need to be signed in to register an organization. Sign in from the
            dashboard, then come back to start onboarding.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
          >
            Go to dashboard to sign in
          </Link>
        </section>
      )}
    </main>
  );
}
