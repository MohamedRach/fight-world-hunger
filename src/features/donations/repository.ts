import "server-only";
import { randomUUID } from "node:crypto";
import type { Donation } from "./types";

type NewDonation = Omit<Donation, "id" | "createdAt" | "updatedAt">;
type DonationChanges = Partial<
  Omit<Donation, "id" | "donorUserId" | "campaignId" | "ngoId" | "createdAt" | "updatedAt">
>;

/**
 * Persistence boundary for donations.
 *
 * TEMPORARY in-memory implementation, matching the other repositories until
 * the team's ORM lands (TEAM_DEVELOPMENT_GUIDE section 16). Seed records come
 * from src/mocks/donations.json.
 */
export interface DonationRepository {
  findById(id: string): Promise<Donation | null>;
  findByDonor(donorUserId: string): Promise<Donation[]>;
  findByCampaign(campaignId: string): Promise<Donation[]>;
  findByCampaigns(campaignIds: string[]): Promise<Donation[]>;
  /** Looks up a donation by its idempotency key, to reject double submits. */
  findByRequestId(donorUserId: string, requestId: string): Promise<Donation | null>;
  create(data: NewDonation, requestId?: string): Promise<Donation>;
  update(id: string, changes: DonationChanges): Promise<Donation>;
}

class InMemoryDonationRepository implements DonationRepository {
  private donations = new Map<string, Donation>();
  /** `${donorUserId}:${requestId}` → donation id. */
  private requestIds = new Map<string, string>();

  private byCreatedAtDesc(a: Donation, b: Donation): number {
    return b.createdAt.getTime() - a.createdAt.getTime();
  }

  async findById(id: string): Promise<Donation | null> {
    return this.donations.get(id) ?? null;
  }

  async findByDonor(donorUserId: string): Promise<Donation[]> {
    return [...this.donations.values()]
      .filter((donation) => donation.donorUserId === donorUserId)
      .sort(this.byCreatedAtDesc);
  }

  async findByCampaign(campaignId: string): Promise<Donation[]> {
    return [...this.donations.values()]
      .filter((donation) => donation.campaignId === campaignId)
      .sort(this.byCreatedAtDesc);
  }

  async findByCampaigns(campaignIds: string[]): Promise<Donation[]> {
    const wanted = new Set(campaignIds);
    return [...this.donations.values()]
      .filter((donation) => wanted.has(donation.campaignId))
      .sort(this.byCreatedAtDesc);
  }

  async findByRequestId(donorUserId: string, requestId: string): Promise<Donation | null> {
    const id = this.requestIds.get(`${donorUserId}:${requestId}`);
    return id ? (this.donations.get(id) ?? null) : null;
  }

  async create(data: NewDonation, requestId?: string): Promise<Donation> {
    const now = new Date();
    const donation: Donation = { ...data, id: randomUUID(), createdAt: now, updatedAt: now };
    this.donations.set(donation.id, donation);
    if (requestId) {
      this.requestIds.set(`${donation.donorUserId}:${requestId}`, donation.id);
    }
    return donation;
  }

  async update(id: string, changes: DonationChanges): Promise<Donation> {
    const existing = this.donations.get(id);
    if (!existing) throw new Error(`Donation not found: ${id}`);
    const updated: Donation = { ...existing, ...changes, id, updatedAt: new Date() };
    this.donations.set(id, updated);
    return updated;
  }
}

const globalStore = globalThis as unknown as { __donationRepository?: DonationRepository };

export function getDonationRepository(): DonationRepository {
  globalStore.__donationRepository ??= new InMemoryDonationRepository();
  return globalStore.__donationRepository;
}
