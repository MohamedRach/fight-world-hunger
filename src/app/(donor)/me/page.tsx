import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import {
  computeIndividualCompleteness,
  getMyIndividualProfile,
} from "@/features/individuals/service";
import { getManagedNgos } from "@/features/ngos/service";
import { IndividualOnboardingWizard } from "@/components/individuals/IndividualOnboardingWizard";
import { IndividualProfileOverview } from "@/components/individuals/IndividualProfileOverview";
import { SignOutButton } from "@/components/sign-in/SignOutButton";

export const metadata: Metadata = {
  title: "My profile",
};

export default async function MyProfilePage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">My profile</h1>
        <p className="mt-2 text-sm opacity-80">Sign in to create or view your profile.</p>
        <Link
          href="/sign-in?as=individual"
          className="mt-6 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
        >
          Sign in as an individual
        </Link>
      </main>
    );
  }

  const [profile, managedNgos] = await Promise.all([
    getMyIndividualProfile(user.id),
    getManagedNgos(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/map" className="underline underline-offset-2 opacity-70 hover:opacity-100">
          ← Back to the map
        </Link>
        <div className="flex items-center gap-3">
          <span className="break-all opacity-70">{user.id}</span>
          <SignOutButton />
        </div>
      </div>

      {profile ? (
        <IndividualProfileOverview
          profile={profile}
          completeness={computeIndividualCompleteness(profile)}
        />
      ) : (
        <IndividualOnboardingWizard initialEmail={user.id.includes("@") ? user.id : undefined} />
      )}

      <aside className="mt-10 rounded-xl border border-black/10 p-5 text-sm dark:border-white/15">
        <h2 className="font-semibold">Do you also represent an NGO?</h2>
        <p className="mt-1 opacity-70">
          {managedNgos.length > 0
            ? `You manage ${managedNgos.length} ${managedNgos.length === 1 ? "organization" : "organizations"} with this account.`
            : "Use the same account to register your organization."}
        </p>
        <Link
          href={managedNgos.length > 0 ? "/dashboard" : "/onboarding"}
          className="mt-3 inline-block rounded-full border border-black/15 px-4 py-1.5 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          {managedNgos.length > 0 ? "Go to my NGO dashboard" : "Register an NGO"}
        </Link>
      </aside>
    </main>
  );
}
