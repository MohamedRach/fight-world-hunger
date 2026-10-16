export default function EditNgoLoading() {
  return (
    <main
      className="mx-auto w-full max-w-3xl flex-1 animate-pulse px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-label="Loading form"
    >
      <div className="h-8 w-72 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-8 space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 rounded-xl bg-black/5 dark:bg-white/5" />
        ))}
      </div>
    </main>
  );
}
