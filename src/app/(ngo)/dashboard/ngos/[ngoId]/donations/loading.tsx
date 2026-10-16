export default function NgoDonationsLoading() {
  return (
    <main
      className="mx-auto w-full max-w-4xl flex-1 animate-pulse px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-label="Loading donations"
    >
      <div className="h-4 w-36 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-4 h-8 w-64 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-6 h-7 w-96 max-w-full rounded-full bg-black/5 dark:bg-white/5" />
      <div className="mt-6 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-black/5 dark:bg-white/5" />
        ))}
      </div>
    </main>
  );
}
