// Rough AI cost estimates for the admin usage panel. Prices are USD per 1M tokens and only an estimate:
// text is counted as ~4 characters per token. Check the provider's price list and adjust when it changes.
export const AI_PRICES: Record<string, { input: number; output: number }> = {
  deepseek: { input: 0.3, output: 1.2 },
  openai: { input: 1.5, output: 10 },
};
export const tokensOf = (chars: number) => Math.ceil(chars / 4);
export function estimateCost(provider: string, charsIn: number, charsOut: number) {
  const price = AI_PRICES[provider] || AI_PRICES.openai;
  return Math.round(((tokensOf(charsIn) * price.input + tokensOf(charsOut) * price.output) / 1_000_000) * 10000) / 10000;
}

export type AiUsageRow = { day: string; feature: string; provider: string; user_id: string; calls: number; chars_in: number; chars_out: number; errors: number };
// Totals per feature, per day and per person, with the estimated cost of each.
export function summarizeAiUsage(rows: AiUsageRow[], names: Map<string, string> = new Map()) {
  const sum = (list: AiUsageRow[]) => ({
    calls: list.reduce((n, r) => n + r.calls, 0),
    errors: list.reduce((n, r) => n + r.errors, 0),
    tokens: list.reduce((n, r) => n + tokensOf(r.chars_in) + tokensOf(r.chars_out), 0),
    cost: Math.round(list.reduce((n, r) => n + estimateCost(r.provider, r.chars_in, r.chars_out), 0) * 100) / 100,
  });
  const group = (key: (r: AiUsageRow) => string) => {
    const map = new Map<string, AiUsageRow[]>();
    for (const r of rows) map.set(key(r), [...(map.get(key(r)) || []), r]);
    return map;
  };
  return {
    total: sum(rows),
    byFeature: [...group((r) => r.feature)].map(([feature, list]) => ({ feature, ...sum(list) })).sort((a, b) => b.cost - a.cost || b.calls - a.calls),
    byProvider: [...group((r) => r.provider)].map(([provider, list]) => ({ provider, ...sum(list) })),
    byDay: [...group((r) => r.day)].map(([day, list]) => ({ day, ...sum(list) })).sort((a, b) => (a.day < b.day ? 1 : -1)),
    byUser: [...group((r) => r.user_id)]
      .filter(([id]) => id)
      .map(([id, list]) => ({ user: names.get(id) || "Silinmiş hesab", ...sum(list) }))
      .sort((a, b) => b.cost - a.cost || b.calls - a.calls)
      .slice(0, 20),
  };
}
