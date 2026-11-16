// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { type OrderRow, generateApiKey, hashApiKey, keyPrefix, safeWebhookUrl } from "@/lib/integration";
import { budgetProblem } from "@/lib/hr-expenses";
import { companyAudit } from "@/lib/api-core";
import { createXlsxBook } from "@/lib/xlsx";
import { categoryLabel as expenseCategoryLabel, integrationSetting, pushWebhook, setIntegrationSetting } from "@/lib/expense-ops";
import { matchEmployee, fold as plainFold } from "@/lib/sheet-imports";
import { normalizeMode, splitAmount } from "@/lib/branches";
import { parseBranchSheets } from "@/lib/branches-excel";
import { parsePlanFactSheets } from "@/lib/plan-fact-excel";
import { ExpenseDbRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_20(c: Pick<RouteCtx, "auditView" | "branchContext" | "canAct" | "db" | "employeeRefs" | "expenseRow" | "heldBudget" | "hrFundReport" | "id" | "monthApproved" | "monthOf" | "path" | "payrollMonth" | "payrollRows" | "request" | "requestUrl" | "requirePermission" | "revealAll" | "userId" | "yearPlanState">): Promise<Response | undefined> {
  const { auditView, branchContext, canAct, db, employeeRefs, expenseRow, heldBudget, hrFundReport, id, monthApproved, monthOf, path, payrollMonth, payrollRows, request, requestUrl, requirePermission, revealAll, userId, yearPlanState } = c;
  if (request.method === "GET" && path === "company/branches") {
    requirePermission("salaries", "Filialları yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    const month = monthOf(requestUrl.searchParams.get("month"));
    const ctx = await branchContext(month);
    const people = (await db.prepare("SELECT id,name,position,department,status FROM company_employees WHERE company_id=? AND status IN ('active','leave') ORDER BY name").bind(id).all<{ id: string; name: string; position: string; department: string; status: string }>()).results;
    const byId = new Map(people.map((p) => [p.id, p]));
    return ok({
      month,
      locked: await monthApproved(month),
      mode: ctx.mode,
      branches: ctx.branches,
      rules: ctx.rules,
      sales: ctx.sales.map((x) => ({ ...x, reached: x.target > 0 && x.sales >= x.target })),
      links: ctx.links.filter((l) => byId.has(l.employeeId)).map((l) => ({ ...l, name: byId.get(l.employeeId)?.name || "", position: byId.get(l.employeeId)?.position || "", department: l.department || byId.get(l.employeeId)?.department || "" })),
      employees: people.map((p) => ({ id: p.id, name: p.name, position: p.position, department: p.department })),
      // The staff table is where the structure comes from: branch → department → section → position.
      units: (await db.prepare("SELECT branch,department,section,position,planned FROM staff_units WHERE company_id=? ORDER BY branch,department,section,position").bind(id).all<{ branch: string; department: string; section: string; position: string; planned: number }>().catch(() => ({ results: [] as { branch: string; department: string; section: string; position: string; planned: number }[] }))).results,
    });
  }
  if (request.method === "GET" && path === "company/staff/structure") {
    requirePermission("employees", "Ştat strukturunu yalnız işçi kartına icazəsi olan şəxs görə bilər.");
    const unitRows = (await db.prepare("SELECT branch,department,section,position FROM staff_units WHERE company_id=? ORDER BY branch,department,section,position").bind(id).all<{ branch: string; department: string; section: string; position: string }>().catch(() => ({ results: [] as { branch: string; department: string; section: string; position: string }[] }))).results;
    // Every branch (also one with no staff row yet) and the departments chosen for a branch when the department was created.
    const branchRows = (await db.prepare("SELECT id,name FROM branches WHERE company_id=? ORDER BY name").bind(id).all<{ id: string; name: string }>().catch(() => ({ results: [] as { id: string; name: string }[] }))).results;
    const linkRows = (await db.prepare("SELECT branch_id,department FROM branch_departments WHERE company_id=?").bind(id).all<{ branch_id: string; department: string }>().catch(() => ({ results: [] as { branch_id: string; department: string }[] }))).results;
    return ok({ units: unitRows, branches: branchRows, departments: linkRows.map((l) => ({ branch: branchRows.find((b) => b.id === l.branch_id)?.name || "", department: l.department })).filter((l) => l.branch) });
  }
  if (request.method === "POST" && path === "company/branches/save") {
    requirePermission("salaries", "Filialı yalnız əmək haqqı icazəsi olan şəxs yaza bilər.");
    const b = await jsonBody(request);
    const branchId = str(b.id, 100);
    if (!branchId) throw new HttpError(409, "Filial burada yaradılmır: ştat cədvəlinin «Departament və şöbələr» bölməsində «Filiallar» siyahısında (və ya ştat sətrinin «Filial» sahəsində) yaradın, filial burada özü görünəcək.");
    const r = await db.prepare("UPDATE branches SET code=?,city=?,active=? WHERE id=? AND company_id=?").bind(str(b.code, 40).trim(), str(b.city, 120).trim(), b.active === false ? 0 : 1, branchId, id).run();
    if (!r.meta.changes) throw new HttpError(404, "Filial tapılmadı.");
    await companyAudit(db, id, userId, "branch", branchId, "");
    return ok({ ok: true, id: branchId });
  }
  if (request.method === "POST" && path === "company/branches/rename") {
    requirePermission("salaries", "Filialın adını yalnız əmək haqqı icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const branchId = str(b.id, 100);
    const name = str(b.name, 120).trim();
    if (!name) throw new HttpError(400, "Yeni adı yazın.");
    const current = await db.prepare("SELECT name FROM branches WHERE id=? AND company_id=?").bind(branchId, id).first<{ name: string }>();
    if (!current) throw new HttpError(404, "Filial tapılmadı.");
    const taken = (await db.prepare("SELECT id,name FROM branches WHERE company_id=?").bind(id).all<{ id: string; name: string }>()).results;
    if (taken.some((x) => x.id !== branchId && x.name.trim().toLocaleLowerCase("az") === name.toLocaleLowerCase("az"))) throw new HttpError(409, "Bu adda filial artıq var.");
    await db.batch([
      db.prepare("UPDATE branches SET name=? WHERE id=? AND company_id=?").bind(name, branchId, id),
      db.prepare("UPDATE staff_units SET branch=? WHERE company_id=? AND lower(branch)=lower(?)").bind(name, id, current.name),
    ]);
    await companyAudit(db, id, userId, "branch-renamed", branchId, `${current.name} → ${name}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/branches/delete") {
    requirePermission("salaries", "Filialı yalnız əmək haqqı icazəsi olan şəxs silə bilər.");
    const b = await jsonBody(request);
    const branchId = str(b.id, 100);
    const named = await db.prepare("SELECT name FROM branches WHERE id=? AND company_id=?").bind(branchId, id).first<{ name: string }>();
    const rows = named ? await db.prepare("SELECT COUNT(*) AS n FROM staff_units WHERE company_id=? AND lower(branch)=lower(?)").bind(id, named.name).first<{ n: number }>() : null;
    if (Number(rows?.n)) throw new HttpError(409, `Bu filial ştat cədvəlinin ${rows?.n} sətrində yazılıb. Filialı silmək üçün əvvəl həmin sətirlərin «Filial» sahəsini dəyişin və ya silin.`);
    const used = await db.prepare("SELECT COUNT(*) AS n FROM employee_branches WHERE company_id=? AND branch_id=?").bind(id, branchId).first<{ n: number }>();
    if (Number(used?.n)) throw new HttpError(409, `Bu filialda ${used?.n} işçi bağlıdır. Əvvəl onların filial bağlantısını silin (və ya filialı passiv edin).`);
    await db.batch([
      db.prepare("DELETE FROM branch_sales WHERE company_id=? AND branch_id=?").bind(id, branchId),
      db.prepare("DELETE FROM branch_bonus_rules WHERE company_id=? AND branch_id=?").bind(id, branchId),
      db.prepare("DELETE FROM branch_departments WHERE company_id=? AND branch_id=?").bind(id, branchId),
      db.prepare("DELETE FROM branches WHERE company_id=? AND id=?").bind(id, branchId),
    ]);
    await companyAudit(db, id, userId, "branch-deleted", branchId, "");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/branches/link") {
    requirePermission("salaries", "Filial bağlantısını yalnız əmək haqqı icazəsi olan şəxs yaza bilər.");
    const b = await jsonBody(request);
    const employeeId = str(b.employeeId, 100);
    const branchId = str(b.branchId, 100);
    if (!(await db.prepare("SELECT 1 AS x FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(employeeId, id).first())) throw new HttpError(404, "İşçi tapılmadı.");
    if (!(await db.prepare("SELECT 1 AS x FROM branches WHERE id=? AND company_id=?").bind(branchId, id).first())) throw new HttpError(404, "Filial tapılmadı.");
    const pct = b.sharePct === undefined || b.sharePct === null || b.sharePct === "" ? 0 : Number(b.sharePct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new HttpError(400, "Pay faizi 0–100 arası olmalıdır (boş = rejimə görə).");
    const from = str(b.from, 10);
    const to = str(b.to, 10);
    for (const d of [from, to]) if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new HttpError(400, "Tarix düzgün deyil.");
    if (from && to && to < from) throw new HttpError(400, "Bitmə tarixi başlamadan əvvəl ola bilməz.");
    // The department and the section must be ones the staff table has under that branch.
    const department = str(b.department, 120).trim();
    const section = str(b.section, 120).trim();
    const branchName = (await db.prepare("SELECT name FROM branches WHERE id=?").bind(branchId).first<{ name: string }>())?.name || "";
    const branchRows = (await db.prepare("SELECT department,section FROM staff_units WHERE company_id=? AND lower(branch)=lower(?)").bind(id, branchName).all<{ department: string; section: string }>()).results;
    const sameName = (a: string, c: string) => a.trim().toLocaleLowerCase("az") === c.trim().toLocaleLowerCase("az");
    if (branchRows.length) {
      if (!department) throw new HttpError(400, "Departamenti seçin (bu filialın ştat cədvəlindən).");
      if (!branchRows.some((r) => sameName(r.department, department))) throw new HttpError(409, `“${department}” departamenti “${branchName}” filialının ştat cədvəlində yoxdur.`);
      if (section && !branchRows.some((r) => sameName(r.department, department) && sameName(r.section, section))) throw new HttpError(409, `“${section}” şöbəsi “${branchName} / ${department}” üçün ştat cədvəlində yoxdur.`);
    }
    await db.prepare("INSERT INTO employee_branches(company_id,employee_id,branch_id,role,share_pct,bonus_eligible,from_date,to_date,department,section) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(employee_id,branch_id) DO UPDATE SET role=excluded.role,share_pct=excluded.share_pct,bonus_eligible=excluded.bonus_eligible,from_date=excluded.from_date,to_date=excluded.to_date,department=excluded.department,section=excluded.section").bind(id, employeeId, branchId, str(b.role, 120).trim(), Math.round(pct * 100) / 100, b.bonusEligible === false ? 0 : 1, from, to, department, section).run();
    await companyAudit(db, id, userId, "branch-link", employeeId, branchId);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/branches/unlink") {
    requirePermission("salaries", "Filial bağlantısını yalnız əmək haqqı icazəsi olan şəxs silə bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM employee_branches WHERE company_id=? AND employee_id=? AND branch_id=?").bind(id, str(b.employeeId, 100), str(b.branchId, 100)).run();
    await companyAudit(db, id, userId, "branch-unlink", str(b.employeeId, 100), str(b.branchId, 100));
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/branches/rule") {
    requirePermission("salaries", "Bonus qaydasını yalnız əmək haqqı icazəsi olan şəxs yaza bilər.");
    const b = await jsonBody(request);
    const branchId = str(b.branchId, 100);
    if (!(await db.prepare("SELECT 1 AS x FROM branches WHERE id=? AND company_id=?").bind(branchId, id).first())) throw new HttpError(404, "Filial tapılmadı.");
    const kind = b.kind === "salary_percent" ? "salary_percent" : "fixed";
    const value = Math.round((Number(b.value) || 0) * 100) / 100;
    if (!(value >= 0) || value > (kind === "salary_percent" ? 1000 : 1e7)) throw new HttpError(400, "Bonus dəyəri düzgün deyil.");
    await db.prepare("INSERT INTO branch_bonus_rules(company_id,branch_id,kind,value,active) VALUES(?,?,?,?,?) ON CONFLICT(branch_id) DO UPDATE SET kind=excluded.kind,value=excluded.value,active=excluded.active").bind(id, branchId, kind, value, b.active === false ? 0 : 1).run();
    await companyAudit(db, id, userId, "branch-rule", branchId, `${kind} ${value}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/branches/sales") {
    requirePermission("salaries", "Satışı yalnız əmək haqqı icazəsi olan şəxs yaza bilər.");
    const b = await jsonBody(request);
    const month = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, "Ayı düzgün seçin.");
    if (await monthApproved(month)) throw new HttpError(409, `${month} ayının əmək haqqı təsdiqlənib: satış və limit dəyişmir.`);
    const list = (Array.isArray(b.rows) ? b.rows : []).slice(0, 500) as { branchId?: unknown; target?: unknown; sales?: unknown }[];
    const known = new Set((await db.prepare("SELECT id FROM branches WHERE company_id=?").bind(id).all<{ id: string }>()).results.map((r) => r.id));
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];
    for (const r of list) {
      const branchId = String(r.branchId ?? "");
      const target = Math.round((Number(r.target) || 0) * 100) / 100;
      const sales = Math.round((Number(r.sales) || 0) * 100) / 100;
      if (!known.has(branchId)) throw new HttpError(404, "Filial tapılmadı.");
      if (target < 0 || sales < 0 || target > 1e12 || sales > 1e12) throw new HttpError(400, "Satış və limit mənfi olmayan rəqəm olmalıdır.");
      statements.push(db.prepare("INSERT INTO branch_sales(company_id,branch_id,month,target,sales,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(branch_id,month) DO UPDATE SET target=excluded.target,sales=excluded.sales,updated=excluded.updated").bind(id, branchId, month, target, sales, now));
    }
    if (!statements.length) throw new HttpError(400, "Satış yazılmayıb.");
    await db.batch(statements);
    await companyAudit(db, id, userId, "branch-sales", month, `${statements.length} filial`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/branches/mode") {
    requirePermission("salaries", "Bölgü rejimini yalnız əmək haqqı icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, "branch_alloc_mode", normalizeMode(b.mode)).run();
    await companyAudit(db, id, userId, "branch-mode", "", normalizeMode(b.mode));
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/branches/export-data") {
    requirePermission("salaries", "Filial məlumatını yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const rows = (await db.prepare("SELECT id,name,profile FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ id: string; name: string; profile: string }>()).results;
    const opened = await revealAll(rows);
    const ctx = await branchContext("0000-00");
    const allSales = (await db.prepare("SELECT branch_id,month,target,sales FROM branch_sales WHERE company_id=? ORDER BY month DESC LIMIT 600").bind(id).all<{ branch_id: string; month: string; target: number; sales: number }>().catch(() => ({ results: [] as { branch_id: string; month: string; target: number; sales: number }[] }))).results;
    const nameOf = new Map(ctx.branches.map((x) => [x.id, x.name]));
    const empOf = new Map(rows.map((r) => [r.id, r]));
    return ok({
      mode: ctx.mode,
      branches: ctx.branches.map((x) => ({ name: x.name, code: x.code, city: x.city, active: x.active })),
      links: ctx.links.filter((l) => empOf.has(l.employeeId)).map((l) => ({ fin: opened.get(l.employeeId)?.fin || "", name: empOf.get(l.employeeId)?.name || "", branch: nameOf.get(l.branchId) || "", role: l.role, sharePct: l.sharePct, bonusEligible: l.bonusEligible, from: l.from, to: l.to, department: l.department || "", section: l.section || "" })),
      sales: allSales.map((x) => { const rule = ctx.rules.find((r) => r.branchId === x.branch_id); return { month: x.month, branch: nameOf.get(x.branch_id) || "", target: x.target, sales: x.sales, kind: rule?.kind || "fixed", value: rule?.value || 0, active: rule ? rule.active : true }; }),
    });
  }
  if (request.method === "POST" && path === "company/branches/import") {
    requirePermission("salaries", "Filialları yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const b = await jsonBody(request);
    const sheets = (Array.isArray(b.sheets) ? b.sheets : []).slice(0, 10).map((sh: { name?: unknown; rows?: unknown }) => ({ name: String(sh?.name ?? ""), rows: (Array.isArray(sh?.rows) ? sh.rows : []).slice(0, 5001).map((r: unknown) => (Array.isArray(r) ? r.map((c) => String(c ?? "")) : [])) }));
    const parsed = parseBranchSheets(sheets);
    const issues = [...parsed.issues];
    const apply = b.apply === true;
    const known = new Map((await db.prepare("SELECT id,name FROM branches WHERE company_id=?").bind(id).all<{ id: string; name: string }>()).results.map((r) => [plainFold(r.name), r.id]));
    // No branch is created here: they come from the staff table.
    for (const x of parsed.branches) if (!known.has(plainFold(x.name))) issues.push({ sheet: "Filiallar", line: 0, reason: `“${x.name}” filialı yoxdur. Filial yalnız ştat cədvəlinin «Departament və şöbələr» bölməsində (Filiallar siyahısı) yaradılır.` });
    const branchIdOf = (name: string) => known.get(plainFold(name)) || "";
    const unitsByBranch = new Map<string, { department: string; section: string }[]>();
    for (const u of (await db.prepare("SELECT branch,department,section FROM staff_units WHERE company_id=?").bind(id).all<{ branch: string; department: string; section: string }>()).results) unitsByBranch.set(plainFold(u.branch), [...(unitsByBranch.get(plainFold(u.branch)) || []), u]);
    const people = await employeeRefs();
    const lockedMonths = new Map<string, boolean>();
    const statements: D1PreparedStatement[] = [];
    const now = new Date().toISOString();
    let nLinks = 0;
    let nSales = 0;
    for (const x of parsed.branches) {
      const existing = known.get(plainFold(x.name));
      if (existing) statements.push(db.prepare("UPDATE branches SET code=?,city=?,active=? WHERE id=? AND company_id=?").bind(x.code, x.city, x.active ? 1 : 0, existing, id));
    }
    for (const x of parsed.links) {
      const branchId = branchIdOf(x.branch);
      if (!branchId) {
        issues.push({ sheet: "İşçi-filial", line: 0, reason: `${x.name || x.fin}: “${x.branch}” filialı yoxdur (Filiallar vərəqinə əlavə edin).` });
        continue;
      }
      const found = matchEmployee(people, { name: x.name, email: "", fin: x.fin });
      if ("error" in found) {
        issues.push({ sheet: "İşçi-filial", line: 0, reason: found.error });
        continue;
      }
      const rowsOfBranch = unitsByBranch.get(plainFold(x.branch)) || [];
      if (rowsOfBranch.length && x.department && !rowsOfBranch.some((r) => plainFold(r.department) === plainFold(x.department) && (!x.section || plainFold(r.section) === plainFold(x.section)))) {
        issues.push({ sheet: "İşçi-filial", line: 0, reason: `${x.name || x.fin}: “${x.department}${x.section ? ` / ${x.section}` : ""}” “${x.branch}” filialının ştat cədvəlində yoxdur.` });
        continue;
      }
      statements.push(db.prepare("INSERT INTO employee_branches(company_id,employee_id,branch_id,role,share_pct,bonus_eligible,from_date,to_date,department,section) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(employee_id,branch_id) DO UPDATE SET role=excluded.role,share_pct=excluded.share_pct,bonus_eligible=excluded.bonus_eligible,from_date=excluded.from_date,to_date=excluded.to_date,department=excluded.department,section=excluded.section").bind(id, found.id, branchId, x.role, x.sharePct, x.bonusEligible ? 1 : 0, x.from, x.to, x.department, x.section));
      nLinks++;
    }
    for (const x of parsed.sales) {
      const branchId = branchIdOf(x.branch);
      if (!branchId) {
        issues.push({ sheet: "Satış və bonus", line: 0, reason: `“${x.branch}” filialı yoxdur.` });
        continue;
      }
      if (!lockedMonths.has(x.month)) lockedMonths.set(x.month, await monthApproved(x.month));
      if (lockedMonths.get(x.month)) {
        issues.push({ sheet: "Satış və bonus", line: 0, reason: `${x.branch}: ${x.month} ayının əmək haqqı təsdiqlənib, satış dəyişmir.` });
        continue;
      }
      statements.push(db.prepare("INSERT INTO branch_sales(company_id,branch_id,month,target,sales,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(branch_id,month) DO UPDATE SET target=excluded.target,sales=excluded.sales,updated=excluded.updated").bind(id, branchId, x.month, x.target, x.sales, now));
      if (x.kind) statements.push(db.prepare("INSERT INTO branch_bonus_rules(company_id,branch_id,kind,value,active) VALUES(?,?,?,?,?) ON CONFLICT(branch_id) DO UPDATE SET kind=excluded.kind,value=excluded.value,active=excluded.active").bind(id, branchId, x.kind, x.value, x.active ? 1 : 0));
      nSales++;
    }
    if (parsed.mode) statements.push(db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, "branch_alloc_mode", parsed.mode));
    const summary = { branches: parsed.branches.filter((x) => known.has(plainFold(x.name))).length, newBranches: 0, links: nLinks, sales: nSales, mode: parsed.mode, found: parsed.found };
    if (!apply || !parsed.found.length) return ok({ applied: false, summary, issues });
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "branch-import", "", `${parsed.branches.length} filial, ${nLinks} bağlantı, ${nSales} satış`);
    return ok({ applied: true, summary, issues });
  }
  if (request.method === "GET" && path === "company/payroll/branches") {
    requirePermission("salaries", "Filial bölgüsünü yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    const { raw: monthRaw } = payrollMonth();
    await auditView("view-payroll-branches", monthRaw);
    const sheet = await payrollRows(monthRaw);
    const ctx = await branchContext(monthRaw);
    type Line = { employeeId: string; name: string; position: string; branchId: string; branch: string; role: string; share: number; gross: number; net: number; employerCost: number; bonus: number };
    const lines: Line[] = [];
    for (const r of sheet.rows) {
      const mine = (r as unknown as { branches?: { branchId: string; name: string; role: string; share: number }[] }).branches || [];
      const bonuses = (r as unknown as { branchBonuses?: { branchId: string; amount: number }[] }).branchBonuses || [];
      if (!mine.length) continue;
      const shares = new Map(mine.map((x) => [x.branchId, x.share]));
      const gross = splitAmount(r.result.gross, shares);
      const net = splitAmount(r.result.net, shares);
      const cost = splitAmount(r.result.employerCost, shares);
      for (const l of mine) lines.push({ employeeId: r.employeeId, name: r.name, position: r.position, branchId: l.branchId, branch: l.name, role: l.role, share: l.share, gross: gross.get(l.branchId) || 0, net: net.get(l.branchId) || 0, employerCost: cost.get(l.branchId) || 0, bonus: Math.round(bonuses.filter((x) => x.branchId === l.branchId).reduce((t, x) => t + x.amount, 0) * 100) / 100 });
    }
    const unassigned = sheet.rows.filter((r) => !((r as unknown as { branches?: unknown[] }).branches || []).length && r.result.gross > 0).map((r) => ({ employeeId: r.employeeId, name: r.name, gross: r.result.gross, net: r.result.net, employerCost: r.result.employerCost }));
    const branches = ctx.branches.map((br) => {
      const mine = lines.filter((l) => l.branchId === br.id);
      const sales = ctx.sales.find((x) => x.branchId === br.id);
      const rule = ctx.rules.find((x) => x.branchId === br.id);
      const sum = (pick: (l: Line) => number) => Math.round(mine.reduce((t, l) => t + pick(l), 0) * 100) / 100;
      return { id: br.id, name: br.name, active: br.active, people: mine.length, target: sales?.target || 0, sales: sales?.sales || 0, reached: !!sales && sales.target > 0 && sales.sales >= sales.target, rule: rule ? { kind: rule.kind, value: rule.value, active: rule.active } : null, gross: sum((l) => l.gross), net: sum((l) => l.net), employerCost: sum((l) => l.employerCost), bonus: sum((l) => l.bonus) };
    });
    return ok({ month: monthRaw, status: sheet.status, mode: ctx.mode, branches, lines, unassigned });
  }
  if (request.method === "GET" && path === "company/integrations") {
    requirePermission("salaries", "İnteqrasiyaları yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    const [keys, log] = await Promise.all([
      db.prepare("SELECT id,name,system,key_prefix,created,last_used,revoked FROM integration_keys WHERE company_id=? ORDER BY created DESC").bind(id).all<{ id: string; name: string; system: string; key_prefix: string; created: string; last_used: string; revoked: string }>().catch(() => ({ results: [] as { id: string; name: string; system: string; key_prefix: string; created: string; last_used: string; revoked: string }[] })),
      db.prepare("SELECT at,direction,actor,action,ref,ok,message FROM integration_log WHERE company_id=? ORDER BY at DESC LIMIT 40").bind(id).all<{ at: string; direction: string; actor: string; action: string; ref: string; ok: number; message: string }>().catch(() => ({ results: [] as { at: string; direction: string; actor: string; action: string; ref: string; ok: number; message: string }[] })),
    ]);
    return ok({
      keys: keys.results.map((k) => ({ id: k.id, name: k.name, system: k.system, prefix: k.key_prefix, created: k.created, lastUsed: k.last_used, revoked: k.revoked })),
      ordersEnabled: (await integrationSetting(db, id, "orders_enabled")) === "1",
      webhookUrl: await integrationSetting(db, id, "webhook_url"),
      hasWebhookSecret: !!(await integrationSetting(db, id, "webhook_secret")),
      log: log.results.map((l) => ({ at: l.at, direction: l.direction, actor: l.actor, action: l.action, ref: l.ref, ok: !!l.ok, message: l.message })),
      canManage: canAct("approve-director"),
    });
  }
  if (request.method === "POST" && path === "company/integrations/key-create") {
    requirePermission("salaries", "Açarı yalnız əmək haqqı icazəsi olan şəxs yarada bilər.");
    if (!canAct("approve-director")) throw new HttpError(403, "İnteqrasiya açarını yalnız direktor (təsdiq səlahiyyəti olan şəxs) yarada bilər.");
    const b = await jsonBody(request);
    const name = str(b.name, 80).trim();
    if (!name) throw new HttpError(400, "Açarın adını yazın (məs. 1C mühasibat).");
    const system = ["1c", "sap", "other"].includes(String(b.system)) ? String(b.system) : "other";
    const count = await db.prepare("SELECT COUNT(*) AS n FROM integration_keys WHERE company_id=? AND revoked=''").bind(id).first<{ n: number }>();
    if (Number(count?.n) >= 10) throw new HttpError(409, "Ən çox 10 aktiv açar ola bilər. Köhnəsini ləğv edin.");
    const key = generateApiKey();
    await db.prepare("INSERT INTO integration_keys(id,company_id,name,system,key_hash,key_prefix,created,created_by) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, name, system, await hashApiKey(key), keyPrefix(key), new Date().toISOString(), userId).run();
    await companyAudit(db, id, userId, "integration-key-created", "", `${name} (${system})`);
    return ok({ ok: true, key });
  }
  if (request.method === "POST" && path === "company/integrations/key-revoke") {
    requirePermission("salaries", "Açarı yalnız əmək haqqı icazəsi olan şəxs ləğv edə bilər.");
    if (!canAct("approve-director")) throw new HttpError(403, "İnteqrasiya açarını yalnız direktor ləğv edə bilər.");
    const b = await jsonBody(request);
    await db.prepare("UPDATE integration_keys SET revoked=? WHERE id=? AND company_id=? AND revoked=''").bind(new Date().toISOString(), str(b.id, 100), id).run();
    await companyAudit(db, id, userId, "integration-key-revoked", str(b.id, 100), "");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/integrations/settings") {
    requirePermission("salaries", "İnteqrasiya ayarlarını yalnız əmək haqqı icazəsi olan şəxs dəyişə bilər.");
    if (!canAct("approve-director")) throw new HttpError(403, "İnteqrasiya ayarlarını yalnız direktor dəyişə bilər.");
    const b = await jsonBody(request);
    if (typeof b.ordersEnabled === "boolean") await setIntegrationSetting(db, id, "orders_enabled", b.ordersEnabled ? "1" : "0");
    if (typeof b.webhookUrl === "string") {
      const raw = b.webhookUrl.trim();
      const safe = raw ? safeWebhookUrl(raw) : "";
      if (raw && !safe) throw new HttpError(400, "Ünvan https:// ilə başlayan açıq internet ünvanı olmalıdır (localhost, daxili şəbəkə və IP ünvanı olmaz).");
      await setIntegrationSetting(db, id, "webhook_url", safe);
    }
    if (typeof b.webhookSecret === "string" && b.webhookSecret.trim()) await setIntegrationSetting(db, id, "webhook_secret", str(b.webhookSecret, 200).trim());
    await companyAudit(db, id, userId, "integration-settings", "", "ayarlar dəyişdi");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/integrations/test") {
    requirePermission("salaries", "Sınağı yalnız əmək haqqı icazəsi olan şəxs göndərə bilər.");
    if (!safeWebhookUrl(await integrationSetting(db, id, "webhook_url"))) throw new HttpError(409, "Əvvəl bildiriş ünvanını yazın.");
    const sample: OrderRow = { id: "test", order_no: "JL-TEST-000000", status: "ordered", category: "other", title: "Sınaq sifarişi", department: "", amount: 1, expense_date: new Date().toISOString().slice(0, 10), payee: "", note: "JobMatch sınaq bildirişi", ordered_at: new Date().toISOString(), paid_on: "", pay_method: "", pay_ref: "", external_id: "" };
    await pushWebhook(db, id, "ping", sample);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/plan-fact/export-data") {
    requirePermission("salaries", "Plan və fakt məlumatını yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const y = str(requestUrl.searchParams.get("year"), 4);
    const year = /^\d{4}$/.test(y) ? y : new Date().toISOString().slice(0, 4);
    const [lines, targets, expenses] = await Promise.all([
      db.prepare("SELECT month,department,category,amount FROM budget_lines WHERE company_id=? AND month LIKE ? AND kind='budget' ORDER BY category,department,month").bind(id, `${year}-%`).all<{ month: string; department: string; category: string; amount: number }>().catch(() => ({ results: [] as { month: string; department: string; category: string; amount: number }[] })),
      db.prepare("SELECT month,target FROM headcount_targets WHERE company_id=? AND month LIKE ? ORDER BY month").bind(id, `${year}-%`).all<{ month: string; target: number }>().catch(() => ({ results: [] as { month: string; target: number }[] })),
      db.prepare("SELECT * FROM hr_expenses WHERE company_id=? AND expense_date LIKE ? ORDER BY expense_date,created").bind(id, `${year}-%`).all<ExpenseDbRow>().catch(() => ({ results: [] as ExpenseDbRow[] })),
    ]);
    return ok({ year, budgets: lines.results, targets: targets.results, expenses: expenses.results.map(expenseRow) });
  }
  if (request.method === "POST" && path === "company/plan-fact/import") {
    requirePermission("salaries", "Planı yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const b = await jsonBody(request);
    const sheets = (Array.isArray(b.sheets) ? b.sheets : []).slice(0, 10).map((sh: { name?: unknown; rows?: unknown }) => ({ name: String(sh?.name ?? ""), rows: (Array.isArray(sh?.rows) ? sh.rows : []).slice(0, 5001).map((r: unknown) => (Array.isArray(r) ? r.map((c) => String(c ?? "")) : [])) }));
    const parsed = parsePlanFactSheets(sheets);
    const apply = b.apply === true;
    const problems = [...parsed.issues];
    const years = new Set([...parsed.budgets.map((x) => x.month.slice(0, 4)), ...parsed.targets.map((x) => x.month.slice(0, 4))]);
    for (const y of years) {
      const st = await yearPlanState(y);
      if (st.status !== "draft") problems.push({ sheet: "", line: 0, reason: `${y} planı ${st.status === "approved" ? "təsdiqlənib" : "təsdiqdədir"}: büdcə və işçi sayı planı dəyişmir. Direktor «Redaktə üçün aç» etməlidir.` });
    }
    // Expenses are checked one by one against the budget of their kind (the budget of this very file counts).
    const budgetNow = new Map<string, number>();
    const heldNow = new Map<string, number>();
    const budgetOf = async (category: string, year: string) => {
      const k = `${category}|${year}`;
      if (!budgetNow.has(k)) {
        const h = await heldBudget(category, year, "");
        const incoming = parsed.budgets.filter((x) => x.category === category && x.month.startsWith(year));
        // A line of this file replaces the stored one of the same department and month.
        const stored = (await db.prepare("SELECT month,department,amount FROM budget_lines WHERE company_id=? AND month LIKE ? AND category=? AND kind='budget'").bind(id, `${year}-%`, category).all<{ month: string; department: string; amount: number }>().catch(() => ({ results: [] as { month: string; department: string; amount: number }[] }))).results;
        const replaced = new Set(incoming.map((x) => `${x.department}|${x.month}`));
        const total = stored.filter((x) => !replaced.has(`${x.department}|${x.month}`)).reduce((t, x) => t + x.amount, 0) + incoming.reduce((t, x) => t + x.amount, 0);
        budgetNow.set(k, total);
        heldNow.set(k, h.held);
      }
      return { budget: budgetNow.get(k) as number, held: heldNow.get(k) as number, k };
    };
    const okExpenses: typeof parsed.expenses = [];
    for (const e of parsed.expenses) {
      const { budget, held, k } = await budgetOf(e.category, e.date.slice(0, 4));
      const fit = budgetProblem(expenseCategoryLabel(e.category), e.date.slice(0, 4), budget, held, e.amount);
      if (fit) {
        problems.push({ sheet: "Xərclər", line: 0, reason: `${e.title}: ${fit}` });
        continue;
      }
      heldNow.set(k, held + e.amount);
      okExpenses.push(e);
    }
    const blocked = problems.some((x) => !x.sheet) || (parsed.found.length === 0);
    const summary = { budgets: parsed.budgets.length, targets: parsed.targets.length, expenses: okExpenses.length, skipped: parsed.skipped, found: parsed.found };
    if (!apply || blocked) return ok({ applied: false, summary, issues: problems });
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];
    for (const x of parsed.budgets) statements.push(db.prepare("INSERT INTO budget_lines(company_id,month,department,category,kind,amount,updated,updated_by) VALUES(?,?,?,?,'budget',?,?,?) ON CONFLICT(company_id,month,department,category,kind) DO UPDATE SET amount=excluded.amount,updated=excluded.updated,updated_by=excluded.updated_by").bind(id, x.month, x.department, x.category, x.amount, now, userId));
    for (const x of parsed.targets) statements.push(db.prepare("INSERT INTO headcount_targets(company_id,month,target,updated,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(company_id,month) DO UPDATE SET target=excluded.target,updated=excluded.updated,updated_by=excluded.updated_by").bind(id, x.month, x.target, now, userId));
    for (const x of okExpenses) statements.push(db.prepare("INSERT INTO hr_expenses(id,company_id,category,title,department,employee_id,amount,expense_date,payee,note,status,created_by,created,updated,source) VALUES(?,?,?,?,?,'',?,?,?,?,'planned',?,?,?,'excel')").bind(crypto.randomUUID(), id, x.category, x.title, x.department, x.amount, x.date, x.payee, x.note, userId, now, now));
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "plan-fact-import", "", `${parsed.budgets.length} büdcə, ${parsed.targets.length} ay planı, ${okExpenses.length} xərc`);
    return ok({ applied: true, summary, issues: problems });
  }
  if (request.method === "GET" && path === "company/hr-report") {
    requirePermission("salaries", "Kadr və əmək haqqı fondu hesabatını yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    await auditView("view-fund-report");
    return ok(await hrFundReport());
  }
  if (request.method === "GET" && path === "company/hr-report/export") {
    requirePermission("salaries", "Hesabatı yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const r = await hrFundReport();
    const rows = r.departments.map((d) => [d.department, d.headcount, d.planned, d.free, d.over, d.fte, d.monthlyBudget, d.monthlyFund, d.monthlyVariance, d.avgSalary, d.vacationDays, d.vacationLiability, d.hires, d.exits, d.turnover, d.actualGross, d.actualNet, d.actualTax, d.actualInsurance, d.actualEmployerCost, d.budgetForPeriod, d.periodVariance]);
    const t = r.totals;
    rows.push(["CƏMİ", t.headcount, t.planned, t.free, "", "", t.monthlyBudget, t.monthlyFund, t.monthlyVariance, "", t.vacationDays, t.vacationLiability, t.hires, t.exits, t.turnover, t.actualGross, t.actualNet, "", "", t.actualEmployerCost, t.budgetForPeriod, t.periodVariance]);
    const leavers = r.departments.flatMap((d) => Object.entries(d.leavers).map(([type, n]) => [d.department, type, n]));
    await companyAudit(db, id, userId, "hr-report-exported", "", r.year);
    const book = createXlsxBook([
      { name: "Departamentlər", headers: ["Departament", "İşçi sayı", "Plan (ştat)", "Boş ştat", "Plandan artıq", "Ştat vahidi (FTE)", "Aylıq büdcə (plan)", "Aylıq fond (faktiki maaşlar, gross)", "Büdcə − fond", "Orta maaş", "Məzuniyyət qalığı (gün)", "Məzuniyyət borcu (AZN)", "İşə qəbul", "İşdən çıxma", "Dövriyyə %", "Təsdiqlənmiş aylar üzrə gross", "Net", "Gəlir vergisi", "İşçi sığortası", "İşəgötürənin xərci", "Dövr üçün büdcə", "Büdcə − fakt"], rows },
      { name: "Aylar üzrə", headers: ["Ay", "Gross", "Net", "İşəgötürənin xərci"], rows: r.months.map((m) => [m.month, m.gross, m.net, m.employerCost]) },
      { name: "Çıxış səbəbləri", headers: ["Departament", "Çıxışın növü", "Say"], rows: leavers },
    ]);
    return new Response(Uint8Array.from(book).buffer, {
      headers: { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="kadr-fond-hesabati-${r.year}.xlsx"`, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    });
  }
  return undefined;
}
