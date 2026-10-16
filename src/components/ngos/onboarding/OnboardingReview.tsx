"use client";

import type { ReactNode } from "react";
import {
  ONBOARDING_STEPS,
  SOCIAL_KEYS,
  SOCIAL_LABELS,
  type OnboardingDraft,
  type OnboardingStep,
} from "@/features/ngos/onboarding";
import { NGO_CAUSE_LABELS } from "@/features/ngos/types";
import { countryName } from "@/features/ngos/countries";

type Row = { label: string; value: ReactNode; isPrivate?: boolean };

const NOT_PROVIDED = <span className="italic opacity-50">Not provided</span>;

function causeLabel(value: string): string {
  return (NGO_CAUSE_LABELS as Record<string, string>)[value] ?? value;
}

function text(value: string): ReactNode {
  const trimmed = value.trim();
  return trimmed ? <span className="whitespace-pre-line">{trimmed}</span> : NOT_PROVIDED;
}

function list(values: string[]): ReactNode {
  return values.length > 0 ? values.join(", ") : NOT_PROVIDED;
}

function rowsFor(stepId: OnboardingStep["id"], draft: OnboardingDraft): Row[] {
  switch (stepId) {
    case "identity":
      return [
        { label: "NGO name", value: text(draft.name) },
        { label: "Logo URL", value: text(draft.logoUrl) },
        { label: "Year founded", value: text(draft.yearFounded) },
        { label: "Registration identifier", value: text(draft.registrationId), isPrivate: true },
        { label: "Short description", value: text(draft.shortDescription) },
        { label: "Mission statement", value: text(draft.mission) },
      ];
    case "geography":
      return [
        {
          label: "Headquarters",
          value: draft.hqCountryCode
            ? `${draft.hqCity.trim() ? `${draft.hqCity.trim()}, ` : ""}${countryName(draft.hqCountryCode)}`
            : NOT_PROVIDED,
        },
        {
          label: "Countries of operation",
          value: list(draft.operatingCountryCodes.map(countryName)),
        },
      ];
    case "causes":
      return [
        {
          label: "Primary cause",
          value: draft.primaryCause ? causeLabel(draft.primaryCause) : NOT_PROVIDED,
        },
        { label: "Other areas", value: list(draft.otherCauses.map(causeLabel)) },
        { label: "Activities", value: text(draft.activitiesDescription) },
        { label: "Target beneficiaries", value: text(draft.targetBeneficiaries) },
      ];
    case "contact": {
      const socials = SOCIAL_KEYS.filter((key) => draft.socialLinks[key].trim()).map(
        (key) => SOCIAL_LABELS[key],
      );
      return [
        { label: "Website", value: text(draft.website) },
        { label: "Public email", value: text(draft.contactEmail) },
        { label: "Public phone", value: text(draft.contactPhone) },
        { label: "Social media", value: list(socials) },
      ];
    }
    case "impact": {
      const achievements = draft.keyAchievements
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return [
        { label: "Projects and initiatives", value: text(draft.projectsSummary) },
        { label: "Impact summary", value: text(draft.impactSummary) },
        {
          label: "Key achievements",
          value:
            achievements.length > 0 ? (
              <ul className="list-disc pl-5">
                {achievements.map((achievement) => (
                  <li key={achievement}>{achievement}</li>
                ))}
              </ul>
            ) : (
              NOT_PROVIDED
            ),
        },
      ];
    }
  }
}

export function OnboardingReview({
  draft,
  onEdit,
}: {
  draft: OnboardingDraft;
  /** Called with an index into ONBOARDING_STEPS. */
  onEdit: (stepIndex: number) => void;
}) {
  return (
    <div className="grid gap-4">
      {ONBOARDING_STEPS.map((step, index) => (
        <section
          key={step.id}
          aria-labelledby={`review-${step.id}`}
          className="rounded-xl border border-black/10 p-5 dark:border-white/15"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 id={`review-${step.id}`} className="font-semibold">
              {step.title}
            </h3>
            <button
              type="button"
              onClick={() => onEdit(index)}
              className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Edit<span className="sr-only"> {step.title}</span>
            </button>
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-[12rem_1fr]">
            {rowsFor(step.id, draft).map((row) => (
              <div key={row.label} className="contents">
                <dt className="font-medium opacity-70">
                  {row.label}
                  {row.isPrivate && (
                    <span className="ml-1 rounded bg-black/5 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide dark:bg-white/10">
                      Private
                    </span>
                  )}
                </dt>
                <dd className="min-w-0 break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
