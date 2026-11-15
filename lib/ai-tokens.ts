// The AI allowance of a candidate package, counted in tokens: a balance that starts again every 5 hours (so a whole month cannot be
// burnt in one day) and a monthly ceiling (so the 5-hour balance cannot be used up again and again). The ceiling is what keeps the
// net profit of the package; both are worked out from the OpenAI price (the worst case), see docs/PAKET_SIYASETI.md.
export const WINDOW_HOURS = 5;
export type TokenLimits = { window: number; month: number };
export type TokenUsed = { window: number; month: number };
export type TokenVerdict = { ok: true } | { ok: false; reason: "window" | "month"; resetAt: string };

export const windowIndex = (at: Date) => Math.floor(at.getTime() / (WINDOW_HOURS * 3_600_000));
export const windowResetAt = (at: Date) => new Date((windowIndex(at) + 1) * WINDOW_HOURS * 3_600_000).toISOString();
export const monthStartNext = (at: Date) => new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1)).toISOString();
export const windowKey = (at: Date) => `W:${windowIndex(at)}`;
export const monthPeriodKey = (at: Date) => `M:${at.toISOString().slice(0, 7)}`;
// About four characters make a token.
export const tokensOfChars = (chars: number) => Math.ceil(Math.max(0, chars) / 4);

// Whether another call may start: the 5-hour balance and the ceiling of the month must both have something left.
export function tokenVerdict(limits: TokenLimits, used: TokenUsed, now: Date): TokenVerdict {
  if (limits.month <= 0 || limits.window <= 0) return { ok: false, reason: "month", resetAt: monthStartNext(now) };
  if (used.month >= limits.month) return { ok: false, reason: "month", resetAt: monthStartNext(now) };
  if (used.window >= limits.window) return { ok: false, reason: "window", resetAt: windowResetAt(now) };
  return { ok: true };
}
export const tokensLeft = (limits: TokenLimits, used: TokenUsed) => ({
  window: Math.max(0, Math.min(limits.window - used.window, limits.month - used.month)),
  month: Math.max(0, limits.month - used.month),
});
