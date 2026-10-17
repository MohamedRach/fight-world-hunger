import "server-only";
import { fieldErrorsFromZod } from "@/features/ngos/validation";
import { getNgoRepository, slugify } from "@/features/ngos/repository";
import { canManageNgo } from "@/features/ngos/service";
import { getDonationRepository } from "@/features/donations/repository";
import { countsTowardRaised } from "@/features/donations/types";
import { progressPercentage } from "@/features/money";
import { ensureMockDataSeeded } from "@/mocks/seed";
import { getCampaignRepository } from "./repository";
import {
  campaignCreateSchema,
  campaignStatusSchema,
  campaignUpdateSchema,
} from "./validation";
import {
  canTransitionCampaign,
  isPubliclyVisible,
  toCampaignSummary,
  type Campaign,
  type CampaignStatus,
  type CampaignSummary,
  type CampaignWithProgress,
} from "./types";

export type CampaignServiceErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_TRANSITION";

export class CampaignServiceError extends Error {
  readonly code: CampaignServiceErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: CampaignServiceErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "CampaignServiceError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function uniqueSlug(title: string): Promise<string> {
  const repo = getCampaignRepository();
  const base = slugify(title) || "campaign";
  let candidate = base;
  for (let suffix = 2; await repo.findByIdOrSlug(candidate); suffix += 1) {
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

/**
 * Attaches the derived figures (raised, donation count, progress) to
 * campaigns. This is the ONLY place the raised total is computed, so every
 * view agrees; the eligibility rule itself lives in `countsTowardRaised`.
 */
export async function withProgress(campaigns: Campaign[]): Promise<CampaignWithProgress[]> {
  if (campaigns.length === 0) return [];

  const donations = await getDonationRepository().findByCampaigns(
    campaigns.map((campaign) => campaign.id),
  );

  const totals = new Map<string, { raisedMinor: number; count: number }>();
  for (const donation of donations) {
    const entry = totals.get(donation.campaignId) ?? { raisedMinor: 0, count: 0 };
    entry.count += 1;
    if (countsTowardRaised(donation.status)) entry.raisedMinor += donation.amountMinor;
    totals.set(donation.campaignId, entry);
  }

  const ngoRepo = getNgoRepository();
  const ngoIds = [...new Set(campaigns.map((campaign) => campaign.ngoId))];
  const ngos = new Map(
    (await Promise.all(ngoIds.map((id) => ngoRepo.findById(id)))).flatMap((ngo) =>
      ngo ? [[ngo.id, ngo] as const] : [],
    ),
  );

  return campaigns.map((campaign) => {
    const { raisedMinor = 0, count = 0 } = totals.get(campaign.id) ?? {};
    const ngo = ngos.get(campaign.ngoId);
    return {
      ...campaign,
      ngoName: ngo?.name ?? "Unknown organization",
      ngoSlug: ngo?.slug ?? campaign.ngoId,
      raisedAmountMinor: raisedMinor,
      donationCount: count,
      progressPercent: progressPercentage(raisedMinor, campaign.goalAmountMinor),
      remainingAmountMinor: Math.max(0, campaign.goalAmountMinor - raisedMinor),
    };
  });
}

/** Public campaigns serving a country. Drafts are never listed. */
export async function getCampaignsByCountry(countryCode: string): Promise<CampaignSummary[]> {
  await ensureMockDataSeeded();
  const campaigns = (await getCampaignRepository().findByCountry(countryCode)).filter((campaign) =>
    isPubliclyVisible(campaign.status),
  );
  const withTotals = await withProgress(campaigns);
  // Campaigns open for donations first, then the most recently created.
  return withTotals
    .sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === "ACTIVE") return -1;
        if (b.status === "ACTIVE") return 1;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .map(toCampaignSummary);
}

/** A single campaign for a public page; returns null for drafts. */
export async function getPublicCampaign(idOrSlug: string): Promise<CampaignWithProgress | null> {
  await ensureMockDataSeeded();
  const campaign = await getCampaignRepository().findByIdOrSlug(idOrSlug);
  if (!campaign || !isPubliclyVisible(campaign.status)) return null;
  const [withTotals] = await withProgress([campaign]);
  return withTotals ?? null;
}

/** Campaigns owned by the NGOs the user manages. */
export async function getCampaignsForNgo(
  userId: string | null,
  ngoId: string,
): Promise<CampaignWithProgress[]> {
  await ensureMockDataSeeded();
  if (!(await canManageNgo(userId, ngoId))) {
    throw new CampaignServiceError(
      "FORBIDDEN",
      "You are not authorized to manage this organization's campaigns.",
    );
  }
  return withProgress(await getCampaignRepository().findByNgo(ngoId));
}

/** One campaign the user manages, including drafts. */
export async function getManagedCampaign(
  userId: string | null,
  campaignIdOrSlug: string,
): Promise<CampaignWithProgress> {
  await ensureMockDataSeeded();
  const campaign = await getCampaignRepository().findByIdOrSlug(campaignIdOrSlug);
  if (!campaign) throw new CampaignServiceError("NOT_FOUND", "Campaign not found.");
  if (!(await canManageNgo(userId, campaign.ngoId))) {
    throw new CampaignServiceError(
      "FORBIDDEN",
      "You are not authorized to manage this campaign.",
    );
  }
  const [withTotals] = await withProgress([campaign]);
  return withTotals;
}

export async function createCampaign(
  userId: string | null,
  input: unknown,
): Promise<CampaignWithProgress> {
  if (!userId) {
    throw new CampaignServiceError(
      "UNAUTHENTICATED",
      "You must be signed in to create a campaign.",
    );
  }
  await ensureMockDataSeeded();

  const parsed = campaignCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new CampaignServiceError(
      "VALIDATION_ERROR",
      "The submitted campaign is invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const data = parsed.data;

  const ngo = await getNgoRepository().findByIdOrSlug(data.ngoId);
  if (!ngo) {
    throw new CampaignServiceError("VALIDATION_ERROR", "That organization does not exist.", {
      ngoId: ["Select one of your organizations"],
    });
  }
  if (!(await canManageNgo(userId, ngo.id))) {
    throw new CampaignServiceError(
      "FORBIDDEN",
      "You can only create campaigns for an organization you manage.",
    );
  }

  const campaign = await getCampaignRepository().create({
    slug: await uniqueSlug(data.title),
    ngoId: ngo.id,
    title: data.title,
    summary: data.summary,
    description: data.description,
    countryCodes: data.countryCodes,
    issueTags: data.issueTags,
    goalAmountMinor: data.goalAmountMinor,
    currency: data.currency,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    imageUrl: data.imageUrl ?? null,
    status: data.status,
    isDemoSeed: false,
  });

  const [withTotals] = await withProgress([campaign]);
  return withTotals;
}

export async function updateCampaign(
  userId: string | null,
  campaignId: string,
  input: unknown,
): Promise<CampaignWithProgress> {
  const existing = await getManagedCampaign(userId, campaignId);

  const parsed = campaignUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new CampaignServiceError(
      "VALIDATION_ERROR",
      "The submitted changes are invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  // Re-check the date order against the stored values when only one changed.
  const startDate = parsed.data.startDate ?? existing.startDate;
  const endDate = parsed.data.endDate ?? existing.endDate;
  if (startDate && endDate && endDate < startDate) {
    throw new CampaignServiceError("VALIDATION_ERROR", "The submitted changes are invalid.", {
      endDate: ["The end date cannot be before the start date"],
    });
  }

  const updated = await getCampaignRepository().update(existing.id, parsed.data);
  const [withTotals] = await withProgress([updated]);
  return withTotals;
}

export async function updateCampaignStatus(
  userId: string | null,
  campaignId: string,
  input: unknown,
): Promise<CampaignWithProgress> {
  const existing = await getManagedCampaign(userId, campaignId);

  const parsed = campaignStatusSchema.safeParse(input);
  if (!parsed.success) {
    throw new CampaignServiceError(
      "VALIDATION_ERROR",
      "The submitted status is invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const next: CampaignStatus = parsed.data.status;

  if (next === existing.status) {
    return existing;
  }
  if (!canTransitionCampaign(existing.status, next)) {
    throw new CampaignServiceError(
      "INVALID_TRANSITION",
      `A ${existing.status.toLowerCase()} campaign cannot become ${next.toLowerCase()}.`,
      { status: ["This status change is not allowed."] },
    );
  }

  const updated = await getCampaignRepository().update(existing.id, { status: next });
  const [withTotals] = await withProgress([updated]);
  return withTotals;
}
