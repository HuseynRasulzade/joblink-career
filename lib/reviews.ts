// Company reviews by candidates who applied to the company; every review is checked by an admin before it shows.
export type ReviewInput = { rating: number; title: string; body: string };
const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

export function sanitizeReview(input: unknown): ReviewInput | { error: string } {
  const v = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const rating = Math.round(Number(v.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { error: "Qiymət 1-dən 5-ə qədər olmalıdır." };
  const body = text(v.body, 1500);
  if (body.length < 20) return { error: "Rəyi ən azı 20 simvolla yazın (nə yaxşı, nə pis idi)." };
  return { rating, title: text(v.title, 100), body };
}

export function summarizeRatings(ratings: number[]) {
  if (!ratings.length) return { count: 0, average: null as number | null, distribution: [0, 0, 0, 0, 0] };
  const distribution = [1, 2, 3, 4, 5].map((n) => ratings.filter((r) => r === n).length);
  return { count: ratings.length, average: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10, distribution };
}
