import "server-only";
import { randomUUID } from "node:crypto";
import type { Ngo, NgoMembership, NgoMemberRole } from "./types";

/**
 * Persistence boundary for the NGO feature.
 *
 * TEMPORARY: the team has not yet chosen an ORM (TEAM_DEVELOPMENT_GUIDE §16),
 * so the only implementation is in-memory. When Prisma/Drizzle lands
 * (Developer 1), implement this interface against PostgreSQL and swap it in
 * `getNgoRepository()` — no callers need to change.
 */
export interface NgoRepository {
  findById(id: string): Promise<Ngo | null>;
  findByIdOrSlug(idOrSlug: string): Promise<Ngo | null>;
  findByName(name: string): Promise<Ngo | null>;
  findByRegistrationId(registrationId: string): Promise<Ngo | null>;
  create(data: Omit<Ngo, "id" | "createdAt" | "updatedAt">): Promise<Ngo>;
  update(id: string, data: Partial<Omit<Ngo, "id" | "createdAt" | "updatedAt">>): Promise<Ngo>;
  findMembership(userId: string, ngoId: string): Promise<NgoMembership | null>;
  findMembershipsByUser(userId: string): Promise<NgoMembership[]>;
  addMembership(userId: string, ngoId: string, role: NgoMemberRole): Promise<NgoMembership>;
}

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

class InMemoryNgoRepository implements NgoRepository {
  private ngos = new Map<string, Ngo>();
  private memberships = new Map<string, NgoMembership>();

  async findById(id: string): Promise<Ngo | null> {
    return this.ngos.get(id) ?? null;
  }

  async findByIdOrSlug(idOrSlug: string): Promise<Ngo | null> {
    const byId = this.ngos.get(idOrSlug);
    if (byId) return byId;
    for (const ngo of this.ngos.values()) {
      if (ngo.slug === idOrSlug) return ngo;
    }
    return null;
  }

  async findByName(name: string): Promise<Ngo | null> {
    const normalized = name.trim().toLowerCase();
    for (const ngo of this.ngos.values()) {
      if (ngo.name.toLowerCase() === normalized) return ngo;
    }
    return null;
  }

  async findByRegistrationId(registrationId: string): Promise<Ngo | null> {
    for (const ngo of this.ngos.values()) {
      if (ngo.registrationId === registrationId) return ngo;
    }
    return null;
  }

  async create(data: Omit<Ngo, "id" | "createdAt" | "updatedAt">): Promise<Ngo> {
    const now = new Date();
    const ngo: Ngo = { ...data, id: randomUUID(), createdAt: now, updatedAt: now };
    this.ngos.set(ngo.id, ngo);
    return ngo;
  }

  async update(
    id: string,
    data: Partial<Omit<Ngo, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Ngo> {
    const existing = this.ngos.get(id);
    if (!existing) throw new Error(`NGO not found: ${id}`);
    const updated: Ngo = { ...existing, ...data, id, updatedAt: new Date() };
    this.ngos.set(id, updated);
    return updated;
  }

  async findMembership(userId: string, ngoId: string): Promise<NgoMembership | null> {
    return this.memberships.get(`${userId}:${ngoId}`) ?? null;
  }

  async findMembershipsByUser(userId: string): Promise<NgoMembership[]> {
    return [...this.memberships.values()].filter((m) => m.userId === userId);
  }

  async addMembership(
    userId: string,
    ngoId: string,
    role: NgoMemberRole,
  ): Promise<NgoMembership> {
    const membership: NgoMembership = {
      id: randomUUID(),
      userId,
      ngoId,
      role,
      createdAt: new Date(),
    };
    this.memberships.set(`${userId}:${ngoId}`, membership);
    return membership;
  }
}

// Survive dev-server module reloads the same way a shared DB client would.
const globalStore = globalThis as unknown as { __ngoRepository?: NgoRepository };

export function getNgoRepository(): NgoRepository {
  globalStore.__ngoRepository ??= new InMemoryNgoRepository();
  return globalStore.__ngoRepository;
}

/** Test-only: replace or reset the repository. */
export function setNgoRepositoryForTesting(repo: NgoRepository | undefined): void {
  globalStore.__ngoRepository = repo;
}
