// Error log helpers: messages are trimmed and stripped of e-mail addresses and long tokens before they are stored.
export function cleanErrorMessage(value: unknown, max = 300) {
  const raw = typeof value === "string" ? value : value instanceof Error ? value.message : "";
  return raw
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-poçt]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[açar]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
// The same error from many people is one line with a count: group by message and place.
export async function errorFingerprint(source: string, message: string, where: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${source}\u0000${message}\u0000${where}`));
  return Buffer.from(digest).toString("hex").slice(0, 16);
}
// A path without ids: /api/joblink/hr/assessment?id=123 -> /api/joblink/hr/assessment
export const cleanWhere = (value: unknown) => (typeof value === "string" ? value.split("?")[0].split("#")[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ":id").slice(0, 120) : "");
