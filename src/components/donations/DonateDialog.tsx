"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ApiError, getJson, postJson } from "@/features/api-client";
import type { CampaignSummary } from "@/features/campaigns/types";
import type { DonationView } from "@/features/donations/types";
import { formatMoney, parseAmountToMinor } from "@/features/money";
import type { PaymentMethodView } from "@/features/payments/types";
import { AddPaymentMethodForm } from "@/components/payments/AddPaymentMethodForm";

interface DonateDialogProps {
  campaign: CampaignSummary;
  onClose: () => void;
  /** Lets the country list refresh its progress figures after a donation. */
  onDonated?: () => void;
}

type WalletState =
  | { status: "loading" }
  | { status: "ready"; methods: PaymentMethodView[] }
  | { status: "signed-out" }
  | { status: "wrong-account" }
  | { status: "error"; message: string };

const SUGGESTED_MINOR = [1000, 2500, 5000, 10000];

export function DonateDialog({ campaign, onClose, onDonated }: DonateDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const amountInputId = useId();
  const cardFieldsetId = useId();

  const [wallet, setWallet] = useState<WalletState>({ status: "loading" });
  const [walletAttempt, setWalletAttempt] = useState(0);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);

  const [amount, setAmount] = useState("25.00");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<DonationView | null>(null);

  // One id per dialog instance makes a double submit idempotent server-side.
  // Created on first submit: generating it during render would be impure.
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getJson<PaymentMethodView[]>("/api/me/payment-methods", controller.signal)
      .then((methods) => setWallet({ status: "ready", methods }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          setWallet({ status: "signed-out" });
        } else if (error instanceof ApiError && error.status === 403) {
          setWallet({ status: "wrong-account" });
        } else {
          setWallet({
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });
    return () => controller.abort();
  }, [walletAttempt]);

  // Default to the donor's default card once the wallet arrives.
  const methods = wallet.status === "ready" ? wallet.methods : [];
  const activeMethodId =
    selectedMethodId ?? methods.find((method) => method.isDefault)?.id ?? methods[0]?.id ?? null;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handleCardAdded = useCallback((method: PaymentMethodView) => {
    setShowAddCard(false);
    setSelectedMethodId(method.id);
    setWalletAttempt((n) => n + 1);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setFieldErrors({});

    const amountMinor = parseAmountToMinor(amount);
    if (amountMinor === null) {
      setFieldErrors({ amount: "Enter an amount greater than zero, e.g. 25.00" });
      return;
    }
    if (!activeMethodId) {
      setFormError("Add a mock card before donating.");
      return;
    }

    requestIdRef.current ??= `donate-${campaign.id}-${crypto.randomUUID()}`;

    setSubmitting(true);
    try {
      const donation = await postJson<DonationView>("/api/donations", {
        campaignId: campaign.id,
        paymentMethodId: activeMethodId,
        amountMinor,
        isAnonymous,
        message: message.trim() === "" ? null : message.trim(),
        requestId: requestIdRef.current,
      });
      setConfirmed(donation);
      onDonated?.();
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (messages[0]) mapped[field === "amountMinor" ? "amount" : field] = messages[0];
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="donate-dialog-title"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-950 p-5 text-slate-100 shadow-2xl outline-none sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="donate-dialog-title" className="text-lg font-semibold text-white">
              {confirmed ? "Simulated donation recorded" : "Donate"}
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-300">{campaign.title}</p>
            <p className="text-xs text-slate-400">by {campaign.ngo.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close donation dialog"
            className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-[11px] leading-snug text-amber-100">
          <strong className="font-semibold">Simulated donation.</strong> This development build
          does not process payments. No card is charged and no money moves. Your pledge is
          recorded so you can follow the tracking workflow.
        </p>

        {confirmed ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-100">
                You pledged{" "}
                <strong className="font-semibold">
                  {formatMoney(confirmed.amountMinor, confirmed.currency)}
                </strong>{" "}
                to {confirmed.campaign.title}.
              </p>
              <p className="mt-1 text-xs text-emerald-200/80">
                Status: {confirmed.status} — the organization has not acknowledged it yet. It
                will count towards the campaign total once confirmed.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/me/donations"
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
              >
                Track my donations
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        ) : wallet.status === "signed-out" ? (
          <SignedOutNotice />
        ) : wallet.status === "wrong-account" ? (
          <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4 text-sm">
            <p>You are signed in as an NGO account.</p>
            <p className="mt-1 text-xs text-slate-400">
              Donations are made from individual accounts. NGO accounts receive them.
            </p>
            <Link
              href="/sign-in?as=individual"
              className="mt-3 inline-block rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Sign in as an individual
            </Link>
          </div>
        ) : showAddCard ? (
          // Rendered INSTEAD of the donation form: an HTML form cannot be
          // nested inside another, which silently breaks the inner one.
          <div className="mt-4">
            <h3 className="text-sm font-medium text-white">Add a mock card</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">
              You will come straight back to {campaign.title}.
            </p>
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <AddPaymentMethodForm
                tone="dark"
                onAdded={handleCardAdded}
                onCancel={() => setShowAddCard(false)}
              />
            </div>
          </div>
        ) : wallet.status === "error" ? (
          <div role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            <p>We couldn&apos;t load your saved cards. {wallet.message}</p>
            <button
              type="button"
              onClick={() => setWalletAttempt((n) => n + 1)}
              className="mt-3 rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium hover:bg-white/10"
            >
              Try again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-5" noValidate>
            <div>
              <label htmlFor={amountInputId} className="block text-sm font-medium text-white">
                Amount ({campaign.currency})
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <span aria-hidden="true" className="text-sm text-slate-400">
                  {formatMoney(0, campaign.currency).replace(/[\d.,\s]/g, "")}
                </span>
                <input
                  id={amountInputId}
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-invalid={fieldErrors.amount ? true : undefined}
                  aria-describedby={fieldErrors.amount ? `${amountInputId}-error` : undefined}
                  className="w-40 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
                />
              </div>
              {fieldErrors.amount ? (
                <p id={`${amountInputId}-error`} role="alert" className="mt-1 text-xs text-red-300">
                  {fieldErrors.amount}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SUGGESTED_MINOR.map((minor) => (
                  <button
                    key={minor}
                    type="button"
                    onClick={() => setAmount((minor / 100).toFixed(2))}
                    className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10"
                  >
                    {formatMoney(minor, campaign.currency)}
                  </button>
                ))}
              </div>
            </div>

            <fieldset aria-describedby={`${cardFieldsetId}-hint`}>
              <legend className="text-sm font-medium text-white">Pay with</legend>
              <p id={`${cardFieldsetId}-hint`} className="mt-0.5 text-[11px] text-slate-400">
                Saved mock cards. Nothing is charged.
              </p>

              {methods.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-white/15 p-3 text-xs text-slate-300">
                  You have no saved cards yet. Add a mock card below to continue — you will not
                  lose this campaign.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {methods.map((method) => (
                    <li key={method.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-sm ${
                          activeMethodId === method.id
                            ? "border-emerald-400/60 bg-emerald-500/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={activeMethodId === method.id}
                          onChange={() => setSelectedMethodId(method.id)}
                          className="accent-emerald-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-white">
                            {method.brandLabel} {method.maskedNumber}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {method.label} · expires {method.expiryLabel}
                            {method.isDefault ? " · default" : ""}
                            {method.isExpired ? " · expired" : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setShowAddCard(true)}
                className="mt-2 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
              >
                + Add a mock card
              </button>
            </fieldset>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(event) => setIsAnonymous(event.target.checked)}
                  className="accent-emerald-500"
                />
                Donate anonymously (the organization will not see your name)
              </label>
              <label className="block text-xs text-slate-300">
                Message to the organization (optional)
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={2}
                  maxLength={500}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
                />
              </label>
            </div>

            {formError ? (
              <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-2.5 text-xs text-red-100">
                {formError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || methods.length === 0}
                className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Recording…" : "Confirm simulated donation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SignedOutNotice() {
  return (
    <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4 text-sm">
      <p>Sign in as an individual to donate.</p>
      <p className="mt-1 text-xs text-slate-400">
        Your donations and saved mock cards belong to your individual account.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/sign-in?as=individual"
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
