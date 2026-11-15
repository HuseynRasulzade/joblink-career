// The personal code of an account: it never changes and is the same everywhere (lists, messages, links), so two people
// with the same name are told apart by it. Ten hex characters, shown as JM-XXXXX-XXXXX.
export function generatePublicCode(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return `JM-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
export const formatPublicCode = (code: string) => (/^JM-[0-9A-F]{10}$/.test(code) ? `JM-${code.slice(3, 8)}-${code.slice(8)}` : code);
// What a person types (with or without dashes, any case) back to the stored form.
export const normalizePublicCode = (text: string) => {
  const hex = String(text || "").toUpperCase().replace(/^JM/, "").replace(/[^0-9A-F]/g, "");
  return hex.length === 10 ? `JM-${hex}` : "";
};
