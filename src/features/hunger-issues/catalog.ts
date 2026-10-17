/**
 * The shared world hunger issue taxonomy.
 *
 * ONE canonical list, used by three entities:
 *  - individuals  → the issues a donor cares about (`hungerInterests`)
 *  - NGOs         → the issues an organization works on (`hungerFocusAreas`)
 *  - campaigns    → the issues a specific campaign addresses (`issueTags`)
 *
 * Because all three use the same identifiers, matching a donor to a campaign
 * is a set operation rather than string guesswork, and the LLM is given
 * stable ids instead of free text.
 *
 * It lives in TypeScript rather than JSON so the ids are available to Zod
 * schemas and to the type system; duplicating it as mock JSON would create a
 * second source of truth that could drift.
 *
 * Ids are permanent: renaming one invalidates stored profiles and campaigns.
 */

export const HUNGER_ISSUES = [
  {
    id: "food_insecurity",
    label: "Food insecurity & emergency food aid",
    shortLabel: "Emergency food aid",
    description:
      "Getting food to people facing acute shortages, including crises and famine response.",
  },
  {
    id: "child_malnutrition",
    label: "Child hunger & malnutrition",
    shortLabel: "Child nutrition",
    description:
      "Treating and preventing malnutrition and stunting in infants and children.",
  },
  {
    id: "maternal_nutrition",
    label: "Maternal & vulnerable-group nutrition",
    shortLabel: "Maternal nutrition",
    description:
      "Nutrition for pregnant and breastfeeding women, older people and people with illnesses.",
  },
  {
    id: "food_access",
    label: "Access to nutritious, affordable food",
    shortLabel: "Food access",
    description:
      "Making healthy food affordable and available where diets are poor or markets fail.",
  },
  {
    id: "food_distribution",
    label: "Food distribution in underserved communities",
    shortLabel: "Food distribution",
    description:
      "Food banks, community kitchens and last-mile delivery to isolated communities.",
  },
  {
    id: "agricultural_development",
    label: "Agricultural development & smallholder farmers",
    shortLabel: "Smallholder farming",
    description:
      "Seeds, tools, training and fair market access so small farms can feed their regions.",
  },
  {
    id: "climate_resilience",
    label: "Climate resilience & drought",
    shortLabel: "Climate & drought",
    description:
      "Helping food systems withstand drought, floods and a changing climate.",
  },
  {
    id: "food_waste_reduction",
    label: "Food loss & waste reduction",
    shortLabel: "Food waste",
    description:
      "Cutting losses after harvest and redirecting surplus food to people who need it.",
  },
  {
    id: "sustainable_food_systems",
    label: "Sustainable food systems",
    shortLabel: "Sustainable systems",
    description:
      "Farming and supply chains that stay productive without exhausting land and water.",
  },
  {
    id: "school_meals",
    label: "School meals & nutrition programmes",
    shortLabel: "School meals",
    description:
      "Daily meals at school, which also keep children — especially girls — in class.",
  },
  {
    id: "refugee_food_assistance",
    label: "Refugee & displaced-population food aid",
    shortLabel: "Refugee food aid",
    description: "Feeding people displaced by conflict or disaster, in camps and host communities.",
  },
  {
    id: "long_term_food_security",
    label: "Long-term food security & community resilience",
    shortLabel: "Long-term security",
    description:
      "Building local capacity so communities stop needing emergency assistance.",
  },
] as const;

export type HungerIssue = (typeof HUNGER_ISSUES)[number];
export type HungerIssueId = HungerIssue["id"];

/** Ids only — the tuple Zod enums are built from. */
export const HUNGER_ISSUE_IDS = HUNGER_ISSUES.map((issue) => issue.id) as unknown as [
  HungerIssueId,
  ...HungerIssueId[],
];

const BY_ID = new Map<string, HungerIssue>(HUNGER_ISSUES.map((issue) => [issue.id, issue]));

export function isHungerIssueId(value: unknown): value is HungerIssueId {
  return typeof value === "string" && BY_ID.has(value);
}

export function findHungerIssue(id: string): HungerIssue | undefined {
  return BY_ID.get(id);
}

/** Display label; falls back to the raw id so unknown data never renders blank. */
export function hungerIssueLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

export function hungerIssueShortLabel(id: string): string {
  return BY_ID.get(id)?.shortLabel ?? id;
}

/** Keeps only ids that exist in the catalog, de-duplicated and in catalog order. */
export function normalizeIssueIds(values: readonly string[]): HungerIssueId[] {
  const wanted = new Set(values);
  return HUNGER_ISSUES.filter((issue) => wanted.has(issue.id)).map((issue) => issue.id);
}

/** Issues shared by two sets, in catalog order. The core matching primitive. */
export function sharedIssues(
  a: readonly string[],
  b: readonly string[],
): HungerIssueId[] {
  const second = new Set(b);
  return normalizeIssueIds(a.filter((id) => second.has(id)));
}
