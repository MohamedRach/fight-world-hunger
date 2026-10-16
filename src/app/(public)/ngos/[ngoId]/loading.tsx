export default function NgoProfileLoading() {
  return (
    <main
      className="mx-auto w-full max-w-4xl flex-1 animate-pulse px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-label="Loading NGO profile"
    >
      <div className="flex gap-6">
        <div className="h-24 w-24 rounded-xl bg-black/10 dark:bg-white/10" />
        <div className="flex-1 space-y-3">
          <div className="h-8 w-1/2 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-1/3 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-2/3 rounded bg-black/10 dark:bg-white/10" />
        </div>
      </div>
      <div className="mt-8 space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-black/5 dark:bg-white/5" />
        ))}
      </div>
    </main>
  );
}
