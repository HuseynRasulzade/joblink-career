// AI cost for the admin usage panel. Prices are USD per 1M tokens (the admin can change them in the panel when the provider's list changes).
// A call whose provider answer carried the real token counts is priced from those counts ("real"); older calls and calls without a
// `usage` block fall back to an estimate (about 4 characters = 1 token), and the panel says how large each share is.
export type AiPrice = { input: number; cachedInput: number; output: number };
export const AI_PRICES: Record<string, AiPrice> = {
  deepseek: { input: 0.3, cachedInput: 0.03, output: 1.2 },
  openai: { input: 1.5, cachedInput: 0.15, output: 10 },
};
export type AiPrices = Record<string, AiPrice>;
// Admin prices over the defaults; wrong values are ignored.
export function mergePrices(stored: unknown): AiPrices {
  const out: AiPrices = JSON.parse(JSON.stringify(AI_PRICES));
  if (stored && typeof stored === "object") {
    for (const [provider, value] of Object.entries(stored as Record<string, Partial<AiPrice>>)) {
      const base = out[provider] || { ...AI_PRICES.openai };
      const pick = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1000 ? Number(v) : fallback);
      out[provider] = { input: pick(value?.input, base.input), cachedInput: pick(value?.cachedInput, base.cachedInput), output: pick(value?.output, base.output) };
    }
  }
  return out;
}
export const tokensOf = (chars: number) => Math.ceil(chars / 4);
export function estimateCost(provider: string, charsIn: number, charsOut: number, prices: AiPrices = AI_PRICES) {
  const price = prices[provider] || prices.openai || AI_PRICES.openai;
  return Math.round(((tokensOf(charsIn) * price.input + tokensOf(charsOut) * price.output) / 1_000_000) * 10000) / 10000;
}

export type AiUsageRow = { day: string; feature: string; provider: string; user_id: string; calls: number; chars_in: number; chars_out: number; errors: number; tokens_in?: number; tokens_out?: number; tokens_cached?: number; measured?: number };
// Cost of one aggregated row: the measured calls are priced from the real token counts, the rest (calls - measured) from the character estimate.
export function rowCost(r: AiUsageRow, prices: AiPrices = AI_PRICES) {
  const price = prices[r.provider] || prices.openai || AI_PRICES.openai;
  const calls = Math.max(1, r.calls);
  const measured = Math.min(calls, Math.max(0, r.measured || 0));
  const tin = Number(r.tokens_in) || 0;
  const cached = Math.min(tin, Number(r.tokens_cached) || 0);
  const real = measured ? ((tin - cached) * price.input + cached * price.cachedInput + (Number(r.tokens_out) || 0) * price.output) / 1_000_000 : 0;
  const rest = (calls - measured) / calls;
  const estimated = rest > 0 ? estimateCost(r.provider, r.chars_in * rest, r.chars_out * rest, prices) : 0;
  const realTokens = measured ? tin + (Number(r.tokens_out) || 0) : 0;
  const estTokens = rest > 0 ? tokensOf(r.chars_in * rest) + tokensOf(r.chars_out * rest) : 0;
  return { cost: real + estimated, real, estimated, tokens: realTokens + estTokens, measuredCalls: measured, calls: r.calls };
}
// Totals per feature, per day and per person, with the estimated cost of each.
export function summarizeAiUsage(allRows: AiUsageRow[], names: Map<string, string> = new Map(), prices: AiPrices = AI_PRICES) {
  // Rows of the provider «cache» are answers served from memory: no call to the AI, no cost.
  const rows = allRows.filter((r) => r.provider !== "cache");
  const savedRows = allRows.filter((r) => r.provider === "cache");
  const sum = (list: AiUsageRow[]) => {
    const parts = list.map((r) => rowCost(r, prices));
    const calls = list.reduce((n, r) => n + r.calls, 0);
    const measured = parts.reduce((n, x) => n + x.measuredCalls, 0);
    return {
      calls,
      errors: list.reduce((n, r) => n + r.errors, 0),
      tokens: Math.round(parts.reduce((n, x) => n + x.tokens, 0)),
      cost: Math.round(parts.reduce((n, x) => n + x.cost, 0) * 100) / 100,
      // Share of the calls priced from real provider token counts (100 = the whole cost is real, 0 = a pure estimate).
      realShare: calls ? Math.round((measured / calls) * 100) : 0,
    };
  };
  const group = (key: (r: AiUsageRow) => string, source: AiUsageRow[] = rows) => {
    const map = new Map<string, AiUsageRow[]>();
    for (const r of source) map.set(key(r), [...(map.get(key(r)) || []), r]);
    return map;
  };
  return {
    total: sum(rows),
    // Served from memory instead of the AI, per kind of judgement, and what share of all requests that is.
    saved: {
      calls: savedRows.reduce((n, r) => n + r.calls, 0),
      share: rows.reduce((n, r) => n + r.calls, 0) + savedRows.reduce((n, r) => n + r.calls, 0) ? Math.round((savedRows.reduce((n, r) => n + r.calls, 0) / (rows.reduce((n, r) => n + r.calls, 0) + savedRows.reduce((n, r) => n + r.calls, 0))) * 100) : 0,
      byFeature: [...group((r) => r.feature, savedRows)].map(([feature, list]) => ({ feature: feature.replace(/^saved:/, ""), calls: list.reduce((n, r) => n + r.calls, 0) })).sort((a, b) => b.calls - a.calls),
    },
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
