import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { Account } from "./types";

type Session = { accountId: string; expiresAt: Date };

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * TEMPORARY in-memory accounts and sessions, until the team's database and
 * Developer 1's authentication land. Swap the implementation in
 * `getAccountRepository()`; callers don't change.
 */
export interface AccountRepository {
  findByEmail(email: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  create(data: Omit<Account, "id" | "createdAt">): Promise<Account>;
  delete(id: string): Promise<void>;
  createSession(accountId: string): Promise<string>;
  findSessionAccountId(token: string): Promise<string | null>;
  deleteSession(token: string): Promise<void>;
}

class InMemoryAccountRepository implements AccountRepository {
  private accounts = new Map<string, Account>();
  private sessions = new Map<string, Session>();

  async findByEmail(email: string): Promise<Account | null> {
    const normalized = email.trim().toLowerCase();
    for (const account of this.accounts.values()) {
      if (account.email === normalized) return account;
    }
    return null;
  }

  async findById(id: string): Promise<Account | null> {
    return this.accounts.get(id) ?? null;
  }

  async create(data: Omit<Account, "id" | "createdAt">): Promise<Account> {
    const account: Account = {
      ...data,
      email: data.email.trim().toLowerCase(),
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.accounts.set(account.id, account);
    return account;
  }

  async delete(id: string): Promise<void> {
    this.accounts.delete(id);
    for (const [token, session] of this.sessions) {
      if (session.accountId === id) this.sessions.delete(token);
    }
  }

  async createSession(accountId: string): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    // Date, not a number: comparisons stay consistent and the value is stable
    // during prerender (this read used to make Next.js log an error).
    this.sessions.set(token, { accountId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
    return token;
  }

  async findSessionAccountId(token: string): Promise<string | null> {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    return session.accountId;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}

const globalStore = globalThis as unknown as { __accountRepository?: AccountRepository };

export function getAccountRepository(): AccountRepository {
  globalStore.__accountRepository ??= new InMemoryAccountRepository();
  return globalStore.__accountRepository;
}

/** Test-only: replace or reset the repository. */
export function setAccountRepositoryForTesting(repo: AccountRepository | undefined): void {
  globalStore.__accountRepository = repo;
}
