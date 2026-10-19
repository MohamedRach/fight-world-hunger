"use client";

import { HUNGER_ISSUES } from "@/features/hunger-issues/catalog";

interface HungerIssuePickerProps {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Caps the selection, e.g. so a campaign stays focused. */
  max?: number;
}

/**
 * Selectable chips for the shared world hunger taxonomy.
 *
 * Used by individual onboarding (interests), NGO onboarding (focus areas) and
 * campaign creation (issue tags), so the three always speak the same language.
 */
export function HungerIssuePicker({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required,
  max,
}: HungerIssuePickerProps) {
  const selected = new Set(value);
  const atLimit = max !== undefined && value.length >= max;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  function toggle(issueId: string) {
    if (selected.has(issueId)) {
      onChange(value.filter((item) => item !== issueId));
    } else if (!atLimit) {
      onChange([...value, issueId]);
    }
  }

  return (
    <fieldset
      aria-describedby={[hint ? hintId : null, error ? errorId : null]
        .filter(Boolean)
        .join(" ") || undefined}
    >
      <legend className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-red-400">*</span> : null}
      </legend>
      {hint ? (
        <p id={hintId} className="mt-0.5 text-xs opacity-70">
          {hint}
        </p>
      ) : null}

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {HUNGER_ISSUES.map((issue) => {
          const isSelected = selected.has(issue.id);
          const disabled = !isSelected && atLimit;
          return (
            <li key={issue.id}>
              <label
                className={`flex h-full cursor-pointer gap-2.5 rounded-xl border p-3 transition ${
                  isSelected
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : "border-white/15 hover:bg-white/5"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  name={id}
                  value={issue.id}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => toggle(issue.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{issue.label}</span>
                  <span className="mt-0.5 block text-xs opacity-70">{issue.description}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-xs opacity-60">
        {value.length} selected{max !== undefined ? ` · up to ${max}` : ""}
      </p>

      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
