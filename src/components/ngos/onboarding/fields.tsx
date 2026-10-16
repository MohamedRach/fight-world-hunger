"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import { countryName } from "@/features/ngos/countries";

export const inputClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 aria-[invalid=true]:border-red-600 dark:border-white/20 dark:aria-[invalid=true]:border-red-400";

type BaseFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
};

function RequiredMark({ required }: { required?: boolean }) {
  return required ? (
    <span className="text-red-600 dark:text-red-400">
      <span aria-hidden="true"> *</span>
      <span className="sr-only"> (required)</span>
    </span>
  ) : (
    <span className="font-normal opacity-60"> (optional)</span>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

function HintAndError({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return (
    <>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs opacity-60">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  );
}

function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  trailing,
  children,
}: BaseFieldProps & { trailing?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          <RequiredMark required={required} />
        </label>
        {trailing}
      </div>
      {children}
      <HintAndError id={id} hint={hint} error={error} />
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  type = "text",
  maxLength,
  inputMode,
  placeholder,
  autoComplete,
  ...field
}: BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "url" | "email" | "tel";
  maxLength?: number;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <FieldShell {...field}>
      <input
        id={field.id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={field.required}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={describedBy(field.id, field.hint, field.error)}
        className={inputClass}
      />
    </FieldShell>
  );
}

export function TextArea({
  value,
  onChange,
  rows = 4,
  maxLength,
  placeholder,
  ...field
}: BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <FieldShell
      {...field}
      trailing={
        maxLength ? (
          <span className="text-xs tabular-nums opacity-60">
            {value.length}/{maxLength}
          </span>
        ) : undefined
      }
    >
      <textarea
        id={field.id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        required={field.required}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={describedBy(field.id, field.hint, field.error)}
        className={inputClass}
      />
    </FieldShell>
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  ...field
}: BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [value: string, label: string]>;
  placeholder: string;
}) {
  return (
    <FieldShell {...field}>
      <select
        id={field.id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={describedBy(field.id, field.hint, field.error)}
        className={inputClass}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxGroup({
  id,
  label,
  required,
  hint,
  error,
  options,
  value,
  onChange,
  disabledValues = [],
}: BaseFieldProps & {
  options: ReadonlyArray<readonly [value: string, label: string]>;
  value: string[];
  onChange: (value: string[]) => void;
  disabledValues?: string[];
}) {
  const selected = new Set(value);
  function toggle(optionValue: string) {
    onChange(
      selected.has(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue],
    );
  }

  return (
    <fieldset aria-describedby={describedBy(id, hint, error)} className="flex flex-col gap-1">
      <legend className="text-sm font-medium">
        {label}
        <RequiredMark required={required} />
      </legend>
      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map(([optionValue, optionLabel]) => {
          const disabled = disabledValues.includes(optionValue);
          return (
            <label
              key={optionValue}
              className={`flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15 ${
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(optionValue)}
                disabled={disabled}
                onChange={() => toggle(optionValue)}
                className="h-4 w-4 accent-emerald-600"
              />
              {optionLabel}
            </label>
          );
        })}
      </div>
      <HintAndError id={id} hint={hint} error={error} />
    </fieldset>
  );
}

export function CountryMultiSelect({
  id,
  label,
  required,
  hint,
  error,
  options,
  value,
  onChange,
}: BaseFieldProps & {
  options: ReadonlyArray<readonly [code: string, name: string]>;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = new Set(value);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? options.filter(
        ([code, name]) =>
          name.toLowerCase().includes(normalizedQuery) ||
          code.toLowerCase() === normalizedQuery,
      )
    : options;

  function toggle(code: string) {
    onChange(selected.has(code) ? value.filter((item) => item !== code) : [...value, code]);
  }

  return (
    <fieldset aria-describedby={describedBy(id, hint, error)} className="flex flex-col gap-1">
      <legend className="text-sm font-medium">
        {label}
        <RequiredMark required={required} />
      </legend>

      {value.length > 0 && (
        <ul aria-label="Selected countries" className="mt-1 flex flex-wrap gap-2">
          {value.map((code) => (
            <li key={code}>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 py-1 pl-3 pr-1 text-sm text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
                {countryName(code)}
                <button
                  type="button"
                  onClick={() => toggle(code)}
                  aria-label={`Remove ${countryName(code)}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-emerald-600/20"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <label htmlFor={`${id}-search`} className="sr-only">
        Search countries
      </label>
      <input
        id={`${id}-search`}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          // Don't let Enter in the search box submit the surrounding step form.
          if (event.key === "Enter") event.preventDefault();
        }}
        placeholder="Search countries…"
        aria-invalid={error ? true : undefined}
        className={`${inputClass} mt-1`}
      />
      <div className="max-h-56 overflow-y-auto rounded-lg border border-black/10 dark:border-white/15">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm opacity-70">No country matches “{query}”.</p>
        ) : (
          <ul className="grid gap-0.5 p-2 sm:grid-cols-2">
            {filtered.map(([code, name]) => (
              <li key={code}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={selected.has(code)}
                    onChange={() => toggle(code)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  {name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <HintAndError id={id} hint={hint} error={error} />
    </fieldset>
  );
}
