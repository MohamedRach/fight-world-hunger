import "server-only";
import { randomUUID } from "node:crypto";
import type { IndividualProfile } from "./types";

type NewProfile = Omit<IndividualProfile, "id" | "createdAt" | "updatedAt">;
type ProfileChanges = Partial<Omit<IndividualProfile, "id" | "userId" | "createdAt" | "updatedAt">>;

/**
 * Persistence boundary for individual profiles. TEMPORARY in-memory
 * implementation until the team's ORM lands (TEAM_DEVELOPMENT_GUIDE §16);
 * swap it in `getIndividualRepository()` without changing callers.
 */
export interface IndividualRepository {
  findByUserId(userId: string): Promise<IndividualProfile | null>;
  create(data: NewProfile): Promise<IndividualProfile>;
  update(userId: string, changes: ProfileChanges): Promise<IndividualProfile>;
}

class InMemoryIndividualRepository implements IndividualRepository {
  private byUserId = new Map<string, IndividualProfile>();

  async findByUserId(userId: string): Promise<IndividualProfile | null> {
    return this.byUserId.get(userId) ?? null;
  }

  async create(data: NewProfile): Promise<IndividualProfile> {
    const now = new Date();
    const profile: IndividualProfile = { ...data, id: randomUUID(), createdAt: now, updatedAt: now };
    this.byUserId.set(profile.userId, profile);
    return profile;
  }

  async update(userId: string, changes: ProfileChanges): Promise<IndividualProfile> {
    const existing = this.byUserId.get(userId);
    if (!existing) throw new Error(`Individual profile not found for user: ${userId}`);
    const updated: IndividualProfile = { ...existing, ...changes, updatedAt: new Date() };
    this.byUserId.set(userId, updated);
    return updated;
  }
}

// Survive dev-server module reloads, like a shared DB client would.
const globalStore = globalThis as unknown as { __individualRepository?: IndividualRepository };

export function getIndividualRepository(): IndividualRepository {
  globalStore.__individualRepository ??= new InMemoryIndividualRepository();
  return globalStore.__individualRepository;
}

/** Test-only: replace or reset the repository. */
export function setIndividualRepositoryForTesting(repo: IndividualRepository | undefined): void {
  globalStore.__individualRepository = repo;
}
