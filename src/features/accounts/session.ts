import "server-only";
import { cookies } from "next/headers";
import { getAccountRepository, SESSION_TTL_MS } from "./repository";
import { toSessionAccount, type SessionAccount } from "./types";

export const SESSION_COOKIE = "fwh_session";

/** Starts a session for the account (Route Handlers / Server Actions only). */
export async function startSession(accountId: string): Promise<void> {
  const token = await getAccountRepository().createSession(accountId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

/** Ends the current session (Route Handlers / Server Actions only). */
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await getAccountRepository().deleteSession(token);
  store.delete(SESSION_COOKIE);
}

/** The signed-in account, or null. Safe to call from Server Components. */
export async function getCurrentAccount(): Promise<SessionAccount | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const repo = getAccountRepository();
  const accountId = await repo.findSessionAccountId(token);
  if (!accountId) return null;
  const account = await repo.findById(accountId);
  return account ? toSessionAccount(account) : null;
}
