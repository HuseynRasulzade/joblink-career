// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { APPROVAL_CHAINS, APPROVAL_KIND_LABEL, type ApprovalKind, can, delegateUntil, mayDecide, normalizeApprovalRules, requestAmount } from "@/lib/company";
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit, notify } from "@/lib/api-core";
import { exitTypeLabel } from "@/lib/workforce";
import { StaffInput, applyStaffRows, ok, saveStaffUnit, setDepartmentPlan, setPlanStatus, staffBandProblem } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_38(c: Pick<RouteCtx, "approvalHistory" | "approvalRules" | "approverCandidates" | "approverPeople" | "auditView" | "canAct" | "db" | "deliverOffer" | "hoursBetween" | "id" | "lentFrom" | "loadOfferTarget" | "memberGrants" | "memberRole" | "path" | "request" | "requesterName" | "salaryChange" | "setYearPlan" | "userId">): Promise<Response | undefined> {
  const { approvalHistory, approvalRules, approverCandidates, approverPeople, auditView, canAct, db, deliverOffer, hoursBetween, id, lentFrom, loadOfferTarget, memberGrants, memberRole, path, request, requesterName, salaryChange, setYearPlan, userId } = c;
  if (request.method === "GET" && path === "company/approval-rules") {
    return ok({
      rules: await approvalRules(),
      canEdit: canAct("approve-director"),
      people: await approverCandidates(),
    });
  }
  if (request.method === "GET" && path === "company/requests/detail") {
    const reqId = str(new URL(request.url).searchParams.get("id"), 100);
    const row = await db
      .prepare("SELECT id,kind,subject,payload,requested_by,requested_by_name,status,decided_by_name,note,reply,created,decided FROM approval_requests WHERE id=? AND company_id=?")
      .bind(reqId, id)
      .first<{ id: string; kind: string; subject: string; payload: string; requested_by: string; requested_by_name: string; status: string; decided_by_name: string; note: string; reply: string; created: string; decided: string }>();
    if (!row) throw new HttpError(404, "Sorğu tapılmadı.");
    if (!canAct("approve-director") && row.requested_by !== userId) throw new HttpError(403, "Bu sorğunun təfərrüatını yalnız təsdiqləyən və ya göndərən görə bilər.");
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(row.payload); } catch { /* shown without details */ }
    const facts: { label: string; value: string }[] = [];
    const links: { label: string; page: string; target?: Record<string, unknown> }[] = [];
    const azn = (n: unknown) => `${Number(n).toLocaleString("az-AZ", { maximumFractionDigits: 2 })} AZN`;
    const employee = payload.employeeId
      ? await db.prepare("SELECT name,position,department,section,salary_cents,salary_type,start_date,status FROM company_employees WHERE id=? AND company_id=?").bind(String(payload.employeeId), id).first<{ name: string; position: string; department: string; section: string; salary_cents: number; salary_type: string; start_date: string; status: string }>()
      : null;
    if (row.kind === "salary" && employee) {
      const oldPay = employee.salary_cents / 100;
      const next = Number(payload.salary);
      facts.push({ label: "İşçi", value: employee.name }, { label: "Vəzifə", value: `${employee.position || "—"}${employee.department ? ` · ${employee.department}` : ""}` }, { label: "İşə başlama", value: employee.start_date || "—" }, { label: "Hazırkı maaş", value: azn(oldPay) }, { label: "Təklif olunan maaş", value: azn(next) }, { label: "Dəyişiklik", value: `${next >= oldPay ? "+" : ""}${azn(next - oldPay)} (${oldPay > 0 ? `${Math.round(((next - oldPay) / oldPay) * 1000) / 10}%` : "yeni maaş"})` });
      links.push({ label: "İşçinin kartı", page: "hr-employees", target: { kind: "employee", id: String(payload.employeeId), name: employee.name } });
    } else if (row.kind === "exit" && employee) {
      facts.push({ label: "İşçi", value: employee.name }, { label: "Vəzifə", value: `${employee.position || "—"}${employee.department ? ` · ${employee.department}` : ""}` }, { label: "İşə başlama", value: employee.start_date || "—" }, { label: "Xitam növü", value: exitTypeLabel(String(payload.exitType || "")) }, { label: "Son iş günü", value: String(payload.endDate || "—") }, { label: "Səbəb", value: String(payload.exitReason || "—") });
      if (payload.exitNote) facts.push({ label: "Qeyd", value: String(payload.exitNote) });
      links.push({ label: "İşçinin kartı", page: "hr-employees", target: { kind: "employee", id: String(payload.employeeId), name: employee.name } });
    } else if (row.kind === "offer") {
      const data = (payload.data && typeof payload.data === "object" ? payload.data : {}) as Record<string, unknown>;
      const app = await db.prepare("SELECT a.candidate_id,a.job_id,json_extract(j.data,'$.title') AS title,json_extract(j.data,'$.department') AS department FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND j.owner=?").bind(String(payload.applicationId || ""), id).first<{ candidate_id: string; job_id: string; title: string; department: string }>();
      const who = app ? (await db.prepare("SELECT name FROM accounts WHERE id=?").bind(app.candidate_id).first<{ name: string }>())?.name : "";
      facts.push({ label: "Namizəd", value: who || "—" }, { label: "Vakansiya", value: app?.title || "—" }, { label: "Vəzifə", value: String(data.position || "—") }, { label: "Maaş", value: `${azn(data.salary)} (${data.salaryPeriod === "gross" ? "gross" : "net"})` });
      if (data.startDate) facts.push({ label: "İşə başlama", value: String(data.startDate) });
      if (data.message) facts.push({ label: "Namizədə mesaj", value: String(data.message) });
      if (app) links.push({ label: "Namizəd və müraciət", page: "hr-candidates", target: { kind: "application", id: String(payload.applicationId), jobId: app.job_id, name: who || "" } });
    } else if (row.kind === "headcount") {
      if (payload.approvePlan) facts.push({ label: "Əməliyyat", value: "Ştat planının təsdiqi (təsdiqdən sonra plana dəyişiklik direktorun qərarı ilə olur)" });
      else if (Array.isArray(payload.units)) facts.push({ label: "Əməliyyat", value: `Excel idxalı: ${payload.units.length} ştat sətri plana yazılacaq` }, ...(payload.units as { department?: string; position?: string; planned?: number }[]).slice(0, 8).map((u) => ({ label: u.department || "—", value: `${u.position || "—"}: ${u.planned ?? "?"} ştat` })));
      else if (payload.unitDelete) facts.push({ label: "Əməliyyat", value: "Ştat sətri silinir" });
      else if (payload.unit && typeof payload.unit === "object") {
        const u = payload.unit as { department?: string; section?: string; position?: string; planned?: number; salaryCents?: number; note?: string };
        facts.push({ label: "Departament / şöbə", value: [u.department, u.section].filter(Boolean).join(" / ") || "—" }, { label: "Vəzifə", value: u.position || "—" }, { label: "Ştat sayı", value: String(u.planned ?? "—") });
        if (u.salaryCents) facts.push({ label: "Maaş", value: azn(u.salaryCents / 100) });
        if (u.note) facts.push({ label: "Qeyd", value: u.note });
      } else facts.push({ label: "Departament", value: String(payload.department || "—") }, { label: "Yeni plan", value: payload.planned === null ? "plan silinir" : `${payload.planned} ştat` });
      {
        const u = (payload.unit && typeof payload.unit === "object" ? payload.unit : {}) as { department?: string; position?: string };
        links.push({ label: "Ştat planı", page: "hr-planfact", target: { kind: "staff", department: String(payload.department || u.department || ""), position: u.position || "" } });
      }
    }
    if (!facts.length) facts.push({ label: "Sorğu", value: row.subject });
    const rules = await approvalRules();
    const names = new Map((await approverPeople()).map((p) => [p.userId, p.name]));
    const amount = requestAmount(row.kind, payload);
    await auditView("approval-viewed", row.id, row.subject);
    return ok({
      id: row.id,
      kind: row.kind,
      subject: row.subject,
      status: row.status,
      requestedByName: row.requested_by_name,
      created: row.created,
      facts,
      links,
      amount,
      approvers: (rules.approvers[row.kind as ApprovalKind] || []).map((a) => ({ name: names.get(a.userId) || "Üzv", limit: a.limit, ok: a.limit <= 0 || amount === null || amount <= a.limit })),
      timeline: [
        { at: row.created, text: `${row.requested_by_name || "—"} sorğu göndərdi` },
        ...(row.decided ? [{ at: row.decided, text: `${row.decided_by_name || "—"}: ${row.status === "approved" ? "təsdiqlədi" : row.status === "rejected" ? "rədd etdi" : "əlavə məlumat istədi"}${row.note ? ` — ${row.note}` : ""}` }] : []),
        ...(row.reply ? [{ at: row.decided, text: `Göndərənin cavabı: ${row.reply}` }] : []),
      ],
      canDecide: row.status === "pending" && canAct("approve-director") && mayDecide(rules, row.kind, [userId, ...lentFrom], memberRole === "owner", amount) && (row.requested_by !== userId || memberRole === "owner"),
    });
  }
  if (request.method === "POST" && path === "company/approval-rules") {
    if (!canAct("approve-director"))
      throw new HttpError(
        403,
        "Təsdiq qaydalarını yalnız direktor və ya hesab sahibi dəyişə bilər.",
      );
    const b = await jsonBody(request);
    const rules = normalizeApprovalRules(b);
    {
      const valid = new Set((await approverCandidates()).map((p) => p.userId));
      for (const kind of Object.keys(rules.approvers) as ApprovalKind[]) rules.approvers[kind] = rules.approvers[kind].filter((a) => valid.has(a.userId));
    }
    await db
      .prepare(
        `INSERT INTO company_profiles(company_id,data,verification_status,updated,approval_rules) VALUES(?,?,?,?,?)
        ON CONFLICT(company_id) DO UPDATE SET approval_rules=excluded.approval_rules`,
      )
      .bind(id, "{}", "none", new Date().toISOString(), JSON.stringify(rules))
      .run();
    await companyAudit(
      db,
      id,
      userId,
      "approval-rules",
      "",
      `Təkliflər: ${rules.offers ? "təsdiqlə" : "birbaşa"}, maaş: ${rules.salaries ? "təsdiqlə" : "birbaşa"}, vakansiya zənciri: ${APPROVAL_CHAINS[rules.chain]}`,
    );
    return ok({ rules });
  }
  if (request.method === "GET" && path === "company/requests") {
    const rows = await db
      .prepare(
        "SELECT id,kind,subject,payload,requested_by,requested_by_name,status,decided_by_name,note,reply,escalated_at,created,decided FROM approval_requests WHERE company_id=? ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'info' THEN 1 ELSE 2 END,created DESC LIMIT 60",
      )
      .bind(id)
      .all<{
        id: string;
        kind: string;
        subject: string;
        payload: string;
        requested_by: string;
        status: string;
      }>();
    const rules = await approvalRules();
    const names = new Map((await approverPeople()).map((p) => [p.userId, p.name]));
    return ok({
      requests: rows.results.map(({ payload, ...r }) => {
        let data: unknown = {};
        try { data = JSON.parse(payload); } catch { /* an unreadable payload has no amount */ }
        const amount = requestAmount(r.kind, data);
        const named = rules.approvers[r.kind as ApprovalKind] || [];
        return {
          ...r,
          amount,
          approvers: named.length ? named.map((a) => ({ name: names.get(a.userId) || "Üzv", limit: a.limit, ok: a.limit <= 0 || amount === null || amount <= a.limit })) : [],
          canDecide:
            r.status === "pending" &&
            canAct("approve-director") &&
            mayDecide(rules, r.kind, [userId, ...lentFrom], memberRole === "owner", amount) &&
            (r.requested_by !== userId || memberRole === "owner"),
          canRespond: r.status === "info" && r.requested_by === userId,
        };
      }),
    });
  }
  if (request.method === "POST" && path === "company/requests/decide") {
    if (!canAct("approve-director"))
      throw new HttpError(
        403,
        "Bu qərarı yalnız direktor, hesab sahibi və ya onların əvəzedicisi verə bilər.",
      );
    const b = await jsonBody(request);
    const decision =
      b.decision === "approve"
        ? "approved"
        : b.decision === "reject"
          ? "rejected"
          : b.decision === "info"
            ? "info"
            : "";
    if (!decision) throw new HttpError(400, "Qərar yanlışdır.");
    const note = str(b.note, 500);
    if (decision === "rejected" && note.length < 5)
      throw new HttpError(400, "Rədd səbəbini yazın.");
    if (decision === "info" && note.length < 5)
      throw new HttpError(400, "Hansı məlumatın lazım olduğunu yazın.");
    const req = await db
      .prepare(
        "SELECT id,kind,subject,payload,requested_by FROM approval_requests WHERE id=? AND company_id=? AND status='pending'",
      )
      .bind(str(b.id, 100), id)
      .first<{
        id: string;
        kind: string;
        subject: string;
        payload: string;
        requested_by: string;
      }>();
    if (!req) throw new HttpError(404, "Gözləyən sorğu tapılmadı.");
    if (req.requested_by === userId && memberRole !== "owner")
      throw new HttpError(
        403,
        "Öz göndərdiyiniz sorğunu təsdiqləyə bilməzsiniz.",
      );
    const payload = JSON.parse(req.payload);
    {
      const rules = await approvalRules();
      if (!mayDecide(rules, req.kind, [userId, ...lentFrom], memberRole === "owner", requestAmount(req.kind, payload))) {
        const named = rules.approvers[req.kind as ApprovalKind] || [];
        const mine = named.find((a) => a.userId === userId || lentFrom.includes(a.userId));
        throw new HttpError(
          403,
          mine ? `Bu sorğunun məbləği sizin təsdiq limitinizdən (${mine.limit} AZN) çoxdur. Limiti yuxarı olan şəxs və ya hesab sahibi təsdiqləməlidir.` : "Bu növ sorğunu təsdiqləmək üçün siz “Təsdiq icazələri”ndə adı çəkilən şəxslərdən deyilsiniz.",
        );
      }
    }
    // A question goes back to the sender; the request stays open until they reply.
    if (decision === "info") {
      await db
        .prepare(
          "UPDATE approval_requests SET status='info',note=?,decided_by=?,decided_by_name=?,decided=?,reply='' WHERE id=?",
        )
        .bind(note, userId, await requesterName(), new Date().toISOString(), req.id)
        .run();
      await companyAudit(db, id, userId, "request-info", req.id, `${req.subject} — ${note}`);
      await notify(db, {
        userId: req.requested_by,
        type: "approval",
        title: `Əlavə məlumat istənilir: ${APPROVAL_KIND_LABEL[req.kind as ApprovalKind] || "sorğu"}`,
        body: `${req.subject} — ${note}`,
        link: "hr-approvals",
      });
      return ok({ ok: true, status: "info" });
    }
    if (decision === "approved") {
      if (req.kind === "exit") {
        const emp = await db
          .prepare("SELECT name,status FROM company_employees WHERE id=? AND company_id=?")
          .bind(String(payload.employeeId), id)
          .first<{ name: string; status: string }>();
        if (!emp) throw new HttpError(409, "İşçi artıq siyahıda yoxdur.");
        const now = new Date().toISOString();
        await db.batch([
          db
            .prepare(
              "UPDATE company_employees SET status='left',end_date=?,exit_type=?,exit_reason=?,exit_note=?,updated=? WHERE id=? AND company_id=?",
            )
            .bind(
              String(payload.endDate || now.slice(0, 10)),
              String(payload.exitType || ""),
              String(payload.exitReason || ""),
              String(payload.exitNote || ""),
              now,
              String(payload.employeeId),
              id,
            ),
          db
            .prepare(
              "INSERT INTO employee_events(id,company_id,employee_id,type,from_value,to_value,note,actor_id,event_date,created) VALUES(?,?,?,?,?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              id,
              String(payload.employeeId),
              "left",
              emp.status,
              String(payload.exitType || ""),
              String(payload.exitReason || ""),
              userId,
              String(payload.endDate || now.slice(0, 10)),
              now,
            ),
        ]);
        await companyAudit(db, id, userId, "employee-left", String(payload.employeeId), `${emp.name} (təsdiqləndi)`);
      } else if (req.kind === "headcount" && typeof payload.approveYearPlan === "string") {
        await setYearPlan(String(payload.approveYearPlan), "approved", userId);
        await companyAudit(db, id, userId, "year-plan-approved", String(payload.approveYearPlan), `${payload.approveYearPlan} planı təsdiqləndi`);
      } else if (req.kind === "headcount" && payload.approvePlan) {
        await setPlanStatus(db, id, "approved");
        await companyAudit(db, id, userId, "staff-plan-approved", "", "Ştat planı təsdiqləndi");
      } else if (req.kind === "headcount" && Array.isArray(payload.units)) {
        const problem = await staffBandProblem(db, id, payload.units as StaffInput[]);
        if (problem) throw new HttpError(409, `Təsdiq mümkün deyil: ${problem}`);
        const result = await applyStaffRows(db, id, payload.units as StaffInput[]);
        await companyAudit(db, id, userId, "staff-imported", "", `${result.created} yeni, ${result.updated} yenilənən (təsdiqləndi)`);
      } else if (req.kind === "headcount" && (payload.unit || payload.unitDelete)) {
        if (payload.unitDelete) {
          await db.prepare("DELETE FROM staff_units WHERE id=? AND company_id=?").bind(String(payload.unitDelete), id).run();
        } else {
          const unit = payload.unit as { id: string; department: string; section: string; position: string; planned: number; salaryCents: number; note: string };
          const problem = await staffBandProblem(db, id, [unit]);
          if (problem) throw new HttpError(409, `Təsdiq mümkün deyil: ${problem}`);
          await saveStaffUnit(db, id, String(unit.id || ""), unit);
        }
        await companyAudit(db, id, userId, "staff-unit", "", "təsdiqləndi");
      } else if (req.kind === "headcount") {
        const department = String(payload.department);
        await setDepartmentPlan(db, id, department, payload.planned === null ? null : Number(payload.planned));
        await companyAudit(db, id, userId, "headcount-plan", department, `${payload.planned ?? "silindi"} (təsdiqləndi)`);
      } else if (req.kind === "offer") {
        const { row } = await loadOfferTarget(String(payload.applicationId));
        await deliverOffer(row, payload.data);
      } else if (req.kind === "salary") {
        const emp = await db
          .prepare(
            "SELECT salary_cents,name FROM company_employees WHERE id=? AND company_id=?",
          )
          .bind(String(payload.employeeId), id)
          .first<{ salary_cents: number; name: string }>();
        if (!emp) throw new HttpError(409, "İşçi artıq siyahıda yoxdur.");
        const cents = Math.round(Number(payload.salary) * 100);
        const now = new Date().toISOString();
        const typeRow = await db.prepare("SELECT salary_type FROM company_employees WHERE id=? AND company_id=?").bind(String(payload.employeeId), id).first<{ salary_type: string }>();
        const historyStatements = await salaryChange(String(payload.employeeId), emp.salary_cents, typeRow?.salary_type || "gross", cents, typeRow?.salary_type || "gross", now.slice(0, 10), userId);
        if (historyStatements.length) await db.batch(historyStatements);
        await db.batch([
          db
            .prepare(
              "UPDATE company_employees SET salary_cents=?,updated=? WHERE id=? AND company_id=?",
            )
            .bind(cents, now, String(payload.employeeId), id),
          db
            .prepare(
              "INSERT INTO employee_events(id,company_id,employee_id,type,from_value,to_value,note,actor_id,event_date,created) VALUES(?,?,?,?,?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              id,
              String(payload.employeeId),
              "salary",
              "",
              "",
              "",
              userId,
              now.slice(0, 10),
              now,
            ),
        ]);
        await companyAudit(
          db,
          id,
          userId,
          "salary-changed",
          String(payload.employeeId),
          `${emp.name}: ${emp.salary_cents / 100} → ${payload.salary} AZN (təsdiqləndi)`,
        );
      }
    }
    const deciderName = `${await requesterName()}${canAct("approve-director") && !can(memberRole, "approve-director", memberGrants) ? " (əvəzedici)" : ""}`;
    await db
      .prepare(
        "UPDATE approval_requests SET status=?,decided_by=?,decided_by_name=?,note=?,decided=? WHERE id=?",
      )
      .bind(
        decision,
        userId,
        deciderName,
        note,
        new Date().toISOString(),
        req.id,
      )
      .run();
    await companyAudit(
      db,
      id,
      userId,
      `request-${decision}`,
      req.id,
      `${req.subject}${note ? ` — ${note}` : ""}`,
    );
    if (req.requested_by && req.requested_by !== id)
      await notify(db, {
        userId: req.requested_by,
        type: "approval",
        title: `${APPROVAL_KIND_LABEL[req.kind as ApprovalKind] || "Sorğu"}: ${decision === "approved" ? "təsdiqləndi" : "rədd edildi"}`,
        body: `${req.subject}${note ? ` — ${note}` : ""}`,
        link: "hr-approvals",
      });
    return ok({ ok: true, status: decision });
  }
  if (request.method === "POST" && path === "company/requests/respond") {
    const b = await jsonBody(request);
    const reply = str(b.reply, 1000);
    if (reply.length < 3) throw new HttpError(400, "Cavabı yazın.");
    const req = await db
      .prepare("SELECT id,subject,requested_by,decided_by,kind FROM approval_requests WHERE id=? AND company_id=? AND status='info'")
      .bind(str(b.id, 100), id)
      .first<{ id: string; subject: string; requested_by: string; decided_by: string; kind: string }>();
    if (!req) throw new HttpError(404, "Cavab gözləyən sorğu tapılmadı.");
    if (req.requested_by !== userId) throw new HttpError(403, "Cavabı yalnız sorğunu göndərən yaza bilər.");
    await db
      .prepare("UPDATE approval_requests SET status='pending',reply=?,reminded_at='',reminders=0,escalated_at='' WHERE id=?")
      .bind(reply, req.id)
      .run();
    await companyAudit(db, id, userId, "request-reply", req.id, `${req.subject} — ${reply}`);
    await notify(db, {
      userId: req.decided_by || id,
      type: "approval",
      title: `Əlavə məlumat verildi: ${APPROVAL_KIND_LABEL[req.kind as ApprovalKind] || "sorğu"}`,
      body: `${req.subject} — ${reply}`,
      link: "hr-approvals",
    });
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/approvals/stats") {
    const rows = await approvalHistory();
    const decided = rows.filter((r) => r.decided && (r.decision === "approved" || r.decision === "rejected"));
    const hours = decided.map((r) => hoursBetween(r.requested, r.decided)).filter((h): h is number => h !== null);
    const byDecider = new Map<string, { count: number; hours: number[] }>();
    for (const r of decided) {
      const who = r.decidedBy || "—";
      const entry = byDecider.get(who) || { count: 0, hours: [] };
      entry.count++;
      const h = hoursBetween(r.requested, r.decided);
      if (h !== null) entry.hours.push(h);
      byDecider.set(who, entry);
    }
    const avg = (list: number[]) => (list.length ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10 : 0);
    return ok({
      pending: rows.filter((r) => r.decision === "pending").length,
      info: rows.filter((r) => r.decision === "info").length,
      approved: decided.filter((r) => r.decision === "approved").length,
      rejected: decided.filter((r) => r.decision === "rejected").length,
      avgHours: avg(hours),
      byDecider: [...byDecider.entries()].map(([name, v]) => ({ name, count: v.count, avgHours: avg(v.hours) })).sort((a, b) => b.count - a.count),
    });
  }
  if (request.method === "GET" && path === "company/delegates") {
    const rows = await db
      .prepare(
        `SELECT d.id,d.from_user,d.to_user,d.until,COALESCE(f.name,'') AS from_name,COALESCE(t.name,'') AS to_name FROM approval_delegates d
        LEFT JOIN accounts f ON f.id=d.from_user LEFT JOIN accounts t ON t.id=d.to_user WHERE d.company_id=? AND d.until>=? ORDER BY d.until`,
      )
      .bind(id, new Date().toISOString().slice(0, 10))
      .all<{ id: string; from_user: string }>();
    const members = await db
      .prepare(
        "SELECT m.user_id AS id,COALESCE(a.name,m.email) AS name,m.role FROM company_members m LEFT JOIN accounts a ON a.id=m.user_id WHERE m.company_id=? AND m.status='active' AND m.user_id<>''",
      )
      .bind(id)
      .all();
    return ok({
      delegates: rows.results.map((r) => ({
        ...r,
        mine: r.from_user === userId,
        canRemove:
          r.from_user === userId || can(memberRole, "team", memberGrants),
      })),
      members: members.results.filter(
        (m) => (m as { id: string }).id !== userId,
      ),
      canDelegate:
        can(memberRole, "approve-hr", memberGrants) ||
        can(memberRole, "approve-director", memberGrants),
    });
  }
  if (request.method === "POST" && path === "company/delegates") {
    if (!(
      can(memberRole, "approve-hr", memberGrants) ||
      can(memberRole, "approve-director", memberGrants)
    ))
      throw new HttpError(
        403,
        "Əvəzedici yalnız təsdiq hüququ olan işçi təyin edə bilər.",
      );
    const b = await jsonBody(request);
    const until = delegateUntil(b.until);
    if (!until)
      throw new HttpError(400, "Tarixi bu gündən 30 günə qədər seçin.");
    const to = str(b.userId, 100);
    if (to === userId)
      throw new HttpError(400, "Özünüzü əvəzedici edə bilməzsiniz.");
    const member = await db
      .prepare(
        "SELECT user_id FROM company_members WHERE company_id=? AND user_id=? AND status='active'",
      )
      .bind(id, to)
      .first();
    if (!member) throw new HttpError(404, "Komanda üzvü tapılmadı.");
    await db
      .prepare(
        "DELETE FROM approval_delegates WHERE company_id=? AND from_user=? AND to_user=?",
      )
      .bind(id, userId, to)
      .run();
    await db
      .prepare(
        "INSERT INTO approval_delegates(id,company_id,from_user,to_user,until,created) VALUES(?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        id,
        userId,
        to,
        until,
        new Date().toISOString(),
      )
      .run();
    await notify(db, {
      userId: to,
      type: "approval",
      title: `${await requesterName()} sizi ${until} tarixinədək təsdiq əvəzedicisi təyin etdi`,
      link: "hr-approvals",
    });
    await companyAudit(db, id, userId, "delegate-set", to, until);
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/delegates/delete") {
    const b = await jsonBody(request);
    const row = await db
      .prepare(
        "SELECT id,from_user,to_user FROM approval_delegates WHERE id=? AND company_id=?",
      )
      .bind(str(b.id, 100), id)
      .first<{ id: string; from_user: string; to_user: string }>();
    if (!row) throw new HttpError(404, "Əvəzedici tapılmadı.");
    if (row.from_user !== userId && !can(memberRole, "team", memberGrants))
      throw new HttpError(
        403,
        "Bunu yalnız təyin edən və ya komanda meneceri geri götürə bilər.",
      );
    await db
      .prepare("DELETE FROM approval_delegates WHERE id=?")
      .bind(row.id)
      .run();
    await companyAudit(db, id, userId, "delegate-removed", row.to_user, "");
    return ok({ ok: true });
  }
  return undefined;
}
