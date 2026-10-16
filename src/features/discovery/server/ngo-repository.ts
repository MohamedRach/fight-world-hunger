import type { NgoSummary } from "../types";

/**
 * Read-side access to NGOs for discovery features.
 *
 * Implementations must only return NGOs that are publicly listable under the
 * application's verification/active-status rules; those rules are enforced
 * server-side inside the implementation, never by the caller.
 */
export interface NgoRepository {
  findByOperatingCountry(countryCode: string): Promise<NgoSummary[]>;
}

/**
 * In-memory implementation. Used by tests, and as the production repository
 * until the NGO entity and database layer exist (see docs/HUNGER_GLOBE.md,
 * "Remaining NGO integration work"). It holds no records by default, so the
 * UI truthfully reports that no NGOs are registered yet.
 */
export class InMemoryNgoRepository implements NgoRepository {
  constructor(private readonly ngos: readonly NgoSummary[] = []) {}

  async findByOperatingCountry(countryCode: string): Promise<NgoSummary[]> {
    return this.ngos.filter((ngo) =>
      ngo.operatingCountryCodes.includes(countryCode),
    );
  }
}

let repository: NgoRepository = new InMemoryNgoRepository();

export function getNgoRepository(): NgoRepository {
  return repository;
}

/** Swap the repository, e.g. for a database-backed implementation or in tests. */
export function setNgoRepository(next: NgoRepository): void {
  repository = next;
}
