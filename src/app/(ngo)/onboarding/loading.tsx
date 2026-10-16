export default function OnboardingLoading() {
  return (
    <main
      className="mx-auto w-full max-w-4xl flex-1 animate-pulse px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-label="Loading onboarding"
    >
      <div className="h-4 w-32 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-10 w-2/3 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-4 w-1/2 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="h-40 rounded-xl bg-black/5 dark:bg-white/5" />
        <div className="h-40 rounded-xl bg-black/5 dark:bg-white/5" />
      </div>
    </main>
  );
}
