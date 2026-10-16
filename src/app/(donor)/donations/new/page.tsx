import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { getPublicNgoProfile } from "@/features/ngos/service";
import { getMyIndividualProfile } from "@/features/individuals/service";
import { DonationForm } from "@/components/donations/DonationForm";

export const metadata: Metadata = {
  title: "Make a donation",
};

const primaryLink =
  "mt-4 inline-block rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950";
const panel = "mt-8 rounded-xl border border-black/10 p-6 dark:border-white/15";

export default async function NewDonationPage(props: PageProps<"/donations/new">) {
  // Per-user page: render at request time (the session lookup reads the clock).
  await connection();
  const { ngo: ngoParam } = await props.searchParams;
  const ngoId = typeof ngoParam === "string" ? ngoParam.trim() : "";
  const ngo = ngoId ? await getPublicNgoProfile(ngoId) : null;
  const user = await getSessionUser();

  if (!ngo) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <Link href="/map" className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100">
          ← Back to the map
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Make a donation</h1>
        <div className={panel}>
          <h2 className="font-semibold">Choose an NGO first</h2>
          <p className="mt-1 text-sm opacity-70">
            {ngoId
              ? "We couldn't find this organization. It may have been removed."
              : "Find an organization on the map, open its profile, and choose “Support this NGO”."}
          </p>
          <Link href="/map" className={primaryLink}>
            Explore NGOs on the map
          </Link>
        </div>
      </main>
    );
  }

  const nextPath = `/donations/new?ngo=${encodeURIComponent(ngo.slug)}`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link
        href={`/ngos/${ngo.slug}`}
        className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100"
      >
        ← Back to {ngo.name}
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Support {ngo.name}</h1>
      <p className="mt-1 text-sm opacity-70">{ngo.shortDescription}</p>

      {!user ? (
        <div className={panel}>
          <h2 className="font-semibold">Sign in to donate</h2>
          <p className="mt-1 text-sm opacity-70">
            Donations are made from an individual account so you can follow their progress.
          </p>
          <Link
            href={`/sign-in?as=individual&next=${encodeURIComponent(nextPath)}`}
            className={primaryLink}
          >
            Sign in as an individual
          </Link>
        </div>
      ) : user.type === "NGO" ? (
        <div className={panel}>
          <h2 className="font-semibold">This is an NGO account</h2>
          <p className="mt-1 text-sm opacity-70">
            Donations are made from individual accounts. Individual and NGO accounts are separate.
          </p>
          <Link href="/dashboard" className={primaryLink}>
            Go to my NGO dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <DonationForm
            ngo={{ id: ngo.id, slug: ngo.slug, name: ngo.name }}
            defaultAnonymous={(await getMyIndividualProfile(user.id))?.donateAnonymously ?? false}
          />
        </div>
      )}
    </main>
  );
}
