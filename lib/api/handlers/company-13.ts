// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { matchEmployee, parseTrainings } from "@/lib/sheet-imports";
import { quiet } from "@/lib/quiet";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_13(c: Pick<RouteCtx, "catalogSkills" | "dateOk" | "db" | "employeeRefs" | "ensureSkillDef" | "id" | "path" | "request" | "requirePermission" | "resolveAnySkill" | "setSkillLevel" | "tellPayroll" | "trainingYear" | "userId">): Promise<Response | undefined> {
  const { catalogSkills, dateOk, db, employeeRefs, ensureSkillDef, id, path, request, requirePermission, resolveAnySkill, setSkillLevel, tellPayroll, trainingYear, userId } = c;
  if (request.method === "GET" && path === "company/training") {
    requirePermission("salaries", "Təlim planını yalnız kadr işçisi görə bilər.");
    const year = trainingYear();
    const [list, parts, budget, people] = await Promise.all([
      db.prepare("SELECT id,title,provider,kind,start_date,end_date,hours,cost_cents,status,note,valid_months,required_for,skill_id,skill_level FROM trainings WHERE company_id=? ORDER BY start_date").bind(id).all<{ id: string; title: string; provider: string; kind: string; start_date: string; end_date: string; hours: number; cost_cents: number; status: string; note: string; valid_months: number; required_for: string; skill_id: string; skill_level: number }>(),
      db.prepare("SELECT training_id,employee_id,status,result,certificate_no,completed_on,valid_until,bond_months,bond_until,bond_cost_cents FROM training_participants WHERE company_id=?").bind(id).all<{ training_id: string; employee_id: string; status: string; result: string; certificate_no: string; completed_on: string; valid_until: string; bond_months: number; bond_until: string; bond_cost_cents: number }>(),
      db.prepare("SELECT value FROM hr_settings WHERE company_id=? AND key=?").bind(id, `training_budget_${year}`).first<{ value: string }>(),
      db.prepare("SELECT id,name,department FROM company_employees WHERE company_id=? AND status IN ('active','leave') ORDER BY name").bind(id).all<{ id: string; name: string; department: string }>(),
    ]);
    const names = new Map(people.results.map((p) => [p.id, p.name]));
    const inYear = list.results.filter((t) => t.start_date.startsWith(`${year}-`) || !t.start_date);
    const spent = inYear.filter((t) => t.status !== "cancelled").reduce((sum, t) => sum + t.cost_cents, 0) / 100;
    const hoursBy = new Map<string, number>();
    for (const t of list.results) if (t.status === "done") for (const p of parts.results.filter((x) => x.training_id === t.id && x.status === "completed")) hoursBy.set(p.employee_id, (hoursBy.get(p.employee_id) || 0) + t.hours);
    return ok({
      year,
      budget: await (async () => { const planned = await db.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM budget_lines WHERE company_id=? AND month LIKE ? AND category='training' AND kind='budget'").bind(id, `${year}-%`).first<{ s: number }>().catch(() => null); return Number(planned?.s) > 0 ? Number(planned?.s) : Number(budget?.value || 0) / 100; })(),
      spent,
      trainings: inYear.map((t) => ({ id: t.id, title: t.title, provider: t.provider, kind: t.kind, start: t.start_date, end: t.end_date, hours: t.hours, cost: t.cost_cents / 100, status: t.status, note: t.note, validMonths: t.valid_months, requiredFor: t.required_for, skillId: t.skill_id, skillLevel: t.skill_level, participants: parts.results.filter((p) => p.training_id === t.id).map((p) => ({ employeeId: p.employee_id, name: names.get(p.employee_id) || "", status: p.status, result: p.result, certificateNo: p.certificate_no, completedOn: p.completed_on, validUntil: p.valid_until, bondMonths: p.bond_months, bondUntil: p.bond_until, bondCost: p.bond_cost_cents / 100 })) })),
      employees: people.results.map((p) => ({ id: p.id, name: p.name, department: p.department, hours: hoursBy.get(p.id) || 0 })),
      skills: (await db.prepare("SELECT id,name FROM skill_defs WHERE company_id=? ORDER BY name").bind(id).all<{ id: string; name: string }>()).results,
      bonds: parts.results.filter((p) => p.bond_until && p.bond_until >= new Date().toISOString().slice(0, 10)).map((p) => ({ employeeId: p.employee_id, name: names.get(p.employee_id) || "", title: list.results.find((t) => t.id === p.training_id)?.title || "", until: p.bond_until, cost: p.bond_cost_cents / 100 })).sort((a, b) => a.until.localeCompare(b.until)),
      // Certificates that run out within 60 days (or already did), and who still lacks a mandatory training of their position.
      expiring: parts.results.filter((p) => p.valid_until && p.valid_until <= new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)).map((p) => ({ employeeId: p.employee_id, name: names.get(p.employee_id) || "", title: list.results.find((t) => t.id === p.training_id)?.title || "", validUntil: p.valid_until, expired: p.valid_until < new Date().toISOString().slice(0, 10) })).sort((a, b) => a.validUntil.localeCompare(b.validUntil)),
      missing: await (async () => {
        const staff = (await db.prepare("SELECT id,name,position FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ id: string; name: string; position: string }>()).results;
        const today = new Date().toISOString().slice(0, 10);
        return list.results.filter((t) => t.required_for && t.status !== "cancelled").map((t) => {
          // Typed with or without the Azerbaijani letters ("sürücü" or "surucu"): both match.
          const plain = (v: string) => v.toLocaleLowerCase("az").replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g");
          const needed = t.required_for.split(/[;,]/).map((x) => plain(x.trim())).filter(Boolean);
          const who = staff.filter((e) => needed.some((n) => plain(e.position).includes(n)));
          const lacking = who.filter((e) => !parts.results.some((p) => p.training_id === t.id && p.employee_id === e.id && p.status === "completed" && (!p.valid_until || p.valid_until >= today)));
          return { trainingId: t.id, title: t.title, requiredFor: t.required_for, employees: lacking.map((e) => ({ id: e.id, name: e.name })) };
        }).filter((m) => m.employees.length);
      })(),
    });
  }
  if (request.method === "POST" && path === "company/training/save") {
    requirePermission("salaries", "Təlimi yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const title = str(b.title, 200);
    if (title.length < 3) throw new HttpError(400, "Təlimin adını yazın.");
    const start = dateOk(str(b.start, 10)) ? str(b.start, 10) : "";
    const end = dateOk(str(b.end, 10)) ? str(b.end, 10) : start;
    if (start && end < start) throw new HttpError(400, "Bitmə tarixi başlanğıcdan əvvəl ola bilməz.");
    const kind = ["internal", "external", "online", "safety"].includes(str(b.kind, 10)) ? str(b.kind, 10) : "external";
    const status = ["planned", "done", "cancelled"].includes(str(b.status, 10)) ? str(b.status, 10) : "planned";
    const values = [title, str(b.provider, 120), kind, start, end, Math.max(0, Math.min(2000, Math.round(Number(b.hours) || 0))), Math.max(0, Math.round((Number(b.cost) || 0) * 100)), status, str(b.note, 300), Math.max(0, Math.min(120, Math.round(Number(b.validMonths) || 0))), str(b.requiredFor, 120), str(b.skillId, 100), Math.max(0, Math.min(4, Math.round(Number(b.skillLevel) || 0)))];
    if (str(b.id, 100)) await db.prepare("UPDATE trainings SET title=?,provider=?,kind=?,start_date=?,end_date=?,hours=?,cost_cents=?,status=?,note=?,valid_months=?,required_for=?,skill_id=?,skill_level=? WHERE id=? AND company_id=?").bind(...values, str(b.id, 100), id).run();
    else await db.prepare("INSERT INTO trainings(id,company_id,title,provider,kind,start_date,end_date,hours,cost_cents,status,note,valid_months,required_for,skill_id,skill_level,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, ...values, new Date().toISOString()).run();
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/training/participants") {
    requirePermission("salaries", "İştirakçıları yalnız kadr işçisi seçə bilər.");
    const b = await jsonBody(request);
    const training = await db.prepare("SELECT id,title,start_date FROM trainings WHERE id=? AND company_id=?").bind(str(b.trainingId, 100), id).first<{ id: string; title: string; start_date: string }>();
    if (!training) throw new HttpError(404, "Təlim tapılmadı.");
    const wanted = new Set<string>((Array.isArray(b.employeeIds) ? (b.employeeIds as unknown[]) : []).map((x) => String(x)).slice(0, 5000));
    const valid = new Set((await db.prepare("SELECT id FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ id: string }>()).results.map((r) => r.id));
    const current = new Set((await db.prepare("SELECT employee_id FROM training_participants WHERE training_id=?").bind(training.id).all<{ employee_id: string }>()).results.map((r) => r.employee_id));
    const added = [...wanted].filter((e) => valid.has(e) && !current.has(e));
    const removed = [...current].filter((e) => !wanted.has(e));
    const statements = [
      ...added.map((e) => db.prepare("INSERT INTO training_participants(training_id,company_id,employee_id,status) VALUES(?,?,?,'invited')").bind(training.id, id, e)),
      ...removed.map((e) => db.prepare("DELETE FROM training_participants WHERE training_id=? AND employee_id=?").bind(training.id, e)),
    ];
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    if (added.length) await tellPayroll(added, "Təlimə dəvət olundunuz", `${training.title}${training.start_date ? ` (${training.start_date})` : ""}. İş yerim → Təlimlərim bölməsində cavab verin.`);
    return ok({ ok: true, added: added.length, removed: removed.length });
  }
  if (request.method === "POST" && path === "company/training/import") {
    requirePermission("salaries", "Təlimi yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const parsed = parseTrainings((Array.isArray(b.rows) ? b.rows : []).slice(0, 3001).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda təlim tapılmadı.");
    const refs = await employeeRefs();
    const custom = await catalogSkills();
    const issues = [...parsed.issues];
    const existing = (await db.prepare("SELECT id,title,start_date FROM trainings WHERE company_id=?").bind(id).all<{ id: string; title: string; start_date: string }>()).results;
    const byKey = new Map(existing.map((t) => [`${t.title.toLocaleLowerCase("az")}|${t.start_date}`, t.id]));
    const have = new Set((await db.prepare("SELECT training_id,employee_id FROM training_participants WHERE company_id=?").bind(id).all<{ training_id: string; employee_id: string }>()).results.map((p) => `${p.training_id}|${p.employee_id}`));
    const invited = new Map<string, { title: string; start: string; ids: string[] }>();
    let created = 0;
    let participants = 0;
    for (const row of parsed.rows) {
      let skillId = "";
      if (row.skill) {
        const skill = await resolveAnySkill(row.skill, custom);
        if (!skill) {
          issues.push({ line: row.line, reason: `${row.title}: “${row.skill}” bacarıq kataloqunda və ESCO siyahısında tapılmadı (admin panelindəki kataloqa baxın).` });
          continue;
        }
        try {
          skillId = await ensureSkillDef(skill);
        } catch (error) {
          issues.push({ line: row.line, reason: `${row.title}: ${(error as Error).message}` });
          continue;
        }
      }
      let employeeId = "";
      if (row.name || row.fin) {
        const found = matchEmployee(refs, { name: row.name, email: row.email, fin: row.fin });
        if ("error" in found) {
          issues.push({ line: row.line, reason: found.error });
          continue;
        }
        employeeId = found.id;
      }
      const key = `${row.title.toLocaleLowerCase("az")}|${row.start}`;
      let trainingId = byKey.get(key);
      if (!trainingId) {
        trainingId = crypto.randomUUID();
        await db.prepare("INSERT INTO trainings(id,company_id,title,provider,kind,start_date,end_date,hours,cost_cents,status,note,valid_months,required_for,skill_id,skill_level,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(trainingId, id, row.title, row.provider, row.kind, row.start, row.end, row.hours, Math.round(row.cost * 100), row.status, "", row.validMonths, "", skillId, row.skillLevel, new Date().toISOString()).run();
        byKey.set(key, trainingId);
        created++;
      }
      if (employeeId && !have.has(`${trainingId}|${employeeId}`)) {
        await db.prepare("INSERT INTO training_participants(training_id,company_id,employee_id,status) VALUES(?,?,?,'invited')").bind(trainingId, id, employeeId).run();
        have.add(`${trainingId}|${employeeId}`);
        const entry = invited.get(trainingId) || { title: row.title, start: row.start, ids: [] };
        entry.ids.push(employeeId);
        invited.set(trainingId, entry);
        participants++;
      }
    }
    for (const t of invited.values()) await tellPayroll(t.ids, "Təlimə dəvət olundunuz", `${t.title}${t.start ? ` (${t.start})` : ""}. İş yerim → Təlimlərim bölməsində cavab verin.`);
    await companyAudit(db, id, userId, "training-imported", "", `${created} təlim, ${participants} iştirakçı Excel faylından yükləndi`);
    return ok({ created, participants, issues });
  }
  if (request.method === "POST" && path === "company/training/result") {
    requirePermission("salaries", "Nəticəni yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const status = ["invited", "attending", "completed", "declined"].includes(str(b.status, 12)) ? str(b.status, 12) : "invited";
    const trainingRow = await db.prepare("SELECT valid_months FROM trainings WHERE id=? AND company_id=?").bind(str(b.trainingId, 100), id).first<{ valid_months: number }>();
    const bondMonths = Math.max(0, Math.min(120, Math.round(Number(b.bondMonths) || 0)));
    const bondCost = Math.max(0, Math.round((Number(b.bondCost) || 0) * 100));
    // A completed training with a validity (a safety briefing, first aid) runs out on a date the system watches.
    const completedOn = status === "completed" ? (dateOk(str(b.completedOn, 10)) ? str(b.completedOn, 10) : new Date().toISOString().slice(0, 10)) : "";
    const validUntil = completedOn && trainingRow?.valid_months ? (() => { const d = new Date(`${completedOn}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + trainingRow.valid_months); return d.toISOString().slice(0, 10); })() : "";
    // A bond ("work for the company so many months after the training"): the date it ends is watched at an exit.
    const bondUntil = completedOn && bondMonths ? (() => { const d = new Date(`${completedOn}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + bondMonths); return d.toISOString().slice(0, 10); })() : "";
    const res = await db.prepare("UPDATE training_participants SET status=?,result=?,certificate_no=?,completed_on=?,valid_until=?,bond_months=?,bond_until=?,bond_cost_cents=? WHERE training_id=? AND employee_id=? AND company_id=?").bind(status, str(b.result, 200), str(b.certificateNo, 60), completedOn, validUntil, bondMonths, bondUntil, bondCost, str(b.trainingId, 100), str(b.employeeId, 100), id).run();
    if (!res.meta.changes) throw new HttpError(404, "İştirakçı tapılmadı.");
    // A completed training that teaches a skill lifts the level in the skill matrix (never lowers it).
    let skillGranted = "";
    if (status === "completed") {
      const t = await db.prepare("SELECT skill_id,skill_level FROM trainings WHERE id=? AND company_id=?").bind(str(b.trainingId, 100), id).first<{ skill_id: string; skill_level: number }>();
      if (t?.skill_id && t.skill_level > 0) {
        const cur = await db.prepare("SELECT level FROM employee_skills WHERE company_id=? AND employee_id=? AND skill_id=?").bind(id, str(b.employeeId, 100), t.skill_id).first<{ level: number }>();
        if ((cur?.level || 0) < t.skill_level) {
          await setSkillLevel(id, str(b.employeeId, 100), t.skill_id, t.skill_level, null).catch((error) => quiet("route-best-effort", error));
          skillGranted = t.skill_id;
        }
      }
    }
    return ok({ ok: true, validUntil, skillGranted });
  }
  if (request.method === "POST" && path === "company/training/delete") {
    requirePermission("salaries", "Təlimi yalnız kadr işçisi silə bilər.");
    const b = await jsonBody(request);
    await db.batch([db.prepare("DELETE FROM training_participants WHERE training_id=? AND company_id=?").bind(str(b.id, 100), id), db.prepare("DELETE FROM trainings WHERE id=? AND company_id=?").bind(str(b.id, 100), id)]);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/training/budget") {
    requirePermission("salaries", "Büdcəni yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const year = str(b.year, 4);
    if (!/^\d{4}$/.test(year)) throw new HttpError(400, "İli düzgün seçin.");
    await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, `training_budget_${year}`, String(Math.max(0, Math.round((Number(b.amount) || 0) * 100)))).run();
    return ok({ ok: true });
  }
  return undefined;
}
