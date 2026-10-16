import Link from "next/link";

export default function NgoNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">NGO not found</h1>
      <p className="mt-2 max-w-md opacity-70">
        The organization you are looking for does not exist or may have been
        removed.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full border border-black/15 px-5 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
      >
        Back to home
      </Link>
    </main>
  );
}
