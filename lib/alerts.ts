// A burst of server errors (5xx) is written down and, once there are too many in a short time, every admin gets one notification
// (at most one per hour). Everything here is best-effort: a failure in alerting must never turn into a failure of the request.
import { notify } from "./api-core";

const WINDOW_MS = 10 * 60 * 1000;
const THRESHOLD = 5;
const QUIET_MS = 60 * 60 * 1000;

export async function recordServerError(db: D1Database, path: string, status: number) {
  try {
    const now = Date.now();
    await db.prepare("INSERT INTO server_errors(id,path,status,created) VALUES(?,?,?,?)").bind(crypto.randomUUID(), path.slice(0, 120), status, new Date(now).toISOString()).run();
    const since = new Date(now - WINDOW_MS).toISOString();
    const row = await db.prepare("SELECT COUNT(*) AS n FROM server_errors WHERE created>=?").bind(since).first<{ n: number }>();
    if ((row?.n || 0) < THRESHOLD) return;
    const recent = await db.prepare("SELECT 1 AS x FROM notifications WHERE type='system_alert' AND created>=? LIMIT 1").bind(new Date(now - QUIET_MS).toISOString()).first();
    if (recent) return;
    const top = await db.prepare("SELECT path,COUNT(*) AS n FROM server_errors WHERE created>=? GROUP BY path ORDER BY n DESC LIMIT 3").bind(since).all<{ path: string; n: number }>();
    const admins = await db.prepare("SELECT id FROM accounts WHERE role='admin' AND COALESCE(status,'active')<>'suspended'").all<{ id: string }>();
    const body = (top.results || []).map((r) => `${r.path} (${r.n})`).join(", ");
    for (const a of admins.results || [])
      await notify(db, { userId: a.id, type: "system_alert", title: `Server xətaları: son 10 dəqiqədə ${row?.n}`, body, link: "admin" });
  } catch {
    // alerting is best-effort
  }
}

export async function purgeOldServerErrors(db: D1Database) {
  try {
    await db.prepare("DELETE FROM server_errors WHERE created<?").bind(new Date(Date.now() - 24 * 3600 * 1000).toISOString()).run();
  } catch {
    // ignore
  }
}
