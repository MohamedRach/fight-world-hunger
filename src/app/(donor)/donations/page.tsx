import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { listDonations } from "@/features/donations/service";
import { DONATION_LIST_MAX_LIMIT } from "@/features/donations/validation";
import {
  DONATION_STATUSES,
  DONATION_STATUS_LABELS,
  type DonationStatus,
} from "@/features/donations/types";
import { DonationList } from "@/components/donations/DonationList";
import { DonationStatusFilter } from "@/components/donations/DonationStatusFilter";
import { SignOutButton } from "@/components/sign-in/SignOutButton";

export const metadata: Metadata = {
  title: "My donations",
};

const primaryLink =
  "mt-4 inline-block rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950";

function parseStatus(value: string | string[] | undefined): DonationStatus | undefined {
  return DONATION_STATUSES.find((status) => status === value);
}

export default async function MyDonationsPage(props: PageProps<"/donations">) {
  // Per-user page: render at request time (the session lookup reads the clock).
  await connection();
  const { status: statusParam } = await props.searchParams;
  const status = parseStatus(statusParam);
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">My donations</h1>
        <p className="mt-2 text-sm opacity-80">Sign in to see and track your donations.</p>
        <Link href="/sign-in?as=individual&next=%2Fdonations" className={`mt-6 ${primaryLink}`}>
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
          Donation history is for individual accounts. See the donations your organization
          received from the NGO dashboard.
        </p>
        <Link href="/dashboard" className={`mt-6 ${primaryLink}`}>
          Go to my NGO dashboard
        </Link>
      </main>
    );
  }

  const { items, total } = await listDonations(user, {
    status,
    limit: DONATION_LIST_MAX_LIMIT,
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/me" className="underline underline-offset-2 opacity-70 hover:opacity-100">
          ← Back to my profile
        </Link>
        <div className="flex items-center gap-3">
          <span className="break-all opacity-70">{user.email}</span>
          <SignOutButton />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">My donations</h1>
        <p className="mt-1 text-sm opacity-70">
          Follow the progress of every donation you&apos;ve made.
        </p>
      </div>

      <div className="mt-6">
        <DonationStatusFilter basePath="/donations" current={status} />
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-black/10 p-6 dark:border-white/15">
          {status ? (
            <>
              <h2 className="font-semibold">
                No {DONATION_STATUS_LABELS[status].toLowerCase()} donations
              </h2>
              <p className="mt-1 text-sm opacity-70">
                None of your donations currently have this status.
              </p>
              <Link
                href="/donations"
                className="mt-4 inline-block rounded-full border border-black/15 px-5 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Show all donations
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-semibold">No donations yet</h2>
              <p className="mt-1 text-sm opacity-70">
                Find an organization fighting hunger on the map and support its work.
              </p>
              <Link href="/map" className={primaryLink}>
                Explore NGOs on the map
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <DonationList donations={items} perspective="DONOR" />
          {total > items.length && (
            <p className="mt-3 text-sm opacity-70">
              Showing your {items.length} most recent donations out of {total}.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
