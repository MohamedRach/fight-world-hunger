import "server-only";
import { randomUUID } from "node:crypto";
import type { Campaign } from "./types";

type NewCampaign = Omit<Campaign, "id" | "createdAt" | "updatedAt">;
type CampaignChanges = Partial<Omit<Campaign, "id" | "ngoId" | "createdAt" | "updatedAt">>;

/**
 * Persistence boundary for campaigns.
 *
 * TEMPORARY: mirrors the in-memory pattern used by the NGO, individual and
 * account repositories until the team's ORM lands (TEAM_DEVELOPMENT_GUIDE
 * section 16). Seed records come from src/mocks/campaigns.json. Swap the
 * implementation in `getCampaignRepository()`; no caller changes.
 */
export interface CampaignRepository {
  findById(id: string): Promise<Campaign | null>;
  findByIdOrSlug(idOrSlug: string): Promise<Campaign | null>;
  findByNgo(ngoId: string): Promise<Campaign[]>;
  /** Campaigns serving a country. One record can serve many countries. */
  findByCountry(countryCode: string): Promise<Campaign[]>;
  findAll(): Promise<Campaign[]>;
  create(data: NewCampaign): Promise<Campaign>;
  update(id: string, changes: CampaignChanges): Promise<Campaign>;
}

class InMemoryCampaignRepository implements CampaignRepository {
  private campaigns = new Map<string, Campaign>();

  async findById(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) ?? null;
  }

  async findByIdOrSlug(idOrSlug: string): Promise<Campaign | null> {
    const byId = this.campaigns.get(idOrSlug);
    if (byId) return byId;
    for (const campaign of this.campaigns.values()) {
      if (campaign.slug === idOrSlug) return campaign;
    }
    return null;
  }

  async findByNgo(ngoId: string): Promise<Campaign[]> {
    return [...this.campaigns.values()]
      .filter((campaign) => campaign.ngoId === ngoId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByCountry(countryCode: string): Promise<Campaign[]> {
    return [...this.campaigns.values()]
      .filter((campaign) => campaign.countryCodes.includes(countryCode))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findAll(): Promise<Campaign[]> {
    return [...this.campaigns.values()];
  }

  async create(data: NewCampaign): Promise<Campaign> {
    const now = new Date();
    const campaign: Campaign = { ...data, id: randomUUID(), createdAt: now, updatedAt: now };
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async update(id: string, changes: CampaignChanges): Promise<Campaign> {
    const existing = this.campaigns.get(id);
    if (!existing) throw new Error(`Campaign not found: ${id}`);
    const updated: Campaign = { ...existing, ...changes, id, updatedAt: new Date() };
    this.campaigns.set(id, updated);
    return updated;
  }
}

// Survive dev-server module reloads, like a shared DB client would.
const globalStore = globalThis as unknown as { __campaignRepository?: CampaignRepository };

export function getCampaignRepository(): CampaignRepository {
  globalStore.__campaignRepository ??= new InMemoryCampaignRepository();
  return globalStore.__campaignRepository;
}
