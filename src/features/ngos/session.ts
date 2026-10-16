import "server-only";
import { getCurrentAccount } from "@/features/accounts/session";
import type { SessionAccount } from "@/features/accounts/types";

export type SessionUser = SessionAccount;

/**
 * The signed-in account. Delegates to the temporary account system in
 * src/features/accounts (email + password, in-memory) until Developer 1's
 * authentication replaces it.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  return getCurrentAccount();
}
