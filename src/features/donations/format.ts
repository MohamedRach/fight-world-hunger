import type { DonationCurrency } from "./types";

// Fixed locale and time zone so server and client render identical text.
const LOCALE = "en-GB";

export function formatDonationAmount(amount: number, currency: DonationCurrency): string {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(amount);
}

export function formatDonationDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return date.toLocaleDateString(LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDonationDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return `${date.toLocaleString(LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}
