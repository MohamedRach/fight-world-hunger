export const ACCOUNT_TYPES = ["INDIVIDUAL", "NGO"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * An account is either an individual or an NGO — never both.
 * TEMPORARY: identified by email only (no password) until Developer 1's
 * real authentication lands.
 */
export type Account = {
  id: string;
  /** Lower-cased; unique across both account types. */
  email: string;
  type: AccountType;
  displayName: string;
  createdAt: Date;
};

/** What the rest of the app knows about the signed-in account. */
export type SessionAccount = {
  id: string;
  email: string;
  type: AccountType;
  displayName: string;
};

export function toSessionAccount(account: Account): SessionAccount {
  return {
    id: account.id,
    email: account.email,
    type: account.type,
    displayName: account.displayName,
  };
}
