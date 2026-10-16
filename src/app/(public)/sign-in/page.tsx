import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import { SignInPanel, type SignInRole } from "@/components/sign-in/SignInPanel";
import { safeNextPath } from "@/components/sign-in/next-path";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in as an individual or as an NGO.",
};

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { as, next } = await props.searchParams;
  const initialRole: SignInRole = as === "ngo" ? "ngo" : "individual";
  const nextPath = safeNextPath(next);
  const user = await getSessionUser();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/map" className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100">
        ← Back to the map
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Welcome</h1>
      <p className="mt-2 opacity-80">
        Sign in to support NGOs fighting hunger, or to manage your organization.
      </p>

      <div className="mt-8">
        {process.env.NODE_ENV === "production" ? (
          <p className="rounded-xl border border-black/10 p-6 text-sm dark:border-white/15">
            Sign-in is not available yet. Please check back soon.
          </p>
        ) : (
          <SignInPanel
            initialRole={initialRole}
            currentUserId={user?.id ?? null}
            nextPath={nextPath}
          />
        )}
      </div>
    </main>
  );
}
