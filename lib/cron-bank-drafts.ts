// The payment order drafts of the advance day and the pay day are prepared by the application itself when the bank page
// is opened. This daily job opens it for every company whose bank account is set to prepare orders automatically, as
// that company's owner, with a session that lives five minutes and is deleted at once, so the draft is waiting in the morning.
const hex = async (value: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const token = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function runBankDrafts(db: D1Database, call: (request: Request) => Promise<Response>, origin = "https://cron.invalid", now = new Date()) {
  const companies = await db
    .prepare("SELECT DISTINCT company_id FROM payroll_bank_accounts WHERE auto='prepare' LIMIT 500")
    .all<{ company_id: string }>()
    .catch(() => ({ results: [] as { company_id: string }[] }));
  let opened = 0;
  const seconds = Math.floor(now.getTime() / 1000);
  for (const { company_id } of companies.results) {
    const secret = token();
    const key = await hex(secret);
    try {
      await db.prepare("INSERT INTO sessions(id,user_id,expires,created,agent) VALUES(?,?,?,?,?)").bind(key, company_id, seconds + 300, seconds, "cron").run();
      const response = await call(new Request(`${origin}/api/joblink/company/payroll/bank`, { headers: { cookie: `__Host-joblink_session=${secret}` } }));
      if (response.ok) opened++;
    } catch {
      // One company's failure does not stop the others.
    } finally {
      await db.prepare("DELETE FROM sessions WHERE id=?").bind(key).run().catch(() => undefined);
    }
  }
  return opened;
}
