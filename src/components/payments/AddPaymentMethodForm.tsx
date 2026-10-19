"use client";

import { useId, useState } from "react";

import { ApiError, postJson } from "@/features/api-client";
import {
  MOCK_CARD_BRAND_LABELS,
  MOCK_CARD_BRANDS,
  type PaymentMethodView,
} from "@/features/payments/types";

interface AddPaymentMethodFormProps {
  onAdded: (method: PaymentMethodView) => void;
  onCancel?: () => void;
  /** `dark` inside the map/donation dialog, `light` on app pages. */
  tone?: "dark" | "light";
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 12 }, (_, index) => CURRENT_YEAR + index);
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

/**
 * Adds a MOCK card.
 *
 * SECURITY: there is no field for a full card number or a CVV, by design.
 * Only the last four digits of a test card, a brand, a holder name, an expiry
 * and a label are collected, and that is all that is ever stored.
 */
export function AddPaymentMethodForm({ onAdded, onCancel, tone = "light" }: AddPaymentMethodFormProps) {
  const fieldId = useId();
  const [brand, setBrand] = useState<string>("VISA");
  const [last4, setLast4] = useState("4242");
  const [holderName, setHolderName] = useState("");
  const [expMonth, setExpMonth] = useState(12);
  const [expYear, setExpYear] = useState(CURRENT_YEAR + 2);
  const [label, setLabel] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const dark = tone === "dark";
  const inputClass = dark
    ? "mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
    : "mt-1 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-white/20";
  const labelClass = dark ? "block text-xs text-slate-200" : "block text-sm font-medium";
  const hintClass = dark ? "text-[11px] text-slate-400" : "text-xs opacity-70";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const method = await postJson<PaymentMethodView>("/api/me/payment-methods", {
        brand,
        last4: last4.trim(),
        holderName: holderName.trim(),
        expMonth,
        expYear,
        label: label.trim() === "" ? `${MOCK_CARD_BRAND_LABELS[brand as keyof typeof MOCK_CARD_BRAND_LABELS]} ••${last4.trim()}` : label.trim(),
        makeDefault,
      });
      setHolderName("");
      setLabel("");
      onAdded(method);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (messages[0]) mapped[field] = messages[0];
        }
        setFieldErrors(mapped);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <p
        className={
          dark
            ? "rounded-lg border border-amber-400/30 bg-amber-500/10 p-2 text-[11px] leading-snug text-amber-100"
            : "rounded-lg border border-amber-500/40 bg-amber-50 p-2.5 text-xs leading-snug text-amber-900 dark:bg-amber-500/10 dark:text-amber-100"
        }
      >
        <strong className="font-semibold">Mock card only.</strong> Never enter a real card
        number or CVV. Use the last 4 digits of a well-known test card, e.g. 4242.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Card brand
          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            className={inputClass}
          >
            {MOCK_CARD_BRANDS.map((option) => (
              <option key={option} value={option} className="text-slate-900">
                {MOCK_CARD_BRAND_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Last 4 digits
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            value={last4}
            onChange={(event) => setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))}
            aria-invalid={fieldErrors.last4 ? true : undefined}
            className={inputClass}
          />
          {fieldErrors.last4 ? (
            <span role="alert" className="mt-1 block text-xs text-red-500 dark:text-red-300">
              {fieldErrors.last4}
            </span>
          ) : null}
        </label>
      </div>

      <label className={labelClass}>
        Cardholder name
        <input
          type="text"
          autoComplete="off"
          value={holderName}
          onChange={(event) => setHolderName(event.target.value)}
          placeholder="ALEX DEMO"
          aria-invalid={fieldErrors.holderName ? true : undefined}
          className={inputClass}
        />
        {fieldErrors.holderName ? (
          <span role="alert" className="mt-1 block text-xs text-red-500 dark:text-red-300">
            {fieldErrors.holderName}
          </span>
        ) : null}
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          Expiry month
          <select
            value={expMonth}
            onChange={(event) => setExpMonth(Number(event.target.value))}
            className={inputClass}
          >
            {MONTHS.map((month) => (
              <option key={month} value={month} className="text-slate-900">
                {String(month).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Expiry year
          <select
            value={expYear}
            onChange={(event) => setExpYear(Number(event.target.value))}
            className={inputClass}
          >
            {YEARS.map((year) => (
              <option key={year} value={year} className="text-slate-900">
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Card name
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Personal card"
            className={inputClass}
          />
        </label>
      </div>
      {fieldErrors.expYear ? (
        <p role="alert" className="text-xs text-red-500 dark:text-red-300">
          {fieldErrors.expYear}
        </p>
      ) : null}

      <label className={`flex items-center gap-2 ${hintClass}`}>
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(event) => setMakeDefault(event.target.checked)}
          className="accent-emerald-500"
        />
        Use as my default card
      </label>

      {formError ? (
        <p
          role="alert"
          className={
            dark
              ? "rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-100"
              : "rounded-lg border border-red-500/30 bg-red-50 p-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-200"
          }
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting}
          className={
            dark
              ? "rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
              : "rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:text-emerald-950"
          }
        >
          {submitting ? "Saving…" : "Save mock card"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className={
              dark
                ? "rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                : "rounded-full border border-black/15 px-5 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            }
          >
            Cancel
          </button>
        ) : null}
      </div>
      <p className={hintClass} id={`${fieldId}-note`}>
        Stored for display only: brand, last 4 digits, holder name, expiry and label.
      </p>
    </form>
  );
}
