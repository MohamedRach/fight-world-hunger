import "server-only";
import type { SessionAccount } from "@/features/accounts/types";
import { getMyIndividualProfile } from "@/features/individuals/service";
import { canManageNgo, getPublicNgoProfile } from "@/features/ngos/service";
import { fieldErrorsFromZod } from "@/features/ngos/validation";
import { getDonationRepository, type DonationListFilter } from "./repository";
import { allowedNextStatuses, canTransition } from "./status";
import {
  DONATION_STATUS_LABELS,
  type Donation,
  type DonationActorRole,
  type DonationDetail,
  type DonationList,
  type DonationNgoSummary,
  type DonationStatusHistoryEntry,
  type DonationView,
} from "./types";
import {
  donationCreateSchema,
  donationListQuerySchema,
  donationStatusUpdateSchema,
  fromMinorUnits,
  toMinorUnits,
} from "./validation";

export type DonationServiceErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "STATUS_CONFLICT";

export class DonationServiceError extends Error {
  readonly code: DonationServiceErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: DonationServiceErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "DonationServiceError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** The signed-in account, as provided by the session helper. */
export type DonationViewer = Pick<SessionAccount, "id" | "type" | "displayName">;

function requireViewer(viewer: DonationViewer | null): DonationViewer {
  if (!viewer) {
    throw new DonationServiceError("UNAUTHENTICATED", "You must be signed in.");
  }
  return viewer;
}

/** Resolves NGO summaries once per call, for lists that repeat the same NGO. */
function ngoSummaryLoader() {
  const cache = new Map<string, Promise<DonationNgoSummary>>();
  return (ngoId: string): Promise<DonationNgoSummary> => {
    let summary = cache.get(ngoId);
    if (!summary) {
      summary = getPublicNgoProfile(ngoId).then((ngo) =>
        ngo
          ? { id: ngo.id, slug: ngo.slug, name: ngo.name }
          : { id: ngoId, slug: ngoId, name: "Unknown organization" },
      );
      cache.set(ngoId, summary);
    }
    return summary;
  };
}

function toView(
  donation: Donation,
  ngo: DonationNgoSummary,
  role: DonationActorRole,
): DonationView {
  return {
    id: donation.id,
    ngo,
    amount: fromMinorUnits(donation.amountMinor),
    currency: donation.currency,
    message: donation.message,
    isAnonymous: donation.isAnonymous,
    // Honour the donor's anonymity: the NGO never sees an anonymous donor's name.
    donorName: role === "NGO" && donation.isAnonymous ? null : donation.donorName,
    status: donation.status,
    createdAt: donation.createdAt.toISOString(),
    updatedAt: donation.updatedAt.toISOString(),
  };
}

function toDetail(
  donation: Donation,
  ngo: DonationNgoSummary,
  role: DonationActorRole,
  history: DonationStatusHistoryEntry[],
): DonationDetail {
  return {
    ...toView(donation, ngo, role),
    history: history.map((entry) => ({
      id: entry.id,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      note: entry.note,
      actor: entry.changedByRole,
      createdAt: entry.createdAt.toISOString(),
    })),
    viewerRole: role,
    allowedNextStatuses: role === "NGO" ? allowedNextStatuses(donation.status) : [],
  };
}

/** The viewer's relationship to a donation, or null when they may not see it. */
async function roleFor(
  viewer: DonationViewer,
  donation: Donation,
): Promise<DonationActorRole | null> {
  if (viewer.type === "INDIVIDUAL") {
    return donation.donorUserId === viewer.id ? "DONOR" : null;
  }
  return (await canManageNgo(viewer.id, donation.ngoId)) ? "NGO" : null;
}

/** Finds a donation the viewer may see. Others get NOT_FOUND so ids can't be probed. */
async function findAccessibleDonation(
  viewer: DonationViewer,
  donationId: string,
): Promise<{ donation: Donation; role: DonationActorRole }> {
  const donation = await getDonationRepository().findById(donationId);
  const role = donation ? await roleFor(viewer, donation) : null;
  if (!donation || !role) {
    throw new DonationServiceError("NOT_FOUND", "Donation not found.");
  }
  return { donation, role };
}

/** An individual pledges a donation to an NGO. It starts as PENDING. */
export async function createDonation(
  viewer: DonationViewer | null,
  input: unknown,
): Promise<DonationDetail> {
  const donor = requireViewer(viewer);
  if (donor.type !== "INDIVIDUAL") {
    throw new DonationServiceError(
      "FORBIDDEN",
      "Only individual accounts can make donations. NGO accounts can't.",
    );
  }

  const parsed = donationCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new DonationServiceError(
      "VALIDATION_ERROR",
      "The donation details are invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const data = parsed.data;

  const ngo = await getPublicNgoProfile(data.ngoId);
  if (!ngo) {
    throw new DonationServiceError("VALIDATION_ERROR", "This NGO doesn't exist.", {
      ngoId: ["Select an existing NGO"],
    });
  }

  const profile = await getMyIndividualProfile(donor.id);
  const repo = getDonationRepository();
  const donation = await repo.create({
    donorUserId: donor.id,
    donorName: profile?.fullName ?? donor.displayName,
    ngoId: ngo.id,
    amountMinor: toMinorUnits(data.amount),
    currency: data.currency,
    message: data.message,
    isAnonymous: data.isAnonymous ?? profile?.donateAnonymously ?? false,
  });

  return toDetail(
    donation,
    { id: ngo.id, slug: ngo.slug, name: ngo.name },
    "DONOR",
    await repo.findHistory(donation.id),
  );
}

/**
 * Lists donations visible to the viewer, newest first:
 * - individuals see the donations they made (optionally for one NGO);
 * - NGO accounts must pass `ngoId` and see donations that NGO received.
 */
export async function listDonations(
  viewer: DonationViewer | null,
  query: unknown,
): Promise<DonationList> {
  const user = requireViewer(viewer);

  const parsed = donationListQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new DonationServiceError(
      "VALIDATION_ERROR",
      "The list parameters are invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const { ngoId, status, limit, offset } = parsed.data;
  const filter: DonationListFilter = { status, limit, offset };
  const repo = getDonationRepository();

  if (user.type === "INDIVIDUAL") {
    if (ngoId) {
      const ngo = await getPublicNgoProfile(ngoId);
      if (!ngo) return { items: [], total: 0, limit, offset };
      filter.ngoId = ngo.id;
    }
    const page = await repo.listByDonor(user.id, filter);
    const loadNgo = ngoSummaryLoader();
    return {
      items: await Promise.all(
        page.items.map(async (donation) =>
          toView(donation, await loadNgo(donation.ngoId), "DONOR"),
        ),
      ),
      total: page.total,
      limit,
      offset,
    };
  }

  if (!ngoId) {
    throw new DonationServiceError("VALIDATION_ERROR", "Choose which NGO's donations to list.", {
      ngoId: ["Required for NGO accounts"],
    });
  }
  const ngo = await getPublicNgoProfile(ngoId);
  if (!ngo) {
    throw new DonationServiceError("NOT_FOUND", "NGO not found.");
  }
  if (!(await canManageNgo(user.id, ngo.id))) {
    throw new DonationServiceError(
      "FORBIDDEN",
      "You are not authorized to view this NGO's donations.",
    );
  }
  const summary: DonationNgoSummary = { id: ngo.id, slug: ngo.slug, name: ngo.name };
  const page = await repo.listByNgo(ngo.id, filter);
  return {
    items: page.items.map((donation) => toView(donation, summary, "NGO")),
    total: page.total,
    limit,
    offset,
  };
}

/** One donation with its tracking history, for its donor or the receiving NGO. */
export async function getDonation(
  viewer: DonationViewer | null,
  donationId: string,
): Promise<DonationDetail> {
  const user = requireViewer(viewer);
  const { donation, role } = await findAccessibleDonation(user, donationId);
  return toDetail(
    donation,
    await ngoSummaryLoader()(donation.ngoId),
    role,
    await getDonationRepository().findHistory(donation.id),
  );
}

/** A representative of the receiving NGO moves the donation to its next status. */
export async function updateDonationStatus(
  viewer: DonationViewer | null,
  donationId: string,
  input: unknown,
): Promise<DonationDetail> {
  const user = requireViewer(viewer);
  const { donation, role } = await findAccessibleDonation(user, donationId);
  if (role !== "NGO") {
    throw new DonationServiceError(
      "FORBIDDEN",
      "Only the NGO receiving this donation can update its status.",
    );
  }

  const parsed = donationStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new DonationServiceError(
      "VALIDATION_ERROR",
      "The status update is invalid.",
      fieldErrorsFromZod(parsed.error),
    );
  }
  const { status, note } = parsed.data;

  if (!canTransition(donation.status, status)) {
    const message =
      donation.status === status
        ? `This donation is already ${DONATION_STATUS_LABELS[status].toLowerCase()}.`
        : `A ${DONATION_STATUS_LABELS[donation.status].toLowerCase()} donation can't be marked as ${DONATION_STATUS_LABELS[status].toLowerCase()}.`;
    throw new DonationServiceError("INVALID_STATUS_TRANSITION", message, { status: [message] });
  }

  const repo = getDonationRepository();
  const updated = await repo.updateStatus(donation.id, {
    expectedStatus: donation.status,
    newStatus: status,
    note,
    changedByUserId: user.id,
    changedByRole: "NGO",
  });
  if (!updated) {
    throw new DonationServiceError(
      "STATUS_CONFLICT",
      "This donation was just updated by someone else. Reload the page and try again.",
    );
  }

  return toDetail(
    updated,
    await ngoSummaryLoader()(updated.ngoId),
    "NGO",
    await repo.findHistory(updated.id),
  );
}
