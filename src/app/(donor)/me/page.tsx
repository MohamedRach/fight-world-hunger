import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import {
  computeIndividualCompleteness,
  getMyIndividualProfile,
} from "@/features/individuals/service";
import { IndividualProfileOverview } from "@/components/individuals/IndividualProfileOverview";
import { SignOutButton } from "@/components/sign-in/SignOutButton";

export const metadata: Metadata = {
  title: "My profile",
};

const primaryLink =
  "mt-6 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950";

export default async function MyProfilePage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">My profile</h1>
        <p className="mt-2 text-sm opacity-80">Sign in or create an individual account.</p>
        <Link href="/sign-in?as=individual" className={primaryLink}>
          Sign in as an individual
        </Link>
      </main>
    );
  }

  if (user.type === "NGO") {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">This is an NGO account</h1>
        <p className="mt-2 text-sm opacity-80">
          Individual profiles are for individual accounts. Manage your organization from the
          NGO dashboard.
        </p>
        <Link href="/dashboard" className={primaryLink}>
          Go to my NGO dashboard
        </Link>
      </main>
    );
  }

  const profile = await getMyIndividualProfile(user.id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/map" className="underline underline-offset-2 opacity-70 hover:opacity-100">
          ← Back to the map
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/donations"
            className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            My donations
          </Link>
          <span className="break-all opacity-70">{user.email}</span>
          <SignOutButton />
        </div>
      </div>

      {profile ? (
        <IndividualProfileOverview
          profile={profile}
          completeness={computeIndividualCompleteness(profile)}
        />
      ) : (
        <p className="rounded-xl border border-black/10 p-6 text-sm dark:border-white/15">
          Your profile couldn&apos;t be found.
        </p>
      )}
    </main>
  );
}
