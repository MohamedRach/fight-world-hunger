"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { errorFor, type FieldErrors } from "@/features/ngos/onboarding";
import {
  DONATION_STATUS_DESCRIPTIONS,
  DONATION_STATUS_LABELS,
  type DonationDetail,
  type DonationStatus,
} from "@/features/donations/types";
import { DONATION_STATUS_NOTE_MAX } from "@/features/donations/validation";
import { TextArea } from "@/components/ngos/onboarding/fields";

type ApiError = { code: string; message: string; fieldErrors?: FieldErrors };

/** Lets the receiving NGO move a donation to one of its allowed next statuses. */
export function DonationStatusUpdateForm({
  donationId,
  allowedNextStatuses,
}: {
  donationId: string;
  allowedNextStatuses: DonationStatus[];
}) {
  const router = useRouter();
  const uid = useId();
  const [status, setStatus] = useState<DonationStatus | "">("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<DonationStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(null);
    if (!status) {
      setErrors({ status: ["Choose the new status"] });
      setFormError(null);
      return;
    }
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      const response = await fetch(`/api/donations/${encodeURIComponent(donationId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note.trim() || null }),
      });
      const body = (await response.json()) as { data: DonationDetail } | { error: ApiError };
      if (!response.ok || "error" in body) {
        const error = "error" in body ? body.error : undefined;
        setErrors(error?.fieldErrors ?? {});
        setFormError(error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setSaved(body.data.status);
      setStatus("");
      setNote("");
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const statusError = errorFor(errors, "status");

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
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
          Status updated to {DONATION_STATUS_LABELS[saved].toLowerCase()}. The donor can now see
          it.
        </p>
      )}

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={statusError ? `${uid}-status-error` : undefined}
      >
        <legend className="mb-1 text-sm font-medium">
          New status
          <span className="text-red-600 dark:text-red-400">
            <span aria-hidden="true"> *</span>
            <span className="sr-only"> (required)</span>
          </span>
        </legend>
        {allowedNextStatuses.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 p-3 hover:bg-black/5 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-600/5 dark:border-white/15 dark:hover:bg-white/5 dark:has-[:checked]:border-emerald-400"
          >
            <input
              type="radio"
              name={`${uid}-status`}
              value={option}
              checked={status === option}
              onChange={() => {
                setStatus(option);
                setErrors({});
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
            />
            <span>
              <span className="text-sm font-medium">{DONATION_STATUS_LABELS[option]}</span>
              <span className="mt-0.5 block text-xs opacity-70">
                {DONATION_STATUS_DESCRIPTIONS[option]}
              </span>
            </span>
          </label>
        ))}
        {statusError && (
          <p
            id={`${uid}-status-error`}
            role="alert"
            className="text-xs text-red-600 dark:text-red-400"
          >
            {statusError}
          </p>
        )}
      </fieldset>

      <TextArea
        id={`${uid}-note`}
        label="Note for the donor"
        rows={3}
        maxLength={DONATION_STATUS_NOTE_MAX}
        placeholder="e.g. Your donation funded 120 school meals in Kano."
        value={note}
        onChange={setNote}
        error={errorFor(errors, "note")}
        hint="Shown on the donor's tracking timeline."
      />

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950"
        >
          {submitting ? "Updating…" : "Update status"}
        </button>
      </div>
    </form>
  );
}
