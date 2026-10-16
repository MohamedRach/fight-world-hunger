"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import {
  NGO_CAUSES,
  NGO_CAUSE_LABELS,
  type NgoCause,
  type NgoPublicProfile,
} from "@/features/ngos/types";
import { COUNTRIES } from "@/features/ngos/countries";

type FieldErrors = Record<string, string[]>;

type ApiError = {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
};

const COUNTRY_OPTIONS = Object.entries(COUNTRIES).sort(([, a], [, b]) =>
  a.localeCompare(b),
);

function textOrUndefined(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}

function buildPayload(form: HTMLFormElement): Record<string, unknown> {
  const fd = new FormData(form);

  const yearText = textOrUndefined(fd.get("yearFounded"));
  const achievementsText = textOrUndefined(fd.get("keyAchievements"));
  const socialLinks: Record<string, string> = {};
  for (const key of ["twitter", "facebook", "instagram", "linkedin"] as const) {
    const url = textOrUndefined(fd.get(`social.${key}`));
    if (url) socialLinks[key] = url;
  }

  return {
    name: fd.get("name")?.toString().trim() ?? "",
    logoUrl: textOrUndefined(fd.get("logoUrl")),
    shortDescription: fd.get("shortDescription")?.toString().trim() ?? "",
    mission: fd.get("mission")?.toString().trim() ?? "",
    activitiesDescription: textOrUndefined(fd.get("activitiesDescription")),
    targetBeneficiaries: textOrUndefined(fd.get("targetBeneficiaries")),
    yearFounded: yearText !== undefined ? Number(yearText) : undefined,
    registrationId: textOrUndefined(fd.get("registrationId")),
    website: textOrUndefined(fd.get("website")),
    contactEmail: textOrUndefined(fd.get("contactEmail")),
    contactPhone: textOrUndefined(fd.get("contactPhone")),
    socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    primaryCause: fd.get("primaryCause")?.toString() ?? "",
    otherCauses: fd.getAll("otherCauses").map(String),
    hqCountryCode: fd.get("hqCountryCode")?.toString() ?? "",
    hqCity: textOrUndefined(fd.get("hqCity")),
    operatingCountryCodes: fd.getAll("operatingCountryCodes").map(String),
    projectsSummary: textOrUndefined(fd.get("projectsSummary")),
    impactSummary: textOrUndefined(fd.get("impactSummary")),
    keyAchievements: achievementsText
      ? achievementsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : [],
  };
}

type FieldRenderProps = {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
};

/** Module-scoped so re-renders never remount (and reset) uncontrolled inputs. */
function Field({
  label,
  name,
  formId,
  errors,
  required,
  hint,
  children,
}: {
  label: string;
  name: string;
  formId: string;
  errors: FieldErrors;
  required?: boolean;
  hint?: string;
  children: (props: FieldRenderProps) => ReactNode;
}) {
  const id = `${formId}-${name}`;
  const error = errors[name]?.[0];
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-red-600 dark:text-red-400">
            {" "}
            *
          </span>
        ) : (
          <span className="font-normal opacity-60"> (optional)</span>
        )}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
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
    </div>
  );
}

export function NgoProfileForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: NgoPublicProfile;
}) {
  const router = useRouter();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    setSuccess(false);

    try {
      const payload = buildPayload(event.currentTarget);
      const response = await fetch(
        mode === "create" ? "/api/ngos" : `/api/ngos/${initial!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as
        | { data: NgoPublicProfile }
        | { error: ApiError };

      if (!response.ok || "error" in body) {
        const error = "error" in body ? body.error : undefined;
        setFieldErrors(error?.fieldErrors ?? {});
        setFormError(error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const errorFor = (name: string) => fieldErrors[name]?.[0];

  const inputClass =
    "rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-white/20";
  const sectionClass =
    "rounded-xl border border-black/10 p-5 dark:border-white/15";
  const legendClass = "px-1 text-base font-semibold";

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-red-600/40 bg-red-600/5 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {formError}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-600/40 bg-emerald-600/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          Profile saved. Redirecting to your dashboard…
        </div>
      )}

      <fieldset className={sectionClass}>
        <legend className={legendClass}>Organization identity</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field formId={formId} errors={fieldErrors} label="NGO name" name="name" required>
            {(props) => (
              <input
                {...props}
                name="name"
                type="text"
                defaultValue={initial?.name}
                maxLength={120}
                className={inputClass}
              />
            )}
          </Field>
          <Field formId={formId} errors={fieldErrors} label="Logo URL" name="logoUrl" hint="Link to a hosted image (https://…)">
            {(props) => (
              <input
                {...props}
                name="logoUrl"
                type="url"
                defaultValue={initial?.logoUrl ?? ""}
                className={inputClass}
              />
            )}
          </Field>
          <Field formId={formId} errors={fieldErrors} label="Year founded" name="yearFounded">
            {(props) => (
              <input
                {...props}
                name="yearFounded"
                type="number"
                min={1800}
                max={new Date().getFullYear()}
                defaultValue={initial?.yearFounded ?? ""}
                className={inputClass}
              />
            )}
          </Field>
          <Field
            formId={formId}
            errors={fieldErrors}
            label="Registration identifier"
            name="registrationId"
            hint="Official registration number. Not shown publicly."
          >
            {(props) => (
              <input
                {...props}
                name="registrationId"
                type="text"
                maxLength={100}
                className={inputClass}
              />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field
              formId={formId}
              errors={fieldErrors}
              label="Short description"
              name="shortDescription"
              required
              hint="One or two sentences shown in listings (max 280 characters)."
            >
              {(props) => (
                <textarea
                  {...props}
                  name="shortDescription"
                  rows={2}
                  maxLength={280}
                  defaultValue={initial?.shortDescription}
                  className={inputClass}
                />
              )}
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field formId={formId} errors={fieldErrors} label="Mission statement" name="mission" required>
              {(props) => (
                <textarea
                  {...props}
                  name="mission"
                  rows={4}
                  maxLength={2000}
                  defaultValue={initial?.mission}
                  className={inputClass}
                />
              )}
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className={sectionClass}>
        <legend className={legendClass}>Geography</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field formId={formId} errors={fieldErrors} label="Headquarters country" name="hqCountryCode" required>
            {(props) => (
              <select
                {...props}
                name="hqCountryCode"
                defaultValue={initial?.hqCountryCode ?? ""}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a country…
                </option>
                {COUNTRY_OPTIONS.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field formId={formId} errors={fieldErrors} label="Headquarters city" name="hqCity">
            {(props) => (
              <input
                {...props}
                name="hqCity"
                type="text"
                maxLength={120}
                defaultValue={initial?.hqCity ?? ""}
                className={inputClass}
              />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field
              formId={formId}
              errors={fieldErrors}
              label="Countries of operation"
              name="operatingCountryCodes"
              required
              hint="Hold Ctrl (Windows) or Cmd (Mac) to select multiple countries."
            >
              {(props) => (
                <select
                  {...props}
                  name="operatingCountryCodes"
                  multiple
                  size={8}
                  defaultValue={initial?.operatingCountryCodes ?? []}
                  className={inputClass}
                >
                  {COUNTRY_OPTIONS.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className={sectionClass}>
        <legend className={legendClass}>Areas of intervention</legend>
        <div className="grid gap-4">
          <Field formId={formId} errors={fieldErrors} label="Primary cause" name="primaryCause" required>
            {(props) => (
              <select
                {...props}
                name="primaryCause"
                defaultValue={initial?.primaryCause ?? ""}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a cause…
                </option>
                {NGO_CAUSES.map((cause) => (
                  <option key={cause} value={cause}>
                    {NGO_CAUSE_LABELS[cause]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <fieldset>
            <legend className="text-sm font-medium">
              Other areas of intervention{" "}
              <span className="font-normal opacity-60">(optional)</span>
            </legend>
            {errorFor("otherCauses") && (
              <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errorFor("otherCauses")}
              </p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {NGO_CAUSES.map((cause) => (
                <label key={cause} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="otherCauses"
                    value={cause}
                    defaultChecked={initial?.otherCauses.includes(cause as NgoCause)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  {NGO_CAUSE_LABELS[cause]}
                </label>
              ))}
            </div>
          </fieldset>
          <Field formId={formId} errors={fieldErrors} label="Description of activities" name="activitiesDescription">
            {(props) => (
              <textarea
                {...props}
                name="activitiesDescription"
                rows={4}
                maxLength={5000}
                defaultValue={initial?.activitiesDescription ?? ""}
                className={inputClass}
              />
            )}
          </Field>
          <Field formId={formId} errors={fieldErrors} label="Target beneficiaries" name="targetBeneficiaries">
            {(props) => (
              <textarea
                {...props}
                name="targetBeneficiaries"
                rows={2}
                maxLength={1000}
                defaultValue={initial?.targetBeneficiaries ?? ""}
                className={inputClass}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className={sectionClass}>
        <legend className={legendClass}>Contact and social links</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field formId={formId} errors={fieldErrors} label="Official website" name="website">
            {(props) => (
              <input
                {...props}
                name="website"
                type="url"
                defaultValue={initial?.website ?? ""}
                className={inputClass}
              />
            )}
          </Field>
          <Field formId={formId} errors={fieldErrors} label="Public contact email" name="contactEmail">
            {(props) => (
              <input
                {...props}
                name="contactEmail"
                type="email"
                defaultValue={initial?.contactEmail ?? ""}
                className={inputClass}
              />
            )}
          </Field>
          <Field formId={formId} errors={fieldErrors} label="Public phone number" name="contactPhone">
            {(props) => (
              <input
                {...props}
                name="contactPhone"
                type="tel"
                defaultValue={initial?.contactPhone ?? ""}
                className={inputClass}
              />
            )}
          </Field>
          {(["twitter", "facebook", "instagram", "linkedin"] as const).map((key) => (
            <Field
              key={key}
              formId={formId}
              errors={fieldErrors}
              label={`${key.charAt(0).toUpperCase()}${key.slice(1)} URL`}
              name={`socialLinks.${key}`}
            >
              {(props) => (
                <input
                  {...props}
                  name={`social.${key}`}
                  type="url"
                  defaultValue={initial?.socialLinks?.[key] ?? ""}
                  className={inputClass}
                />
              )}
            </Field>
          ))}
        </div>
      </fieldset>

      <fieldset className={sectionClass}>
        <legend className={legendClass}>Impact and transparency</legend>
        <div className="grid gap-4">
          <Field formId={formId} errors={fieldErrors} label="Projects and initiatives" name="projectsSummary">
            {(props) => (
              <textarea
                {...props}
                name="projectsSummary"
                rows={4}
                maxLength={5000}
                defaultValue={initial?.projectsSummary ?? ""}
                className={inputClass}
              />
            )}
          </Field>
          <Field formId={formId} errors={fieldErrors} label="Impact summary" name="impactSummary">
            {(props) => (
              <textarea
                {...props}
                name="impactSummary"
                rows={4}
                maxLength={5000}
                defaultValue={initial?.impactSummary ?? ""}
                className={inputClass}
              />
            )}
          </Field>
          <Field
            formId={formId}
            errors={fieldErrors}
            label="Key achievements"
            name="keyAchievements"
            hint="One achievement per line (up to 20)."
          >
            {(props) => (
              <textarea
                {...props}
                name="keyAchievements"
                rows={4}
                defaultValue={initial?.keyAchievements.join("\n") ?? ""}
                className={inputClass}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-emerald-600 px-6 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-emerald-950"
        >
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Create NGO profile"
              : "Save changes"}
        </button>
        <p className="text-xs opacity-60">
          Fields marked <span aria-hidden="true">*</span> are required.
        </p>
      </div>
    </form>
  );
}
