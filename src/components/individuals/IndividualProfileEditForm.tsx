"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { topLevelField, type FieldErrors } from "@/features/ngos/onboarding";
import {
  INDIVIDUAL_SECTIONS,
  draftToUpdatePayload,
  profileToDraft,
  validateUpdateDraft,
  type IndividualDraft,
} from "@/features/individuals/onboarding";
import type { IndividualProfileView } from "@/features/individuals/types";
import { IndividualProfileFields } from "./IndividualProfileFields";

type ApiError = { code: string; message: string; fieldErrors?: FieldErrors };

export function IndividualProfileEditForm({ profile }: { profile: IndividualProfileView }) {
  const router = useRouter();
  const uid = useId();
  const [draft, setDraft] = useState<IndividualDraft>(() => profileToDraft(profile));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof IndividualDraft>(key: K, value: IndividualDraft[K]) => {
    setSaved(false);
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) =>
      Object.fromEntries(Object.entries(previous).filter(([k]) => topLevelField(k) !== key)),
    );
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    const clientErrors = validateUpdateDraft(draft);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch("/api/me/individual-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToUpdatePayload(draft)),
      });
      const body = (await response.json()) as
        | { data: IndividualProfileView }
        | { error: ApiError };
      if (!response.ok || "error" in body) {
        const error = "error" in body ? body.error : undefined;
        setErrors(error?.fieldErrors ?? {});
        setFormError(error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setSaved(true);
      router.push("/me");
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      {formError && (
        <p
          role="alert"
          className="rounded-lg border border-red-600/40 bg-red-600/5 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {formError}
        </p>
      )}
      {saved && (
        <p
          role="status"
          className="rounded-lg border border-emerald-600/40 bg-emerald-600/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          Profile saved.
        </p>
      )}

      {INDIVIDUAL_SECTIONS.map((section) => (
        <fieldset
          key={section.id}
          className="rounded-xl border border-black/10 p-5 dark:border-white/15"
        >
          <legend className="px-1 text-base font-semibold">{section.title}</legend>
          <p className="mb-4 text-sm opacity-70">{section.description}</p>
          <IndividualProfileFields
            section={section.id}
            draft={draft}
            errors={errors}
            onChange={update}
            idPrefix={uid}
            mode="edit"
          />
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <Link
          href="/me"
          className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
