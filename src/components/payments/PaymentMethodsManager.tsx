"use client";

import { useState } from "react";

import { ApiError, deleteJson, patchJson } from "@/features/api-client";
import type { PaymentMethodView } from "@/features/payments/types";
import { AddPaymentMethodForm } from "./AddPaymentMethodForm";

interface PaymentMethodsManagerProps {
  initialMethods: PaymentMethodView[];
}

/** Donor wallet: list, add, set default and remove MOCK cards. */
export function PaymentMethodsManager({ initialMethods }: PaymentMethodsManagerProps) {
  const [methods, setMethods] = useState(initialMethods);
  const [showForm, setShowForm] = useState(initialMethods.length === 0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<PaymentMethodView[]>, message: string) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      setMethods(await action());
      setNotice(message);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div aria-live="polite" className="space-y-2">
        {notice ? (
          <p className="rounded-lg border border-emerald-600/30 bg-emerald-50 p-2.5 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200"
          >
            {error}
          </p>
        ) : null}
      </div>

      {methods.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-6 text-sm opacity-80 dark:border-white/20">
          You have no saved mock cards. Add one to use the simulated donation flow.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {methods.map((method) => (
            <li
              key={method.id}
              className="rounded-xl border border-black/10 p-4 dark:border-white/15"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{method.brandLabel}</p>
                  <p className="font-mono text-sm tracking-wide opacity-80">
                    {method.maskedNumber}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {method.isDefault ? (
                    <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      Default
                    </span>
                  ) : null}
                  {method.isDemoSeed ? (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] opacity-70 dark:bg-white/10">
                      Demo data
                    </span>
                  ) : null}
                  {method.isExpired ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                      Expired
                    </span>
                  ) : null}
                </div>
              </div>

              <dl className="mt-2 space-y-0.5 text-xs opacity-70">
                <div className="flex gap-1">
                  <dt>Name:</dt>
                  <dd className="truncate">{method.holderName}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Expires:</dt>
                  <dd>{method.expiryLabel}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Label:</dt>
                  <dd className="truncate">{method.label}</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-2">
                {!method.isDefault ? (
                  <button
                    type="button"
                    disabled={busyId === method.id}
                    onClick={() =>
                      run(
                        method.id,
                        () =>
                          patchJson<PaymentMethodView[]>(
                            `/api/me/payment-methods/${method.id}`,
                            { makeDefault: true },
                          ),
                        "Default card updated.",
                      )
                    }
                    className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    Make default
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === method.id}
                  onClick={() =>
                    run(
                      method.id,
                      () => deleteJson<PaymentMethodView[]>(`/api/me/payment-methods/${method.id}`),
                      "Mock card removed.",
                    )
                  }
                  className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section
        aria-labelledby="add-card-title"
        className="rounded-xl border border-black/10 p-5 dark:border-white/15"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="add-card-title" className="font-semibold">
            Add a mock card
          </h2>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
            >
              Add card
            </button>
          ) : null}
        </div>

        {showForm ? (
          <div className="mt-4">
            <AddPaymentMethodForm
              onAdded={(method) => {
                setMethods((previous) => [
                  method,
                  ...previous.map((item) =>
                    method.isDefault ? { ...item, isDefault: false } : item,
                  ),
                ]);
                setNotice("Mock card saved.");
                setShowForm(false);
              }}
              onCancel={methods.length > 0 ? () => setShowForm(false) : undefined}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
