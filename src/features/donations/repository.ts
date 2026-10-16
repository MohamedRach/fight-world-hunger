import "server-only";
import { randomUUID } from "node:crypto";
import type {
  Donation,
  DonationActorRole,
  DonationStatus,
  DonationStatusHistoryEntry,
} from "./types";

export type NewDonation = Omit<Donation, "id" | "status" | "createdAt" | "updatedAt">;

export type DonationListFilter = {
  status?: DonationStatus;
  /** Only donations to this NGO (canonical id). */
  ngoId?: string;
  limit: number;
  offset: number;
};

export type DonationPage = { items: Donation[]; total: number };

export type StatusChange = {
  /** The status the caller validated the transition against. */
  expectedStatus: DonationStatus;
  newStatus: DonationStatus;
  note: string | null;
  changedByUserId: string;
  changedByRole: DonationActorRole;
};

/**
 * Persistence boundary for donations and their status history.
 *
 * TEMPORARY: the team has not yet chosen an ORM (TEAM_DEVELOPMENT_GUIDE §16),
 * so the only implementation is in-memory. A PostgreSQL implementation must:
 * - insert the donation and its first history entry in one transaction;
 * - in `updateStatus`, update the status and insert the history entry in one
 *   transaction, only when the current status still equals `expectedStatus`
 *   (e.g. `UPDATE ... WHERE id = $1 AND status = $2`).
 * Swap it in `getDonationRepository()`; callers don't change.
 */
export interface DonationRepository {
  /** Creates a PENDING donation and the history entry recording its creation. */
  create(data: NewDonation): Promise<Donation>;
  findById(id: string): Promise<Donation | null>;
  /** Newest first. */
  listByDonor(donorUserId: string, filter: DonationListFilter): Promise<DonationPage>;
  /** Newest first. */
  listByNgo(ngoId: string, filter: DonationListFilter): Promise<DonationPage>;
  /** Oldest first. */
  findHistory(donationId: string): Promise<DonationStatusHistoryEntry[]>;
  /**
   * Atomically changes the status and records the history entry.
   * Returns null when the status no longer equals `expectedStatus`.
   */
  updateStatus(id: string, change: StatusChange): Promise<Donation | null>;
}

function paginate(donations: Donation[], filter: DonationListFilter): DonationPage {
  // Reversing insertion order first keeps same-millisecond donations newest first.
  const matching = donations
    .filter((donation) => !filter.status || donation.status === filter.status)
    .filter((donation) => !filter.ngoId || donation.ngoId === filter.ngoId)
    .reverse()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return {
    items: matching.slice(filter.offset, filter.offset + filter.limit),
    total: matching.length,
  };
}

class InMemoryDonationRepository implements DonationRepository {
  private donations = new Map<string, Donation>();
  private history = new Map<string, DonationStatusHistoryEntry[]>();

  async create(data: NewDonation): Promise<Donation> {
    const now = new Date();
    const donation: Donation = {
      ...data,
      id: randomUUID(),
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };
    this.donations.set(donation.id, donation);
    this.history.set(donation.id, [
      {
        id: randomUUID(),
        donationId: donation.id,
        previousStatus: null,
        newStatus: "PENDING",
        note: null,
        changedByUserId: data.donorUserId,
        changedByRole: "DONOR",
        createdAt: now,
      },
    ]);
    return donation;
  }

  async findById(id: string): Promise<Donation | null> {
    return this.donations.get(id) ?? null;
  }

  async listByDonor(donorUserId: string, filter: DonationListFilter): Promise<DonationPage> {
    return paginate(
      [...this.donations.values()].filter((donation) => donation.donorUserId === donorUserId),
      filter,
    );
  }

  async listByNgo(ngoId: string, filter: DonationListFilter): Promise<DonationPage> {
    return paginate(
      [...this.donations.values()].filter((donation) => donation.ngoId === ngoId),
      filter,
    );
  }

  async findHistory(donationId: string): Promise<DonationStatusHistoryEntry[]> {
    return [...(this.history.get(donationId) ?? [])];
  }

  // No `await` between the check and the writes, so this is atomic in-process.
  async updateStatus(id: string, change: StatusChange): Promise<Donation | null> {
    const existing = this.donations.get(id);
    if (!existing) throw new Error(`Donation not found: ${id}`);
    if (existing.status !== change.expectedStatus) return null;

    const now = new Date();
    const updated: Donation = { ...existing, status: change.newStatus, updatedAt: now };
    this.donations.set(id, updated);
    this.history.set(id, [
      ...(this.history.get(id) ?? []),
      {
        id: randomUUID(),
        donationId: id,
        previousStatus: existing.status,
        newStatus: change.newStatus,
        note: change.note,
        changedByUserId: change.changedByUserId,
        changedByRole: change.changedByRole,
        createdAt: now,
      },
    ]);
    return updated;
  }
}

// Survive dev-server module reloads the same way a shared DB client would.
const globalStore = globalThis as unknown as { __donationRepository?: DonationRepository };

export function getDonationRepository(): DonationRepository {
  globalStore.__donationRepository ??= new InMemoryDonationRepository();
  return globalStore.__donationRepository;
}

/** Test-only: replace or reset the repository. */
export function setDonationRepositoryForTesting(repo: DonationRepository | undefined): void {
  globalStore.__donationRepository = repo;
}
