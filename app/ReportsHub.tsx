"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Download, FileBarChart, Printer } from "lucide-react";
import { ATTENDANCE_CODES } from "@/lib/calendar-az";
import { requestKindLabel } from "@/lib/requests";
import { createXlsx } from "@/lib/xlsx";
import { Field } from "./components";
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

  { id: "fund", group: "Kadr və əmək haqqı", title: "Kadr və əmək haqqı fondu", description: "Departament üzrə işçi, plan, büdcə ilə fond, məzuniyyət borcu və dövriyyə; il üzrə süzgəc.", need: "payroll", render: ({ notify }) => <HrFundReport notify={notify} /> },
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
  { id: "workforce", group: "Kadr və əmək haqqı", title: "İşçi axını və dövriyyə", description: "İşə qəbul, ayrılma, işçi sayı və dövriyyə faizi; dövr üzrə süzgəc.", need: "reports" },

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

const GROUP_ORDER = ["İşə qəbul", "Kadr və əmək haqqı", "Davamiyyət və vaxt", "İnkişaf", "Kadr əməliyyatları"];

function ReportFrame({ report, notify, onBack }: { report: Report; notify: Notify; onBack: () => void }) {
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
  function exportExcel() {
    if (!data) return;
    const bytes = createXlsx(data.columns, data.totals ? [...data.rows, data.totals] : data.rows, report.title);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.id}-${today()}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
  function print() {
    if (!data) return;
    const esc = (v: Cell) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const win = window.open("", "_blank");
    if (!win) return notify("Çap pəncərəsi bloklanıb.");
    const shown = specs.map((s) => [s.label, values[s.id]]).filter(([, v]) => v).map(([l, v]) => `${l}: ${v}`).join(" · ");
    win.document.write(`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>${esc(report.title)}</title><style>body{font:12px/1.4 Arial,sans-serif;margin:18px;color:#17332b}h1{font-size:17px;margin:0}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #cdd9d3;padding:3px 6px;text-align:left}th{background:#eef4f1}p{margin:4px 0}</style></head><body><h1>${esc(report.title)}</h1><p>${esc(shown || "Süzgəcsiz")} · hazırlanıb ${dmy(today())}</p>${data.note ? `<p>${esc(data.note)}</p>` : ""}<table><thead><tr>${data.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${[...data.rows, ...(data.totals ? [data.totals] : [])].map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
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
            <button type="button" className="secondary report-button" disabled={!data} onClick={exportExcel}><Download size={14} /> Excel</button>
            <button type="button" className="secondary" disabled={!data} onClick={print}><Printer size={14} /> Çap</button>
          </div>
        )}
      </div>
      <p className="muted">{report.description}</p>
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
            {data.note && <p><b>{data.note}</b></p>}
            <p className="muted">{data.rows.length} sətir</p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr>{data.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {data.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{typeof c === "number" && !Number.isInteger(c) ? c.toFixed(2) : c}</td>)}</tr>)}
                  {data.totals && <tr className="tot">{data.totals.map((c, j) => <td key={j}><b>{c}</b></td>)}</tr>}
                  {!data.rows.length && <tr><td colSpan={data.columns.length}><p className="admin-empty">Seçilmiş süzgəclərə uyğun məlumat yoxdur.</p></td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : null}
    </div>
  );
}

// The Reports page: every report by name, grouped; a click opens it with its own filters, Excel and print.
export default function ReportsHub({ me, notify, hiring, workforce }: { me: HubMe; notify: Notify; hiring: ReactNode; workforce: ReactNode }) {
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
      <ReportFrame key={current.id} report={current} notify={notify} onBack={() => setOpen("")} />
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
    </div>
  );
}
