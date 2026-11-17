"use client";
import HrTrends from "./HrTrends";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Download, FileBarChart, Printer } from "lucide-react";
import { ATTENDANCE_CODES } from "@/lib/calendar-az";
import { requestKindLabel } from "@/lib/requests";
import { createXlsx } from "@/lib/xlsx";
import { Field } from "./components";
import { ReportChart, SavedBar, ScheduleBar, FeedKeyPanel } from "./ReportTools";
import { mergeCompare, previousFilters } from "@/lib/report-compare";
import HrFundReport from "./HrFundReport";
import PayrollReport from "./PayrollReport";

type Notify = (message: string) => void;
type Cell = string | number;
async function get<T>(path: string): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, { credentials: "same-origin", cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Hesabat alınmadı.");
  return data;
}

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => today().slice(0, 7);
const thisYear = () => today().slice(0, 4);
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");
const money = (v: number) => Math.round((v || 0) * 100) / 100;
const inRange = (date: string, from: string, to: string) => !!date && (!from || date.slice(0, 10) >= from) && (!to || date.slice(0, 10) <= to);

type Filters = Record<string, string>;
type Spec = { id: string; label: string; type: "from" | "to" | "month" | "year" | "department" | "select" | "text"; options?: [string, string][]; initial?: string };
type Result = { columns: string[]; rows: Cell[][]; totals?: Cell[]; note?: string };
type Report = {
  id: string;
  group: string;
  title: string;
  description: string;
  need?: string; // company permission
  schedulable?: boolean; // can be sent to the e-mail on a schedule
  filters?: Spec[];
  run?: (f: Filters) => Promise<Result>;
  render?: (props: { me: HubMe; notify: Notify }) => ReactNode; // reports with their own screen
};
export type HubMe = { permissions: string[] } | null;

const PERIOD: Spec[] = [
  { id: "from", label: "Başlanğıc tarixi", type: "from" },
  { id: "to", label: "Son tarix", type: "to" },
];
const DEPARTMENT: Spec = { id: "department", label: "Departament", type: "department" };

// Every report has a name, a short description and its own filters; the ones with a table also give Excel and print.
const openPlan = () => {
  window.location.hash = "hr-planfact";
};

const REPORTS: Report[] = [
  { id: "hiring", group: "İşə qəbul", title: "İşə qəbul icmalı", description: "Vakansiyalar, müraciətlər, müsahibə, təklif və işə qəbul göstəriciləri; tarix və vakansiya üzrə süzgəc.", need: "reports" },
  { id: "referrals", group: "İşə qəbul", title: "Tövsiyə proqramı", description: "İşçilərin tövsiyə etdiyi namizədlər, vəziyyəti və bonusları.", filters: [...PERIOD, { id: "status", label: "Vəziyyət", type: "select", options: [["new", "Yeni"], ["contacted", "Əlaqə saxlanılıb"], ["interview", "Müsahibə"], ["hired", "İşə qəbul olunub"], ["rejected", "Uyğun gəlmədi"]] }],
    run: async (f) => {
      const d = await get<{ items: { referrer: string; jobTitle: string; name: string; status: string; bonus: number; paidAt: string; created: string }[]; statusText: Record<string, string> }>("company/referrals");
      const rows = d.items.filter((r) => inRange(r.created, f.from, f.to) && (!f.status || r.status === f.status));
      return { columns: ["Tarix", "Tövsiyə edən", "Namizəd", "Vakansiya", "Vəziyyət", "Bonus (AZN)", "Bonus ödənilib"], rows: rows.map((r) => [dmy(r.created), r.referrer, r.name, r.jobTitle, d.statusText[r.status] || r.status, r.bonus, dmy(r.paidAt)]), totals: ["CƏMİ", "", `${rows.length} tövsiyə`, "", "", money(rows.reduce((t, r) => t + r.bonus, 0)), ""] };
    } },
  { id: "references", group: "İşə qəbul", title: "Rəy yoxlamaları", description: "Namizədlərin rəy verənləri və nəticələri.", filters: [{ id: "status", label: "Vəziyyət", type: "select", options: [["done", "Yoxlanılıb"], ["planned", "Gözləyir"]] }, { id: "q", label: "Namizəd", type: "text" }],
    run: async (f) => {
      const d = await get<{ items: { candidate: string; jobTitle: string; referee: string; role: string; company: string; status: string; score: number | null; reading: string; verdict: string; checkedAt: string }[] }>("company/reference-checks");
      const rows = d.items.filter((r) => (!f.status || r.status === f.status) && (!f.q || r.candidate.toLowerCase().includes(f.q.toLowerCase())));
      return { columns: ["Namizəd", "Vakansiya", "Rəy verən", "Vəzifə / şirkət", "Vəziyyət", "Orta qiymət", "Nəticə", "Rəy", "Tarix"], rows: rows.map((r) => [r.candidate, r.jobTitle, r.referee, [r.role, r.company].filter(Boolean).join(" / "), r.status === "done" ? "Yoxlanılıb" : "Gözləyir", r.score ?? "", r.reading, r.verdict, dmy(r.checkedAt)]) };
    } },

  { id: "fund", group: "Kadr və əmək haqqı", title: "Kadr və əmək haqqı fondu", description: "Departament üzrə işçi, plan, büdcə ilə fond, məzuniyyət borcu və dövriyyə; il üzrə süzgəc.", need: "payroll", render: ({ notify }) => <HrFundReport notify={notify} onOpenPlan={openPlan} /> },
  { id: "settlement", group: "Kadr və əmək haqqı", title: "İşçilərlə hesablaşma hesabatı", description: "Hər işçiyə nə qədər hesablanıb, nə qədər və nəyə görə ödənilib, hər tərəfin borcu; dövr üzrə süzgəc, aylar üzrə ətraflı jurnal.", need: "payroll", render: ({ notify }) => <PayrollReport initialMonth={thisMonth()} notify={notify} /> },
  { id: "payroll-month", group: "Kadr və əmək haqqı", title: "Aylıq əmək haqqı cədvəli", description: "Seçilmiş ay üçün hər işçinin hesablanan, tutulan və ödəniləcək məbləği.", need: "payroll", filters: [{ id: "month", label: "Ay", type: "month" }, DEPARTMENT, { id: "q", label: "İşçi", type: "text" }],
    run: async (f) => {
      const d = await get<{ status: string; rows: { name: string; position: string; department: string; result: { gross: number; incomeTax: number; employeeSocial: number; employeeUnemployment: number; employeeMedical: number; net: number; toPay: number; employerCost: number }; advances: number; salaryPaid: number; outstanding: number }[] }>(`company/payroll?month=${f.month}`);
      const rows = d.rows.filter((r) => (!f.department || r.department === f.department) && (!f.q || r.name.toLowerCase().includes(f.q.toLowerCase())));
      const sum = (pick: (r: (typeof rows)[number]) => number) => money(rows.reduce((t, r) => t + pick(r), 0));
      return {
        note: d.status === "approved" ? "Ay təsdiqlənib." : "Ay hələ təsdiqlənməyib: ilkin hesablamadır.",
        columns: ["İşçi", "Vəzifə", "Departament", "Gross", "Gəlir vergisi", "Sığorta (işçi)", "Net", "Avans", "Ödənilib", "Qalıq", "İşəgötürənin xərci"],
        rows: rows.map((r) => [r.name, r.position, r.department, r.result.gross, r.result.incomeTax, money(r.result.employeeSocial + r.result.employeeUnemployment + r.result.employeeMedical), r.result.net, r.advances, r.salaryPaid, r.outstanding, r.result.employerCost]),
        totals: ["CƏMİ", "", "", sum((r) => r.result.gross), sum((r) => r.result.incomeTax), sum((r) => r.result.employeeSocial + r.result.employeeUnemployment + r.result.employeeMedical), sum((r) => r.result.net), sum((r) => r.advances), sum((r) => r.salaryPaid), sum((r) => r.outstanding), sum((r) => r.result.employerCost)],
      };
    } },
  { id: "trends", group: "Kadr və əmək haqqı", title: "Kadr dinamikası, proqnoz və plan-fakt", description: "Son 12 ayda işçi sayı, işə qəbul və çıxış qrafiki, 3 aylıq proqnoz, ştat cədvəli ilə faktiki işçi müqayisəsi və xəbərdarlıqlar.", need: "reports", render: ({ notify }) => <HrTrends notify={notify} onOpenPlan={openPlan} /> },
  { id: "workforce", group: "Kadr və əmək haqqı", title: "İşçi axını və dövriyyə", description: "İşə qəbul, ayrılma, işçi sayı və dövriyyə faizi; dövr üzrə süzgəc.", need: "reports" },

  // ---- The plan and the staff table ----
  { id: "staff-plan", group: "Ştat planı və fakt", schedulable: true, title: "Ştat planı sətir-sətir", description: "Filial, departament, şöbə, vəzifə və pillə üzrə plan, faktiki işçi, boş yer, dövr, maaş həddi və aylıq xərc; boş yeri olanları və aktiv olmayan sətirləri ayırmaq olar.", need: "payroll", filters: [DEPARTMENT, { id: "state", label: "Sətirlər", type: "select", options: [["free", "Boş yeri olanlar"], ["full", "Dolu olanlar"], ["inactive", "Aktiv olmayan (gələcək və ya bitmiş)"]] }],
    run: async (f) => {
      const d = await get<{ rows: { branch?: string; department: string; section: string; position: string; level?: string; rate: number; planned: number; startMonth?: string; endMonth?: string; salaryMin: number; salaryMax: number; filled: number; free: number; active?: boolean; costMax?: number }[]; total: { planned: number; filled: number; planCostMax?: number } }>("company/staff");
      const rate = { 1: "Tam ştat", 0.75: "3/4 ştat", 0.5: "Yarım ştat", 0.25: "1/4 ştat" } as Record<number, string>;
      const rows = d.rows.filter((r) => (!f.department || r.department === f.department) && (!f.state || (f.state === "free" ? r.free > 0 && r.active !== false : f.state === "full" ? r.free <= 0 : r.active === false)));
      return {
        columns: ["Filial", "Departament", "Şöbə", "Vəzifə", "Pillə", "Ştat növü", "Plan", "Faktiki", "Boş", "Dövr", "Maaş həddi (min)", "Maaş həddi (maks)", "Aylıq xərc (maks.)", "Vəziyyət"],
        rows: rows.map((r) => [r.branch || "Baş ofis", r.department, r.section, r.position, r.level || "", rate[r.rate] || "Tam ştat", r.planned, r.filled, Math.max(0, r.free), r.startMonth || r.endMonth ? `${r.startMonth || "…"} – ${r.endMonth || "…"}` : "il boyu", money(r.salaryMin), money(r.salaryMax || r.salaryMin), money(r.costMax || 0), r.active === false ? "Aktiv deyil" : r.free > 0 ? "Boş yer var" : r.free < 0 ? "Plandan artıq" : "Dolu"]),
        totals: ["CƏMİ", "", "", "", "", "", money(rows.reduce((t, r) => t + r.planned, 0)), money(rows.reduce((t, r) => t + r.filled, 0)), money(rows.reduce((t, r) => t + Math.max(0, r.free), 0)), "", "", "", money(rows.reduce((t, r) => t + (r.costMax || 0), 0)), ""],
      };
    } },
  { id: "staff-cost", group: "Ştat planı və fakt", title: "Ştat xərci: plan və fakt (departament üzrə)", description: "Hər departamentin plan üzrə maksimum aylıq maaş fondu (maaş həddi × say), faktiki işçilərin gross maaşı və fərq; plan xərci işəgötürən payları ilə.", need: "payroll", filters: [DEPARTMENT],
    run: async (f) => {
      const d = await get<{ rows: { department: string; rate: number; planned: number; salaryMin: number; salaryMax: number; costMax?: number; active?: boolean; people: { gross?: number | null }[] }[] }>("company/staff");
      const by = new Map<string, { planned: number; planGross: number; planCost: number; factGross: number; people: number }>();
      for (const r of d.rows) {
        if (r.active === false) continue;
        const cur = by.get(r.department) || { planned: 0, planGross: 0, planCost: 0, factGross: 0, people: 0 };
        cur.planned += r.planned;
        cur.planGross += (r.salaryMax || r.salaryMin) * r.planned * (r.rate || 1);
        cur.planCost += r.costMax || 0;
        for (const p of r.people) { cur.factGross += p.gross || 0; cur.people += 1; }
        by.set(r.department, cur);
      }
      const rows = [...by.entries()].filter(([name]) => !f.department || name === f.department).sort((a, b) => a[0].localeCompare(b[0], "az"));
      const sum = (pick: (v: { planned: number; planGross: number; planCost: number; factGross: number; people: number }) => number) => money(rows.reduce((t, [, v]) => t + pick(v), 0));
      return {
        note: "Plan: maaş həddinin yuxarı sərhədi (həddi olmayan sətir 0 sayılır). Faktiki: işçi kartındakı gross maaş.",
        columns: ["Departament", "Plan (nəfər)", "Faktiki (nəfər)", "Plan fondu (gross)", "Faktiki fond (gross)", "Fərq (plan − fakt)", "Plan xərci (işəgötürən payları ilə)"],
        rows: rows.map(([name, v]) => [name || "Departamentsiz", v.planned, v.people, money(v.planGross), money(v.factGross), money(v.planGross - v.factGross), money(v.planCost)]),
        totals: ["CƏMİ", sum((v) => v.planned), sum((v) => v.people), sum((v) => v.planGross), sum((v) => v.factGross), sum((v) => v.planGross - v.factGross), sum((v) => v.planCost)],
      };
    } },
  { id: "staff-issues", group: "Ştat planı və fakt", title: "Ştat uyğunsuzluqları", description: "Ştatda yeri olmayan işçilər və maaşı ştat həddindən kənar olanlar: düzəldilməsi lazım olan siyahı.", need: "payroll", filters: [DEPARTMENT, { id: "kind", label: "Növ", type: "select", options: [["unplaced", "Ştatda yeri yoxdur"], ["band", "Maaşı həddən kənar"]] }],
    run: async (f) => {
      const d = await get<{ unplaced: { name: string; department: string; section: string; position: string }[]; rows: { department: string; position: string; salaryMin: number; salaryMax: number; people: { name: string; gross?: number | null; outside?: string }[] }[] }>("company/staff");
      const out: Cell[][] = [];
      if (!f.kind || f.kind === "unplaced") for (const p of d.unplaced) if (!f.department || p.department === f.department) out.push(["Ştatda yeri yoxdur", p.name, p.department, p.position, "", "", "Ştat sətri əlavə edin və ya vəzifəni düzəldin"]);
      if (!f.kind || f.kind === "band") for (const r of d.rows) for (const p of r.people) if (p.outside && (!f.department || r.department === f.department)) out.push(["Maaşı həddən kənar", p.name, r.department, r.position, p.gross ?? "", `${money(r.salaryMin)} – ${money(r.salaryMax || r.salaryMin)}`, p.outside === "above" ? "Maaş həddən yuxarıdır" : "Maaş həddən aşağıdır"]);
      return { columns: ["Növ", "İşçi", "Departament", "Vəzifə", "Maaş (gross)", "Ştat həddi", "Nə etməli"], rows: out };
    } },
  { id: "plan-exceptions", group: "Ştat planı və fakt", title: "Plandan kənar sorğular və təkliflər", description: "Plandan kənar yer, departament təklifi, maaş həddi və işçi maaş artımı sorğuları: kim, nə vaxt, səbəb və qərar. İlkin plan ilə hazırkı planın fərqi də göstərilir.", need: "payroll", filters: [...PERIOD, { id: "status", label: "Vəziyyət", type: "select", options: [["pending", "Təsdiq gözləyir"], ["approved", "Təsdiqlənib / tətbiq olunub"], ["rejected", "Rədd edilib"]] }],
    run: async (f) => {
      const d = await get<{ items: { created: string; subject: string; requested_by_name: string; status: string; decided_by_name: string; note: string }[]; summary?: { year: string; baselinePlanned: number | null; planned: number; requests: number; approved: number } }>("company/staff/exceptions");
      const label: Record<string, string> = { pending: "Təsdiq gözləyir", approved: "Təsdiqlənib / tətbiq olunub", rejected: "Rədd edilib", returned: "Geri qaytarılıb", cancelled: "Ləğv edilib" };
      const rows = d.items.filter((r) => inRange(r.created, f.from, f.to) && (!f.status || r.status === f.status));
      const s = d.summary;
      return {
        note: s ? `${s.year}: ilkin plan ${s.baselinePlanned ?? "təsdiqlənməyib"}, hazırkı plan ${s.planned}${s.baselinePlanned !== null ? ` (${s.planned - s.baselinePlanned >= 0 ? "+" : ""}${s.planned - s.baselinePlanned})` : ""}; bu il ${s.requests} sorğu, ${s.approved} tətbiq/təsdiq.` : undefined,
        columns: ["Tarix", "Sorğu", "Göndərən", "Vəziyyət", "Qərar verən", "Qeyd"],
        rows: rows.map((r) => [dmy(r.created), r.subject, r.requested_by_name, label[r.status] || r.status, r.decided_by_name, r.note]),
      };
    } },
  { id: "plan-exits", group: "Ştat planı və fakt", title: "Gözlənilən çıxışlar", description: "Çıxış tarixi təyin olunmuş və ya müddətli müqaviləsi bitən işçilər: bu yerlər üçün əvvəlcədən vakansiya açmaq olar.", need: "employees", filters: [DEPARTMENT, { id: "within", label: "Nə qədər irəli", type: "select", options: [["30", "30 gün"], ["90", "90 gün"], ["180", "180 gün"]], initial: "90" }],
    run: async (f) => {
      const d = await get<{ items: { name: string; department: string; position: string; date: string; kind: string }[] }>("company/reports/expected-exits");
      const limit = new Date(Date.now() + Number(f.within || "90") * 86400000).toISOString().slice(0, 10);
      const rows = d.items.filter((r) => r.date <= limit && (!f.department || r.department === f.department));
      return { columns: ["İşçi", "Departament", "Vəzifə", "Tarix", "Səbəb"], rows: rows.map((r) => [r.name, r.department, r.position, dmy(r.date), r.kind]) };
    } },
  { id: "plan-fill", group: "Ştat planı və fakt", title: "Yerin dolma müddəti", description: "Vakansiyanın açıldığı gündən işçi kartının yarandığı günə qədər keçən müddət (platforma üzərindən işə götürülənlər).", need: "employees", filters: [DEPARTMENT],
    run: async (f) => {
      const d = await get<{ items: { name: string; department: string; position: string; title: string; opened: string; hired: string; days: number }[] }>("company/reports/fill-time");
      const rows = d.items.filter((r) => !f.department || r.department === f.department);
      const avg = rows.length ? Math.round(rows.reduce((t, r) => t + r.days, 0) / rows.length) : 0;
      return { note: rows.length ? `Orta müddət: ${avg} gün (${rows.length} işə qəbul).` : undefined, columns: ["İşçi", "Departament", "Vəzifə", "Vakansiya açıldı", "İşə qəbul", "Gün"], rows: rows.map((r) => [r.name, r.department, r.position, dmy(r.opened), dmy(r.hired), r.days]) };
    } },
  { id: "approvals-stats", group: "Təsdiqlər və jurnal", title: "Təsdiqlər: say və gözləmə müddəti", description: "Gözləyən, təsdiqlənən və rədd edilən sorğular, orta qərar müddəti və qərar verənlər üzrə bölgü.", need: "approve-hr",
    run: async () => {
      const d = await get<{ pending: number; info: number; approved: number; rejected: number; avgHours: number; byDecider: { name: string; count: number; avgHours: number }[] }>("company/approvals/stats");
      return {
        note: `Gözləyən: ${d.pending} · məlumat gözləyən: ${d.info} · təsdiqlənən: ${d.approved} · rədd edilən: ${d.rejected} · orta qərar müddəti: ${d.avgHours} saat.`,
        columns: ["Qərar verən", "Qərar sayı", "Orta müddət (saat)"],
        rows: d.byDecider.map((x) => [x.name, x.count, x.avgHours]),
      };
    } },
  { id: "company-audit", group: "Təsdiqlər və jurnal", title: "Şirkət əməliyyat jurnalı", description: "Komanda üzvlərinin son əməliyyatları (maaş, ştat, təsdiq, sənəd, idxal): kim, nə vaxt, nəyi dəyişib.", need: "audit", filters: [{ id: "q", label: "Axtarış", type: "text" }],
    run: async (f) => {
      const d = await get<{ events: { action: string; target: string; detail: string; created: string; actor: string }[] }>("company/audit");
      const rows = d.events.filter((e) => !f.q || `${e.action} ${e.detail} ${e.actor}`.toLowerCase().includes(f.q.toLowerCase()));
      return { columns: ["Tarix", "Kim", "Əməliyyat", "Təfərrüat"], rows: rows.map((e) => [dmy(e.created), e.actor, e.action, e.detail]) };
    } },

  { id: "turnover", group: "Kadr və əmək haqqı", title: "Dövriyyə: səbəb və staj üzrə", description: "İşdən çıxanlar: kim, hansı departamentdən, nə qədər işləyib, hansı səbəblə. İlk il dövriyyəsi və çıxış səbəbləri yuxarıda xülasə kimi yazılır.", need: "employees", filters: [...PERIOD, DEPARTMENT],
    run: async (f) => {
      const d = await get<{ headcount: number; items: { name: string; department: string; position: string; start: string; end: string; tenureMonths: number | null; exitType: string; reason: string }[] }>(`company/reports/turnover?from=${f.from || ""}&to=${f.to || ""}`);
      const rows = d.items.filter((r) => !f.department || r.department === f.department);
      const firstYear = rows.filter((r) => r.tenureMonths !== null && r.tenureMonths < 12).length;
      const byType = new Map<string, number>();
      for (const r of rows) byType.set(r.exitType || "Göstərilməyib", (byType.get(r.exitType || "Göstərilməyib") || 0) + 1);
      const rate = d.headcount + rows.length ? Math.round((rows.length / (d.headcount + rows.length)) * 1000) / 10 : 0;
      return {
        note: rows.length ? `${rows.length} çıxış (hazırkı işçi ${d.headcount}; dövriyyə ≈ ${rate}%). İlk ilində çıxan: ${firstYear} (${Math.round((firstYear / rows.length) * 100)}%). Səbəblər: ${[...byType.entries()].map(([k, v]) => `${k} ${v}`).join(", ")}.` : undefined,
        columns: ["İşçi", "Departament", "Vəzifə", "İşə başlama", "Çıxış", "Staj (ay)", "Çıxışın növü", "Səbəb"],
        rows: rows.map((r) => [r.name, r.department, r.position, dmy(r.start), dmy(r.end), r.tenureMonths ?? "", r.exitType, r.reason]),
      };
    } },
  { id: "hiring-flow", group: "İşə qəbul", title: "İşə qəbul: mərhələ müddəti və təklifin qəbulu", description: "Müraciətlər hər mərhələyə nə qədər çatır, mərhələlər arasında orta neçə gün keçir, təkliflərin neçə faizi qəbul olunub və bir işə qəbulun orta dəyəri (işə qəbul xərcləri).", need: "reports",
    run: async () => {
      const d = await get<{ stages: { stage: string; reached: number; avgDays: number | null }[]; offers: { sent: number; accepted: number; answered: number; acceptRate: number | null }; hires: number; hiringCost: number }>("company/reports/hiring-flow");
      return {
        note: `Təkliflər: cavab verilən ${d.offers.answered}, qəbul edilən ${d.offers.accepted}${d.offers.acceptRate !== null ? ` (${d.offers.acceptRate}%)` : ""}, cavab gözləyən ${d.offers.sent}. Son 12 ayda ${d.hires} işə qəbul${d.hires && d.hiringCost ? `, işə qəbul xərci ${d.hiringCost} AZN, bir işə qəbulun dəyəri ≈ ${Math.round(d.hiringCost / d.hires)} AZN` : ""}.`,
        columns: ["Mərhələ", "Çatan müraciət", "Əvvəlki mərhələdən orta gün"],
        rows: d.stages.map((x) => [x.stage, x.reached, x.avgDays ?? ""]),
      };
    } },
  { id: "fund-change", group: "Kadr və əmək haqqı", title: "Əmək haqqı fondunun aylıq dəyişikliyi", description: "Hər ayın gross, net və işəgötürən xərci, əvvəlki aya görə dəyişiklik və həmin ayda neçə işə qəbul, çıxış və maaş dəyişikliyi olub.", need: "payroll", filters: [],
    run: async () => {
      const d = await get<{ year: string; months: { month: string; gross: number; net: number; employerCost: number; hires: number; exits: number; raises: number }[] }>("company/reports/fund-change");
      const rows = d.months.map((m, i) => [m.month, money(m.gross), i ? money(m.gross - d.months[i - 1].gross) : "", money(m.net), money(m.employerCost), m.hires, m.exits, m.raises]);
      return { note: `${d.year} ili. «Dəyişiklik» əvvəlki ayın gross fonduna görədir.`, columns: ["Ay", "Gross", "Əvvəlki aya görə dəyişiklik", "Net", "İşəgötürənin xərci", "İşə qəbul", "Çıxış", "Maaş dəyişikliyi"], rows };
    } },
  { id: "branch-summary", group: "Ştat planı və fakt", title: "Filial üzrə icmal", description: "Hər filialın planı, faktiki işçi sayı, boş yer, plan xərci və faktiki gross fond bir cədvəldə.", need: "payroll",
    run: async () => {
      const d = await get<{ rows: { branch?: string; planned: number; filled: number; free: number; active?: boolean; costMax?: number; people: { gross?: number | null }[] }[] }>("company/staff");
      const by = new Map<string, { planned: number; filled: number; free: number; cost: number; gross: number }>();
      for (const r of d.rows) {
        if (r.active === false) continue;
        const k = r.branch || "Baş ofis";
        const cur = by.get(k) || { planned: 0, filled: 0, free: 0, cost: 0, gross: 0 };
        cur.planned += r.planned; cur.filled += r.filled; cur.free += Math.max(0, r.free); cur.cost += r.costMax || 0;
        cur.gross += r.people.reduce((t, p) => t + (p.gross || 0), 0);
        by.set(k, cur);
      }
      const rows = [...by.entries()].sort((a, b) => a[0].localeCompare(b[0], "az"));
      const sum = (pick: (v: { planned: number; filled: number; free: number; cost: number; gross: number }) => number) => money(rows.reduce((t, [, v]) => t + pick(v), 0));
      return { columns: ["Filial", "Plan", "Faktiki", "Boş", "Plan xərci (aylıq, maks.)", "Faktiki gross fond"], rows: rows.map(([k, v]) => [k, v.planned, v.filled, v.free, money(v.cost), money(v.gross)]), totals: ["CƏMİ", sum((v) => v.planned), sum((v) => v.filled), sum((v) => v.free), sum((v) => v.cost), sum((v) => v.gross)] };
    } },
  { id: "lateness", group: "Davamiyyət və vaxt", title: "Gecikmə və erkən çıxış", description: "Ay üzrə hər işçinin gecikdiyi və erkən çıxdığı günlərin sayı və cəmi dəqiqə (giriş-çıxış qeydinə görə).", need: "attendance", filters: [{ id: "month", label: "Ay", type: "month" }, DEPARTMENT],
    run: async (f) => {
      const d = await get<{ employees: { name: string; position: string; department: string; entries?: { late?: number; early?: number }[]; days?: { late?: number; early?: number }[] }[] }>(`company/hours?month=${f.month}`);
      const rows = d.employees.filter((e) => !f.department || e.department === f.department).map((e) => {
        const list = e.entries || e.days || [];
        const late = list.filter((x) => (x.late || 0) > 0), early = list.filter((x) => (x.early || 0) > 0);
        return [e.name, e.position, e.department, late.length, money(late.reduce((t, x) => t + (x.late || 0), 0)), early.length, money(early.reduce((t, x) => t + (x.early || 0), 0))];
      }).filter((r) => (r[3] as number) > 0 || (r[5] as number) > 0);
      return { columns: ["İşçi", "Vəzifə", "Departament", "Gecikmə (gün)", "Gecikmə (dəqiqə)", "Erkən çıxış (gün)", "Erkən çıxış (dəqiqə)"], rows };
    } },
  { id: "leave-liability", group: "Davamiyyət və vaxt", title: "Məzuniyyət öhdəliyi (işçi üzrə)", description: "Hər işçinin istifadə olunmamış məzuniyyət günləri və təxmini maliyyə öhdəliyi (qalıq gün × orta gündəlik maaş; təxmini hesablamadır).", need: "payroll", filters: [DEPARTMENT],
    run: async (f) => {
      const d = await get<{ employees: { name: string; position: string; department: string; salary?: number; salaryType?: string; remaining?: number; vacation?: { remaining: number } }[] }>("company/leave-schedule");
      const people = await get<{ employees: { id: string; name: string; salary?: number; gross?: number; salaryType?: string }[] }>("company/employees").catch(() => ({ employees: [] }));
      const pay = new Map(people.employees.map((p) => [p.name, p.gross ?? p.salary ?? 0]));
      const rows = d.employees.filter((e) => !f.department || e.department === f.department).map((e) => {
        const remaining = e.remaining ?? e.vacation?.remaining ?? 0;
        const monthly = pay.get(e.name) || 0;
        const daily = monthly / 30.4;
        return [e.name, e.position, e.department, remaining, money(monthly), money(daily), money(remaining * daily)];
      });
      const total = money(rows.reduce((t, r) => t + (r[6] as number), 0));
      return { note: "Orta gündəlik maaş = aylıq maaş ÷ 30,4. Maaşı görünməyən işçilərdə öhdəlik 0 göstərilir.", columns: ["İşçi", "Vəzifə", "Departament", "Qalıq (gün)", "Aylıq maaş", "Orta gündəlik", "Təxmini öhdəlik"], rows, totals: ["CƏMİ", "", "", money(rows.reduce((t, r) => t + (r[3] as number), 0)), "", "", total] };
    } },

  { id: "attendance", group: "Davamiyyət və vaxt", title: "Davamiyyət xülasəsi", description: "Ay üzrə hər işçinin norma, işlənmiş gün və məzuniyyət, xəstəlik, yoxluq günləri.", need: "attendance", filters: [{ id: "month", label: "Ay", type: "month" }, DEPARTMENT],
    run: async (f) => {
      const d = await get<{ employees: { name: string; position: string; department: string; summary: { norm: number; worked: number; byCode: Record<string, number>; hours: number } }[] }>(`company/attendance?month=${f.month}`);
      const rows = d.employees.filter((e) => !f.department || e.department === f.department);
      const codes = ATTENDANCE_CODES.filter((c) => rows.some((e) => (e.summary.byCode[c.id] || 0) > 0));
      return {
        columns: ["İşçi", "Vəzifə", "Departament", "Norma (gün)", "İşlənib (gün)", "Saat", ...codes.map((c) => c.label.replace(/\s*\(.*\)\s*/, ""))],
        rows: rows.map((e) => [e.name, e.position, e.department, e.summary.norm, e.summary.worked, e.summary.hours, ...codes.map((c) => e.summary.byCode[c.id] || 0)]),
      };
    } },
  { id: "hours", group: "Davamiyyət və vaxt", title: "Saat uçotu: artıq iş, gecə və istirahət günü", description: "Ay üzrə işlənən saat, artıq iş, istirahət/bayram günü və gecə saatları.", need: "attendance", filters: [{ id: "month", label: "Ay", type: "month" }, DEPARTMENT],
    run: async (f) => {
      const d = await get<{ employees: { name: string; position: string; department: string; weekHours: number; summary: { days: number; worked: number; overtime: number; restDay: number; night: number } }[] }>(`company/hours?month=${f.month}`);
      const rows = d.employees.filter((e) => (!f.department || e.department === f.department) && e.summary.days > 0);
      const sum = (pick: (e: (typeof rows)[number]) => number) => money(rows.reduce((t, e) => t + pick(e), 0));
      return { columns: ["İşçi", "Vəzifə", "Departament", "Həftəlik saat", "Qeydli gün", "İşlənən saat", "Artıq iş", "İstirahət/bayram günü", "Gecə"], rows: rows.map((e) => [e.name, e.position, e.department, e.weekHours, e.summary.days, e.summary.worked, e.summary.overtime, e.summary.restDay, e.summary.night]), totals: ["CƏMİ", "", "", "", sum((e) => e.summary.days), sum((e) => e.summary.worked), sum((e) => e.summary.overtime), sum((e) => e.summary.restDay), sum((e) => e.summary.night)] };
    } },
  { id: "leave", group: "Davamiyyət və vaxt", title: "Məzuniyyət qalığı və qrafiki", description: "İşçilərin məzuniyyət hüququ, qalığı və planlaşdırılmış günləri.", need: "employees", filters: [{ id: "year", label: "İl", type: "year" }, DEPARTMENT, { id: "plan", label: "Plan", type: "select", options: [["none", "Planı olmayanlar"], ["has", "Planı olanlar"]] }],
    run: async (f) => {
      const d = await get<{ employees: { name: string; position: string; department: string; entitlement: number; remaining: number; planned: number }[]; entries: { employeeId: string; start: string; end: string; days: number; status: string; statusText: string; name: string }[] }>(`company/leave-schedule?year=${f.year}`);
      const rows = d.employees.filter((e) => (!f.department || e.department === f.department) && (!f.plan || (f.plan === "has" ? e.planned > 0 : e.planned === 0)));
      return {
        columns: ["İşçi", "Vəzifə", "Departament", "Hüquq (gün)", "Qalıq (gün)", "Planlaşdırılıb (gün)", "Tarixlər"],
        rows: rows.map((e) => [e.name, e.position, e.department, e.entitlement, e.remaining, e.planned, d.entries.filter((x) => x.name === e.name && x.status !== "rejected").map((x) => `${dmy(x.start)}–${dmy(x.end)}`).join("; ")]),
      };
    } },
  { id: "shifts", group: "Davamiyyət və vaxt", title: "Ezamiyyətlər və xərclər", description: "Ezamiyyətlər, gündəlik, avans, xərc və hesablaşma; tarix və vəziyyət üzrə süzgəc.", need: "employees", filters: [...PERIOD, DEPARTMENT, { id: "status", label: "Vəziyyət", type: "select", options: [["requested", "Təsdiq gözləyir"], ["approved", "Təsdiqlənib"], ["reported", "Hesabat verilib"], ["settled", "Hesablaşılıb"], ["rejected", "Rədd edilib"]] }],
    run: async (f) => {
      const [d, people] = await Promise.all([get<{ trips: { name: string; destination: string; purpose: string; start: string; end: string; days: number; status: string; statusText: string; calc: { perDiem: number; expenses: number; total: number; advance: number; balance: number } }[] }>("company/trips"), get<{ employees: { name: string; department: string }[] }>("company/employees")]);
      const dept = new Map(people.employees.map((p) => [p.name, p.department]));
      const rows = d.trips.filter((t) => inRange(t.start, f.from, f.to) && (!f.status || t.status === f.status) && (!f.department || dept.get(t.name) === f.department));
      const sum = (pick: (t: (typeof rows)[number]) => number) => money(rows.reduce((t, r) => t + pick(r), 0));
      return { columns: ["İşçi", "Təyinat", "Başlanğıc", "Bitmə", "Gün", "Gündəlik cəmi", "Xərclər", "Cəmi", "Avans", "Qalıq (+ işçiyə, − işçidən)", "Vəziyyət"], rows: rows.map((t) => [t.name, t.destination, dmy(t.start), dmy(t.end), t.days, t.calc.perDiem, t.calc.expenses, t.calc.total, t.calc.advance, t.calc.balance, t.statusText]), totals: ["CƏMİ", "", "", "", sum((t) => t.days), sum((t) => t.calc.perDiem), sum((t) => t.calc.expenses), sum((t) => t.calc.total), sum((t) => t.calc.advance), sum((t) => t.calc.balance), ""] };
    } },

  { id: "training", group: "İnkişaf", title: "Təlimlər və büdcə", description: "İl üzrə təlimlər, xərc, saat, iştirakçı sayı və büdcə qalığı.", need: "employees", filters: [{ id: "year", label: "İl", type: "year" }, { id: "status", label: "Vəziyyət", type: "select", options: [["planned", "Planlaşdırılıb"], ["done", "Keçirilib"], ["cancelled", "Ləğv edilib"]] }, { id: "kind", label: "Növ", type: "select", options: [["internal", "Daxili"], ["external", "Xarici"], ["online", "Onlayn"], ["safety", "Əməyin mühafizəsi"]] }],
    run: async (f) => {
      const d = await get<{ budget: number; spent: number; trainings: { title: string; provider: string; kind: string; start: string; end: string; hours: number; cost: number; status: string; participants: { status: string }[] }[] }>(`company/training?year=${f.year}`);
      const rows = d.trainings.filter((t) => (!f.status || t.status === f.status) && (!f.kind || t.kind === f.kind));
      const TS: Record<string, string> = { planned: "Planlaşdırılıb", done: "Keçirilib", cancelled: "Ləğv edilib" };
      return { note: `Büdcə ${money(d.budget)} AZN · planlaşdırılan xərc ${money(d.spent)} AZN · qalıq ${money(d.budget - d.spent)} AZN`, columns: ["Təlim", "Təşkilat", "Növ", "Başlanğıc", "Bitmə", "Saat", "Xərc (AZN)", "İştirakçı", "Tamamlayan", "Vəziyyət"], rows: rows.map((t) => [t.title, t.provider, t.kind, dmy(t.start), dmy(t.end), t.hours, t.cost, t.participants.length, t.participants.filter((p) => p.status === "completed").length, TS[t.status] || t.status]), totals: ["CƏMİ", "", "", "", "", money(rows.reduce((s, t) => s + t.hours, 0)), money(rows.reduce((s, t) => s + t.cost, 0)), "", "", ""] };
    } },
  { id: "performance", group: "İnkişaf", title: "Performans nəticələri", description: "Qiymətləndirmə dövrü üzrə məqsədlər, özünüqiymət, rəhbər qiyməti və dərəcə.", need: "employees", filters: [DEPARTMENT, { id: "status", label: "Vəziyyət", type: "select", options: [["open", "Başlanmayıb"], ["self-done", "Özünüqiymət verilib"], ["manager-done", "Rəhbər qiymətləndirib"], ["acknowledged", "İşçi tanış olub"]] }],
    run: async (f) => {
      const d = await get<{ cycles: { id: string; name: string }[]; cycle: string; employees: { name: string; position: string; department: string; goals: unknown[]; goalScore: number | null; band: string; review: { selfScore: number | null; managerScore: number | null; status: string } | null }[] }>("company/performance");
      const rows = d.employees.filter((e) => (!f.department || e.department === f.department) && (!f.status || (e.review?.status || "open") === f.status));
      const SS: Record<string, string> = { open: "Başlanmayıb", "self-done": "Özünüqiymət verilib", "manager-done": "Rəhbər qiymətləndirib", acknowledged: "İşçi tanış olub" };
      return { note: `Dövr: ${d.cycles.find((c) => c.id === d.cycle)?.name || "yoxdur"}`, columns: ["İşçi", "Vəzifə", "Departament", "Məqsəd sayı", "Məqsədlər üzrə orta", "Özünüqiymət", "Rəhbər qiyməti", "Dərəcə", "Vəziyyət"], rows: rows.map((e) => [e.name, e.position, e.department, e.goals.length, e.goalScore ?? "", e.review?.selfScore ?? "", e.review?.managerScore ?? "", e.band, SS[e.review?.status || "open"]]) };
    } },
  { id: "surveys", group: "İnkişaf", title: "Sorğu nəticələri (eNPS)", description: "İşçi sorğuları, cavab sayı, eNPS və orta qiymətlər.", need: "employees", filters: [{ id: "status", label: "Vəziyyət", type: "select", options: [["open", "Açıq"], ["closed", "Bağlı"]] }],
    run: async (f) => {
      const d = await get<{ employees: number; surveys: { title: string; status: string; anonymous: boolean; responses: number; enps: { score: number | null; promoters: number; passives: number; detractors: number } | null; created: string }[] }>("company/surveys");
      const rows = d.surveys.filter((s) => !f.status || s.status === f.status);
      return { columns: ["Sorğu", "Tarix", "Vəziyyət", "Anonim", "Cavab", "İşçi sayı", "eNPS", "Tərəfdar", "Neytral", "Tənqidçi"], rows: rows.map((s) => [s.title, dmy(s.created.slice(0, 10)), s.status === "open" ? "Açıq" : "Bağlı", s.anonymous ? "bəli" : "xeyr", s.responses, d.employees, s.enps?.score ?? "", s.enps?.promoters ?? "", s.enps?.passives ?? "", s.enps?.detractors ?? ""]) };
    } },

  { id: "applications", group: "Kadr əməliyyatları", title: "İşçi ərizələri və cavab müddəti", description: "İşçilərin ərizələri, vəziyyəti və cavab müddəti; tarix, növ və vəziyyət üzrə süzgəc.", need: "orders", filters: [...PERIOD, DEPARTMENT, { id: "status", label: "Vəziyyət", type: "select", options: [["new", "Gözləyir"], ["ordered", "Əmr hazırlanıb"], ["answered", "Cavablandırılıb"], ["rejected", "Rədd edilib"], ["withdrawn", "Geri götürülüb"]] }],
    run: async (f) => {
      const d = await get<{ requests: { kind: string; status: string; created: string; source: string; employee: { name: string; department: string }; data: { from?: string; to?: string; quantity?: number }; orderNumber: string }[]; stats?: { answered: number; waiting: number; overdue: number; averageHours: number | null } }>("company/applications");
      const rows = d.requests.filter((r) => inRange(r.created, f.from, f.to) && (!f.status || r.status === f.status) && (!f.department || r.employee.department === f.department));
      const ST: Record<string, string> = { new: "Gözləyir", ordered: "Əmr hazırlanıb", answered: "Cavablandırılıb", rejected: "Rədd edilib", withdrawn: "Geri götürülüb" };
      const s = d.stats;
      return { note: s ? `Son 90 gün: ${s.answered} cavablandırılıb, gözləyən ${s.waiting}, 3 gündən çox gözləyən ${s.overdue}${s.averageHours !== null ? `, orta cavab müddəti ${s.averageHours} saat` : ""}` : undefined, columns: ["Tarix", "İşçi", "Departament", "Ərizənin növü", "Başlanğıc", "Bitmə", "Mənbə", "Vəziyyət", "Əmr №"], rows: rows.map((r) => [dmy(r.created), r.employee.name, r.employee.department, requestKindLabel(r.kind), dmy(r.data.from || ""), dmy(r.data.to || ""), r.source === "employee" ? "işçi" : "HR", ST[r.status] || r.status, r.orderNumber]) };
    } },
  { id: "offboarding", group: "Kadr əməliyyatları", title: "İşdən çıxma prosesləri", description: "Çıxan işçilər, siyahının icrası, qaytarılmamış əmlak və çıxış səbəbləri.", need: "employees", filters: [DEPARTMENT, { id: "status", label: "Vəziyyət", type: "select", options: [["open", "Açıq"], ["closed", "Bağlı"]] }],
    run: async (f) => {
      const d = await get<{ cases: { name: string; position: string; department: string; endDate: string; exitType: string; exitReason: string; status: string; progress: { done: number; total: number }; heldAssets: number; answers: Record<string, string> }[] }>("company/offboarding");
      const rows = d.cases.filter((c) => (!f.department || c.department === f.department) && (!f.status || c.status === f.status));
      return { columns: ["İşçi", "Vəzifə", "Departament", "Çıxış tarixi", "Növ", "Səbəb", "Siyahı", "Qaytarılmayan əmlak", "Müsahibədə səbəb", "Vəziyyət"], rows: rows.map((c) => [c.name, c.position, c.department, dmy(c.endDate), c.exitType, c.exitReason, `${c.progress.done}/${c.progress.total}`, c.heldAssets, c.answers.reason || "", c.status === "open" ? "Açıq" : "Bağlı"]) };
    } },
  { id: "assets", group: "Kadr əməliyyatları", title: "Şirkət əmlakı", description: "Əmlakın siyahısı, kimdə olduğu və dəyəri; vəziyyət və kateqoriya üzrə süzgəc.", need: "employees", filters: [{ id: "status", label: "Vəziyyət", type: "select", options: [["stock", "Anbarda"], ["assigned", "İşçidədir"], ["repair", "Təmirdə"], ["written-off", "Silinib"]] }, { id: "category", label: "Kateqoriya", type: "text" }],
    run: async (f) => {
      const d = await get<{ assets: { name: string; category: string; serial: string; inventoryNo: string; value: number; statusText: string; status: string; holder: string; issuedOn: string }[] }>("company/assets");
      const rows = d.assets.filter((a) => (!f.status || a.status === f.status) && (!f.category || a.category.toLowerCase().includes(f.category.toLowerCase())));
      return { columns: ["Əmlak", "Kateqoriya", "Seriya №", "İnventar №", "Dəyər (AZN)", "Vəziyyət", "İşçi", "Verilib"], rows: rows.map((a) => [a.name, a.category, a.serial, a.inventoryNo, a.value, a.statusText, a.holder, dmy(a.issuedOn)]), totals: ["CƏMİ", `${rows.length} əmlak`, "", "", money(rows.reduce((t, a) => t + a.value, 0)), "", "", ""] };
    } },
  { id: "documents", group: "Kadr əməliyyatları", title: "Sənəd müddətləri", description: "Müddəti bitən və ya bitməyə yaxın sənədlər (vəsiqə, tibbi arayış, sertifikat).", need: "documents", filters: [{ id: "within", label: "Neçə gün ərzində", type: "select", options: [["0", "Müddəti bitmiş"], ["30", "30 gün"], ["60", "60 gün"], ["90", "90 gün"]], initial: "90" }],
    run: async (f) => {
      const d = await get<{ deadlines: { employeeName: string; what: string; date: string; days: number }[] }>("company/doc-registry");
      const limit = Number(f.within || "90");
      const rows = d.deadlines.filter((x) => (limit === 0 ? x.days < 0 : x.days <= limit));
      return { columns: ["İşçi", "Sənəd", "Bitmə tarixi", "Qalan gün"], rows: rows.map((x) => [x.employeeName, x.what, dmy(x.date), x.days]) };
    } },
];

const GROUP_ORDER = ["İşə qəbul", "Kadr və əmək haqqı", "Ştat planı və fakt", "Davamiyyət və vaxt", "İnkişaf", "Kadr əməliyyatları", "Təsdiqlər və jurnal"];

function ReportFrame({ report, notify, onBack, companyName }: { report: Report; notify: Notify; onBack: () => void; companyName: string }) {
  const specs = useMemo(() => report.filters || [], [report.filters]);
  const [values, setValues] = useState<Filters>(() => Object.fromEntries(specs.map((s) => [s.id, s.initial ?? (s.type === "month" ? thisMonth() : s.type === "year" ? thisYear() : "")])));
  const [departments, setDepartments] = useState<string[]>([]);
  const [result, setResult] = useState<{ key: string; data?: Result; error?: string } | null>(null);
  const key = JSON.stringify(values);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  useEffect(() => {
    if (!specs.some((s) => s.type === "department")) return;
    get<{ employees: { department: string }[] }>("company/employees")
      .then((d) => setDepartments([...new Set(d.employees.map((e) => e.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, "az"))))
      .catch(() => undefined);
  }, [specs]);
  const run = report.run;
  const load = useCallback(() => {
    if (!run) return;
    const current = JSON.stringify(values);
    run(values)
      .then((data) => setResult({ key: current, data }))
      .catch((e) => setResult({ key: current, error: (e as Error).message }));
  }, [run, values]);
  useEffect(load, [load]);
  const data = result?.key === key ? result.data ?? null : null;
  const error = result?.key === key ? result.error || "" : "";
  // The period before, side by side (for reports with a month, a year or a date range).
  const [compare, setCompare] = useState(false);
  const types = useMemo(() => Object.fromEntries(specs.map((s) => [s.id, s.type])), [specs]);
  const canCompare = previousFilters(values, types) !== null;
  const prev = useMemo(() => (compare ? previousFilters(values, types) : null), [compare, values, types]);
  const [prevResult, setPrevResult] = useState<{ key: string; data?: Result } | null>(null);
  useEffect(() => {
    if (!run || !prev) return;
    const prevKey = JSON.stringify(prev);
    let live = true;
    run(prev).then((d) => live && setPrevResult({ key: prevKey, data: d })).catch(() => live && setPrevResult({ key: prevKey }));
    return () => { live = false; };
  }, [run, prev]);
  const prevData = prev && prevResult?.key === JSON.stringify(prev) ? prevResult.data ?? null : null;
  const shown = data && compare && prevData ? mergeCompare(data, prevData) : data;
  // A chart of one numeric column, and the table in pages of fifty.
  const [chartOn, setChartOn] = useState(false);
  const [chartCol, setChartCol] = useState(0);
  const numericCols = shown ? shown.columns.map((_, i) => i).filter((i) => i > 0 && shown.rows.some((r) => typeof r[i] === "number")) : [];
  const activeCol = numericCols.includes(chartCol) ? chartCol : numericCols[0] ?? 0;
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [key, compare]);
  const PAGE = 50;
  const pageCount = shown ? Math.max(1, Math.ceil(shown.rows.length / PAGE)) : 1;
  const logUse = (action: "export" | "print") => {
    fetch("/api/joblink/company/reports/log", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ report: report.id, action, filters: values }) }).catch(() => undefined);
  };
  function exportExcel() {
    if (!shown) return;
    logUse("export");
    const bytes = createXlsx(shown.columns, shown.totals ? [...shown.rows, shown.totals] : shown.rows, report.title);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.id}-${today()}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
  function print() {
    if (!shown) return;
    logUse("print");
    const esc = (v: Cell) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const win = window.open("", "_blank");
    if (!win) return notify("Çap pəncərəsi bloklanıb.");
    const filters = specs.map((s) => [s.label, values[s.id]]).filter(([, v]) => v).map(([l, v]) => `${l}: ${v}`).join(" · ");
    const head = shown.columns.map((c) => `<th>${esc(c)}</th>`).join("");
    const rows = shown.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(typeof c === "number" && !Number.isInteger(c) ? c.toFixed(2) : c)}</td>`).join("")}</tr>`).join("");
    const totals = shown.totals ? `<tr class="tot">${shown.totals.map((c) => `<td><b>${esc(c)}</b></td>`).join("")}</tr>` : "";
    win.document.write(`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>${esc(report.title)}</title><style>
      @page{size:A4 landscape;margin:14mm}body{font:12px/1.45 Arial,sans-serif;color:#111;margin:0}
      .top{display:flex;justify-content:space-between;border-bottom:2px solid #1b7f73;padding-bottom:6px;margin-bottom:10px}
      h1{font-size:18px;margin:0}small{color:#555}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}
      th{background:#eef5f3}tr.tot td{background:#f6f6f6}.sign{display:flex;gap:60px;margin-top:36px}.sign div{flex:1;border-top:1px solid #333;padding-top:4px;font-size:11px;color:#444}
      thead{display:table-header-group}tr{page-break-inside:avoid}
    </style></head><body>
      <div class="top"><div><h1>${esc(report.title)}</h1><small>${esc(companyName)}${filters ? ` · ${esc(filters)}` : ""}</small></div><small>${esc(dmy(today()))}</small></div>
      ${shown.note ? `<p><b>${esc(shown.note)}</b></p>` : ""}
      <table><thead><tr>${head}</tr></thead><tbody>${rows}${totals}</tbody></table>
      <p><small>${shown.rows.length} sətir</small></p>
      <div class="sign"><div>Hazırladı (ad, vəzifə, tarix)</div><div>Yoxladı</div><div>Təsdiq etdi</div></div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }
  const set = (id: string, value: string) => setValues({ ...values, [id]: value });
  return (
    <div className="company-page report-frame">
      <div className="section-heading">
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={onBack}><ArrowLeft size={14} /> Hesabatlar</button>
          <h3 style={{ margin: 0 }}>{report.title}</h3>
        </div>
        {report.run && (
          <div className="admin-actions">
            <button type="button" className="secondary report-button" disabled={!shown} onClick={exportExcel}><Download size={14} /> Excel</button>
            <button type="button" className="secondary" disabled={!shown} onClick={print}><Printer size={14} /> Çap / PDF</button>
          </div>
        )}
      </div>
      <p className="muted">{report.description}</p>
      {report.run && <SavedBar reportId={report.id} values={values} onApply={(f) => setValues({ ...Object.fromEntries(specs.map((sp) => [sp.id, sp.initial ?? (sp.type === "month" ? thisMonth() : sp.type === "year" ? thisYear() : "")])), ...f })} notify={notify} />}
      {report.schedulable && <ScheduleBar reportId={report.id} notify={notify} />}
      {specs.length > 0 && (
        <div className="form-grid report-filters">
          {specs.map((s) => (
            <Field key={s.id} label={s.label}>
              {s.type === "department" ? (
                <select value={values[s.id]} onChange={(e) => set(s.id, e.target.value)}><option value="">Hamısı</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select>
              ) : s.type === "select" ? (
                <select value={values[s.id]} onChange={(e) => set(s.id, e.target.value)}><option value="">Hamısı</option>{s.options?.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              ) : s.type === "year" ? (
                <select value={values[s.id]} onChange={(e) => set(s.id, e.target.value)}>{[-2, -1, 0, 1].map((d) => <option key={d} value={String(Number(thisYear()) + d)}>{Number(thisYear()) + d}</option>)}</select>
              ) : s.type === "month" ? (
                <input type="month" value={values[s.id]} onChange={(e) => e.target.value && set(s.id, e.target.value)} />
              ) : s.type === "text" ? (
                <input type="search" value={values[s.id]} onChange={(e) => set(s.id, e.target.value)} />
              ) : (
                <input type="date" value={values[s.id]} onChange={(e) => set(s.id, e.target.value)} />
              )}
            </Field>
          ))}
          {specs.some((s) => values[s.id] && !(s.type === "month" || s.type === "year" || s.initial)) && (
            <button type="button" className="text-button" onClick={() => setValues(Object.fromEntries(specs.map((s) => [s.id, s.initial ?? (s.type === "month" ? thisMonth() : s.type === "year" ? thisYear() : "")])))}>Süzgəcləri təmizlə</button>
          )}
        </div>
      )}
      {report.run ? (
        error ? <p className="danger-text">{error}</p> : !data ? <p className="muted">Hesabat hazırlanır…</p> : (
          <>
            {shown && <>
            {shown.note && <p><b>{shown.note}</b></p>}
            <div className="admin-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
              <span className="muted">{shown.rows.length} sətir</span>
              {canCompare && <button type="button" className={compare ? "primary" : "secondary"} onClick={() => setCompare(!compare)}>{compare ? "Müqayisəni söndür" : "Əvvəlki dövrlə müqayisə"}</button>}
              {numericCols.length > 0 && <button type="button" className={chartOn ? "primary" : "secondary"} onClick={() => setChartOn(!chartOn)}>{chartOn ? "Qrafiki gizlət" : "Qrafik"}</button>}
              {chartOn && numericCols.length > 1 && <select aria-label="Qrafik sütunu" value={activeCol} onChange={(e) => setChartCol(Number(e.target.value))}>{numericCols.map((i) => <option key={i} value={i}>{shown.columns[i]}</option>)}</select>}
              {compare && !prevData && <span className="muted">Əvvəlki dövr yüklənir…</span>}
            </div>
            {chartOn && <ReportChart data={shown} column={activeCol} />}</>}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr>{(shown || data).columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {(shown || data).rows.slice(page * PAGE, (page + 1) * PAGE).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{typeof c === "number" && !Number.isInteger(c) ? c.toFixed(2) : c}</td>)}</tr>)}
                  {(shown || data).totals && page === pageCount - 1 && <tr className="tot">{((shown || data).totals as Cell[]).map((c, j) => <td key={j}><b>{c}</b></td>)}</tr>}
                  {!(shown || data).rows.length && <tr><td colSpan={(shown || data).columns.length}><p className="admin-empty">Seçilmiş süzgəclərə uyğun məlumat yoxdur.</p></td></tr>}
                </tbody>
              </table>
            </div>
            {pageCount > 1 && (
              <div className="admin-actions" style={{ justifyContent: "flex-start" }}>
                <button type="button" className="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Əvvəlki</button>
                <span className="muted">{page + 1} / {pageCount} (səhifədə {PAGE} sətir; Excel hamısını yazır)</span>
                <button type="button" className="secondary" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Sonrakı ›</button>
              </div>
            )}
          </>
        )
      ) : null}
    </div>
  );
}

// The Reports page: every report by name, grouped; a click opens it with its own filters, Excel and print.
export default function ReportsHub({ me, notify, hiring, workforce, companyName = "" }: { me: HubMe; notify: Notify; hiring: ReactNode; workforce: ReactNode; companyName?: string }) {
  const [open, setOpen] = useState("");
  const [query, setQuery] = useState("");
  const allowed = useMemo(() => REPORTS.filter((r) => !r.need || !me || me.permissions.includes(r.need)), [me]);
  const current = REPORTS.find((r) => r.id === open);
  if (current) {
    const special = current.id === "hiring" ? hiring : current.id === "workforce" ? workforce : null;
    return special ? (
      <div className="company-page report-frame">
        <div className="section-heading">
          <div className="admin-actions"><button type="button" className="secondary" onClick={() => setOpen("")}><ArrowLeft size={14} /> Hesabatlar</button><h3 style={{ margin: 0 }}>{current.title}</h3></div>
        </div>
        <p className="muted">{current.description}</p>
        {special}
      </div>
    ) : current.render ? (
      <div className="company-page report-frame">
        <div className="section-heading"><div className="admin-actions"><button type="button" className="secondary" onClick={() => setOpen("")}><ArrowLeft size={14} /> Hesabatlar</button></div></div>
        {current.render({ me, notify })}
      </div>
    ) : (
      <ReportFrame key={current.id} report={current} notify={notify} onBack={() => setOpen("")} companyName={companyName} />
    );
  }
  const q = query.trim().toLowerCase();
  const list = allowed.filter((r) => !q || `${r.title} ${r.description} ${r.group}`.toLowerCase().includes(q));
  return (
    <div className="company-page reports-hub">
      <div className="section-heading">
        <p className="muted">Hesabatın adına basın: açılır, öz süzgəcləri (dövr, departament, vəziyyət və s.) ilə baxılır, Excel və ya çap kimi çıxarılır.</p>
        <input type="search" placeholder="Hesabat axtar" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Hesabat axtar" />
      </div>
      {GROUP_ORDER.map((group) => {
        const items = list.filter((r) => r.group === group);
        if (!items.length) return null;
        return (
          <section key={group} className="panel">
            <h3>{group}</h3>
            <div className="report-list">
              {items.map((r) => (
                <button key={r.id} type="button" className="report-card" onClick={() => setOpen(r.id)}>
                  <FileBarChart size={18} />
                  <span><b>{r.title}</b><small>{r.description}</small></span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
      {!list.length && <p className="admin-empty">Hesabat tapılmadı.</p>}
      {(!me || me.permissions.includes("payroll")) && <FeedKeyPanel notify={notify} />}
    </div>
  );
}
