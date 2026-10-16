"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { errorFor, type FieldErrors } from "@/features/ngos/onboarding";
import { fieldErrorsFromZod } from "@/features/ngos/validation";
import {
  DONATION_CURRENCIES,
  DONATION_CURRENCY_LABELS,
  type DonationCurrency,
  type DonationDetail,
  type DonationNgoSummary,
} from "@/features/donations/types";
import { DONATION_MESSAGE_MAX, donationCreateSchema } from "@/features/donations/validation";
import {
  CheckboxField,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ngos/onboarding/fields";

type ApiError = { code: string; message: string; fieldErrors?: FieldErrors };

type Draft = {
  amount: string;
  currency: DonationCurrency;
  message: string;
  isAnonymous: boolean;
};

const CURRENCY_OPTIONS = DONATION_CURRENCIES.map(
  (code) => [code, DONATION_CURRENCY_LABELS[code]] as const,
);

function toPayload(ngoId: string, draft: Draft) {
  const amount = draft.amount.trim();
  return {
    ngoId,
    amount: amount === "" ? undefined : Number(amount),
    currency: draft.currency,
    message: draft.message.trim() || null,
    isAnonymous: draft.isAnonymous,
  };
}

export function DonationForm({
  ngo,
  defaultAnonymous,
}: {
  ngo: DonationNgoSummary;
  /** The donor's "donate anonymously by default" profile preference. */
  defaultAnonymous: boolean;
}) {
  const router = useRouter();
  const uid = useId();
  const id = (field: string) => `${uid}-${field}`;
  const [draft, setDraft] = useState<Draft>({
    amount: "",
    currency: "USD",
    message: "",
    isAnonymous: defaultAnonymous,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) =>
      Object.fromEntries(Object.entries(previous).filter(([field]) => field !== key)),
    );
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = toPayload(ngo.id, draft);
    const parsed = donationCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed.error));
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { data: DonationDetail } | { error: ApiError };
      if (!response.ok || "error" in body) {
        const error = "error" in body ? body.error : undefined;
        setErrors(error?.fieldErrors ?? {});
        setFormError(error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(`/donations/${body.data.id}?created=1`);
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const ngoError = errorFor(errors, "ngoId");

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      {(formError || ngoError) && (
        <p
          role="alert"
          className="rounded-lg border border-red-600/40 bg-red-600/5 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {ngoError ?? formError}
        </p>
      )}

      <fieldset className="rounded-xl border border-black/10 p-5 dark:border-white/15">
        <legend className="px-1 text-base font-semibold">Your donation</legend>
        <div className="grid gap-4 sm:grid-cols-[1fr_minmax(12rem,16rem)]">
          <TextInput
            id={id("amount")}
            label="Amount"
            required
            inputMode="decimal"
            placeholder="25.00"
            value={draft.amount}
            onChange={(value) => update("amount", value)}
            error={errorFor(errors, "amount")}
            hint="Between 1 and 1,000,000, up to two decimal places."
          />
          <SelectInput
            id={id("currency")}
            label="Currency"
            required
            placeholder="Select a currency"
            options={CURRENCY_OPTIONS}
            value={draft.currency}
            onChange={(value) => update("currency", value as DonationCurrency)}
            error={errorFor(errors, "currency")}
          />
        </div>
        <div className="mt-4 grid gap-4">
          <TextArea
            id={id("message")}
            label={`Message to ${ngo.name}`}
            rows={3}
            maxLength={DONATION_MESSAGE_MAX}
            placeholder="Why you're giving, or what you'd like your donation to support."
            value={draft.message}
            onChange={(value) => update("message", value)}
            error={errorFor(errors, "message")}
          />
          <CheckboxField
            id={id("isAnonymous")}
            label="Donate anonymously"
            description={`${ngo.name} will not see your name on this donation.`}
            checked={draft.isAnonymous}
            onChange={(value) => update("isAnonymous", value)}
            error={errorFor(errors, "isAnonymous")}
          />
        </div>
      </fieldset>

      <p className="rounded-lg border border-emerald-600/30 bg-emerald-600/5 px-4 py-3 text-sm dark:border-emerald-400/30 dark:bg-emerald-400/10">
        No payment is taken here. Your donation is recorded as a pledge, and {ngo.name} will
        confirm it and keep you updated on its progress.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950"
        >
          {submitting ? "Sending…" : "Pledge donation"}
        </button>
        <Link
          href={`/ngos/${ngo.slug}`}
          className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
