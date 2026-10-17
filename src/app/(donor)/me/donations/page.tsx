import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { getMyDonations } from "@/features/donations/service";
import { MyDonationsList } from "@/components/donations/MyDonationsList";

export const metadata: Metadata = {
  title: "My donations",
  description: "Track the progress of your simulated donations.",
};

const primaryLink =
  "mt-6 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950";

export default async function MyDonationsPage() {
  // Per-user, mutable mock data: render at request time, never prerender.
  await connection();
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">My donations</h1>
        <p className="mt-2 text-sm opacity-80">Sign in as an individual to track your donations.</p>
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
          Donation history belongs to individual accounts. Your organization&apos;s received
          donations are on the campaign pages in your dashboard.
        </p>
        <Link href="/dashboard" className={primaryLink}>
          Go to my NGO dashboard
        </Link>
      </main>
    );
  }

  const donations = await getMyDonations(user.id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/me" className="underline underline-offset-2 opacity-70 hover:opacity-100">
          ← Back to my profile
        </Link>
        <Link
          href="/me/payment-methods"
          className="underline underline-offset-2 opacity-70 hover:opacity-100"
        >
          My payment methods
        </Link>
        <Link href="/map" className="underline underline-offset-2 opacity-70 hover:opacity-100">
          Find a campaign
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">My donations</h1>
      <p className="mt-1 text-sm opacity-70">
        Every donation you have pledged, and what the organization reports about it.
      </p>

      <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
        <strong className="font-semibold">Simulated donations.</strong> No payment was taken and
        no money moved. Statuses describe what the organization reports about the work, not a
        financial settlement.
      </p>

      <div className="mt-8">
        <MyDonationsList initialDonations={donations} />
      </div>
    </main>
  );
}
