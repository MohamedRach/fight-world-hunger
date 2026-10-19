import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/features/ngos/session";
import { getMyPaymentMethods } from "@/features/payments/service";
import { PaymentMethodsManager } from "@/components/payments/PaymentMethodsManager";

export const metadata: Metadata = {
  title: "My payment methods",
  description: "Manage the mock cards used for simulated donations.",
};

const primaryLink =
  "mt-6 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950";

export default async function PaymentMethodsPage() {
  // Per-user, mutable mock data: render at request time, never prerender.
  await connection();
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">My payment methods</h1>
        <p className="mt-2 text-sm opacity-80">
          Sign in as an individual to manage your mock cards.
        </p>
        <Link href="/sign-in?as=individual" className={primaryLink}>
          Sign in as an individual
        </Link>
      </main>
    );
  }

  if (user.type === "NGO") {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">This is an NGO account</h1>
        <p className="mt-2 text-sm opacity-80">
          Saved cards belong to individual accounts. NGO accounts receive donations instead.
        </p>
        <Link href="/dashboard" className={primaryLink}>
          Go to my NGO dashboard
        </Link>
      </main>
    );
  }

  const methods = await getMyPaymentMethods(user.id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/me" className="underline underline-offset-2 opacity-70 hover:opacity-100">
          ← Back to my profile
        </Link>
        <Link
          href="/me/donations"
          className="underline underline-offset-2 opacity-70 hover:opacity-100"
        >
          My donations
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">My payment methods</h1>
      <p className="mt-1 text-sm opacity-70">
        Cards used by the simulated donation flow.
      </p>

      <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
        <strong className="font-semibold">These are mock cards.</strong> This build never
        processes payments. Only a brand, the last four digits, a holder name, an expiry and a
        label are stored — never a full card number or a CVV. Do not enter real card details.
      </p>

      <div className="mt-8">
        <PaymentMethodsManager initialMethods={methods} />
      </div>
    </main>
  );
}
