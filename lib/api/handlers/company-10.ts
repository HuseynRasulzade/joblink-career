// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { ASSET_CATEGORIES, ASSET_STATUS, assetActHtml, parseAssetRows } from "@/lib/assets";
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { AssetRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_10(c: Pick<RouteCtx, "db" | "id" | "path" | "request" | "requestUrl" | "requirePermission" | "tellEmployee" | "userId">): Promise<Response | undefined> {
  const { db, id, path, request, requestUrl, requirePermission, tellEmployee, userId } = c;
  if (request.method === "GET" && path === "company/assets") {
    requirePermission("salaries", "Aktivləri yalnız kadr işçisi görə bilər.");
    const [assets, open, people] = await Promise.all([
      db.prepare("SELECT id,name,category,serial,inventory_no,value_cents,status,note FROM assets WHERE company_id=? ORDER BY name LIMIT 1000").bind(id).all<AssetRow>(),
      db.prepare("SELECT id,asset_id,employee_id,issued_on,condition_out,note FROM asset_assignments WHERE company_id=? AND returned_on=''").bind(id).all<{ id: string; asset_id: string; employee_id: string; issued_on: string; condition_out: string; note: string }>(),
      db.prepare("SELECT id,name,department FROM company_employees WHERE company_id=? AND status IN ('active','leave') ORDER BY name").bind(id).all<{ id: string; name: string; department: string }>(),
    ]);
    const names = new Map(people.results.map((p) => [p.id, p.name]));
    const everyone = new Map((await db.prepare("SELECT id,name FROM company_employees WHERE company_id=?").bind(id).all<{ id: string; name: string }>()).results.map((p) => [p.id, p.name]));
    const holder = new Map(open.results.map((o) => [o.asset_id, o]));
    return ok({
      categories: ASSET_CATEGORIES,
      statusText: ASSET_STATUS,
      assets: assets.results.map((a) => {
        const h = holder.get(a.id);
        return { id: a.id, name: a.name, category: a.category, serial: a.serial, inventoryNo: a.inventory_no, value: a.value_cents / 100, status: a.status, statusText: ASSET_STATUS[a.status] || a.status, note: a.note, holderId: h?.employee_id || "", holder: h ? everyone.get(h.employee_id) || "" : "", assignmentId: h?.id || "", issuedOn: h?.issued_on || "" };
      }),
      employees: people.results.map((p) => ({ id: p.id, name: p.name, department: p.department })),
      acked: (await db.prepare("SELECT id FROM asset_assignments WHERE company_id=? AND returned_on='' AND ack_issued_at<>''").bind(id).all<{ id: string }>()).results.map((r) => r.id),
      total: { count: assets.results.length, assigned: open.results.length, value: Math.round(assets.results.reduce((t, a) => t + a.value_cents, 0)) / 100 },
      names: Object.fromEntries(names),
    });
  }
  if (request.method === "POST" && path === "company/assets/save") {
    requirePermission("salaries", "Aktivləri yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    const name = str(b.name, 120);
    if (name.length < 2) throw new HttpError(400, "Əmlakın adını yazın.");
    const value = Math.max(0, Math.min(100_000_000, Math.round((Number(b.value) || 0) * 100)));
    const status = ["stock", "repair", "written-off"].includes(str(b.status, 12)) ? str(b.status, 12) : "stock";
    const editing = str(b.id, 100);
    if (editing) {
      const cur = await db.prepare("SELECT status FROM assets WHERE id=? AND company_id=?").bind(editing, id).first<{ status: string }>();
      if (!cur) throw new HttpError(404, "Əmlak tapılmadı.");
      await db.prepare("UPDATE assets SET name=?,category=?,serial=?,inventory_no=?,value_cents=?,status=CASE WHEN status='assigned' THEN status ELSE ? END,note=? WHERE id=? AND company_id=?").bind(name, str(b.category, 40), str(b.serial, 60), str(b.inventoryNo, 40), value, status, str(b.note, 300), editing, id).run();
      return ok({ ok: true, id: editing });
    }
    const total = Number((await db.prepare("SELECT COUNT(*) AS n FROM assets WHERE company_id=?").bind(id).first<{ n: number }>())?.n || 0);
    if (total >= 2000) throw new HttpError(409, "Ən çox 2000 əmlak saxlanılır.");
    const assetId = crypto.randomUUID();
    await db.prepare("INSERT INTO assets(id,company_id,name,category,serial,inventory_no,value_cents,status,note,created) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(assetId, id, name, str(b.category, 40), str(b.serial, 60), str(b.inventoryNo, 40), value, status, str(b.note, 300), new Date().toISOString()).run();
    return ok({ ok: true, id: assetId }, 201);
  }
  if (request.method === "POST" && path === "company/assets/import") {
    requirePermission("salaries", "Aktivləri yalnız kadr işçisi yükləyə bilər.");
    const b = await jsonBody(request);
    const parsed = parseAssetRows((Array.isArray(b.rows) ? b.rows : []).slice(0, 501).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda əmlak tapılmadı.");
    const total = Number((await db.prepare("SELECT COUNT(*) AS n FROM assets WHERE company_id=?").bind(id).first<{ n: number }>())?.n || 0);
    if (total + parsed.rows.length > 2000) throw new HttpError(409, "Ən çox 2000 əmlak saxlanılır.");
    const now = new Date().toISOString();
    const statements = parsed.rows.map((r) => db.prepare("INSERT INTO assets(id,company_id,name,category,serial,inventory_no,value_cents,status,note,created) VALUES(?,?,?,?,?,?,?,'stock',?,?)").bind(crypto.randomUUID(), id, r.name, r.category, r.serial, r.inventoryNo, Math.round(r.value * 100), r.note, now));
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "assets-imported", "", `${parsed.rows.length} əmlak`);
    return ok({ ok: true, created: parsed.rows.length, issues: parsed.issues });
  }
  if (request.method === "POST" && path === "company/assets/delete") {
    requirePermission("salaries", "Aktivləri yalnız kadr işçisi silə bilər.");
    const b = await jsonBody(request);
    const used = await db.prepare("SELECT 1 AS n FROM asset_assignments WHERE asset_id=? AND company_id=? LIMIT 1").bind(str(b.id, 100), id).first();
    if (used) throw new HttpError(409, "Bu əmlak işçiyə verilib: silmək əvəzinə “silinib” statusu verin.");
    await db.prepare("DELETE FROM assets WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/assets/assign") {
    requirePermission("salaries", "Əmlakı yalnız kadr işçisi verə bilər.");
    const b = await jsonBody(request);
    const asset = await db.prepare("SELECT id,name,status FROM assets WHERE id=? AND company_id=?").bind(str(b.assetId, 100), id).first<{ id: string; name: string; status: string }>();
    if (!asset) throw new HttpError(404, "Əmlak tapılmadı.");
    if (asset.status !== "stock") throw new HttpError(409, asset.status === "assigned" ? "Bu əmlak artıq başqa işçidədir." : "Bu əmlak hazırda verilə bilməz.");
    const employee = await db.prepare("SELECT id,name FROM company_employees WHERE id=? AND company_id=? AND status IN ('active','leave')").bind(str(b.employeeId, 100), id).first<{ id: string; name: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const issued = /^\d{4}-\d{2}-\d{2}$/.test(str(b.issuedOn, 10)) ? str(b.issuedOn, 10) : new Date().toISOString().slice(0, 10);
    const assignmentId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.batch([
      db.prepare("INSERT INTO asset_assignments(id,company_id,asset_id,employee_id,issued_on,condition_out,note,created_by,created) VALUES(?,?,?,?,?,?,?,?,?)").bind(assignmentId, id, asset.id, employee.id, issued, str(b.condition, 120), str(b.note, 300), userId, now),
      db.prepare("UPDATE assets SET status='assigned' WHERE id=? AND company_id=?").bind(asset.id, id),
    ]);
    await companyAudit(db, id, userId, "asset-issued", employee.id, `${asset.name} → ${employee.name}`);
    await tellEmployee(employee.id, "Sizə şirkət əmlakı verildi", `${asset.name}. Təhvil-təslim aktı ilə təsdiqlənir; əmlakı İş yerim → Əmlakım bölməsində görə bilərsiniz.`);
    return ok({ ok: true, id: assignmentId }, 201);
  }
  if (request.method === "POST" && path === "company/assets/return") {
    requirePermission("salaries", "Əmlakı yalnız kadr işçisi qəbul edə bilər.");
    const b = await jsonBody(request);
    const row = await db.prepare("SELECT a.id,a.asset_id,a.employee_id,s.name FROM asset_assignments a JOIN assets s ON s.id=a.asset_id WHERE a.id=? AND a.company_id=? AND a.returned_on=''").bind(str(b.assignmentId, 100), id).first<{ id: string; asset_id: string; employee_id: string; name: string }>();
    if (!row) throw new HttpError(404, "Verilmə qeydi tapılmadı.");
    const returned = /^\d{4}-\d{2}-\d{2}$/.test(str(b.returnedOn, 10)) ? str(b.returnedOn, 10) : new Date().toISOString().slice(0, 10);
    const damaged = b.damaged === true;
    await db.batch([
      db.prepare("UPDATE asset_assignments SET returned_on=?,condition_in=?,note=CASE WHEN ?<>'' THEN ? ELSE note END WHERE id=? AND company_id=?").bind(returned, str(b.condition, 120), str(b.note, 300), str(b.note, 300), row.id, id),
      db.prepare("UPDATE assets SET status=? WHERE id=? AND company_id=?").bind(damaged ? "repair" : "stock", row.asset_id, id),
    ]);
    await companyAudit(db, id, userId, "asset-returned", row.employee_id, `${row.name}${damaged ? " (zədəli)" : ""}`);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/assets/act") {
    requirePermission("salaries", "Aktı yalnız kadr işçisi çap edə bilər.");
    const row = await db
      .prepare("SELECT a.id,a.issued_on,a.returned_on,a.condition_out,a.condition_in,a.note,a.ack_issued_at,s.name,s.serial,s.inventory_no,s.value_cents,e.name AS employee,e.position,c.name AS company FROM asset_assignments a JOIN assets s ON s.id=a.asset_id JOIN company_employees e ON e.id=a.employee_id LEFT JOIN accounts c ON c.id=a.company_id WHERE a.id=? AND a.company_id=?")
      .bind(str(requestUrl.searchParams.get("id"), 100), id)
      .first<{ id: string; issued_on: string; returned_on: string; condition_out: string; condition_in: string; note: string; ack_issued_at: string; name: string; serial: string; inventory_no: string; value_cents: number; employee: string; position: string; company: string }>();
    if (!row) throw new HttpError(404, "Qeyd tapılmadı.");
    const kind = requestUrl.searchParams.get("kind") === "return" ? "return" : "issue";
    if (kind === "return" && !row.returned_on) throw new HttpError(409, "Əmlak hələ qaytarılmayıb.");
    return ok({ html: assetActHtml({ kind, number: row.id.slice(0, 6).toUpperCase(), date: kind === "return" ? row.returned_on : row.issued_on, company: row.company || "", employee: row.employee, position: row.position, asset: { name: row.name, serial: row.serial, inventoryNo: row.inventory_no, valueCents: row.value_cents }, condition: kind === "return" ? row.condition_in : row.condition_out, note: row.note, ackedAt: row.ack_issued_at }) });
  }
  if (request.method === "GET" && path === "company/employees/assets") {
    requirePermission("salaries", "Aktivləri yalnız kadr işçisi görə bilər.");
    const rows = await db.prepare("SELECT a.id,a.issued_on,a.returned_on,s.name,s.serial,s.inventory_no FROM asset_assignments a JOIN assets s ON s.id=a.asset_id WHERE a.company_id=? AND a.employee_id=? ORDER BY a.issued_on DESC").bind(id, str(requestUrl.searchParams.get("id"), 100)).all<{ id: string; issued_on: string; returned_on: string; name: string; serial: string; inventory_no: string }>();
    return ok({ items: rows.results.map((r) => ({ id: r.id, name: r.name, serial: r.serial, inventoryNo: r.inventory_no, issuedOn: r.issued_on, returnedOn: r.returned_on })) });
  }
  return undefined;
}
