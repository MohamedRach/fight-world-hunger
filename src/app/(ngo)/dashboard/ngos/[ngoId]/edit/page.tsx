import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/features/ngos/session";
import { canManageNgo, getPublicNgoProfile } from "@/features/ngos/service";
import { NgoProfileForm } from "@/components/ngos/NgoProfileForm";

export const metadata: Metadata = {
  title: "Edit NGO profile",
};

export default async function EditNgoPage(
  props: PageProps<"/dashboard/ngos/[ngoId]/edit">,
) {
  const { ngoId } = await props.params;
  const ngo = await getPublicNgoProfile(decodeURIComponent(ngoId));
  if (!ngo) notFound();

  const user = await getSessionUser();
  const authorized = await canManageNgo(user?.id ?? null, ngo.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Edit {ngo.name}</h1>

      {!authorized ? (
        <p className="mt-8 rounded-xl border border-red-600/30 bg-red-600/5 p-6 text-sm text-red-700 dark:text-red-300">
          {user
            ? "You are not authorized to manage this NGO's profile."
            : "You must be signed in to edit an NGO profile."}{" "}
          <Link href="/dashboard" className="underline underline-offset-2">
            Return to the dashboard.
          </Link>
        </p>
      ) : (
        <div className="mt-8">
          <NgoProfileForm mode="edit" initial={ngo} />
        </div>
      )}
    </main>
  );
}
