// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { addSections, addStructure, canonicalOrg, deletePosition, deleteStructure, loadPositions, loadStaffHistory, loadStructure, renamePosition, renameStructure } from "@/lib/staff-db";
import { cleanOrgName } from "@/lib/org-names";
import { companyAudit } from "@/lib/api-core";
import { encryptionOn, sealProfile } from "@/lib/secure-profile";
import { normalizeProfile } from "@/lib/employee-profile";
import { parseStaffRows } from "@/lib/staff-import";
import { parseStructureRows } from "@/lib/staff-import";
import { quiet } from "@/lib/quiet";
import { splitNames } from "@/lib/section-suggestions";
import { applyStaffRows, ensureBranch, ok, setPlanStatus, staffBandProblem } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_32(c: Pick<RouteCtx, "canAct" | "dataKey" | "db" | "id" | "path" | "planLocked" | "queueApproval" | "request" | "requirePermission" | "reveal" | "structureDb" | "userId">): Promise<Response | undefined> {
  const { canAct, dataKey, db, id, path, planLocked, queueApproval, request, requirePermission, reveal, structureDb, userId } = c;
  if (request.method === "GET" && path === "company/structure") {
    requirePermission("salaries", "Strukturu yalnız HR, direktor və hesab sahibi görə bilər.");
    return ok(await loadStructure(db, id));
  }
  if (request.method === "GET" && path === "company/structure/positions") {
    requirePermission("salaries", "Vəzifələri yalnız ştat icazəsi olan şəxs görə bilər.");
    return ok({ positions: await loadPositions(db, id) });
  }
  if (request.method === "POST" && path === "company/structure/positions/rename") {
    requirePermission("salaries", "Vəzifələri yalnız ştat icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const from = str(b.from, 120);
    const name = await structureDb(() => renamePosition(db, id, from, str(b.to, 120)));
    await companyAudit(db, id, userId, "structure-renamed", from, `vəzifə: ${from} → ${name}`);
    return ok({ ok: true, name });
  }
  if (request.method === "POST" && path === "company/structure/positions/delete") {
    requirePermission("salaries", "Vəzifələri yalnız ştat icazəsi olan şəxs silə bilər.");
    const b = await jsonBody(request);
    const name = str(b.name, 120);
    await structureDb(() => deletePosition(db, id, name));
    await companyAudit(db, id, userId, "structure-removed", name, "vəzifə");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/structure/branch/add") {
    requirePermission("salaries", "Strukturu yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const name = cleanOrgName(str(b.name, 120));
    if (name.length < 2) throw new HttpError(400, "Filialın adını yazın.");
    const before = (await db.prepare("SELECT COUNT(*) AS n FROM branches WHERE company_id=?").bind(id).first<{ n: number }>())?.n || 0;
    const canonical = await ensureBranch(db, id, name);
    const after = (await db.prepare("SELECT COUNT(*) AS n FROM branches WHERE company_id=?").bind(id).first<{ n: number }>())?.n || 0;
    const row = (await db.prepare("SELECT id,name FROM branches WHERE company_id=?").bind(id).all<{ id: string; name: string }>()).results.find((x) => x.name === canonical);
    // The code and the city may be written when the branch is made.
    if (after > before && row) await db.prepare("UPDATE branches SET code=?,city=? WHERE id=? AND company_id=?").bind(str(b.code, 40).trim(), str(b.city, 120).trim(), row.id, id).run();
    if (after > before) await companyAudit(db, id, userId, "branch", canonical, "yaradıldı (struktur)");
    return ok({ ok: true, id: row?.id || "", name: canonical, existing: after === before });
  }
  if (request.method === "POST" && path === "company/structure/department/move") {
    requirePermission("salaries", "Strukturu yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const department = str(b.department, 120).trim();
    const fromName = str(b.from, 120).trim();
    const toName = str(b.to, 120).trim();
    if (!department) throw new HttpError(400, "Departamenti seçin.");
    const az = (v: string) => v.trim().toLocaleLowerCase("az");
    const all = (await db.prepare("SELECT id,name FROM branches WHERE company_id=?").bind(id).all<{ id: string; name: string }>()).results;
    const from = fromName ? all.find((x) => az(x.name) === az(fromName)) : undefined;
    const to = toName ? all.find((x) => az(x.name) === az(toName)) : undefined;
    if (toName && !to) throw new HttpError(409, `“${toName}” filialı yoxdur. Əvvəlcə filialı yaradın.`);
    const units = (await db.prepare("SELECT id,branch,department FROM staff_units WHERE company_id=?").bind(id).all<{ id: string; branch: string; department: string }>()).results.filter((u) => az(u.department) === az(department) && az(u.branch) === az(fromName));
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = units.map((u) => db.prepare("UPDATE staff_units SET branch=?,updated=? WHERE id=? AND company_id=?").bind(to?.name || "", now, u.id, id));
    if (from) statements.push(db.prepare("DELETE FROM branch_departments WHERE company_id=? AND branch_id=? AND department=?").bind(id, from.id, department));
    if (to) statements.push(db.prepare("INSERT OR IGNORE INTO branch_departments(company_id,branch_id,department) VALUES(?,?,?)").bind(id, to.id, department));
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "structure-moved", department, `${fromName || "filialsız"} → ${toName || "filialsız"} (${units.length} ştat sətri)`);
    return ok({ ok: true, moved: units.length });
  }
  if (request.method === "POST" && path === "company/structure/add") {
    requirePermission("salaries", "Strukturu yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const department = cleanOrgName(str(b.department, 120));
    if (department.length < 2) throw new HttpError(400, "Departamentin adını yazın.");
    const result = await addStructure(db, id, department, str(b.section, 120));
    // A department made for a branch belongs to it: the branch is chosen from the list of the branches.
    const branchName = str(b.branch, 120).trim();
    if (branchName) {
      const all = await db.prepare("SELECT id,name FROM branches WHERE company_id=?").bind(id).all<{ id: string; name: string }>();
      const found = all.results.find((x) => x.name.trim().toLocaleLowerCase("az") === branchName.toLocaleLowerCase("az"));
      if (!found) throw new HttpError(409, `“${branchName}” filialı yoxdur. Əvvəlcə filialı «Filiallar» siyahısında yaradın.`);
      await db.prepare("INSERT OR IGNORE INTO branch_departments(company_id,branch_id,department) VALUES(?,?,?)").bind(id, found.id, result.department).run();
    }
    await companyAudit(db, id, userId, "structure-added", result.department, result.section || "departament");
    return ok({ ok: true, ...result });
  }
  if (request.method === "POST" && path === "company/structure/add-many") {
    requirePermission("salaries", "Strukturu yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const department = cleanOrgName(str(b.department, 120));
    if (department.length < 2) throw new HttpError(400, "Departamentin adını yazın.");
    const names = splitNames((Array.isArray(b.sections) ? b.sections : []).slice(0, 300).map((x: unknown) => String(x ?? "")).join("\n"), 200);
    if (!names.length) throw new HttpError(400, "Şöbə adı tapılmadı.");
    const { department: owner, created, existing } = await addSections(db, id, department, names);
    await companyAudit(db, id, userId, "structure-added", owner, `${created} şöbə əlavə edildi, ${existing} mövcud`);
    return ok({ ok: true, created, existing, department: owner });
  }
  if (request.method === "POST" && path === "company/structure/rename") {
    requirePermission("salaries", "Strukturu yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const department = str(b.department, 120);
    const section = str(b.section, 120);
    const name = await structureDb(() => renameStructure(db, id, department, str(b.to, 120), section));
    if (!section) await db.prepare("UPDATE OR IGNORE branch_departments SET department=? WHERE company_id=? AND department=?").bind(name, id, department).run().catch((error) => quiet("route-best-effort", error));
    await companyAudit(db, id, userId, "structure-renamed", department, `${section || department} → ${name}`);
    return ok({ ok: true, name });
  }
  if (request.method === "POST" && path === "company/structure/delete") {
    requirePermission("salaries", "Strukturu yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const department = str(b.department, 120);
    const section = str(b.section, 120);
    // A line of a branch: only the department's place in that branch goes (the name stays for the other branches and the company).
    const lineBranch = str(b.branch, 120).trim();
    if (lineBranch && !section) {
      const all = (await db.prepare("SELECT id,name FROM branches WHERE company_id=?").bind(id).all<{ id: string; name: string }>()).results;
      const found = all.find((x) => x.name.trim().toLocaleLowerCase("az") === lineBranch.toLocaleLowerCase("az"));
      if (!found) throw new HttpError(404, "Filial tapılmadı.");
      const rows = (await db.prepare("SELECT branch,department FROM staff_units WHERE company_id=?").bind(id).all<{ branch: string; department: string }>()).results.filter((u) => u.department.trim().toLocaleLowerCase("az") === department.trim().toLocaleLowerCase("az") && u.branch.trim().toLocaleLowerCase("az") === found.name.trim().toLocaleLowerCase("az"));
      if (rows.length) throw new HttpError(409, `“${department}” departamenti ${found.name} filialında ştat cədvəlinin ${rows.length} sətrində istifadə olunur. Əvvəl həmin sətirləri silin və ya başqa filiala keçirin.`);
      await db.prepare("DELETE FROM branch_departments WHERE company_id=? AND branch_id=? AND department=?").bind(id, found.id, department).run();
      await companyAudit(db, id, userId, "structure-removed", department, `filial: ${found.name}`);
      return ok({ ok: true });
    }
    await structureDb(() => deleteStructure(db, id, department, section));
    if (!section) await db.prepare("DELETE FROM branch_departments WHERE company_id=? AND department=?").bind(id, department).run().catch((error) => quiet("route-best-effort", error));
    await companyAudit(db, id, userId, "structure-removed", department, section || "departament");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/structure/import") {
    requirePermission("salaries", "Strukturu yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const incoming = parseStructureRows(
      (Array.isArray(b.rows) ? b.rows : []).slice(0, 501).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])),
    );
    if (!incoming.rows.length) throw new HttpError(400, incoming.issues[0]?.reason || "Faylda departament tapılmadı.");
    // One pass per department: the department once, then its sections in batches.
    const before = await loadStructure(db, id);
    const haveDepartment = new Set(before.departments.map((d) => d.name.toLocaleLowerCase("az")));
    const groups = new Map<string, { name: string; sections: string[] }>();
    for (const row of incoming.rows) {
      const group = groups.get(row.department.toLocaleLowerCase("az")) || { name: row.department, sections: [] };
      if (row.section) group.sections.push(row.section);
      groups.set(row.department.toLocaleLowerCase("az"), group);
    }
    let created = 0;
    let existing = 0;
    for (const group of groups.values()) {
      const known = haveDepartment.has(group.name.toLocaleLowerCase("az"));
      const result = group.sections.length ? await addSections(db, id, group.name, group.sections) : { department: await canonicalOrg(db, id, "department", group.name), created: 0, existing: 0 };
      if (!known) created += 1;
      else if (!group.sections.length) existing += 1;
      created += result.created;
      existing += result.existing;
    }
    await companyAudit(db, id, userId, "structure-imported", "", `${created} yeni, ${existing} mövcud`);
    return ok({ created, existing, issues: incoming.issues });
  }
  if (request.method === "GET" && path === "company/staff/history") {
    requirePermission("salaries", "Ştat tarixçəsini yalnız HR, direktor və hesab sahibi görə bilər.");
    return ok({ entries: await loadStaffHistory(db, id) });
  }
  if (request.method === "POST" && path === "company/employees/profile") {
    requirePermission("salaries", "Şəxsi məlumatları yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const { profile, issues } = normalizeProfile(b.profile);
    if (issues.length) throw new HttpError(400, issues[0]);
    const stored = await db.prepare("SELECT profile FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.id, 100), id).first<{ profile: string }>();
    if (stored && (await reveal(stored.profile)).locked) throw new HttpError(409, "Bu işçinin şifrələnmiş məlumatı açıla bilmir (şifrələmə açarı yoxdur və ya səhvdir): saxlamaq mövcud məlumatı silərdi.");
    const done = await db
      .prepare("UPDATE company_employees SET profile=?,updated=? WHERE id=? AND company_id=? AND status<>'removed'")
      .bind(await sealProfile(profile, dataKey()), new Date().toISOString(), str(b.id, 100), id)
      .run();
    if (!done.meta.changes) throw new HttpError(404, "İşçi tapılmadı.");
    await companyAudit(db, id, userId, "employee-profile", str(b.id, 100), "Şəxsi məlumatlar yeniləndi");
    return ok({ ok: true, profile });
  }
  if (request.method === "GET" && path === "company/security/encryption") {
    if (!canAct("approve-director")) throw new HttpError(403, "Şifrələmə vəziyyətini yalnız direktor və ya hesab sahibi görə bilər.");
    const rows = (await db.prepare("SELECT profile FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ profile: string }>()).results;
    const sealed = rows.filter((r) => r.profile.includes("\"__enc\"")).length;
    return ok({ keySet: encryptionOn(dataKey()), employees: rows.length, sealed, open: rows.length - sealed });
  }
  if (request.method === "POST" && path === "company/security/encrypt") {
    if (!canAct("approve-director")) throw new HttpError(403, "Şifrələməni yalnız direktor və ya hesab sahibi işə sala bilər.");
    if (!encryptionOn(dataKey())) throw new HttpError(409, "Şifrələmə açarı (DATA_KEY) qoyulmayıb: əvvəl serverdə gizli dəyər kimi əlavə edilməlidir.");
    const rows = (await db.prepare("SELECT id,profile FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ id: string; profile: string }>()).results;
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];
    let skipped = 0;
    for (const r of rows) {
      const opened = await reveal(r.profile);
      if (opened.locked) {
        skipped += 1;
        continue;
      }
      statements.push(db.prepare("UPDATE company_employees SET profile=?,updated=? WHERE id=? AND company_id=?").bind(await sealProfile(opened.profile, dataKey()), now, r.id, id));
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "profiles-encrypted", "", `${statements.length} profil, ${skipped} atlandı`);
    return ok({ ok: true, sealed: statements.length, skipped });
  }
  if (request.method === "POST" && path === "company/staff/submit-plan") {
    requirePermission("salaries", "Ştat planını yalnız HR, direktor və hesab sahibi təsdiqə göndərə bilər.");
    const count = await db.prepare("SELECT COUNT(*) AS n FROM staff_units WHERE company_id=?").bind(id).first<{ n: number }>();
    if (!Number(count?.n)) throw new HttpError(400, "Əvvəl ştat sətirləri əlavə edin.");
    if (canAct("approve-director")) {
      await setPlanStatus(db, id, "approved");
      await companyAudit(db, id, userId, "staff-plan-approved", "", "Ştat planı təsdiqləndi");
      return ok({ ok: true, status: "approved" });
    }
    await setPlanStatus(db, id, "pending");
    await queueApproval("headcount", `Ştat planının təsdiqi (${Number(count?.n)} sətir)`, { approvePlan: true });
    return ok({ ok: true, status: "pending" });
  }
  if (request.method === "POST" && path === "company/staff/import") {
    requirePermission("salaries", "Ştat cədvəlini yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const incoming = parseStaffRows(
      (Array.isArray(b.rows) ? b.rows : []).slice(0, 501).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])),
    );
    if (!incoming.rows.length) throw new HttpError(400, incoming.issues[0]?.reason || "Faylda ştat sətri tapılmadı.");
    const rows = incoming.rows.map((row) => ({ branch: row.branch, department: row.department, section: row.section, position: row.position, planned: row.planned, rate: row.rate, salaryCents: Math.round(row.salary * 100), salaryMaxCents: Math.round(row.salaryMax * 100), level: row.level, startMonth: row.startMonth, endMonth: row.endMonth, note: row.note }));
    const importProblem = await staffBandProblem(db, id, rows);
    if (importProblem) throw new HttpError(409, importProblem);
    if (await planLocked()) {
      await queueApproval("headcount", `Excel idxalı: ${rows.length} ştat sətri`, { units: rows });
      return ok({ created: 0, updated: 0, pending: true, issues: incoming.issues });
    }
    const { created, updated } = await applyStaffRows(db, id, rows);
    await companyAudit(db, id, userId, "staff-imported", "", `${created} yeni, ${updated} yenilənən`);
    return ok({ created, updated, issues: incoming.issues });
  }
  return undefined;
}
