"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  EMPTY_DRAFT,
  ONBOARDING_STEPS,
  SOCIAL_KEYS,
  SOCIAL_LABELS,
  draftToPayload,
  errorFor,
  errorsForStep,
  firstStepWithErrors,
  sanitizeDraft,
  topLevelField,
  validateDraft,
  type FieldErrors,
  type OnboardingDraft,
  type OnboardingStep,
  type SocialKey,
} from "@/features/ngos/onboarding";
import { NGO_CAUSES, NGO_CAUSE_LABELS, type NgoPublicProfile } from "@/features/ngos/types";
import { COUNTRIES, countryName } from "@/features/ngos/countries";
import { CheckboxGroup, CountryMultiSelect, SelectInput, TextArea, TextInput } from "./fields";
import { OnboardingStepper } from "./OnboardingStepper";
import { OnboardingReview } from "./OnboardingReview";

const DRAFT_STORAGE_KEY = "ngo-onboarding-draft:v1";
const REVIEW_INDEX = ONBOARDING_STEPS.length;
const STEP_LABELS = [...ONBOARDING_STEPS.map((step) => step.label), "Review"];
const COUNTRY_OPTIONS = Object.entries(COUNTRIES).sort(([, a], [, b]) => a.localeCompare(b));
const CAUSE_OPTIONS = NGO_CAUSES.map((cause) => [cause, NGO_CAUSE_LABELS[cause]] as const);

type ApiError = { code: string; message: string; fieldErrors?: FieldErrors };
type Phase = "welcome" | "steps" | "done";

function loadDraft(): OnboardingDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? sanitizeDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: OnboardingDraft) {
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage may be unavailable (private mode, quota); the wizard still works.
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

const primaryButton =
  "rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400";
const secondaryButton =
  "rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";

export function NgoOnboardingWizard({
  initialCountryCode,
}: {
  /** Pre-selected country of operation, e.g. when arriving from the map. */
  initialCountryCode?: string;
} = {}) {
  const uid = useId();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [current, setCurrent] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<NgoPublicProfile | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  // Move focus to the new step's heading so keyboard and screen-reader users
  // land at the top of the content that just changed.
  useEffect(() => {
    if (hasNavigated.current) headingRef.current?.focus();
  }, [phase, current]);

  const fieldId = (field: string) => `${uid}-${field}`;
  const fieldError = (field: string) => errorFor(errors, field);

  function goTo(nextPhase: Phase, nextStep: number) {
    hasNavigated.current = true;
    setPhase(nextPhase);
    setCurrent(nextStep);
  }

  function clearFieldErrors(field: string) {
    setErrors((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(
          ([key]) => key !== field && topLevelField(key) !== field,
        ),
      ),
    );
  }

  function update<K extends Exclude<keyof OnboardingDraft, "socialLinks">>(
    key: K,
    value: OnboardingDraft[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    clearFieldErrors(key);
  }

  function updateSocial(key: SocialKey, value: string) {
    setDraft((previous) => ({
      ...previous,
      socialLinks: { ...previous.socialLinks, [key]: value },
    }));
    clearFieldErrors(`socialLinks.${key}`);
  }

  function updatePrimaryCause(value: string) {
    setDraft((previous) => ({
      ...previous,
      primaryCause: value,
      otherCauses: previous.otherCauses.filter((cause) => cause !== value),
    }));
    clearFieldErrors("primaryCause");
    clearFieldErrors("otherCauses");
  }

  function start() {
    const saved = loadDraft();
    let initial = saved ?? EMPTY_DRAFT;
    const notices: string[] = [];
    if (saved) notices.push("We restored the progress saved on this device.");
    if (initialCountryCode && !initial.operatingCountryCodes.includes(initialCountryCode)) {
      initial = {
        ...initial,
        operatingCountryCodes: [...initial.operatingCountryCodes, initialCountryCode],
      };
      notices.push(
        `${countryName(initialCountryCode)} has been added to your countries of operation.`,
      );
    }
    setDraft(initial);
    setNotice(notices.length > 0 ? notices.join(" ") : null);
    goTo("steps", 0);
  }

  function startOver() {
    clearDraft();
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setFormError(null);
    setNotice(null);
    goTo("welcome", 0);
  }

  function jumpTo(stepIndex: number) {
    saveDraft(draft);
    setErrors({});
    setFormError(null);
    setNotice(null);
    goTo("steps", stepIndex);
  }

  function back() {
    if (current === 0) {
      saveDraft(draft);
      setErrors({});
      setFormError(null);
      goTo("welcome", 0);
    } else {
      jumpTo(current - 1);
    }
  }

  function next() {
    const stepErrors = errorsForStep(validateDraft(draft), current);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setFormError("Please fix the highlighted fields before continuing.");
      return;
    }
    jumpTo(current + 1);
  }

  function showErrors(fieldErrors: FieldErrors, message: string) {
    const stepIndex = firstStepWithErrors(fieldErrors);
    goTo("steps", stepIndex === -1 ? REVIEW_INDEX : stepIndex);
    setErrors(fieldErrors);
    setFormError(message);
  }

  async function submit() {
    const allErrors = validateDraft(draft);
    if (Object.keys(allErrors).length > 0) {
      showErrors(allErrors, "Some information needs your attention before you can submit.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch("/api/ngos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToPayload(draft)),
      });
      const body = (await response.json()) as { data: NgoPublicProfile } | { error: ApiError };

      if (!response.ok || "error" in body) {
        const error = "error" in body ? body.error : undefined;
        const message =
          response.status === 401
            ? "Your session has expired. Sign in again from the dashboard — your progress is saved."
            : (error?.message ?? "Something went wrong. Please try again.");
        saveDraft(draft);
        if (error?.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
          showErrors(error.fieldErrors, message);
        } else {
          setFormError(message);
        }
        return;
      }

      clearDraft();
      setCreated(body.data);
      goTo("done", 0);
    } catch {
      saveDraft(draft);
      setFormError("Could not reach the server. Check your connection and try again — your progress is saved.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderStepFields(stepId: OnboardingStep["id"]) {
    switch (stepId) {
      case "identity":
        return (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextInput
                id={fieldId("name")}
                label="NGO name"
                required
                value={draft.name}
                onChange={(value) => update("name", value)}
                maxLength={120}
                autoComplete="organization"
                error={fieldError("name")}
              />
            </div>
            <TextInput
              id={fieldId("yearFounded")}
              label="Year founded"
              value={draft.yearFounded}
              onChange={(value) => update("yearFounded", value)}
              inputMode="numeric"
              placeholder="e.g. 2010"
              maxLength={4}
              error={fieldError("yearFounded")}
            />
            <TextInput
              id={fieldId("registrationId")}
              label="Registration identifier"
              value={draft.registrationId}
              onChange={(value) => update("registrationId", value)}
              hint="Official registration number. Used for verification, never shown publicly."
              maxLength={100}
              error={fieldError("registrationId")}
            />
            <div className="sm:col-span-2">
              <TextInput
                id={fieldId("logoUrl")}
                label="Logo URL"
                type="url"
                value={draft.logoUrl}
                onChange={(value) => update("logoUrl", value)}
                placeholder="https://…"
                hint="Link to a hosted image of your logo."
                error={fieldError("logoUrl")}
              />
            </div>
            <div className="sm:col-span-2">
              <TextArea
                id={fieldId("shortDescription")}
                label="Short description"
                required
                rows={2}
                maxLength={280}
                value={draft.shortDescription}
                onChange={(value) => update("shortDescription", value)}
                hint="One or two sentences shown in search results and on the map."
                error={fieldError("shortDescription")}
              />
            </div>
            <div className="sm:col-span-2">
              <TextArea
                id={fieldId("mission")}
                label="Mission statement"
                required
                rows={5}
                maxLength={2000}
                value={draft.mission}
                onChange={(value) => update("mission", value)}
                hint="Why your organization exists and what it aims to achieve."
                error={fieldError("mission")}
              />
            </div>
          </div>
        );

      case "geography":
        return (
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectInput
              id={fieldId("hqCountryCode")}
              label="Headquarters country"
              required
              value={draft.hqCountryCode}
              onChange={(value) => update("hqCountryCode", value)}
              options={COUNTRY_OPTIONS}
              placeholder="Select a country…"
              error={fieldError("hqCountryCode")}
            />
            <TextInput
              id={fieldId("hqCity")}
              label="Headquarters city"
              value={draft.hqCity}
              onChange={(value) => update("hqCity", value)}
              maxLength={120}
              autoComplete="address-level2"
              error={fieldError("hqCity")}
            />
            <div className="sm:col-span-2">
              <CountryMultiSelect
                id={fieldId("operatingCountryCodes")}
                label="Countries of operation"
                required
                options={COUNTRY_OPTIONS}
                value={draft.operatingCountryCodes}
                onChange={(value) => update("operatingCountryCodes", value)}
                hint="Select every country where you run activities. This is how donors find you on the map."
                error={fieldError("operatingCountryCodes")}
              />
            </div>
          </div>
        );

      case "causes":
        return (
          <div className="grid gap-5">
            <SelectInput
              id={fieldId("primaryCause")}
              label="Primary cause"
              required
              value={draft.primaryCause}
              onChange={updatePrimaryCause}
              options={CAUSE_OPTIONS}
              placeholder="Select your main cause…"
              error={fieldError("primaryCause")}
            />
            <CheckboxGroup
              id={fieldId("otherCauses")}
              label="Other areas of intervention"
              options={CAUSE_OPTIONS}
              value={draft.otherCauses}
              onChange={(value) => update("otherCauses", value)}
              disabledValues={draft.primaryCause ? [draft.primaryCause] : []}
              hint="Your primary cause is already included."
              error={fieldError("otherCauses")}
            />
            <TextArea
              id={fieldId("activitiesDescription")}
              label="Description of activities"
              rows={4}
              maxLength={5000}
              value={draft.activitiesDescription}
              onChange={(value) => update("activitiesDescription", value)}
              hint="What your teams do day to day."
              error={fieldError("activitiesDescription")}
            />
            <TextArea
              id={fieldId("targetBeneficiaries")}
              label="Target beneficiaries"
              rows={2}
              maxLength={1000}
              value={draft.targetBeneficiaries}
              onChange={(value) => update("targetBeneficiaries", value)}
              hint="Who benefits from your work."
              error={fieldError("targetBeneficiaries")}
            />
          </div>
        );

      case "contact":
        return (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextInput
                id={fieldId("website")}
                label="Official website"
                type="url"
                value={draft.website}
                onChange={(value) => update("website", value)}
                placeholder="https://…"
                autoComplete="url"
                error={fieldError("website")}
              />
            </div>
            <TextInput
              id={fieldId("contactEmail")}
              label="Public contact email"
              type="email"
              value={draft.contactEmail}
              onChange={(value) => update("contactEmail", value)}
              autoComplete="email"
              hint="Shown publicly on your profile."
              error={fieldError("contactEmail")}
            />
            <TextInput
              id={fieldId("contactPhone")}
              label="Public phone number"
              type="tel"
              value={draft.contactPhone}
              onChange={(value) => update("contactPhone", value)}
              autoComplete="tel"
              hint="Only add a number you want shown publicly."
              error={fieldError("contactPhone")}
            />
            {SOCIAL_KEYS.map((key) => (
              <TextInput
                key={key}
                id={fieldId(`socialLinks-${key}`)}
                label={`${SOCIAL_LABELS[key]} URL`}
                type="url"
                value={draft.socialLinks[key]}
                onChange={(value) => updateSocial(key, value)}
                placeholder="https://…"
                error={fieldError(`socialLinks.${key}`)}
              />
            ))}
          </div>
        );

      case "impact":
        return (
          <div className="grid gap-5">
            <TextArea
              id={fieldId("projectsSummary")}
              label="Projects and initiatives"
              rows={4}
              maxLength={5000}
              value={draft.projectsSummary}
              onChange={(value) => update("projectsSummary", value)}
              error={fieldError("projectsSummary")}
            />
            <TextArea
              id={fieldId("impactSummary")}
              label="Impact summary"
              rows={4}
              maxLength={5000}
              value={draft.impactSummary}
              onChange={(value) => update("impactSummary", value)}
              hint="Describe measurable results where you have them."
              error={fieldError("impactSummary")}
            />
            <TextArea
              id={fieldId("keyAchievements")}
              label="Key achievements"
              rows={4}
              value={draft.keyAchievements}
              onChange={(value) => update("keyAchievements", value)}
              hint="One achievement per line (up to 20)."
              error={fieldError("keyAchievements")}
            />
          </div>
        );
    }
  }

  if (phase === "welcome") {
    return (
      <section aria-labelledby={`${uid}-welcome`}>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          NGO onboarding
        </p>
        <h1
          id={`${uid}-welcome`}
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-3xl font-bold tracking-tight outline-none sm:text-4xl"
        >
          Register your NGO on the platform
        </h1>
        <p className="mt-3 max-w-2xl text-base opacity-80">
          Create your organization&apos;s public profile so donors around the world can
          discover your work, understand your impact, and support you.
        </p>
        {initialCountryCode && (
          <p className="mt-4 inline-flex rounded-full bg-emerald-600/10 px-4 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
            Registering an NGO working in {countryName(initialCountryCode)}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-black/10 p-5 dark:border-white/15">
            <h2 className="font-semibold">What you&apos;ll need</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              <li>Your NGO&apos;s name, a short description, and mission statement</li>
              <li>Your headquarters country and countries of operation</li>
              <li>Your primary cause</li>
              <li className="opacity-70">
                Optional: logo, registration number, contact details, projects and impact
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-black/10 p-5 dark:border-white/15">
            <h2 className="font-semibold">Good to know</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              <li>Takes about 5–10 minutes</li>
              <li>Your progress is saved on this device as you go</li>
              <li>You can edit everything later from your dashboard</li>
              <li>Your registration number is never shown publicly</li>
            </ul>
          </div>
        </div>

        <ol className="mt-8 grid gap-3 sm:grid-cols-5">
          {ONBOARDING_STEPS.map((step, index) => (
            <li key={step.id} className="rounded-xl bg-black/[0.03] p-4 dark:bg-white/5">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Step {index + 1}
              </span>
              <p className="mt-1 text-sm font-medium">{step.title}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" onClick={start} className={primaryButton}>
            Start onboarding
          </button>
          <Link href="/dashboard" className={secondaryButton}>
            Back to dashboard
          </Link>
        </div>
      </section>
    );
  }

  if (phase === "done" && created) {
    return (
      <section aria-labelledby={`${uid}-done`} className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/15 text-3xl text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300"
        >
          ✓
        </div>
        <h1
          id={`${uid}-done`}
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 text-3xl font-bold tracking-tight outline-none"
        >
          Welcome aboard, {created.name}!
        </h1>
        <p className="mx-auto mt-3 max-w-xl opacity-80">
          Your NGO profile has been created and is now visible to donors. Verification of
          your organization is pending.
        </p>
        <div className="mx-auto mt-8 max-w-md rounded-xl border border-black/10 p-5 text-left dark:border-white/15">
          <h2 className="font-semibold">Recommended next steps</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>Preview your public profile as donors will see it</li>
            <li>Complete any missing details from your dashboard</li>
          </ul>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/ngos/${created.slug}`} className={primaryButton}>
            View public profile
          </Link>
          <Link href="/map" className={secondaryButton}>
            See it on the map
          </Link>
          <Link href="/dashboard" className={secondaryButton}>
            Go to dashboard
          </Link>
        </div>
      </section>
    );
  }

  const isReview = current === REVIEW_INDEX;
  const step = ONBOARDING_STEPS[current];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Register your NGO</h1>
      <div className="mt-6">
        <OnboardingStepper labels={STEP_LABELS} current={current} onSelect={jumpTo} />
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (isReview) void submit();
          else next();
        }}
        className="mt-8"
        aria-labelledby={`${uid}-step-title`}
      >
        <div className="rounded-2xl border border-black/10 p-5 sm:p-8 dark:border-white/15">
          <h2
            id={`${uid}-step-title`}
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold outline-none"
          >
            {isReview ? "Review and submit" : step.title}
          </h2>
          <p className="mt-1 text-sm opacity-70">
            {isReview
              ? "Check your information before creating your profile. You can edit any section."
              : step.description}
          </p>

          {notice && (
            <p
              role="status"
              className="mt-4 rounded-lg border border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200"
            >
              {notice}
            </p>
          )}
          {formError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-600/40 bg-red-600/5 px-4 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {formError}
            </p>
          )}

          <div className="mt-6">
            {isReview ? (
              <OnboardingReview draft={draft} onEdit={jumpTo} />
            ) : (
              renderStepFields(step.id)
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={back} className={secondaryButton}>
              Back
            </button>
            <Link href="/dashboard" onClick={() => saveDraft(draft)} className={secondaryButton}>
              Save and exit
            </Link>
          </div>
          <button type="submit" disabled={submitting} className={primaryButton}>
            {isReview ? (submitting ? "Creating profile…" : "Create NGO profile") : "Continue"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs opacity-60">
          Fields marked <span aria-hidden="true">*</span>
          <span className="sr-only">as required</span> are required.{" "}
          <button type="button" onClick={startOver} className="underline underline-offset-2">
            Discard and start over
          </button>
        </p>
      </form>
    </div>
  );
}
