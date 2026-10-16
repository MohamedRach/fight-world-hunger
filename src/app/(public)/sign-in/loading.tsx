export default function SignInLoading() {
  return (
    <main
      className="mx-auto w-full max-w-2xl flex-1 animate-pulse px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-label="Loading sign-in"
    >
      <div className="mt-10 h-9 w-48 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-4 w-80 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="h-28 rounded-xl bg-black/5 dark:bg-white/5" />
        <div className="h-28 rounded-xl bg-black/5 dark:bg-white/5" />
      </div>
    </main>
  );
}
