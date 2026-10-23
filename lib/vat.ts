// Azerbaijan VAT (ƏDV): the invoice total is what the company pays; with VAT included the tax part is
// total * rate / (100 + rate). Only the standard rate and zero are offered.
export const VAT_RATES = [0, 18] as const;
export const normalizeVat = (value: unknown) => (Number(value) === 18 ? 18 : 0);
export function vatParts(totalCents: number, percent: number) {
  const vat = percent > 0 ? Math.round((totalCents * percent) / (100 + percent)) : 0;
  return { total: totalCents, vat, net: totalCents - vat };
}
