// Browser smoke test of the main screens, run against a local dev server (not part of `npm test`, which needs no browser).
//   1. start the app:      npx vinext dev --port 3111   (with the local D1 migrated and the demo accounts seeded)
//   2. install the driver: npm i --no-save playwright-core   (a Chromium must exist; set CHROMIUM_PATH if it is not found)
//   3. run:                npm run e2e
// It logs in as the demo employer and candidate, opens the screens below and fails on a script error or a missing element.
const BASE = process.env.E2E_BASE_URL || "http://localhost:3111";
const ACCOUNTS = {
  employer: { email: process.env.E2E_EMPLOYER_EMAIL || "isveren@joblink.test", password: process.env.E2E_PASSWORD || "Demo-12345-local" },
  candidate: { email: process.env.E2E_CANDIDATE_EMAIL || "namized@joblink.test", password: process.env.E2E_PASSWORD || "Demo-12345-local" },
};

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error("playwright-core is not installed: run `npm i --no-save playwright-core` first.");
  process.exit(2);
}

async function login({ email, password }) {
  const response = await fetch(`${BASE}/api/joblink/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: new URL(BASE).origin }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`login failed for ${email}: ${response.status}`);
  const cookie = (response.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).find((c) => c.includes("joblink_session"));
  if (!cookie) throw new Error(`no session cookie for ${email}`);
  const i = cookie.indexOf("=");
  return { name: cookie.slice(0, i), value: cookie.slice(i + 1) };
}

const browser = await chromium.launch({ args: ["--no-sandbox", "--headless"], executablePath: process.env.CHROMIUM_PATH || undefined });
const failures = [];
let checks = 0;

async function session(kind, steps) {
  const cookie = await login(ACCOUNTS[kind]);
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  await context.addCookies([{ ...cookie, domain: new URL(BASE).hostname, path: "/", httpOnly: true, secure: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "networkidle" });
  const check = async (name, fn) => {
    checks += 1;
    try {
      const ok = await fn();
      if (ok === false) failures.push(`${kind}: ${name}`);
      else console.log(`ok   ${kind}: ${name}`);
    } catch (error) {
      failures.push(`${kind}: ${name} (${String(error).split("\n")[0]})`);
    }
  };
  const open = async (label) => {
    await page.getByText(label, { exact: true }).first().click();
    await page.waitForTimeout(1200);
  };
  await steps({ page, check, open });
  if (errors.length) failures.push(`${kind}: script errors: ${errors.join(" | ")}`);
  await context.close();
}

await session("candidate", async ({ page, check, open }) => {
  await open("Vakansiyalar");
  await check("vacancies page shows search, filters, list and detail", async () => (await page.locator(".jx-search").count()) === 1 && (await page.locator(".jx-card").count()) > 0 && (await page.locator(".jx-detail").count()) === 1);
  await check("choosing another vacancy changes the detail", async () => {
    const cards = page.locator(".jx-card-main");
    if ((await cards.count()) < 2) return true;
    const before = await page.locator(".jx-detail h2").innerText();
    await cards.nth(1).click();
    await page.waitForTimeout(300);
    return (await page.locator(".jx-detail h2").innerText()) !== before;
  });
});

await session("employer", async ({ page, check, open }) => {
  await open("Vakansiyalarım");
  await check("my vacancies: no long descriptions, details open in a side panel", async () => {
    if ((await page.locator(".job-description").count()) !== 0) return false;
    await page.locator(".job-card").first().locator("h3").click();
    await page.waitForTimeout(500);
    const opened = (await page.locator("dialog.side-drawer[open]").count()) === 1;
    await page.keyboard.press("Escape");
    return opened;
  });
  await open("Müsahibələr");
  await check("interviews: tabs, schedule grid", async () => {
    if ((await page.locator(".iv-tile").count()) < 5) return false;
    await page.getByRole("tab", { name: /Cədvəl/ }).click();
    await page.waitForTimeout(400);
    return (await page.locator(".iv-grid table").count()) === 1;
  });
  await open("Təsdiqlər");
  await check("approvals: help, filters, details panel", async () => {
    if ((await page.locator(".approval-help").count()) !== 1 || (await page.locator(".approval-filter button").count()) !== 4) return false;
    const more = page.getByRole("button", { name: "Ətraflı bax" });
    if (!(await more.count())) return true;
    await more.first().click();
    await page.waitForTimeout(600);
    const opened = (await page.locator("dialog.side-drawer[open] .jd-facts").count()) === 1;
    await page.keyboard.press("Escape");
    return opened;
  });
  await open("Namizədlər");
  await check("candidates page opens", async () => (await page.getByText("Namizədlər", { exact: true }).count()) > 0);
});

await browser.close();
console.log(`\n${checks - failures.length} of ${checks} checks passed`);
if (failures.length) {
  console.error(`\nFAILED:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
