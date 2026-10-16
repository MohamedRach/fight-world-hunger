import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { canManageNgo, getPublicNgoProfile } from "@/features/ngos/service";
import { listDonations } from "@/features/donations/service";
import { DONATION_LIST_MAX_LIMIT } from "@/features/donations/validation";
import {
  DONATION_STATUSES,
  DONATION_STATUS_LABELS,
  type DonationStatus,
} from "@/features/donations/types";
import { DonationList } from "@/components/donations/DonationList";
import { DonationStatusFilter } from "@/components/donations/DonationStatusFilter";

export const metadata: Metadata = {
  title: "Donations received",
};

function parseStatus(value: string | string[] | undefined): DonationStatus | undefined {
  return DONATION_STATUSES.find((status) => status === value);
}

export default async function NgoDonationsPage(
  props: PageProps<"/dashboard/ngos/[ngoId]/donations">,
) {
  // Per-user page: render at request time (the session lookup reads the clock).
  await connection();
  const [{ ngoId }, { status: statusParam }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const ngo = await getPublicNgoProfile(decodeURIComponent(ngoId));
  if (!ngo) notFound();

  const status = parseStatus(statusParam);
  const user = await getSessionUser();
  const authorized = user?.type === "NGO" && (await canManageNgo(user.id, ngo.id));
  const result =
    user && authorized
      ? await listDonations(user, { ngoId: ngo.id, status, limit: DONATION_LIST_MAX_LIMIT })
      : null;
  const basePath = `/dashboard/ngos/${ngo.id}/donations`;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Donations to {ngo.name}</h1>
      <p className="mt-1 text-sm opacity-70">
        Confirm new pledges and keep donors informed as you put their donations to use.
      </p>

      {!result ? (
        <p className="mt-8 rounded-xl border border-red-600/30 bg-red-600/5 p-6 text-sm text-red-700 dark:text-red-300">
          {user
            ? "You are not authorized to view this NGO's donations."
            : "You must be signed in to view an NGO's donations."}{" "}
          <Link href={user ? "/dashboard" : "/sign-in?as=ngo"} className="underline underline-offset-2">
            {user ? "Return to the dashboard." : "Sign in as an NGO."}
          </Link>
        </p>
      ) : (
        <>
          <div className="mt-6">
            <DonationStatusFilter basePath={basePath} current={status} />
          </div>

          {result.items.length === 0 ? (
            <div className="mt-6 rounded-xl border border-black/10 p-6 dark:border-white/15">
              <h2 className="font-semibold">
                {status
                  ? `No ${DONATION_STATUS_LABELS[status].toLowerCase()} donations`
                  : "No donations yet"}
              </h2>
              <p className="mt-1 text-sm opacity-70">
                {status
                  ? "No donation currently has this status."
                  : "When individuals support your organization, their donations will appear here."}
              </p>
              {!status && (
                <Link
                  href={`/ngos/${ngo.slug}`}
                  className="mt-4 inline-block rounded-full border border-black/15 px-5 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Preview public profile
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <DonationList donations={result.items} perspective="NGO" />
              {result.total > result.items.length && (
                <p className="mt-3 text-sm opacity-70">
                  Showing the {result.items.length} most recent donations out of {result.total}.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
