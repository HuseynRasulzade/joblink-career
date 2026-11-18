// Azerbaijan VAT (ƏDV): the invoice total is what the company pays; with VAT included the tax part is
// total * rate / (100 + rate). Only the standard rate and zero are offered.
export const VAT_RATES = [0, 18] as const;
export const normalizeVat = (value: unknown) => (Number(value) === 18 ? 18 : 0);
export function vatParts(totalCents: number, percent: number) {
  const vat = percent > 0 ? Math.round((totalCents * percent) / (100 + percent)) : 0;
  return { total: totalCents, vat, net: totalCents - vat };
}

// Package prices are shown WITHOUT VAT; 18% VAT is added when the invoice or payment is made.
export const PACKAGE_VAT_PERCENT = 18;
// The VAT amount and the total of a net price, in AZN with two decimals.
export const vatAzn = (netAzn: number) => Math.round(netAzn * PACKAGE_VAT_PERCENT) / 100;
export const withVatAzn = (netAzn: number) => Math.round(netAzn * (100 + PACKAGE_VAT_PERCENT)) / 100;
// The amount charged or invoiced, in qəpik (VAT included).
export const grossCents = (netAzn: number) => Math.round(netAzn * (100 + PACKAGE_VAT_PERCENT));
