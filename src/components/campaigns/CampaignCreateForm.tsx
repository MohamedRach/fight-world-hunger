"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { ApiError, postJson } from "@/features/api-client";
import type { CampaignSummary } from "@/features/campaigns/types";
import { CURRENCIES, CURRENCY_LABELS, parseAmountToMinor } from "@/features/money";
import { COUNTRIES } from "@/features/ngos/countries";
import { HungerIssuePicker } from "@/components/hunger-issues/HungerIssuePicker";

interface ManageableNgo {
  id: string;
  name: string;
  operatingCountryCodes: string[];
}

interface CampaignCreateFormProps {
  ngos: ManageableNgo[];
}

const SORTED_COUNTRIES = Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1]));

const inputClass =
  "mt-1 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-white/20";
const labelClass = "block text-sm font-medium";

export function CampaignCreateForm({ ngos }: CampaignCreateFormProps) {
  const router = useRouter();
  const formId = useId();

  const [ngoId, setNgoId] = useState(ngos[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [countryCodes, setCountryCodes] = useState<string[]>(
    ngos[0]?.operatingCountryCodes.slice(0, 1) ?? [],
  );
  const [issueTags, setIssueTags] = useState<string[]>([]);
  const [goal, setGoal] = useState("10000.00");
  const [currency, setCurrency] = useState<string>("USD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE">("ACTIVE");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selectedNgo = ngos.find((ngo) => ngo.id === ngoId);
  // Suggest the organization's countries of operation first.
  const suggested = selectedNgo?.operatingCountryCodes ?? [];

  function toggleCountry(code: string) {
    setCountryCodes((previous) =>
      previous.includes(code) ? previous.filter((item) => item !== code) : [...previous, code],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setFieldErrors({});

    const goalAmountMinor = parseAmountToMinor(goal);
    if (goalAmountMinor === null) {
      setFieldErrors({ goalAmountMinor: "The fundraising goal must be greater than zero" });
      return;
    }
    if (issueTags.length === 0) {
      setFieldErrors({ issueTags: "Select at least one world hunger issue this campaign addresses" });
      return;
    }
    if (countryCodes.length === 0) {
      setFieldErrors({ countryCodes: "Select at least one country this campaign serves" });
      return;
    }

    setSubmitting(true);
    try {
      const campaign = await postJson<CampaignSummary>("/api/campaigns", {
        ngoId,
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        countryCodes,
        issueTags,
        goalAmountMinor,
        currency,
        startDate: startDate === "" ? null : startDate,
        endDate: endDate === "" ? null : endDate,
        imageUrl: imageUrl.trim() === "" ? null : imageUrl.trim(),
        status,
      });
      router.push(`/dashboard/campaigns/${campaign.id}`);
      router.refresh();
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
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {ngos.length > 1 ? (
        <label className={labelClass}>
          Organization
          <select
            value={ngoId}
            onChange={(event) => {
              setNgoId(event.target.value);
              const next = ngos.find((ngo) => ngo.id === event.target.value);
              setCountryCodes(next?.operatingCountryCodes.slice(0, 1) ?? []);
            }}
            className={inputClass}
          >
            {ngos.map((ngo) => (
              <option key={ngo.id} value={ngo.id}>
                {ngo.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-sm opacity-70">
          Organization: <strong className="font-medium opacity-100">{selectedNgo?.name}</strong>
        </p>
      )}

      <label className={labelClass}>
        Campaign title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          aria-invalid={fieldErrors.title ? true : undefined}
          className={inputClass}
          placeholder="School meals for 500 children"
        />
        {fieldErrors.title ? (
          <span role="alert" className="mt-1 block text-xs text-red-600 dark:text-red-300">
            {fieldErrors.title}
          </span>
        ) : null}
      </label>

      <label className={labelClass}>
        Short summary
        <input
          type="text"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          maxLength={280}
          aria-invalid={fieldErrors.summary ? true : undefined}
          className={inputClass}
          placeholder="One sentence donors will see on the campaign card."
        />
        <span className="mt-1 block text-xs opacity-60">{summary.length}/280</span>
        {fieldErrors.summary ? (
          <span role="alert" className="mt-1 block text-xs text-red-600 dark:text-red-300">
            {fieldErrors.summary}
          </span>
        ) : null}
      </label>

      <label className={labelClass}>
        Description and purpose
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          maxLength={5000}
          aria-invalid={fieldErrors.description ? true : undefined}
          className={inputClass}
          placeholder="What the campaign will fund, who it helps and how progress will be reported."
        />
        {fieldErrors.description ? (
          <span role="alert" className="mt-1 block text-xs text-red-600 dark:text-red-300">
            {fieldErrors.description}
          </span>
        ) : null}
      </label>

      <HungerIssuePicker
        id="campaign-issue-tags"
        label="World hunger issues this campaign addresses"
        hint="What this specific campaign tackles — not everything your organization does. Donors are matched on these."
        required
        max={5}
        value={issueTags}
        onChange={setIssueTags}
        error={fieldErrors.issueTags}
      />

      <fieldset>
        <legend className={labelClass}>Countries served</legend>
        <p className="mt-0.5 text-xs opacity-70">
          The campaign appears on the map in every country you select. It stays a single
          campaign.
        </p>

        {suggested.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggested.map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={countryCodes.includes(code)}
                onClick={() => toggleCountry(code)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  countryCodes.includes(code)
                    ? "border-emerald-600 bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950"
                    : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                }`}
              >
                {COUNTRIES[code] ?? code}
              </button>
            ))}
          </div>
        ) : null}

        <label className="mt-3 block text-xs opacity-70">
          Add another country
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) toggleCountry(event.target.value);
            }}
            className={inputClass}
          >
            <option value="">Select a country…</option>
            {SORTED_COUNTRIES.filter(([code]) => !countryCodes.includes(code)).map(
              ([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ),
            )}
          </select>
        </label>

        {countryCodes.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected countries">
            {countryCodes.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => toggleCountry(code)}
                  className="rounded-full bg-emerald-600/15 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-600/25 dark:text-emerald-200"
                >
                  {COUNTRIES[code] ?? code} ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {fieldErrors.countryCodes ? (
          <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-300">
            {fieldErrors.countryCodes}
          </p>
        ) : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Fundraising goal
          <input
            type="text"
            inputMode="decimal"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            aria-invalid={fieldErrors.goalAmountMinor ? true : undefined}
            className={inputClass}
          />
          {fieldErrors.goalAmountMinor ? (
            <span role="alert" className="mt-1 block text-xs text-red-600 dark:text-red-300">
              {fieldErrors.goalAmountMinor}
            </span>
          ) : null}
        </label>

        <label className={labelClass}>
          Currency
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className={inputClass}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {CURRENCY_LABELS[code]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Start date (optional)
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          End date (optional)
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            aria-invalid={fieldErrors.endDate ? true : undefined}
            className={inputClass}
          />
          {fieldErrors.endDate ? (
            <span role="alert" className="mt-1 block text-xs text-red-600 dark:text-red-300">
              {fieldErrors.endDate}
            </span>
          ) : null}
        </label>
      </div>

      <label className={labelClass}>
        Image URL (optional)
        <input
          type="url"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="https://…"
          aria-invalid={fieldErrors.imageUrl ? true : undefined}
          className={inputClass}
        />
        {fieldErrors.imageUrl ? (
          <span role="alert" className="mt-1 block text-xs text-red-600 dark:text-red-300">
            {fieldErrors.imageUrl}
          </span>
        ) : null}
      </label>

      <fieldset>
        <legend className={labelClass}>Publish</legend>
        <div className="mt-2 space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name={`${formId}-status`}
              checked={status === "ACTIVE"}
              onChange={() => setStatus("ACTIVE")}
              className="mt-1 accent-emerald-600"
            />
            <span>
              <span className="font-medium">Publish now (Active)</span>
              <span className="block text-xs opacity-70">
                Visible on the map and open for donations.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name={`${formId}-status`}
              checked={status === "DRAFT"}
              onChange={() => setStatus("DRAFT")}
              className="mt-1 accent-emerald-600"
            />
            <span>
              <span className="font-medium">Save as draft</span>
              <span className="block text-xs opacity-70">
                Only your organization can see it. You can publish it later.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200"
        >
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || ngos.length === 0}
        className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:text-emerald-950"
      >
        {submitting ? "Creating…" : "Create campaign"}
      </button>
    </form>
  );
}
