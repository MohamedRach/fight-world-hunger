/**
 * Money helpers shared by campaigns and donations.
 *
 * Amounts are stored as **integer minor units** (cents) to avoid floating
 * point drift, per TEAM_DEVELOPMENT_GUIDE section 6 ("appropriate monetary
 * precision"). Only the UI converts to and from decimal input.
 */

export const CURRENCIES = ["USD", "EUR", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: "USD — US Dollar",
  EUR: "EUR — Euro",
  GBP: "GBP — British Pound",
};

/** All supported currencies use 2 decimal places. */
const MINOR_UNITS_PER_MAJOR = 100;

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/** Formats minor units for display, e.g. (125000, "USD") → "$1,250.00". */
export function formatMoney(amountMinor: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / MINOR_UNITS_PER_MAJOR);
}

/** Compact form for tight spaces, e.g. "$1.3k". Falls back to the full value. */
export function formatMoneyCompact(amountMinor: number, currency: CurrencyCode): string {
  const major = amountMinor / MINOR_UNITS_PER_MAJOR;
  if (major < 10_000) return formatMoney(amountMinor, currency);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(major);
}

/** Minor units → decimal string suitable for a number input ("1250.00"). */
export function minorToDecimalString(amountMinor: number): string {
  return (amountMinor / MINOR_UNITS_PER_MAJOR).toFixed(2);
}

/**
 * Parses user input (e.g. "25", "25.50") into minor units.
 * Returns null when the value is not a positive, two-decimal amount.
 */
export function parseAmountToMinor(input: string | number): number | null {
  const raw = typeof input === "number" ? String(input) : input.trim().replace(/,/g, "");
  if (raw === "" || !/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const minor = Math.round(Number(raw) * MINOR_UNITS_PER_MAJOR);
  if (!Number.isSafeInteger(minor) || minor <= 0) return null;
  return minor;
}

/** Progress of `raised` against `goal`, clamped to 0–100 and rounded. */
export function progressPercentage(raisedMinor: number, goalMinor: number): number {
  if (goalMinor <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((raisedMinor / goalMinor) * 100)));
}
