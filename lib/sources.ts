// Where an application came from. "platform", "auto" and "invite" are set by the server;
// the rest come from a tracking link such as /?job=ID&src=linkedin that the employer shares.
export const EXTERNAL_SOURCES = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "telegram", label: "Telegram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "E-poçt" },
  { id: "referral", label: "Tövsiyə (tanışlıq)" },
  { id: "other", label: "Digər" },
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  platform: "Joblink saytı",
  auto: "AI avtomatik müraciət",
  invite: "Şirkətin dəvəti",
  ...Object.fromEntries(EXTERNAL_SOURCES.map((s) => [s.id, s.label])),
};

export const normalizeExternalSource = (value: unknown): string => {
  const id = typeof value === "string" ? value.trim().toLowerCase() : "";
  return EXTERNAL_SOURCES.some((s) => s.id === id) ? id : "";
};

// Applications saved before the source column existed have an empty value.
export const effectiveSource = (stored: string | null | undefined, auto: number | null | undefined) =>
  stored || (auto === 1 ? "auto" : "platform");

export function trackingLink(origin: string, jobId: string, source: string) {
  const url = new URL("/", origin);
  url.searchParams.set("job", jobId);
  const src = normalizeExternalSource(source);
  if (src) url.searchParams.set("src", src);
  return url.toString();
}

export function sourceBreakdown(apps: { source?: string | null; auto?: number | null }[]) {
  const counts = new Map<string, number>();
  for (const a of apps) {
    const key = effectiveSource(a.source, a.auto);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].map(([id, count]) => ({ id, label: SOURCE_LABELS[id] || id, count })).sort((a, b) => b.count - a.count);
}
