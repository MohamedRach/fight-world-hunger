import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import { NgoProfileForm } from "@/components/ngos/NgoProfileForm";

export const metadata: Metadata = {
  title: "Create NGO profile",
};

export default async function NewNgoPage() {
  const user = await getSessionUser();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Create your NGO profile</h1>
      <p className="mt-1 text-sm opacity-70">
        Tell donors who you are, where you work, and the impact you make.
      </p>

      {!user ? (
        <p className="mt-8 rounded-xl border border-black/10 p-6 text-sm opacity-80 dark:border-white/15">
          You must be signed in to create an NGO profile. Go back to the{" "}
          <Link href="/dashboard" className="underline underline-offset-2">
            dashboard
          </Link>{" "}
          to sign in.
        </p>
      ) : (
        <div className="mt-8">
          <NgoProfileForm mode="create" />
        </div>
      )}
    </main>
  );
}
