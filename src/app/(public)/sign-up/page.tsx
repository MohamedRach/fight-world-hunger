import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import { IndividualSignUpWizard } from "@/components/individuals/IndividualSignUpWizard";
import { SignOutButton } from "@/components/sign-in/SignOutButton";

export const metadata: Metadata = {
  title: "Create an individual account",
  description: "Create your account to discover and support NGOs fighting hunger.",
};

export default async function SignUpPage() {
  const user = await getSessionUser();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/map" className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100">
        ← Back to the map
      </Link>
      <div className="mt-6">
        {user ? (
          <section className="rounded-2xl border border-black/10 p-8 text-center dark:border-white/15">
            <h1 className="text-2xl font-bold tracking-tight">You&apos;re already signed in</h1>
            <p className="mt-2 text-sm opacity-80">
              Signed in as <strong className="break-all">{user.email}</strong> (
              {user.type === "NGO" ? "NGO account" : "individual account"}). Sign out to
              create a new individual account.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={user.type === "NGO" ? "/dashboard" : "/me"}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
              >
                {user.type === "NGO" ? "Go to my NGO dashboard" : "Go to my profile"}
              </Link>
              <SignOutButton />
            </div>
          </section>
        ) : (
          <IndividualSignUpWizard />
        )}
      </div>
    </main>
  );
}
