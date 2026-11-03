// The payment order drafts of the advance day and the pay day are prepared by the application itself when the bank page
// is opened. This daily job opens it for every company whose bank account is set to prepare orders automatically, as
// that company's owner, with a session that lives five minutes and is deleted at once, so the draft is waiting in the morning.
const hex = async (value: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const token = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function openAsOwner(db: D1Database, companies: { results: { company_id: string }[] }, path: string, call: (request: Request) => Promise<Response>, origin: string, now: Date) {
  let opened = 0;
  const seconds = Math.floor(now.getTime() / 1000);
  for (const { company_id } of companies.results) {
    const secret = token();
    const key = await hex(secret);
    try {
      await db.prepare("INSERT INTO sessions(id,user_id,expires,created,agent) VALUES(?,?,?,?,?)").bind(key, company_id, seconds + 300, seconds, "cron").run();
      const response = await call(new Request(`${origin}/api/joblink/${path}`, { headers: { cookie: `__Host-joblink_session=${secret}` } }));
      if (response.ok) opened++;
    } catch {
      // One company's failure does not stop the others.
    } finally {
      await db.prepare("DELETE FROM sessions WHERE id=?").bind(key).run().catch(() => undefined);
    }
  }
  return opened;
}

export function runBankDrafts(db: D1Database, call: (request: Request) => Promise<Response>, origin = "https://cron.invalid", now = new Date()) {
  return db
    .prepare("SELECT DISTINCT company_id FROM payroll_bank_accounts WHERE auto='prepare' LIMIT 500")
    .all<{ company_id: string }>()
    .catch(() => ({ results: [] as { company_id: string }[] }))
    .then((companies) => openAsOwner(db, companies, "company/payroll/bank", call, origin, now));
}

// A transfer or a termination that starts later is applied to the card by the application when the order list is opened;
// this daily job opens it for the companies whose date has come, so the card is right in the morning.
export function runDueOrderEffects(db: D1Database, call: (request: Request) => Promise<Response>, origin = "https://cron.invalid", now = new Date()) {
  return db
    .prepare("SELECT DISTINCT company_id FROM order_effects WHERE status='scheduled' AND effective_date<=? LIMIT 500")
    .bind(now.toISOString().slice(0, 10))
    .all<{ company_id: string }>()
    .catch(() => ({ results: [] as { company_id: string }[] }))
    .then((companies) => openAsOwner(db, companies, "company/orders/registry", call, origin, now));
}

// Birthday and work anniversary greetings: the application sends them when the page is opened as the company's owner,
// once a day, for the companies that switched greetings on.
export function runCelebrations(db: D1Database, call: (request: Request) => Promise<Response>, origin = "https://cron.invalid", now = new Date()) {
  return db
    .prepare("SELECT DISTINCT company_id FROM hr_settings WHERE key='celebrations' AND value='on' LIMIT 500")
    .all<{ company_id: string }>()
    .catch(() => ({ results: [] as { company_id: string }[] }))
    .then((companies) => openAsOwner(db, companies, "company/celebrations/run", call, origin, now));
}
