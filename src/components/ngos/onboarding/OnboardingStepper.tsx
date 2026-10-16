"use client";

/** Progress indicator. `current` is an index into `labels`. */
export function OnboardingStepper({
  labels,
  current,
  onSelect,
}: {
  labels: string[];
  current: number;
  /** Called with a step index; only offered for steps before `current`. */
  onSelect: (index: number) => void;
}) {
  return (
    <nav aria-label="Onboarding progress">
      <p className="text-sm font-medium sm:hidden">
        Step {current + 1} of {labels.length}: {labels[current]}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 sm:hidden dark:bg-white/10"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] dark:bg-emerald-400"
          style={{ width: `${((current + 1) / labels.length) * 100}%` }}
        />
      </div>

      <ol className="hidden gap-2 sm:flex">
        {labels.map((label, index) => {
          const done = index < current;
          const active = index === current;
          const circle = (
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? "bg-emerald-600 text-white dark:bg-emerald-400 dark:text-emerald-950"
                  : done
                    ? "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200"
                    : "bg-black/5 opacity-60 dark:bg-white/10"
              }`}
            >
              {done ? <span aria-hidden="true">✓</span> : index + 1}
            </span>
          );
          return (
            <li key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div
                className={`h-1 rounded-full ${
                  index <= current ? "bg-emerald-600 dark:bg-emerald-400" : "bg-black/10 dark:bg-white/10"
                }`}
                aria-hidden="true"
              />
              {done ? (
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  className="flex items-center gap-2 rounded text-left text-xs hover:underline"
                >
                  {circle}
                  <span className="truncate">{label}</span>
                  <span className="sr-only">(completed, go back to this step)</span>
                </button>
              ) : (
                <span
                  className="flex items-center gap-2 text-xs"
                  aria-current={active ? "step" : undefined}
                >
                  {circle}
                  <span className={`truncate ${active ? "font-semibold" : "opacity-60"}`}>
                    {label}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
