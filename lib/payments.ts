// Payment methods and the payment provider. Only a mock provider exists: it
// charges nothing and keeps no card number. A real provider must tokenize the
// card in the browser, so the number never reaches this server.
export type CardInput = { number: string; expMonth: number; expYear: number; holder?: string };
export type CardInfo = { brand: string; last4: string; expMonth: number; expYear: number };

export function luhn(digits: string) {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return digits.length > 0 && sum % 10 === 0;
}
export function cardBrand(digits: string) {
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "Mastercard";
  if (/^(62|81)/.test(digits)) return "UnionPay";
  if (/^3[47]/.test(digits)) return "Amex";
  return "Kart";
}
// Validates a card and returns only what may be stored: brand, last four digits and expiry.
export function parseCard(input: CardInput, now = new Date()): { card: CardInfo | null; error: string } {
  const digits = String(input.number || "").replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(digits) || !luhn(digits)) return { card: null, error: "Kart nömrəsi yanlışdır." };
  const month = Math.round(Number(input.expMonth));
  let year = Math.round(Number(input.expYear));
  if (year < 100) year += 2000;
  if (!(month >= 1 && month <= 12) || !(year >= 2000 && year <= 2100)) return { card: null, error: "Kartın bitmə tarixi yanlışdır." };
  const currentMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();
  if (year * 12 + (month - 1) < currentMonth) return { card: null, error: "Kartın müddəti bitib." };
  return { card: { brand: cardBrand(digits), last4: digits.slice(-4), expMonth: month, expYear: year }, error: "" };
}
export const cardLabel = (c: { brand: string; last4: string }) => `${c.brand} •••• ${c.last4}`;

export type ChargeResult = { ok: boolean; providerRef: string; error: string };
export type PaymentProvider = {
  name: string;
  tokenize(card: CardInfo): string;
  charge(input: { token: string; amountCents: number; currency: string; description: string }): ChargeResult;
};
// Test provider: every charge succeeds except for cards ending in 0002, which
// are declined (like the usual test card 4000 0000 0000 0002).
export const mockProvider: PaymentProvider = {
  name: "mock",
  tokenize: (card) => `mock_${crypto.randomUUID().replace(/-/g, "")}_${card.last4}`,
  charge: ({ token, amountCents }) => {
    if (amountCents < 0) return { ok: false, providerRef: "", error: "Məbləğ yanlışdır." };
    if (token.endsWith("_0002")) return { ok: false, providerRef: "", error: "Bank ödənişi qəbul etmədi." };
    return { ok: true, providerRef: `mock_ch_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`, error: "" };
  },
};
export function providerFor(name: string | undefined): PaymentProvider | null {
  return !name || name === "mock" ? mockProvider : null;
}
