// offers: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { checkSalary } from "@/lib/staff-plan";
import { employeePay } from "@/lib/payroll";
import { needsDirector } from "@/lib/company";
import { loadPlanData, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_offers_02(c: Pick<RouteCtx, "approvalRules" | "canAct" | "db" | "deliverOffer" | "id" | "loadOfferTarget" | "path" | "queueApproval" | "request" | "requirePermission">): Promise<Response | undefined> {
  const { approvalRules, canAct, db, deliverOffer, id, loadOfferTarget, path, queueApproval, request, requirePermission } = c;
  if (request.method === "POST" && path === "offers/create") {
    requirePermission(
      "offers",
      "İş təklifini yalnız HR, direktor və ya hesab sahibi göndərə bilər.",
    );
    const b = await jsonBody(request);
    const { row, job } = await loadOfferTarget(str(b.applicationId, 100));
    const d = b.data || {};
    const salary = Math.round(Number(d.salary) || 0);
    const startDate = str(d.startDate, 10);
    if (salary <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(startDate))
      throw new HttpError(400, "Maaş və işə başlama tarixini düzgün yazın.");
    const validUntil = str(d.validUntil, 10);
    const data = {
      position: str(d.position, 150) || job.title,
      company: job.company,
      salary,
      salaryPeriod: d.salaryPeriod === "gross" ? "gross" : "net",
      startDate,
      contractType: ["Müddətsiz", "Müddətli", "Mülki-hüquqi"].includes(
        d.contractType,
      )
        ? d.contractType
        : "Müddətsiz",
      probationMonths: Math.max(
        0,
        Math.min(6, Math.round(Number(d.probationMonths) || 0)),
      ),
      workSchedule: str(d.workSchedule, 200),
      location: str(d.location, 200) || job.address || job.city,
      benefits: str(d.benefits, 1000),
      validUntil: /^\d{4}-\d{2}-\d{2}$/.test(validUntil) ? validUntil : "",
      message: str(d.message, 2000),
      signerName: str(d.signerName, 120),
      signerTitle: str(d.signerTitle, 120),
    };
    // The offered pay stays inside the band the staff table names for the position of the vacancy.
    {
      const plan = await loadPlanData(db, id);
      const gross = employeePay(salary, data.salaryPeriod === "gross" ? "gross" : "net", "private").gross;
      const problem = checkSalary(plan.units, { id: "", department: job.department || "", section: job.section || "", position: data.position }, gross);
      if (problem) throw new HttpError(409, problem.replace("təyin etmək olmaz", "təklif etmək olmaz"));
    }
    // With the offer rule on, only a director (or a substitute) sends offers directly.
    if (
      needsDirector(await approvalRules(), "offer", canAct("approve-director"), salary)
    ) {
      const who =
        (
          await db
            .prepare("SELECT name FROM accounts WHERE id=?")
            .bind(row.candidate_id)
            .first<{ name: string }>()
        )?.name || "Namizəd";
      const requestId = await queueApproval(
        "offer",
        `${who} — ${data.position}, ${data.salary} AZN (${data.salaryPeriod})`,
        { applicationId: row.id, data },
      );
      return ok({ ok: true, pending: true, id: requestId }, 202);
    }
    return ok({ ok: true, id: await deliverOffer(row, data) }, 201);
  }
  return undefined;
}
