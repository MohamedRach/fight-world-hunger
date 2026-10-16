import type { ProfileCompleteness } from "@/features/ngos/service";

export function NgoCompletenessCard({
  completeness,
  missingIntro = "Add the following to help donors trust your organization:",
  completeMessage = "Your profile is complete. Great job!",
}: {
  completeness: ProfileCompleteness;
  missingIntro?: string;
  completeMessage?: string;
}) {
  const { percentage, missing } = completeness;
  return (
    <div className="rounded-xl border border-black/10 p-5 dark:border-white/15">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-semibold">Profile completeness</h3>
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
        className="mt-2 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
      >
        <div
          className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {missing.length > 0 ? (
        <div className="mt-3">
          <p className="text-sm opacity-70">{missingIntro}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
            {missing.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
          {completeMessage}
        </p>
      )}
    </div>
  );
}
