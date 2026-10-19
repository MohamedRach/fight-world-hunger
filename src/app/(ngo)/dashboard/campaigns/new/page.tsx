import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { getManagedNgos } from "@/features/ngos/service";
import { CampaignCreateForm } from "@/components/campaigns/CampaignCreateForm";

export const metadata: Metadata = {
  title: "New campaign",
  description: "Create a fundraising campaign for your organization.",
};

const primaryLink =
  "mt-6 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950";

export default async function NewCampaignPage() {
  // Per-user, mutable mock data: render at request time, never prerender.
  await connection();
  const user = await getSessionUser();

  if (!user || user.type !== "NGO") {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">New campaign</h1>
        <p className="mt-2 text-sm opacity-80">
          Campaigns are created by NGO accounts from their dashboard.
        </p>
        <Link href="/sign-in?as=ngo" className={primaryLink}>
          Sign in as an NGO
        </Link>
      </main>
    );
  }

  const ngos = await getManagedNgos(user.id);

  if (ngos.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Create your organization first</h1>
        <p className="mt-2 text-sm opacity-80">
          A campaign always belongs to an organization. Create your NGO profile, then come back.
        </p>
        <Link href="/onboarding" className={primaryLink}>
          Create NGO profile
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 text-sm">
        <Link
          href="/dashboard"
          className="underline underline-offset-2 opacity-70 hover:opacity-100"
        >
          ← Back to the dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">New campaign</h1>
      <p className="mt-1 text-sm opacity-70">
        Tell donors what you are raising for and which countries the campaign serves.
      </p>

      <div className="mt-8">
        <CampaignCreateForm
          ngos={ngos.map((ngo) => ({
            id: ngo.id,
            name: ngo.name,
            operatingCountryCodes: ngo.operatingCountryCodes,
          }))}
        />
      </div>
    </main>
  );
}
