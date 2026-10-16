export default function SignUpLoading() {
  return (
    <main
      className="mx-auto w-full max-w-4xl flex-1 animate-pulse px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-label="Loading sign-up"
    >
      <div className="mt-6 h-8 w-64 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-6 h-10 rounded bg-black/5 dark:bg-white/5" />
      <div className="mt-8 h-72 rounded-2xl bg-black/5 dark:bg-white/5" />
    </main>
  );
}
