// The code a company gives an employee so the employee's own account can be linked to the employee record.
// It is shown once, kept only as a hash, works once and runs out after a week.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
export const LINK_CODE_DAYS = 7;
export const LINK_ATTEMPTS_PER_HOUR = 8;

export function generateLinkCode(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
export const formatLinkCode = (code: string) => (code.length === 10 ? `${code.slice(0, 5)}-${code.slice(5)}` : code);
export const normalizeLinkCode = (text: string) => String(text || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const validLinkCode = (code: string) => code.length === 10 && [...code].every((c) => ALPHABET.includes(c));

export async function hashLinkCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`joblink-employee-link:${code}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
export const linkExpiry = (now: Date, days = LINK_CODE_DAYS) => new Date(now.getTime() + days * 86_400_000).toISOString();
export const linkExpired = (expires: string, now: Date) => !expires || expires < now.toISOString();
