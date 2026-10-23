// Vacancy views: one row per vacancy, viewer and day. The viewer is stored only as a one-way hash,
// so the company sees numbers and never who looked, and old rows are purged.
export const VIEW_RETENTION_DAYS = 180;

export async function viewerKey(userId: string, jobId: string) {
  const bytes = new TextEncoder().encode(`joblink-view:${userId}:${jobId}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export type ViewStats = { views: number; unique: number; last7: number };
export const emptyViews: ViewStats = { views: 0, unique: 0, last7: 0 };

export function conversionPercent(applications: number, uniqueViewers: number) {
  return uniqueViewers > 0 ? Math.min(100, Math.round((applications / uniqueViewers) * 100)) : null;
}
