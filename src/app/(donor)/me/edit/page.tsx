import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import { getMyIndividualProfile } from "@/features/individuals/service";
import { IndividualProfileEditForm } from "@/components/individuals/IndividualProfileEditForm";

export const metadata: Metadata = {
  title: "Edit my profile",
};

export default async function EditMyProfilePage() {
  const user = await getSessionUser();
  const profile = await getMyIndividualProfile(user?.id ?? null);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/me" className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100">
        ← Back to my profile
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Edit my profile</h1>

      {profile ? (
        <div className="mt-8">
          <IndividualProfileEditForm profile={profile} />
        </div>
      ) : (
        <p className="mt-8 rounded-xl border border-black/10 p-6 text-sm dark:border-white/15">
          {user ? "You don't have a profile yet. " : "You need to be signed in. "}
          <Link
            href={user ? "/me" : "/sign-in?as=individual"}
            className="underline underline-offset-2"
          >
            {user ? "Create your profile" : "Sign in"}
          </Link>
        </p>
      )}
    </main>
  );
}
