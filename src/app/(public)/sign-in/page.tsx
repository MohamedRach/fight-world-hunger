import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/features/ngos/session";
import { SignInPanel, type SignInRole } from "@/components/sign-in/SignInPanel";
import { safeNextPath } from "@/components/sign-in/next-path";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in as an individual or as an NGO.",
};

const COPY: Record<
  SignInRole,
  { eyebrow: string; title: string; intro: string; switchText: string; switchLink: string; other: SignInRole }
> = {
  ngo: {
    eyebrow: "For organizations",
    title: "Sign in as an NGO",
    intro: "Manage your organization's profile and appear on the hunger map so donors can find you.",
    switchText: "Not an organization?",
    switchLink: "Sign in as an individual",
    other: "individual",
  },
  individual: {
    eyebrow: "For individuals",
    title: "Sign in as an individual",
    intro: "Discover NGOs fighting hunger, follow the causes you care about, and support them.",
    switchText: "Representing an organization?",
    switchLink: "Sign in as an NGO",
    other: "ngo",
  },
};

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { as, next } = await props.searchParams;
  const role: SignInRole = as === "ngo" ? "ngo" : "individual";
  const nextPath = safeNextPath(next);
  const copy = COPY[role];
  const user = await getSessionUser();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/map" className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100">
        ← Back to the map
      </Link>

      <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        {copy.eyebrow}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{copy.title}</h1>
      <p className="mt-2 opacity-80">{copy.intro}</p>

      <div className="mt-8">
        {/* `key` resets the panel's state when switching between the two pages. */}
        <SignInPanel
          key={role}
          role={role}
          currentAccount={user ? { email: user.email, type: user.type } : null}
          nextPath={nextPath}
        />
      </div>

      <p className="mt-8 border-t border-black/10 pt-6 text-sm dark:border-white/15">
        {copy.switchText}{" "}
        <Link
          href={`/sign-in?as=${copy.other}`}
          className="font-medium text-emerald-700 underline underline-offset-2 dark:text-emerald-400"
        >
          {copy.switchLink} →
        </Link>
      </p>
    </main>
  );
}
