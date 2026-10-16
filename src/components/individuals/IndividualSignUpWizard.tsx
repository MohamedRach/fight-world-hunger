"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { topLevelField, type FieldErrors } from "@/features/ngos/onboarding";
import {
  EMPTY_INDIVIDUAL_DRAFT,
  SIGNUP_SECTIONS,
  draftToSignupPayload,
  errorsForSection,
  firstSectionWithErrors,
  validateSignupDraft,
  type IndividualDraft,
  type IndividualSectionId,
} from "@/features/individuals/onboarding";
import type { IndividualProfileView } from "@/features/individuals/types";
import { NGO_CAUSE_LABELS } from "@/features/ngos/types";
import { countryName } from "@/features/ngos/countries";
import { OnboardingStepper } from "@/components/ngos/onboarding/OnboardingStepper";
import { IndividualProfileFields } from "./IndividualProfileFields";

const REVIEW_INDEX = SIGNUP_SECTIONS.length;
const STEP_LABELS = [...SIGNUP_SECTIONS.map((section) => section.label), "Review"];

const primaryButton =
  "rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400";
const secondaryButton =
  "rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";

type ApiError = { code: string; message: string; fieldErrors?: FieldErrors };

function causeLabel(value: string) {
  return (NGO_CAUSE_LABELS as Record<string, string>)[value] ?? value;
}

function ReviewSummary({ draft, onEdit }: { draft: IndividualDraft; onEdit: (index: number) => void }) {
  const none = <span className="italic opacity-50">Not provided</span>;
  const rows: Record<IndividualSectionId, Array<[string, ReactNode]>> = {
    about: [
      ["Full name", draft.fullName.trim() || none],
      ["Email", draft.email.trim() || none],
      ["Country", draft.countryCode ? countryName(draft.countryCode) : none],
      ["Profile photo", draft.avatarUrl.trim() ? "Added" : none],
      ["Why you give", draft.bio.trim() || none],
    ],
    interests: [
      ["Causes", draft.preferredCauses.map(causeLabel).join(", ") || none],
      ["Countries", draft.preferredCountryCodes.map(countryName).join(", ") || none],
    ],
    privacy: [
      ["Donate anonymously", draft.donateAnonymously ? "Yes" : "No"],
      ["NGOs may contact me", draft.contactConsent ? "Yes" : "No"],
      ["Privacy policy", draft.acceptPrivacyPolicy ? "Accepted" : "Not accepted yet"],
    ],
  };

  return (
    <div className="grid gap-4">
      {SIGNUP_SECTIONS.map((section, index) => (
        <section
          key={section.id}
          aria-labelledby={`review-${section.id}`}
          className="rounded-xl border border-black/10 p-5 dark:border-white/15"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 id={`review-${section.id}`} className="font-semibold">
              {section.title}
            </h3>
            <button
              type="button"
              onClick={() => onEdit(index)}
              className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Edit<span className="sr-only"> {section.title}</span>
            </button>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[11rem_1fr]">
            {rows[section.id].map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="font-medium opacity-70">{label}</dt>
                <dd className="min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/** Individual sign-up: creates the account and the profile together. */
export function IndividualSignUpWizard() {
  const router = useRouter();
  const uid = useId();
  const [current, setCurrent] = useState(0);
  const [draft, setDraft] = useState<IndividualDraft>(EMPTY_INDIVIDUAL_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<IndividualProfileView | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (hasNavigated.current) headingRef.current?.focus();
  }, [current, created]);

  const update = <K extends keyof IndividualDraft>(key: K, value: IndividualDraft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) =>
      Object.fromEntries(Object.entries(previous).filter(([k]) => topLevelField(k) !== key)),
    );
  };

  function goTo(index: number) {
    hasNavigated.current = true;
    setCurrent(index);
  }

  function jumpTo(index: number) {
    setErrors({});
    setFormError(null);
    goTo(index);
  }

  function next() {
    const sectionErrors = errorsForSection(validateSignupDraft(draft), SIGNUP_SECTIONS, current);
    if (Object.keys(sectionErrors).length > 0) {
      setErrors(sectionErrors);
      setFormError("Please fix the highlighted fields before continuing.");
      return;
    }
    jumpTo(current + 1);
  }

  function showErrors(fieldErrors: FieldErrors, message: string) {
    const index = firstSectionWithErrors(fieldErrors, SIGNUP_SECTIONS);
    goTo(index === -1 ? REVIEW_INDEX : index);
    setErrors(fieldErrors);
    setFormError(message);
  }

  async function submit() {
    const allErrors = validateSignupDraft(draft);
    if (Object.keys(allErrors).length > 0) {
      showErrors(allErrors, "Some information needs your attention before you can continue.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch("/api/accounts/individual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToSignupPayload(draft)),
      });
      const body = (await response.json()) as
        | { data: { profile: IndividualProfileView } }
        | { error: ApiError };
      if (!response.ok || "error" in body) {
        const error = "error" in body ? body.error : undefined;
        const message = error?.message ?? "Something went wrong. Please try again.";
        if (error?.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
          showErrors(error.fieldErrors, message);
        } else {
          setFormError(message);
        }
        return;
      }
      hasNavigated.current = true;
      setCreated(body.data.profile);
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
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
          Welcome, {created.fullName.split(" ")[0]}!
        </h1>
        <p className="mx-auto mt-3 max-w-xl opacity-80">
          Your account is ready and you&apos;re signed in. Explore the map to find
          organizations fighting hunger where you&apos;d like to help.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/map" className={primaryButton}>
            Explore the hunger map
          </Link>
          <button
            type="button"
            onClick={() => {
              router.push("/me");
              router.refresh();
            }}
            className={secondaryButton}
          >
            Go to my profile
          </button>
        </div>
      </section>
    );
  }

  const isReview = current === REVIEW_INDEX;
  const section = SIGNUP_SECTIONS[current];

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        Individual account
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm opacity-70">
        Takes about 2 minutes. Already have an account?{" "}
        <Link href="/sign-in?as=individual" className="underline underline-offset-2">
          Sign in
        </Link>
      </p>

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
            {isReview ? "Review and create" : section.title}
          </h2>
          <p className="mt-1 text-sm opacity-70">
            {isReview ? "Check your information. You can edit any section." : section.description}
          </p>

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
              <ReviewSummary draft={draft} onEdit={jumpTo} />
            ) : (
              <IndividualProfileFields
                section={section.id}
                draft={draft}
                errors={errors}
                onChange={update}
                idPrefix={uid}
                mode="create"
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {current > 0 && (
              <button type="button" onClick={() => jumpTo(current - 1)} className={secondaryButton}>
                Back
              </button>
            )}
          </div>
          <button type="submit" disabled={submitting} className={primaryButton}>
            {isReview ? (submitting ? "Creating your account…" : "Create my account") : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
