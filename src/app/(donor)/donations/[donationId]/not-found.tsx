import Link from "next/link";

export default function DonationNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Donation not found</h1>
      <p className="mt-2 max-w-md opacity-70">
        This donation doesn&apos;t exist, or it isn&apos;t linked to the account you&apos;re
        signed in with.
      </p>
      <Link
        href="/donations"
        className="mt-6 rounded-full border border-black/15 px-5 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
      >
        Go to my donations
      </Link>
    </main>
  );
}
