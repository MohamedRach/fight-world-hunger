import "server-only";
import { cookies, headers } from "next/headers";

export type SessionUser = {
  id: string;
};

/**
 * TEMPORARY AUTH STUB — to be replaced by Developer 1's shared auth helper
 * (see docs/API_CONTRACTS.md "Authentication note").
 *
 * Outside production the current user is resolved from the `x-dev-user-id`
 * request header (API calls) or the `dev-user-id` cookie (browser pages) so
 * the feature can be exercised end-to-end. In production this stub always
 * returns null (no authenticated user), which fails closed: all mutating NGO
 * operations are rejected until real auth exists.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  const headerList = await headers();
  const fromHeader = headerList.get("x-dev-user-id")?.trim();
  if (fromHeader) return { id: fromHeader };

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("dev-user-id")?.value.trim();
  return fromCookie ? { id: fromCookie } : null;
}
