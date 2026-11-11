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
  // A ready session cookie (name=value) can be given instead of a login: E2E_COOKIE_EMPLOYER / E2E_COOKIE_CANDIDATE.
  const given = process.env[`E2E_COOKIE_${kind.toUpperCase()}`];
  const cookie = given ? { name: given.split("=")[0], value: given.slice(given.indexOf("=") + 1) } : await login(ACCOUNTS[kind]);
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  await context.addCookies([{ ...cookie, domain: new URL(BASE).hostname, path: "/", httpOnly: true, secure: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // A server error (5xx) of any call the screens make is a failure, whatever the screen shows.
  page.on("response", (r) => {
    // 502 is what the app answers when an outside AI provider fails (a key or a balance); that is not a fault of the screen.
    if (r.status() >= 500 && r.status() !== 502 && r.url().includes("/api/")) errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);
  });
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
    await page.getByText(label, { exact: true }).first().click({ timeout: 8000 }).catch(() => failures.push(`${kind}: could not open “${label}”`));
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
    // The whole detail pane is compared (several vacancies may share a title).
    const before = await page.locator(".jx-detail").innerText();
    await cards.nth(1).click();
    await page.waitForTimeout(900);
    return (await page.locator(".jx-detail").innerText()) !== before;
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
    await page.locator(".iv-tile").first().waitFor({ timeout: 6000 });
    if ((await page.locator(".iv-tile").count()) < 5) return false;
    await page.getByRole("tab", { name: /Cədvəl/ }).click();
    await page.locator(".iv-grid table").first().waitFor({ timeout: 5000 });
    return (await page.locator(".iv-grid table").count()) === 1;
  });
  await open("Təsdiqlər");
  await check("approvals: three panes (sections | list | details) and an exact link", async () => {
    if ((await page.locator(".ap3-tab").count()) !== 3 || (await page.locator(".approval-help").count()) !== 1) return false;
    await page.locator(".ap3-tab").nth(1).click();
    await page.waitForTimeout(500);
    if ((await page.locator(".approval-filter button").count()) !== 4) return false;
    const rows = page.locator(".ap3-row-main");
    if (!(await rows.count())) return true;
    await rows.first().click();
    await page.waitForTimeout(1500);
    // A request that has a detail shows its facts; a list entry without one (an older kind) opens without them.
    if ((await page.locator(".ap3-detail").count()) !== 1) return false;
    const link = page.locator(".ap3-detail .approval-filter button").first();
    if (!(await link.count())) return true;
    await link.click();
    await page.waitForTimeout(1200);
    return (await page.locator(".row-focus").count()) >= 1 || (await page.locator(".staff-table, table").count()) > 0;
  });
  // The approvals check may have followed a link into the HR operations menu: back to recruitment first.
  await page.locator(".hr-modes button", { hasText: "İşə qəbul" }).first().click().catch(() => undefined);
  await page.waitForTimeout(600);
  await open("Namizədlər");
  await check("candidates page opens", async () => (await page.getByText("Namizədlər", { exact: true }).count()) > 0);
});

// Every menu item of the panel, and every tab inside it: opened one by one. Nothing is changed (only tabs and menu items are clicked).
// A screen fails when it throws a script error, a call of it answers 5xx, or the page shows the “request not completed” message.
async function crawl(kind, { modes = [] } = {}) {
  await session(kind, async ({ page, check }) => {
    const bad = async () => (await page.getByText("Sorğu tamamlanmadı", { exact: false }).count()) > 0;
    const visit = async (label) => {
      const items = page.locator(".nav-item");
      const names = await items.evaluateAll((els) => els.map((e) => (e.innerText || "").trim().split("\n")[0]));
      for (const name of names) {
        if (!name) continue;
        await check(`${label}${name}: opens, its tabs open`, async () => {
          await page.locator(".nav-item", { hasText: name }).first().click({ timeout: 4000 });
          await page.waitForTimeout(900);
          if (await bad()) return false;
          const tabs = await page.locator('[role="tab"]').evaluateAll((els) => els.map((e) => (e.innerText || "").trim()).filter(Boolean));
          for (const tab of tabs.slice(0, 12)) {
            await page.locator('[role="tab"]', { hasText: tab }).first().click({ timeout: 3000 }).catch(() => undefined);
            await page.waitForTimeout(450);
            if (await bad()) return false;
          }
          return (await page.locator("main, .main-shell").count()) > 0;
        });
      }
    };
    if (!modes.length) return visit("");
    for (const mode of modes) {
      await page.locator(".hr-modes button", { hasText: mode }).first().click().catch(() => undefined);
      await page.waitForTimeout(700);
      await visit(`${mode} › `);
    }
  });
}
await crawl("candidate");
await crawl("employer", { modes: ["İşə qəbul", "Kadr"] });

// The newest screens by name: plan and fact, branches, the org chart.
await session("employer", async ({ page, check }) => {
  const nav = async (label) => {
    if ((await page.locator(".hr-modes button", { hasText: "Kadr" }).count()) > 0) await page.locator(".hr-modes button", { hasText: "Kadr" }).first().click();
    await page.waitForTimeout(500);
    await page.locator(".nav-item", { hasText: label }).first().click();
    await page.waitForTimeout(1500);
  };
  await nav("Plan və fakt");
  await check("plan and fact: year, approval bar, five tabs, Excel buttons", async () => (await page.getByRole("tab").count()) >= 5 && (await page.getByRole("button", { name: /Excel: ixrac/ }).count()) === 1 && (await page.locator("select[aria-label='İl']").count()) === 1);
  await check("plan and fact: the budget tab shows kinds and the comparison", async () => {
    await page.getByRole("tab", { name: "Büdcə", exact: true }).click();
    await page.getByText("Ümumi müqayisə").first().waitFor({ timeout: 8000 });
    return (await page.getByRole("tab", { name: "Əmək haqqı" }).count()) > 0;
  });
  await check("plan and fact: the expenses tab lists the HR kinds", async () => {
    await page.getByRole("tab", { name: "Xərclər", exact: true }).click();
    await page.getByText("Hədiyyələr və təbriklər").first().waitFor({ timeout: 6000 });
    return true;
  });
  await check("plan and fact: the integration tab shows keys and the log", async () => {
    await page.getByRole("tab", { name: /İnteqrasiya/ }).click();
    await page.getByText("Mübadilə jurnalı").first().waitFor({ timeout: 8000 });
    return true;
  });
  await nav("Filiallar");
  await check("branches: four tabs and the Excel buttons", async () => (await page.getByRole("tab").count()) >= 4 && (await page.getByRole("button", { name: /Nümunə fayl/ }).count()) === 1);
  await nav("Kadr əməliyyatları");
  await check("org chart: the flow diagram draws cards", async () => {
    await page.getByRole("tab", { name: /Təşkilat sxemi/ }).click({ timeout: 4000 }).catch(() => page.getByText("Təşkilat sxemi", { exact: true }).first().click());
    await page.waitForTimeout(1500);
    return (await page.locator(".od-node").count()) > 0 || (await page.getByText("Hələ işçi yoxdur").count()) > 0;
  });
});

await browser.close();
console.log(`\n${checks - failures.length} of ${checks} checks passed`);
if (failures.length) {
  console.error(`\nFAILED:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
