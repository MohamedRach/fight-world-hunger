"use client";

import { useState, type FormEvent } from "react";

const CURRENCIES = [
  { code: "USD", label: "USD - US Dollar" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "GBP", label: "GBP - British Pound" },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];

type DonationConfirmation = {
  beneficiary: string;
  amount: number;
  currency: CurrencyCode;
};

export default function DonationForm() {
  const [confirmation, setConfirmation] =
    useState<DonationConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const beneficiary = formData.get("beneficiary");
    const rawAmount = formData.get("amount");
    const rawCurrency = formData.get("currency");

    if (
      typeof beneficiary !== "string" ||
      typeof rawAmount !== "string" ||
      typeof rawCurrency !== "string"
    ) {
      setError("Please complete each donation field.");
      return;
    }

    const amount = Number(rawAmount);
    const currency = CURRENCIES.find(({ code }) => code === rawCurrency)?.code;

    if (!beneficiary.trim() || !Number.isFinite(amount) || amount < 0.01) {
      setError("Enter an organization name and a valid amount of at least 0.01.");
      return;
    }

    if (!currency) {
      setError("Choose a supported currency.");
      return;
    }

    setConfirmation({
      beneficiary: beneficiary.trim(),
      amount,
      currency,
    });
  }

  return (
    <form
      className="space-y-6"
      onChange={() => {
        setConfirmation(null);
        setError(null);
      }}
      onSubmit={handleSubmit}
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Demo form only</p>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          This form does not process payments or save donation details. Do not
          enter payment card information.
        </p>
      </div>

      <div>
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="beneficiary"
        >
          Organization name
        </label>
        <input
          autoComplete="organization"
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          id="beneficiary"
          name="beneficiary"
          placeholder="Enter the NGO you want to support"
          required
          type="text"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <div>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="amount"
          >
            Donation amount
          </label>
          <input
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="amount"
            min="0.01"
            name="amount"
            placeholder="0.00"
            required
            step="0.01"
            type="number"
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="currency"
          >
            Currency
          </label>
          <select
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            defaultValue="USD"
            id="currency"
            name="currency"
          >
            {CURRENCIES.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:w-auto"
        type="submit"
      >
        Review demo donation
      </button>

      {confirmation && (
        <div
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
          role="status"
        >
          <p className="font-semibold">Demo details reviewed</p>
          <p className="mt-1">
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: confirmation.currency,
            }).format(confirmation.amount)}{" "}
            for {confirmation.beneficiary}.
          </p>
          <p className="mt-2">
            No payment was processed and these details were not saved.
          </p>
        </div>
      )}
    </form>
  );
}
