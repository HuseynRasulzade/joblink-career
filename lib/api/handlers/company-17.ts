// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { REFERENCE_QUESTIONS, REFERRAL_STATUS, cleanReferenceAnswers, referenceScore } from "@/lib/references";
import { companyAudit } from "@/lib/api-core";
import { ReferralRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_17(c: Pick<RouteCtx, "db" | "id" | "parseJson" | "path" | "referralBonus" | "request" | "requesterName" | "requirePermission" | "tellEmployee" | "userId">): Promise<Response | undefined> {
  const { db, id, parseJson, path, referralBonus, request, requesterName, requirePermission, tellEmployee, userId } = c;
  if (request.method === "GET" && path === "company/referrals") {
    requirePermission("salaries", "Tövsiyələri yalnız kadr işçisi görə bilər.");
    const rows = (await db.prepare("SELECT id,employee_id,job_id,job_title,candidate_name,candidate_phone,candidate_email,note,status,bonus_cents,bonus_paid_at,created FROM referrals WHERE company_id=? ORDER BY created DESC LIMIT 300").bind(id).all<ReferralRow>()).results;
    const names = new Map((await db.prepare("SELECT id,name FROM company_employees WHERE company_id=?").bind(id).all<{ id: string; name: string }>()).results.map((p) => [p.id, p.name]));
    return ok({ bonus: await referralBonus(), statusText: REFERRAL_STATUS, items: rows.map((r) => ({ id: r.id, referrer: names.get(r.employee_id) || "", jobTitle: r.job_title, name: r.candidate_name, phone: r.candidate_phone, email: r.candidate_email, note: r.note, status: r.status, bonus: r.bonus_cents / 100, paidAt: r.bonus_paid_at, created: r.created })) });
  }
  if (request.method === "POST" && path === "company/referrals/setting") {
    requirePermission("salaries", "Bonusu yalnız kadr işçisi təyin edə bilər.");
    const b = await jsonBody(request);
    await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,'referral_bonus',?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, String(Math.max(0, Math.round((Number(b.bonus) || 0) * 100)))).run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/referrals/status") {
    requirePermission("salaries", "Tövsiyənin vəziyyətini yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    const status = str(b.status, 12);
    if (!(status in REFERRAL_STATUS)) throw new HttpError(400, "Vəziyyət tanınmadı.");
    const row = await db.prepare("SELECT id,employee_id,candidate_name,bonus_cents,bonus_paid_at FROM referrals WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ id: string; employee_id: string; candidate_name: string; bonus_cents: number; bonus_paid_at: string }>();
    if (!row) throw new HttpError(404, "Tövsiyə tapılmadı.");
    if (row.bonus_paid_at && status !== "hired") throw new HttpError(409, "Bonus ödənilib: vəziyyət dəyişdirilmir.");
    const bonus = status === "hired" ? (row.bonus_cents > 0 ? row.bonus_cents : Math.round((await referralBonus()) * 100)) : row.bonus_cents;
    await db.prepare("UPDATE referrals SET status=?,bonus_cents=?,updated=? WHERE id=? AND company_id=?").bind(status, bonus, new Date().toISOString(), row.id, id).run();
    await tellEmployee(row.employee_id, `Tövsiyə etdiyiniz ${row.candidate_name}: ${REFERRAL_STATUS[status]}`, status === "hired" && bonus > 0 ? `Tövsiyə bonusu: ${(bonus / 100).toFixed(2)} AZN.` : "");
    return ok({ ok: true, bonus: bonus / 100 });
  }
  if (request.method === "POST" && path === "company/referrals/pay") {
    requirePermission("salaries", "Bonusu yalnız əmək haqqı icazəsi olan şəxs ödəyə bilər.");
    const b = await jsonBody(request);
    const row = await db.prepare("SELECT id,employee_id,candidate_name,status,bonus_cents,bonus_paid_at FROM referrals WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ id: string; employee_id: string; candidate_name: string; status: string; bonus_cents: number; bonus_paid_at: string }>();
    if (!row) throw new HttpError(404, "Tövsiyə tapılmadı.");
    if (row.status !== "hired") throw new HttpError(409, "Bonus yalnız işə qəbul olunmuş namizədə görə ödənilir.");
    if (row.bonus_paid_at) throw new HttpError(409, "Bonus artıq ödənilib.");
    if (!(row.bonus_cents > 0)) throw new HttpError(409, "Bonus məbləği yoxdur: əvvəl tövsiyə bonusunu təyin edin.");
    const now = new Date().toISOString();
    await db.batch([
      db.prepare("INSERT INTO payroll_payments(id,company_id,employee_id,month,kind,amount_cents,paid_on,method,note,title,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, row.employee_id, now.slice(0, 7), "extra", row.bonus_cents, now.slice(0, 10), "bank", "Tövsiyə proqramı", `Tövsiyə bonusu: ${row.candidate_name}`, userId, now),
      db.prepare("UPDATE referrals SET bonus_paid_at=?,updated=? WHERE id=? AND company_id=?").bind(now, now, row.id, id),
    ]);
    await companyAudit(db, id, userId, "referral-bonus-paid", row.employee_id, `${row.candidate_name}: ${row.bonus_cents / 100} AZN`);
    await tellEmployee(row.employee_id, "Tövsiyə bonusunuz ödənildi", `${(row.bonus_cents / 100).toFixed(2)} AZN (${row.candidate_name}).`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/referrals/delete") {
    requirePermission("salaries", "Tövsiyəni yalnız kadr işçisi silə bilər.");
    const b = await jsonBody(request);
    const res = await db.prepare("DELETE FROM referrals WHERE id=? AND company_id=? AND bonus_paid_at=''").bind(str(b.id, 100), id).run();
    if (!res.meta.changes) throw new HttpError(409, "Ödənilmiş bonusu olan tövsiyə silinmir.");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/reference-checks") {
    requirePermission("salaries", "Rəy yoxlamasını yalnız kadr işçisi görə bilər.");
    const rows = (await db.prepare("SELECT id,candidate_name,job_title,referee_name,referee_role,referee_company,contact,status,answers,verdict,checked_by_name,checked_at,created FROM reference_checks WHERE company_id=? ORDER BY candidate_name,created DESC LIMIT 500").bind(id).all<{ id: string; candidate_name: string; job_title: string; referee_name: string; referee_role: string; referee_company: string; contact: string; status: string; answers: string; verdict: string; checked_by_name: string; checked_at: string; created: string }>()).results;
    return ok({
      questions: REFERENCE_QUESTIONS,
      items: rows.map((r) => {
        const answers = parseJson<Record<string, string>>(r.answers, {});
        return { id: r.id, candidate: r.candidate_name, jobTitle: r.job_title, referee: r.referee_name, role: r.referee_role, company: r.referee_company, contact: r.contact, status: r.status, answers, verdict: r.verdict, checkedBy: r.checked_by_name, checkedAt: r.checked_at, ...referenceScore(answers) };
      }),
    });
  }
  if (request.method === "POST" && path === "company/reference-checks/save") {
    requirePermission("salaries", "Rəy yoxlamasını yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const candidate = str(b.candidate, 120);
    const referee = str(b.referee, 120);
    if (candidate.length < 2 || referee.length < 2) throw new HttpError(400, "Namizədin və rəy verənin adını yazın.");
    const count = Number((await db.prepare("SELECT COUNT(*) AS n FROM reference_checks WHERE company_id=? AND candidate_name=?").bind(id, candidate).first<{ n: number }>())?.n || 0);
    if (!str(b.id, 100) && count >= 6) throw new HttpError(409, "Bir namizəd üçün ən çox 6 rəy verən saxlanılır.");
    const values = [candidate, str(b.jobTitle, 120), referee, str(b.role, 120), str(b.company, 120), str(b.contact, 160)];
    if (str(b.id, 100)) await db.prepare("UPDATE reference_checks SET candidate_name=?,job_title=?,referee_name=?,referee_role=?,referee_company=?,contact=? WHERE id=? AND company_id=?").bind(...values, str(b.id, 100), id).run();
    else await db.prepare("INSERT INTO reference_checks(id,company_id,candidate_name,job_title,referee_name,referee_role,referee_company,contact,created) VALUES(?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, ...values, new Date().toISOString()).run();
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/reference-checks/record") {
    requirePermission("salaries", "Rəy yoxlamasını yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const answers = cleanReferenceAnswers(b.answers);
    if (!Object.keys(answers).length) throw new HttpError(400, "Ən azı bir suala cavab yazın.");
    const res = await db.prepare("UPDATE reference_checks SET answers=?,verdict=?,status='done',checked_by_name=?,checked_at=? WHERE id=? AND company_id=?").bind(JSON.stringify(answers), str(b.verdict, 300), await requesterName(), new Date().toISOString(), str(b.id, 100), id).run();
    if (!res.meta.changes) throw new HttpError(404, "Qeyd tapılmadı.");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/reference-checks/delete") {
    requirePermission("salaries", "Rəy yoxlamasını yalnız kadr işçisi silə bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM reference_checks WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    return ok({ ok: true });
  }
  return undefined;
}
