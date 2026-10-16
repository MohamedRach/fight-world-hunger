/**
 * TEMPORARY development session helpers (browser-side). They set the
 * `dev-user-id` cookie read by the session stub in src/features/ngos/session.ts.
 * Replace with Developer 1's real authentication; the stub ignores this
 * cookie in production, so nothing here grants access outside development.
 */
const COOKIE = "dev-user-id";

export function setDevSession(userId: string) {
  document.cookie = `${COOKIE}=${encodeURIComponent(userId)}; path=/; max-age=86400; samesite=lax`;
}

export function clearDevSession() {
  document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
}
