"use client";

import { errorFor, type FieldErrors } from "@/features/ngos/onboarding";
import type { IndividualDraft, IndividualSectionId } from "@/features/individuals/onboarding";
import { NGO_CAUSES, NGO_CAUSE_LABELS } from "@/features/ngos/types";
import { COUNTRIES } from "@/features/ngos/countries";
import {
  CheckboxField,
  CheckboxGroup,
  CountryMultiSelect,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ngos/onboarding/fields";

const COUNTRY_OPTIONS = Object.entries(COUNTRIES).sort(([, a], [, b]) => a.localeCompare(b));
const CAUSE_OPTIONS = NGO_CAUSES.map((cause) => [cause, NGO_CAUSE_LABELS[cause]] as const);

export type DraftUpdater = <K extends keyof IndividualDraft>(
  key: K,
  value: IndividualDraft[K],
) => void;

/** Fields of one individual-profile section, shared by the wizard and the edit form. */
export function IndividualProfileFields({
  section,
  draft,
  errors,
  onChange,
  idPrefix,
  mode,
}: {
  section: IndividualSectionId;
  draft: IndividualDraft;
  errors: FieldErrors;
  onChange: DraftUpdater;
  idPrefix: string;
  mode: "create" | "edit";
}) {
  const id = (field: string) => `${idPrefix}-${field}`;
  const error = (field: string) => errorFor(errors, field);

  switch (section) {
    case "about":
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            id={id("fullName")}
            label="Full name"
            required
            value={draft.fullName}
            onChange={(value) => onChange("fullName", value)}
            maxLength={120}
            autoComplete="name"
            error={error("fullName")}
          />
          {mode === "create" ? (
            <TextInput
              id={id("email")}
              label="Email"
              type="email"
              required
              value={draft.email}
              onChange={(value) => onChange("email", value)}
              autoComplete="email"
              hint="You'll use it to sign in. Never shown to NGOs unless you allow contact."
              error={error("email")}
            />
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Email</span>
              <span className="rounded-lg bg-black/5 px-3 py-2 text-sm dark:bg-white/10">
                {draft.email}
              </span>
              <span className="text-xs opacity-60">Your sign-in email can&apos;t be changed here.</span>
            </div>
          )}
          <SelectInput
            id={id("countryCode")}
            label="Country of residence"
            value={draft.countryCode}
            onChange={(value) => onChange("countryCode", value)}
            options={COUNTRY_OPTIONS}
            placeholder="Select a country…"
            error={error("countryCode")}
          />
          <TextInput
            id={id("avatarUrl")}
            label="Profile photo URL"
            type="url"
            value={draft.avatarUrl}
            onChange={(value) => onChange("avatarUrl", value)}
            placeholder="https://…"
            error={error("avatarUrl")}
          />
          <div className="sm:col-span-2">
            <TextArea
              id={id("bio")}
              label="Why do you give?"
              rows={3}
              maxLength={500}
              value={draft.bio}
              onChange={(value) => onChange("bio", value)}
              hint="A few words about what motivates you. Only visible to you for now."
              error={error("bio")}
            />
          </div>
        </div>
      );

    case "interests":
      return (
        <div className="grid gap-5">
          <CheckboxGroup
            id={id("preferredCauses")}
            label="Causes you care about"
            options={CAUSE_OPTIONS}
            value={draft.preferredCauses}
            onChange={(value) => onChange("preferredCauses", value)}
            error={error("preferredCauses")}
          />
          <CountryMultiSelect
            id={id("preferredCountryCodes")}
            label="Countries you'd like to support"
            options={COUNTRY_OPTIONS}
            value={draft.preferredCountryCodes}
            onChange={(value) => onChange("preferredCountryCodes", value)}
            hint="Tip: the hunger map shows where needs are highest."
            error={error("preferredCountryCodes")}
          />
        </div>
      );

    case "privacy":
      return (
        <div className="grid gap-3">
          <CheckboxField
            id={id("donateAnonymously")}
            label="Donate anonymously by default"
            description="NGOs will not see your name on donations."
            checked={draft.donateAnonymously}
            onChange={(value) => onChange("donateAnonymously", value)}
            error={error("donateAnonymously")}
          />
          <CheckboxField
            id={id("contactConsent")}
            label="NGOs I support may contact me"
            description="Allows organizations you donate to to email you updates about their work."
            checked={draft.contactConsent}
            onChange={(value) => onChange("contactConsent", value)}
            error={error("contactConsent")}
          />
          {mode === "create" && (
            <CheckboxField
              id={id("acceptPrivacyPolicy")}
              label="I accept the privacy policy"
              description="Your data is used only to run your account and is never sold."
              required
              checked={draft.acceptPrivacyPolicy}
              onChange={(value) => onChange("acceptPrivacyPolicy", value)}
              error={error("acceptPrivacyPolicy")}
            />
          )}
        </div>
      );
  }
}
