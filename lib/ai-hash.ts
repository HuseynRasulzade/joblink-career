// What decides whether the AI has to look at something again. A saved AI judgement is reused while the meaning of its input is the same:
// spaces, capital letters, punctuation and a year of experience that grows by a day do not change the meaning, so they do not change the hash.
const fold = (value: string) =>
  value
    .toLocaleLowerCase("az")
    .replace(/[^\p{L}\p{N}+#.]+/gu, " ")
    .replace(/\.(?=\s|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Years of experience are kept in steps of half a year (a person's total grows every day, but a judgement does not change with a day).
const HALF_YEAR_KEYS = new Set(["relevantYears", "totalYears", "years", "experience"]);

export function hashable(value: unknown, key = ""): unknown {
  if (typeof value === "string") return fold(value);
  if (typeof value === "number") return HALF_YEAR_KEYS.has(key) ? Math.round(value * 2) / 2 : value;
  if (Array.isArray(value)) return value.map((item) => hashable(item, key));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) out[k] = hashable((value as Record<string, unknown>)[k], k);
    return out;
  }
  return value;
}

export async function stableHash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(hashable(value))));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
