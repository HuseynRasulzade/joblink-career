// Some work is best-effort on purpose (a notification, a counter, a cache): its failure must not break the page. It must not be
// invisible either, so the failure is written to the Worker log, at most a few lines a minute so a broken table cannot flood it.
let windowStart = 0;
let written = 0;
export function quiet(where: string, error?: unknown) {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    written = 0;
  }
  if (++written > 10) return;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  console.warn(JSON.stringify({ quiet: where, message: message.slice(0, 200) }));
}
