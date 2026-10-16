export default function NewDonationLoading() {
  return (
    <main
      className="mx-auto w-full max-w-3xl flex-1 animate-pulse px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-label="Loading donation form"
    >
      <div className="h-4 w-32 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-4 h-8 w-64 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-2 h-4 w-80 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-8 h-64 rounded-xl bg-black/5 dark:bg-white/5" />
    </main>
  );
}
