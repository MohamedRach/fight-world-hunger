/**
 * MOCK payment methods.
 *
 * SECURITY: this is a simulated payment flow. Full card numbers, CVV/CVC
 * codes and any other sensitive credentials are never collected, transmitted,
 * logged or stored. Only display metadata is kept: brand, the last four
 * digits, cardholder name, expiry and a label. No payment provider is called
 * and no money moves.
 */

export const MOCK_CARD_BRANDS = ["VISA", "MASTERCARD", "AMEX"] as const;
export type MockCardBrand = (typeof MOCK_CARD_BRANDS)[number];

export const MOCK_CARD_BRAND_LABELS: Record<MockCardBrand, string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  AMEX: "American Express",
};

export type PaymentMethod = {
  id: string;
  /** Account id of the individual who owns this mock card. */
  ownerUserId: string;
  brand: MockCardBrand;
  /** Exactly four digits. Never a full card number. */
  last4: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  /** User-chosen nickname, e.g. "Personal card". */
  label: string;
  isDefault: boolean;
  isDemoSeed: boolean;
  createdAt: Date;
};

export type PaymentMethodView = {
  id: string;
  brand: MockCardBrand;
  brandLabel: string;
  last4: string;
  /** Pre-masked for display, e.g. "•••• •••• •••• 4242". */
  maskedNumber: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  expiryLabel: string;
  label: string;
  isDefault: boolean;
  isExpired: boolean;
  isDemoSeed: boolean;
};

/** AMEX shows 15 digits (4-6-5); the others 16 (4-4-4-4). */
export function maskCardNumber(brand: MockCardBrand, last4: string): string {
  return brand === "AMEX"
    ? `•••• •••••• •${last4}`
    : `•••• •••• •••• ${last4}`;
}

export function formatExpiry(month: number, year: number): string {
  return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

export function isCardExpired(month: number, year: number, now: Date = new Date()): boolean {
  const endOfMonth = new Date(Date.UTC(year, month, 1));
  return endOfMonth.getTime() <= now.getTime();
}

export function toPaymentMethodView(method: PaymentMethod, now?: Date): PaymentMethodView {
  return {
    id: method.id,
    brand: method.brand,
    brandLabel: MOCK_CARD_BRAND_LABELS[method.brand],
    last4: method.last4,
    maskedNumber: maskCardNumber(method.brand, method.last4),
    holderName: method.holderName,
    expMonth: method.expMonth,
    expYear: method.expYear,
    expiryLabel: formatExpiry(method.expMonth, method.expYear),
    label: method.label,
    isDefault: method.isDefault,
    isExpired: isCardExpired(method.expMonth, method.expYear, now),
    isDemoSeed: method.isDemoSeed,
  };
}
