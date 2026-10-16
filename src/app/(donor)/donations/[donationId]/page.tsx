import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { DonationServiceError, getDonation } from "@/features/donations/service";
import { formatDonationAmount, formatDonationDateTime } from "@/features/donations/format";
import { DONATION_STATUS_LABELS, type DonationDetail } from "@/features/donations/types";
import { NgoSection } from "@/components/ngos/NgoSection";
import { DonationStatusBadge } from "@/components/donations/DonationStatusBadge";
import { DonationProgress } from "@/components/donations/DonationProgress";
import { DonationTimeline } from "@/components/donations/DonationTimeline";
import { DonationStatusUpdateForm } from "@/components/donations/DonationStatusUpdateForm";

export const metadata: Metadata = {
  title: "Donation tracking",
};

const primaryLink =
  "inline-block rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950";
const secondaryLink =
  "inline-block rounded-full border border-black/15 px-5 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";

async function loadDonation(
  user: Awaited<ReturnType<typeof getSessionUser>>,
  donationId: string,
): Promise<DonationDetail> {
  try {
    return await getDonation(user, donationId);
  } catch (error) {
    if (error instanceof DonationServiceError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export default async function DonationTrackingPage(props: PageProps<"/donations/[donationId]">) {
  // Per-user page: render at request time (the session lookup reads the clock).
  await connection();
  const [{ donationId }, { created }] = await Promise.all([props.params, props.searchParams]);
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Track a donation</h1>
        <p className="mt-2 text-sm opacity-80">
          Sign in with the account that made or received this donation.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/sign-in?as=individual" className={primaryLink}>
            Sign in as an individual
          </Link>
          <Link href="/sign-in?as=ngo" className={secondaryLink}>
            Sign in as an NGO
          </Link>
        </div>
      </main>
    );
  }

  const donation = await loadDonation(user, decodeURIComponent(donationId));
  const isNgo = donation.viewerRole === "NGO";
  const backHref = isNgo ? `/dashboard/ngos/${donation.ngo.id}/donations` : "/donations";
  const lastUpdate = donation.history.at(-1);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <Link
        href={backHref}
        className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100"
      >
        ← {isNgo ? `Back to ${donation.ngo.name}'s donations` : "Back to my donations"}
      </Link>

      {created === "1" && !isNgo && (
        <p
          role="status"
          className="mt-6 rounded-lg border border-emerald-600/40 bg-emerald-600/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          Thank you! Your donation to {donation.ngo.name} has been recorded. You can follow its
          progress on this page.
        </p>
      )}

      <header className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm opacity-70">
            {isNgo ? (
              <>From {donation.donorName ?? "an anonymous donor"}</>
            ) : (
              <>
                To{" "}
                <Link
                  href={`/ngos/${donation.ngo.slug}`}
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  {donation.ngo.name}
                </Link>
                {donation.isAnonymous ? " · anonymously" : ""}
              </>
            )}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
            {formatDonationAmount(donation.amount, donation.currency)}
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Pledged{" "}
            <time dateTime={donation.createdAt}>{formatDonationDateTime(donation.createdAt)}</time>
          </p>
        </div>
        <div className="self-start">
          <DonationStatusBadge status={donation.status} />
        </div>
      </header>

      <div
        className={`mt-8 grid gap-6 ${isNgo ? "md:grid-cols-[1fr_minmax(16rem,22rem)]" : ""}`}
      >
        <div className="grid content-start gap-6">
          <NgoSection title="Progress">
            <DonationProgress status={donation.status} />
          </NgoSection>

          {donation.message && (
            <NgoSection title={isNgo ? "Message from the donor" : "Your message"}>
              <p className="whitespace-pre-line">{donation.message}</p>
            </NgoSection>
          )}

          <NgoSection title="Timeline">
            <DonationTimeline history={donation.history} ngoName={donation.ngo.name} />
          </NgoSection>
        </div>

        {isNgo && (
          <aside className="self-start rounded-xl border border-black/10 p-5 dark:border-white/15">
            <h2 className="font-semibold">Update status</h2>
            {donation.allowedNextStatuses.length > 0 ? (
              <>
                <p className="mt-1 mb-4 text-sm opacity-70">
                  Keep the donor informed. Each change is added to the timeline.
                </p>
                <DonationStatusUpdateForm
                  donationId={donation.id}
                  allowedNextStatuses={donation.allowedNextStatuses}
                />
              </>
            ) : (
              <p className="mt-1 text-sm opacity-70">
                This donation is {DONATION_STATUS_LABELS[donation.status].toLowerCase()}. Its
                status can no longer change
                {lastUpdate ? (
                  <>
                    {" "}
                    (last updated{" "}
                    <time dateTime={lastUpdate.createdAt}>
                      {formatDonationDateTime(lastUpdate.createdAt)}
                    </time>
                    )
                  </>
                ) : null}
                .
              </p>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}
