// misc: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { COMPANY_ROLES, GRANTABLE, INVITABLE_ROLES, INVITE_DAYS, type JobApproval, PERMISSION_GROUPS, PERMISSION_INFO, can, canDecide, inviteExpired, normalizeGrants, pendingStep, permissionsOf, roleLabel } from "@/lib/company";
import { HttpError, jsonBody, runtime, str } from "@/lib/server";
import { type MemberFigures, groupTotals, snapshotTotals, turnoverPercent } from "@/lib/company-group";
import { calculateFromGross, calculateFromNet } from "@/lib/salary";
import { activeGrants, grantsUntilProblem } from "@/lib/grants-expiry";
import { companyAudit, notify } from "@/lib/api-core";
import { mailConfigured, sendMail } from "@/lib/mail";
import { quiet } from "@/lib/quiet";
import { Row, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_misc_02(c: Pick<RouteCtx, "accountRole" | "canAct" | "db" | "id" | "memberGrants" | "memberRole" | "path" | "request" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { accountRole, canAct, db, id, memberGrants, memberRole, path, request, requirePermission, userId } = c;
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new HttpError(403, "Bu sorğuya icazə verilmir.");
  }
  if (path.startsWith("company/") && accountRole !== "company")
    throw new HttpError(403, "Bu bölmə şirkət hesabı üçündür.");
  if (request.method === "POST" && path === "company/salary-calc") {
    const b = await jsonBody(request);
    const sector = b.sector === "public" ? "public" : "private";
    const amount = Math.max(0, Math.min(10_000_000, Number(b.amount) || 0));
    const headcount = Math.max(
      1,
      Math.min(10_000, Math.round(Number(b.headcount)) || 1),
    );
    const options = { reduction: Math.max(0, Math.min(5000, Number(b.reduction) || 0)) };
    const result =
      b.from === "net"
        ? calculateFromNet(amount, sector, options)
        : calculateFromGross(amount, sector, options);
    return ok({
      result,
      headcount,
      monthlyTotal: Math.round(result.employerCost * headcount * 100) / 100,
      yearlyTotal: Math.round(result.employerCost * headcount * 1200) / 100,
    });
  }
  if (request.method === "GET" && path === "company/me") {
    const company = await db
      .prepare("SELECT id,name FROM accounts WHERE id=?")
      .bind(id)
      .first<{ id: string; name: string }>();
    const profileRow = await db
      .prepare(
        "SELECT verification_status FROM company_profiles WHERE company_id=?",
      )
      .bind(id)
      .first<{ verification_status: string }>()
      .catch(() => null);
    const pending =
      can(memberRole, "approve-hr") || can(memberRole, "approve-director")
        ? await db
            .prepare(
              "SELECT data FROM jobs WHERE owner=? AND status='pending_approval'",
            )
            .bind(id)
            .all<Row>()
        : { results: [] as Row[] };
    const awaiting = pending.results.filter((r) =>
      canDecide(
        memberRole,
        pendingStep(
          (JSON.parse(r.data) as { approval?: JobApproval }).approval,
        ),
      ),
    ).length;
    return ok({
      company,
      role: memberRole,
      roleLabel: roleLabel(memberRole),
      permissions: permissionsOf(memberRole, memberGrants),
      member: userId !== id,
      verification: profileRow?.verification_status || "none",
      awaitingApproval: awaiting,
    });
  }
  if (path === "company/group" || path.startsWith("company/group/")) {
    if (!canAct("approve-director")) throw new HttpError(403, "Qrup (holdinq) məsələlərini yalnız hesab sahibi və ya direktor idarə edə bilər.");
    const nowIso = new Date().toISOString();
    const ownGroup = () => db.prepare("SELECT id,name,created FROM company_groups WHERE owner_company_id=?").bind(id).first<{ id: string; name: string; created: string }>();
    const membership = () =>
      db
        .prepare("SELECT l.id,l.share_pay,l.joined_at,g.name,g.owner_company_id,(SELECT name FROM accounts WHERE id=g.owner_company_id) AS head_name FROM company_group_links l JOIN company_groups g ON g.id=l.group_id WHERE l.company_id=? AND l.status='active'")
        .bind(id)
        .first<{ id: string; share_pay: number; joined_at: string; name: string; owner_company_id: string; head_name: string }>();
    if (request.method === "GET" && path === "company/group") {
      const own = await ownGroup();
      const links = own
        ? (await db.prepare("SELECT l.id,l.company_id,l.code,l.expires,l.status,l.share_pay,l.joined_at,COALESCE(a.name,'') AS company_name FROM company_group_links l LEFT JOIN accounts a ON a.id=l.company_id WHERE l.group_id=? AND l.status IN ('invited','active') ORDER BY l.created").bind(own.id).all<{ id: string; company_id: string; code: string; expires: string; status: string; share_pay: number; joined_at: string; company_name: string }>()).results.filter((l) => l.status === "active" || l.expires >= nowIso)
        : [];
      const mine = await membership();
      return ok({
        group: own ? { id: own.id, name: own.name } : null,
        links: links.map((l) => ({ id: l.id, companyName: l.company_name, status: l.status, sharePay: !!l.share_pay, joinedAt: l.joined_at, code: l.status === "invited" ? l.code : "", expires: l.expires })),
        membership: mine ? { groupName: mine.name, headName: mine.head_name, sharePay: !!mine.share_pay, joinedAt: mine.joined_at } : null,
      });
    }
    if (request.method === "GET" && path === "company/group/overview") {
      const own = await ownGroup();
      if (!own) throw new HttpError(404, "Şirkətinizin qrupu yoxdur.");
      const members = (await db.prepare("SELECT l.company_id,l.share_pay,COALESCE(a.name,'') AS name FROM company_group_links l LEFT JOIN accounts a ON a.id=l.company_id WHERE l.group_id=? AND l.status='active' AND l.company_id<>''").bind(own.id).all<{ company_id: string; share_pay: number; name: string }>()).results;
      const headName = (await db.prepare("SELECT name FROM accounts WHERE id=?").bind(id).first<{ name: string }>())?.name || "";
      const list = [{ company_id: id, share_pay: 1, name: headName, head: true }, ...members.map((m) => ({ ...m, head: false }))];
      const today = nowIso.slice(0, 10);
      const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
      const figures: MemberFigures[] = [];
      for (const m of list) {
        const [counts, depts, orders, jobsOpen, run] = await Promise.all([
          db.prepare("SELECT SUM(CASE WHEN status IN ('active','leave') THEN 1 ELSE 0 END) AS headcount,SUM(CASE WHEN status='leave' THEN 1 ELSE 0 END) AS on_leave,SUM(CASE WHEN status<>'removed' AND start_date>=? AND start_date<=? THEN 1 ELSE 0 END) AS joiners,SUM(CASE WHEN status='left' AND end_date>=? THEN 1 ELSE 0 END) AS leavers FROM company_employees WHERE company_id=?").bind(yearAgo, today, yearAgo, m.company_id).first<{ headcount: number | null; on_leave: number | null; joiners: number | null; leavers: number | null }>(),
          db.prepare("SELECT department,COUNT(*) AS n FROM company_employees WHERE company_id=? AND status IN ('active','leave') GROUP BY department").bind(m.company_id).all<{ department: string; n: number }>(),
          db.prepare("SELECT COUNT(*) AS n FROM employee_orders WHERE company_id=? AND status<>'signed'").bind(m.company_id).first<{ n: number }>(),
          db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE owner=? AND status='published'").bind(m.company_id).first<{ n: number }>(),
          m.share_pay ? db.prepare("SELECT month,snapshot FROM payroll_runs WHERE company_id=? AND status='approved' ORDER BY month DESC LIMIT 1").bind(m.company_id).first<{ month: string; snapshot: string }>() : Promise.resolve(null),
        ]);
        const totals = run ? snapshotTotals(run.snapshot) : null;
        const departments: Record<string, number> = {};
        for (const d of depts.results) departments[d.department || "Departamentsiz"] = (departments[d.department || "Departamentsiz"] || 0) + d.n;
        figures.push({ companyId: m.company_id, name: m.name, isHead: m.head, headcount: counts?.headcount || 0, onLeave: counts?.on_leave || 0, joiners12: counts?.joiners || 0, leavers12: counts?.leavers || 0, pendingOrders: orders?.n || 0, openJobs: jobsOpen?.n || 0, departments, pay: run && totals ? { month: run.month, ...totals } : null, paySharing: !!m.share_pay });
        if (!m.head && m.share_pay) await companyAudit(db, m.company_id, userId, "group-pay-viewed", own.id, `Qrup (${own.name}) maaş yekununa baxdı`);
      }
      return ok({ group: { id: own.id, name: own.name }, companies: figures.map((f) => ({ ...f, turnover: turnoverPercent(f.headcount, f.leavers12) })), totals: groupTotals(figures) });
    }
    if (request.method === "POST" && path === "company/group/create") {
      const b = await jsonBody(request);
      const name = str(b.name, 80);
      if (name.length < 2) throw new HttpError(400, "Qrupun adını yazın.");
      if (await ownGroup()) throw new HttpError(409, "Şirkətinizin artıq qrupu var.");
      if (await membership()) throw new HttpError(409, "Şirkətiniz başqa qrupun üzvüdür: əvvəlcə ondan çıxın.");
      await db.prepare("INSERT INTO company_groups(id,name,owner_company_id,created) VALUES(?,?,?,?)").bind(crypto.randomUUID(), name, id, nowIso).run();
      await companyAudit(db, id, userId, "group-created", "", name);
      return ok({ ok: true }, 201);
    }
    if (request.method === "POST" && path === "company/group/invite") {
      const own = await ownGroup();
      if (!own) throw new HttpError(404, "Əvvəlcə qrup yaradın.");
      const open = await db.prepare("SELECT COUNT(*) AS n FROM company_group_links WHERE group_id=? AND status='invited' AND expires>=?").bind(own.id, nowIso).first<{ n: number }>();
      if ((open?.n || 0) >= 20) throw new HttpError(409, "Eyni vaxtda ən çox 20 açıq dəvət ola bilər.");
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const bytes = crypto.getRandomValues(new Uint8Array(10));
      const code = [...bytes].map((x) => alphabet[x % alphabet.length]).join("");
      const expires = new Date(Date.now() + 14 * 86_400_000).toISOString();
      await db.prepare("INSERT INTO company_group_links(id,group_id,company_id,code,expires,status,share_pay,created) VALUES(?,?,'',?,?,'invited',0,?)").bind(crypto.randomUUID(), own.id, code, expires, nowIso).run();
      await companyAudit(db, id, userId, "group-invited", "", "Yeni dəvət kodu yaradıldı");
      return ok({ ok: true, code, expires }, 201);
    }
    if (request.method === "POST" && path === "company/group/remove") {
      const own = await ownGroup();
      if (!own) throw new HttpError(404, "Şirkətinizin qrupu yoxdur.");
      const b = await jsonBody(request);
      const link = await db.prepare("SELECT id,company_id,status FROM company_group_links WHERE id=? AND group_id=?").bind(str(b.linkId, 100), own.id).first<{ id: string; company_id: string; status: string }>();
      if (!link) throw new HttpError(404, "Dəvət və ya üzv tapılmadı.");
      await db.prepare("UPDATE company_group_links SET status='removed',code='' WHERE id=?").bind(link.id).run();
      if (link.company_id) await companyAudit(db, link.company_id, userId, "group-removed", own.id, `Qrup (${own.name}) şirkəti qrupdan çıxardı`);
      await companyAudit(db, id, userId, "group-member-removed", link.company_id, "Üzv və ya dəvət silindi");
      return ok({ ok: true });
    }
    if (request.method === "POST" && path === "company/group/delete") {
      const own = await ownGroup();
      if (!own) throw new HttpError(404, "Şirkətinizin qrupu yoxdur.");
      await db.batch([db.prepare("UPDATE company_group_links SET status='removed',code='' WHERE group_id=? AND status IN ('invited','active')").bind(own.id), db.prepare("DELETE FROM company_groups WHERE id=?").bind(own.id)]);
      await companyAudit(db, id, userId, "group-deleted", own.id, own.name);
      return ok({ ok: true });
    }
    if (request.method === "POST" && path === "company/group/join") {
      const b = await jsonBody(request);
      const code = str(b.code, 20).toUpperCase().replace(/\s+/g, "");
      if (!code) throw new HttpError(400, "Dəvət kodunu yazın.");
      if (await ownGroup()) throw new HttpError(409, "Şirkətinizin öz qrupu var: başqa qrupa qoşulmaq üçün əvvəlcə onu silin.");
      if (await membership()) throw new HttpError(409, "Şirkətiniz artıq bir qrupun üzvüdür.");
      const link = await db.prepare("SELECT l.id,l.expires,g.name,g.owner_company_id FROM company_group_links l JOIN company_groups g ON g.id=l.group_id WHERE l.code=? AND l.status='invited'").bind(code).first<{ id: string; expires: string; name: string; owner_company_id: string }>();
      if (!link || link.expires < nowIso) throw new HttpError(404, "Dəvət kodu tapılmadı və ya müddəti bitib.");
      if (link.owner_company_id === id) throw new HttpError(409, "Öz qrupunuzun dəvətinə qoşula bilməzsiniz.");
      const sharePay = b.sharePay === true;
      await db.prepare("UPDATE company_group_links SET company_id=?,status='active',share_pay=?,code='',joined_at=? WHERE id=?").bind(id, sharePay ? 1 : 0, nowIso, link.id).run();
      await companyAudit(db, id, userId, "group-joined", link.owner_company_id, `${link.name}: ${sharePay ? "maaş yekunu da paylaşılır" : "yalnız say və göstəricilər"}`);
      return ok({ ok: true, groupName: link.name });
    }
    if (request.method === "POST" && path === "company/group/leave") {
      const mine = await membership();
      if (!mine) throw new HttpError(404, "Şirkətiniz heç bir qrupun üzvü deyil.");
      await db.prepare("UPDATE company_group_links SET status='left' WHERE id=?").bind(mine.id).run();
      await companyAudit(db, id, userId, "group-left", mine.owner_company_id, mine.name);
      return ok({ ok: true });
    }
    if (request.method === "POST" && path === "company/group/share") {
      const mine = await membership();
      if (!mine) throw new HttpError(404, "Şirkətiniz heç bir qrupun üzvü deyil.");
      const b = await jsonBody(request);
      const sharePay = b.sharePay === true;
      await db.prepare("UPDATE company_group_links SET share_pay=? WHERE id=?").bind(sharePay ? 1 : 0, mine.id).run();
      await companyAudit(db, id, userId, "group-share", mine.owner_company_id, sharePay ? "maaş yekunu paylaşılır" : "maaş yekunu paylaşılmır");
      return ok({ ok: true, sharePay });
    }
  }
  if (request.method === "GET" && path === "company/team") {
    const owner = await db
      .prepare(
        "SELECT a.id,a.name,p.email FROM accounts a LEFT JOIN password_accounts p ON p.user_id=a.id WHERE a.id=?",
      )
      .bind(id)
      .first<{ id: string; name: string; email: string }>();
    const members = await db
      .prepare(
        `SELECT m.id,m.user_id,m.email,m.role,m.department,m.grants,m.grants_until,m.status,m.created,m.updated,COALESCE(a.name,'') AS name FROM company_members m
        LEFT JOIN accounts a ON a.id=m.user_id WHERE m.company_id=? AND m.status<>'removed' ORDER BY m.created`,
      )
      .bind(id)
      .all<Record<string, unknown> & { grants: string; grants_until?: string }>();
    const lastSeen = await db
      .prepare(
        "SELECT actor_id,MAX(created) AS last FROM company_audit WHERE company_id=? GROUP BY actor_id",
      )
      .bind(id)
      .all<{ actor_id: string; last: string }>()
      .catch(() => ({ results: [] as { actor_id: string; last: string }[] }));
    const last = new Map(lastSeen.results.map((r) => [r.actor_id, r.last]));
    return ok({
      owner,
      members: members.results.map((m) => ({
        ...m,
        grants: (() => {
          try {
            return normalizeGrants(JSON.parse(m.grants));
          } catch {
            return [];
          }
        })(),
        grantsUntil: m.grants_until || "",
        grantsExpired: !!m.grants_until && activeGrants([1], m.grants_until).length === 0,
        lastActive: last.get(String(m.user_id)) || "",
        expired:
          m.status === "invited" &&
          inviteExpired(String(m.updated || m.created)),
      })),
      inviteDays: INVITE_DAYS,
      roles: COMPANY_ROLES,
      grantable: GRANTABLE,
      // Every permission with its group and what each role holds by itself, for the roles table.
      permissionInfo: PERMISSION_INFO,
      permissionGroups: PERMISSION_GROUPS,
      matrix: COMPANY_ROLES.map((r) => ({ role: r.id, permissions: permissionsOf(r.id) })),
      canManage: can(memberRole, "team"),
    });
  }
  if (request.method === "POST" && path === "company/team/invite") {
    requirePermission("team");
    const b = await jsonBody(request);
    const email = str(b.email, 160).toLowerCase();
    const role = str(b.role, 20);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new HttpError(400, "Etibarlı e-poçt ünvanı yazın.");
    if (!(INVITABLE_ROLES as string[]).includes(role))
      throw new HttpError(400, "Rol yanlışdır.");
    if (role === "director" && memberRole !== "owner")
      throw new HttpError(
        403,
        "Direktoru yalnız hesab sahibi əlavə edə bilər.",
      );
    const ownerEmail = await db
      .prepare("SELECT email FROM password_accounts WHERE user_id=?")
      .bind(id)
      .first<{ email: string }>();
    if (ownerEmail?.email === email)
      throw new HttpError(400, "Bu ünvan hesab sahibinə aiddir.");
    const now = new Date().toISOString();
    const existing = await db
      .prepare(
        "SELECT id,status FROM company_members WHERE company_id=? AND email=?",
      )
      .bind(id, email)
      .first<{ id: string; status: string }>();
    if (existing && existing.status !== "removed")
      throw new HttpError(
        409,
        "Bu ünvan artıq komandadadır və ya dəvət gözləyir.",
      );
    if (existing)
      await db
        .prepare(
          "UPDATE company_members SET role=?,department=?,grants=?,status='invited',user_id='',invited_by=?,updated=? WHERE id=?",
        )
        .bind(
          role,
          str(b.department, 120),
          JSON.stringify(normalizeGrants(b.grants)),
          userId,
          now,
          existing.id,
        )
        .run();
    else
      await db
        .prepare(
          "INSERT INTO company_members(id,company_id,user_id,email,role,department,grants,status,invited_by,created,updated) VALUES(?,?,'',?,?,?,?,'invited',?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          email,
          role,
          str(b.department, 120),
          JSON.stringify(normalizeGrants(b.grants)),
          userId,
          now,
          now,
        )
        .run();
    const invitee = await db
      .prepare("SELECT user_id FROM password_accounts WHERE email=?")
      .bind(email)
      .first<{ user_id: string }>();
    const company = await db
      .prepare("SELECT name FROM accounts WHERE id=?")
      .bind(id)
      .first<{ name: string }>();
    if (invitee)
      await notify(db, {
        userId: invitee.user_id,
        type: "team-invite",
        title: `${company?.name || "Şirkət"} sizi komandaya dəvət etdi (${roleLabel(role)})`,
        link: "hr-team",
      });
    const settings = runtime();
    if (mailConfigured(settings))
      await sendMail(settings, {
        to: email,
        subject: `${company?.name || "Şirkət"} sizi JobMatch-də komandaya dəvət edir`,
        text: `${company?.name || "Şirkət"} sizi "${roleLabel(role)}" rolu ilə JobMatch-dəki şirkət hesabına dəvət edir. Bu e-poçtla şirkət hesabı kimi qeydiyyatdan keçin və ya daxil olun, sonra "Komanda" bölməsində dəvəti qəbul edin.`,
      }).catch((error) => quiet("route-best-effort", error));
    await companyAudit(
      db,
      id,
      userId,
      "member-invited",
      email,
      roleLabel(role),
    );
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/team/update") {
    requirePermission("team");
    const b = await jsonBody(request);
    const role = str(b.role, 20);
    if (!(INVITABLE_ROLES as string[]).includes(role))
      throw new HttpError(400, "Rol yanlışdır.");
    if (role === "director" && memberRole !== "owner")
      throw new HttpError(
        403,
        "Direktor rolunu yalnız hesab sahibi verə bilər.",
      );
    const member = await db
      .prepare(
        "SELECT id,email,role,user_id FROM company_members WHERE id=? AND company_id=? AND status<>'removed'",
      )
      .bind(str(b.id, 100), id)
      .first<{ id: string; email: string; role: string; user_id: string }>();
    if (!member) throw new HttpError(404, "Üzv tapılmadı.");
    if (member.user_id === userId)
      throw new HttpError(400, "Öz rolunuzu dəyişə bilməzsiniz.");
    if (member.role === "director" && memberRole !== "owner")
      throw new HttpError(
        403,
        "Direktorun rolunu yalnız hesab sahibi dəyişə bilər.",
      );
    const grants = normalizeGrants(b.grants);
    // A temporary grant ends on this day (empty: no end). Without any extra permission there is nothing to end.
    const grantsUntil = grants.length ? str(b.grantsUntil, 10) : "";
    const untilProblem = grantsUntilProblem(grantsUntil);
    if (untilProblem) throw new HttpError(400, untilProblem);
    await db
      .prepare(
        "UPDATE company_members SET role=?,department=?,grants=?,grants_until=?,updated=? WHERE id=?",
      )
      .bind(
        role,
        str(b.department, 120),
        JSON.stringify(grants),
        grantsUntil,
        new Date().toISOString(),
        member.id,
      )
      .run();
    await companyAudit(
      db,
      id,
      userId,
      "member-role",
      member.email,
      `${roleLabel(member.role)} → ${roleLabel(role)}${grants.length ? ` (+${grants.join(", ")}${grantsUntil ? `, ${grantsUntil} tarixinədək` : ""})` : ""}`,
    );
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/team/resend") {
    requirePermission("team");
    const b = await jsonBody(request);
    const member = await db
      .prepare(
        "SELECT id,email,role FROM company_members WHERE id=? AND company_id=? AND status='invited'",
      )
      .bind(str(b.id, 100), id)
      .first<{ id: string; email: string; role: string }>();
    if (!member) throw new HttpError(404, "Gözləyən dəvət tapılmadı.");
    await db
      .prepare("UPDATE company_members SET updated=?,invited_by=? WHERE id=?")
      .bind(new Date().toISOString(), userId, member.id)
      .run();
    const invitee = await db
      .prepare("SELECT user_id FROM password_accounts WHERE email=?")
      .bind(member.email)
      .first<{ user_id: string }>();
    const company = await db
      .prepare("SELECT name FROM accounts WHERE id=?")
      .bind(id)
      .first<{ name: string }>();
    if (invitee)
      await notify(db, {
        userId: invitee.user_id,
        type: "team-invite",
        title: `${company?.name || "Şirkət"} sizi komandaya dəvət etdi (${roleLabel(member.role)})`,
        link: "hr-team",
      });
    const settings = runtime();
    if (mailConfigured(settings))
      await sendMail(settings, {
        to: member.email,
        subject: `${company?.name || "Şirkət"} sizi JobMatch-də komandaya dəvət edir`,
        text: `${company?.name || "Şirkət"} sizi "${roleLabel(member.role)}" rolu ilə JobMatch-dəki şirkət hesabına yenidən dəvət edir. Bu e-poçtla şirkət hesabı kimi daxil olun və dəvəti qəbul edin. Dəvət ${INVITE_DAYS} gün qüvvədədir.`,
      }).catch((error) => quiet("route-best-effort", error));
    await companyAudit(
      db,
      id,
      userId,
      "member-invite-resent",
      member.email,
      roleLabel(member.role),
    );
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/team/status") {
    requirePermission("team");
    const b = await jsonBody(request);
    const member = await db
      .prepare(
        "SELECT id,email,role,user_id,status FROM company_members WHERE id=? AND company_id=? AND status IN ('active','suspended')",
      )
      .bind(str(b.id, 100), id)
      .first<{
        id: string;
        email: string;
        role: string;
        user_id: string;
        status: string;
      }>();
    if (!member) throw new HttpError(404, "Üzv tapılmadı.");
    if (member.user_id === userId)
      throw new HttpError(400, "Özünüzü dayandıra bilməzsiniz.");
    if (member.role === "director" && memberRole !== "owner")
      throw new HttpError(
        403,
        "Direktoru yalnız hesab sahibi dayandıra bilər.",
      );
    const next = b.suspended === true ? "suspended" : "active";
    await db
      .prepare("UPDATE company_members SET status=?,updated=? WHERE id=?")
      .bind(next, new Date().toISOString(), member.id)
      .run();
    if (member.user_id)
      await notify(db, {
        userId: member.user_id,
        type: "team",
        title:
          next === "suspended"
            ? "Şirkət hesabındakı girişiniz müvəqqəti dayandırıldı"
            : "Şirkət hesabındakı girişiniz bərpa olundu",
        link: "hr-team",
      });
    await companyAudit(
      db,
      id,
      userId,
      next === "suspended" ? "member-suspended" : "member-reactivated",
      member.email,
      roleLabel(member.role),
    );
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/team/remove") {
    requirePermission("team");
    const b = await jsonBody(request);
    const member = await db
      .prepare(
        "SELECT id,email,role,user_id FROM company_members WHERE id=? AND company_id=? AND status<>'removed'",
      )
      .bind(str(b.id, 100), id)
      .first<{ id: string; email: string; role: string; user_id: string }>();
    if (!member) throw new HttpError(404, "Üzv tapılmadı.");
    if (member.user_id === userId)
      throw new HttpError(400, "Özünüzü komandadan çıxara bilməzsiniz.");
    if (member.role === "director" && memberRole !== "owner")
      throw new HttpError(403, "Direktoru yalnız hesab sahibi çıxara bilər.");
    await db
      .prepare(
        "UPDATE company_members SET status='removed',updated=? WHERE id=?",
      )
      .bind(new Date().toISOString(), member.id)
      .run();
    await companyAudit(
      db,
      id,
      userId,
      "member-removed",
      member.email,
      roleLabel(member.role),
    );
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/invites") {
    const me = await db
      .prepare("SELECT email FROM password_accounts WHERE user_id=?")
      .bind(userId)
      .first<{ email: string }>();
    if (!me) return ok({ invites: [] });
    const rows = await db
      .prepare(
        "SELECT m.id,m.role,m.department,m.created,m.updated,a.name AS company FROM company_members m JOIN accounts a ON a.id=m.company_id WHERE m.email=? AND m.status='invited'",
      )
      .bind(me.email)
      .all<{ updated: string; created: string }>();
    return ok({
      invites: rows.results.filter(
        (row) => !inviteExpired(String(row.updated || row.created)),
      ),
    });
  }
  return undefined;
}
