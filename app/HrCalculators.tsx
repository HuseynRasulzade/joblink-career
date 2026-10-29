"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as hr from "@/lib/hr-calc";
import { calculateFromGross } from "@/lib/salary";
import { SalaryCalculator } from "./SalaryCalculator";
import { createXlsx } from "@/lib/xlsx";
import { ageOn, type EmployeeProfile } from "@/lib/employee-profile";
import { Field } from "./components";

const azn = (v: number) => `${v.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
const today = () => new Date().toISOString().slice(0, 10);

// An employee of the company, as the employees page returns it.
type Emp = {
  id: string;
  name: string;
  position: string;
  department: string;
  startDate: string;
  status: string;
  salary: number | null;
  salaryType?: "gross" | "net";
  sector?: "private" | "public";
  vacationDays?: number;
  vacationUsed?: number;
  vacation?: { remaining: number; used: number };
  pay?: { gross: number; net: number } | null;
  taxReduction?: number;
  profile?: EmployeeProfile | null;
};
const empLabel = (e: Emp) => `${e.name} — ${e.position || "vəzifəsiz"}${e.department ? ` (${e.department})` : ""}`;
const grossOf = (e?: Emp | null) => e?.pay?.gross || 0;
const yearsSince = (start?: string) => (start ? Math.max(0, Math.round(((Date.now() - new Date(`${start}T00:00:00Z`).getTime()) / (365.25 * 86_400_000)) * 10) / 10) : 0);

// What the result panel needs to print or save the calculation.
type ExportContext = { title: string; employee: string; inputs: () => [string, string][] };
const Export = createContext<ExportContext>({ title: "", employee: "", inputs: () => [] });
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function exportLines(ctx: ExportContext, rows: [string, ReactNode, boolean?][], articles: string[], notes: string[]) {
  const results = rows.map(([label, value]) => [label, typeof value === "string" || typeof value === "number" ? String(value) : ""] as [string, string]);
  return { inputs: ctx.inputs(), results, basis: `Əmək Məcəlləsi / Vergi Məcəlləsi, maddə ${articles.join(", ")}`, notes };
}
function saveXlsx(ctx: ExportContext, rows: [string, ReactNode, boolean?][], articles: string[], notes: string[]) {
  const { inputs, results, basis } = exportLines(ctx, rows, articles, notes);
  const sheet: (string | number)[][] = [
    ["Hesablama", ctx.title],
    ["İşçi", ctx.employee || "—"],
    ["Tarix", today()],
    ["", ""],
    ["Daxil edilən məlumat", ""],
    ...inputs,
    ["", ""],
    ["Nəticə", ""],
    ...results,
    ["", ""],
    ["Əsas", basis],
    ...notes.map((n) => ["Qeyd", n] as [string, string]),
  ];
  const bytes = createXlsx(["Göstərici", "Dəyər"], sheet, ctx.title.slice(0, 28));
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  const ascii = ctx.title.toLocaleLowerCase("az").replace(/[əıöüçşğ]/g, (ch) => ({ ə: "e", ı: "i", ö: "o", ü: "u", ç: "c", ş: "s", ğ: "g" })[ch] || ch);
  link.download = `hesablama-${ascii.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${today()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
// A printable page; "Save as PDF" in the print window makes the PDF file.
function printPage(ctx: ExportContext, rows: [string, ReactNode, boolean?][], articles: string[], notes: string[]) {
  const { inputs, results, basis } = exportLines(ctx, rows, articles, notes);
  const table = (list: [string, string][]) => `<table>${list.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</table>`;
  const win = window.open("", "_blank");
  if (!win) {
    window.alert("Çap pəncərəsi bloklanıb. Brauzerdə bu sayt üçün pəncərəyə icazə verin.");
    return;
  }
  win.document.write(`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>${esc(ctx.title)}</title><style>
    body{font:14px/1.5 Arial,sans-serif;color:#17332b;max-width:760px;margin:24px auto;padding:0 16px}
    h1{font-size:20px;margin:0 0 4px} h2{font-size:15px;margin:20px 0 6px} table{width:100%;border-collapse:collapse}
    td{border-bottom:1px solid #dfe8e3;padding:6px 8px;vertical-align:top} td:last-child{text-align:right;font-weight:600}
    p{font-size:12px;color:#556;margin:6px 0} .sign{margin-top:36px;display:flex;justify-content:space-between;font-size:13px}
  </style></head><body>
    <h1>${esc(ctx.title)}</h1>
    <p>Tarix: ${today()}${ctx.employee ? ` · İşçi: ${esc(ctx.employee)}` : ""}</p>
    <h2>Daxil edilən məlumat</h2>${table(inputs)}
    <h2>Nəticə</h2>${table(results)}
    <p>Əsas: ${esc(basis)}.</p>${notes.map((n) => `<p>${esc(n)}</p>`).join("")}
    <p>Hesablama məlumat xarakterlidir; rəsmi sənədləşmədən əvvəl mühasib və ya hüquqşünasla yoxlayın.</p>
    <div class="sign"><span>Hazırladı: ____________</span><span>Təsdiq etdi: ____________</span></div>
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

// One number is taken as the pay of every month, several numbers as the months one by one.
const parseMonths = (text: string) => {
  const list = text
    .split(/[\s,;]+/)
    .map((part) => Number(part.replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n >= 0);
  return list.length === 1 ? Array(12).fill(list[0]) : list;
};

function Num({ label, value, onChange, step, min = 0 }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return (
    <Field label={label}>
      <input type="number" min={min} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}
function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}
function Result({ rows, articles, notes }: { rows: [string, ReactNode, boolean?][]; articles: string[]; notes: string[] }) {
  const ctx = useContext(Export);
  return (
    <section className="panel calc-result">
      <div className="admin-actions calc-export">
        <button type="button" className="secondary" onClick={() => printPage(ctx, rows, articles, notes)}>Çap et / PDF</button>
        <button type="button" className="secondary" onClick={() => saveXlsx(ctx, rows, articles, notes)}>Excel (.xlsx)</button>
      </div>
      <table className="admin-table">
        <tbody>
          {rows.map(([label, value, strong]) => (
            <tr key={label} className={strong ? "calc-strong" : undefined}>
              <td>{label}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted fine-print">Əsas: Əmək Məcəlləsi / Vergi Məcəlləsi, maddə {articles.join(", ")}.</p>
      {notes.map((n) => (
        <p key={n} className="muted fine-print">{n}</p>
      ))}
    </section>
  );
}
function Layout({ title, children, result, employee }: { title: string; children: ReactNode; result: ReactNode; employee?: Emp | null }) {
  const form = useRef<HTMLElement>(null);
  const inputs = (): [string, string][] => {
    const out: [string, string][] = [];
    form.current?.querySelectorAll("label").forEach((label) => {
      const control = label.querySelector("input, select, textarea") as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (!control) return;
      if (control instanceof HTMLInputElement && control.type === "checkbox") out.push([label.textContent?.trim() || "", control.checked ? "Bəli" : "Xeyr"]);
      else {
        const text = control instanceof HTMLSelectElement ? control.selectedOptions[0]?.textContent || "" : control.value;
        out.push([label.querySelector("span")?.textContent?.trim() || "", text.trim()]);
      }
    });
    return out;
  };
  const ctx: ExportContext = { title, employee: employee ? empLabel(employee) : "", inputs };
  return (
    <Export.Provider value={ctx}>
      <div className="calc-page">
        <section className="panel calc-form" ref={form}>
          <h3>{title}{employee ? ` — ${employee.name}` : ""}</h3>
          <div className="form-grid">{children}</div>
        </section>
        {result}
      </div>
    </Export.Provider>
  );
}

function Vacation({ emp }: { emp: Emp | null }) {
  const [extended, setExtended] = useState(false);
  const profile = emp?.profile;
  const [tenure, setTenure] = useState(emp ? yearsSince(emp.startDate) : 3);
  const [kids, setKids] = useState(profile?.childrenUnder14 || 0);
  const [childRight, setChildRight] = useState(Boolean(profile && (profile.gender === "female" || profile.soleParent)));
  const [disabledChild, setDisabledChild] = useState(Boolean(profile && (profile.hasDisabledChild || profile.disabledChildren > 0)));
  const years = profile?.birthDate ? ageOn(profile.birthDate, today()) : null;
  const [age, setAge] = useState(years ?? 30);
  const [disabledMinor, setDisabledMinor] = useState(Boolean(profile && (profile.disability || profile.disabilityDegree) && years !== null && years < 18));
  const [harmful, setHarmful] = useState(0);
  const [start, setStart] = useState(today());
  const [earnings, setEarnings] = useState(String(grossOf(emp) || 1500));
  const [daysText, setDaysText] = useState("");
  const e = hr.vacationEntitlement({ extendedMain: extended, tenureYears: tenure, childrenUnder14: kids, eligibleForChildLeave: childRight, hasDisabledChild: disabledChild, harmfulConditionsDays: harmful, age, disabledMinor });
  const days = daysText === "" ? e.total : Number(daysText);
  const dates = useMemo(() => hr.vacationDates(start, days), [start, days]);
  const pay = hr.vacationPay(parseMonths(earnings), days, start);
  return (
    <Layout
      employee={emp}
      title="Məzuniyyət müddəti və məzuniyyət pulu"
      result={
        <Result
          articles={[...e.articles, ...pay.articles]}
          notes={[...e.notes, ...pay.notes]}
          rows={[
            ["Əsas məzuniyyət", `${e.main} gün`],
            ["Staja görə əlavə", `${e.byTenure} gün`],
            ["Uşaqlı qadın/təkvalideynə görə əlavə", `${e.byChildren} gün`],
            ["Zərərli şəraitə görə əlavə", `${e.harmful} gün`],
            ["Cəmi məzuniyyət hüququ", `${e.total} gün`, true],
            ["Hesablanan gün sayı", `${days} gün`],
            ["Bayram günləri (sayılmır)", dates ? `${dates.holidays.length} gün${dates.holidays.length ? ` (${dates.holidays.map((h) => h.date.slice(5)).join(", ")})` : ""}` : "—"],
            ["Məzuniyyətin son günü", dates?.end || "—"],
            ["İşə çıxış tarixi", dates?.returnDate || "—", true],
            ["Orta aylıq əmək haqqı", azn(pay.averageMonthly)],
            ["Bir günlük (÷ 30,4)", azn(pay.dailyRate)],
            ["Məzuniyyət pulu", azn(pay.pay), true],
            ["Ən geci ödəniş tarixi", pay.payBy || "—"],
          ]}
        />
      }
    >
      <Num label="Əmək stajı (il)" value={tenure} step={0.5} onChange={setTenure} />
      <Field label="Əsas məzuniyyət">
        <select value={extended ? "30" : "21"} onChange={(ev) => setExtended(ev.target.value === "30")}>
          <option value="21">21 gün (ümumi)</option>
          <option value="30">30 gün (rəhbər, mütəxəssis, həkim və s.)</option>
        </select>
      </Field>
      <Num label="İşçinin yaşı" value={age} onChange={setAge} />
      <Check label="18 yaşınadək əlilliyi olan işçi (Əmək Məcəlləsi 119.2: 42 gün)" value={disabledMinor} onChange={setDisabledMinor} />
      <Num label="14 yaşınadək uşaq sayı" value={kids} onChange={setKids} />
      <Check label="Qadın / təkbaşına böyüdən ata / övladlığa götürən" value={childRight} onChange={setChildRight} />
      <Check label="Əlilliyi olan uşaq var" value={disabledChild} onChange={setDisabledChild} />
      <Num label="Zərərli şərait əlavəsi (gün)" value={harmful} onChange={setHarmful} />
      <Field label="Məzuniyyətin başlanğıcı"><input type="date" value={start} onChange={(ev) => setStart(ev.target.value)} /></Field>
      <Field label="Verilən gün (boş = hüquq qədər)">
        <input type="number" min={1} value={daysText} placeholder={String(e.total)} onChange={(ev) => setDaysText(ev.target.value)} />
      </Field>
      <Field label="Əvvəlki 12 ayın əmək haqqı (bir rəqəm = hər ay; və ya vergüllə)">
        <input value={earnings} onChange={(ev) => setEarnings(ev.target.value)} />
      </Field>
    </Layout>
  );
}

function Unused({ emp }: { emp: Emp | null }) {
  const [hire, setHire] = useState(emp?.startDate || "2024-03-01");
  const [end, setEnd] = useState(today());
  const [main, setMain] = useState(emp?.vacationDays ?? 21);
  const [used, setUsed] = useState(emp?.vacation?.used ?? emp?.vacationUsed ?? 0);
  const [earnings, setEarnings] = useState(String(grossOf(emp) || 1500));
  const r = hr.unusedLeaveCompensation({ hireDate: hire, endDate: end, mainLeaveDays: main, usedDays: used, monthlyEarnings: parseMonths(earnings) });
  return (
    <Layout
      employee={emp}
      title="İstifadə edilməmiş məzuniyyət kompensasiyası"
      result={
        r ? (
          <Result
            articles={r.articles}
            notes={r.notes}
            rows={[
              ["Tam iş ili", `${r.fullYears}`],
              ["Yarımçıq ilin günü", `${r.partialDays} gün`],
              ["Hüquq yaranan gün", `${r.earnedDays} gün`],
              ["İstifadə edilən", `${r.usedDays} gün`],
              ["İstifadə edilməyən", `${r.unusedDays} gün`, true],
              ["Bir günlük məbləğ", azn(r.dailyRate)],
              ["Kompensasiya", azn(r.compensation), true],
            ]}
          />
        ) : (
          <p className="muted">Tarixləri düzgün daxil edin.</p>
        )
      }
    >
      <Field label="İşə qəbul tarixi"><input type="date" value={hire} onChange={(e) => setHire(e.target.value)} /></Field>
      <Field label="İşdən çıxma tarixi"><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      <Num label="İllik əsas məzuniyyət (gün)" value={main} onChange={setMain} />
      <Num label="Artıq istifadə edilən gün" value={used} onChange={setUsed} />
      <Field label="Son 12 ayın əmək haqqı (bir rəqəm = hər ay)"><input value={earnings} onChange={(e) => setEarnings(e.target.value)} /></Field>
    </Layout>
  );
}

function Average({ emp }: { emp: Emp | null }) {
  const [earnings, setEarnings] = useState(grossOf(emp) ? grossOf(emp) * 2 : 3000);
  const [workDays, setWorkDays] = useState(43);
  const [paid, setPaid] = useState(5);
  const [last, setLast] = useState(grossOf(emp) ? Math.round((grossOf(emp) / 22) * 100) / 100 : 0);
  const [floor, setFloor] = useState(false);
  const r = hr.averageDailyEarnings({ earnings, workingDays: workDays, paidDays: paid, lastDailyPay: last, floorToLastDay: floor });
  return (
    <Layout
      employee={emp}
      title="Orta əmək haqqı (ezamiyyət, donor günü, məhkəmə və s.)"
      result={
        <Result
          articles={r.articles}
          notes={r.notes}
          rows={[
            ["Bir günlük orta əmək haqqı", azn(r.dailyRate)],
            ["Əmək haqqı saxlanılan iş günü", `${r.paidDays}`],
            ["Ödəniləcək məbləğ", azn(r.pay), true],
            ...(r.floorApplied ? ([["Qeyd", "Sonuncu bir günlük əmək haqqı tətbiq edildi"]] as [string, ReactNode][]) : []),
          ]}
        />
      }
    >
      <Num label="Əvvəlki 2 ayın əmək haqqı cəmi (AZN)" value={earnings} onChange={setEarnings} />
      <Num label="O aylardakı iş günü sayı" value={workDays} onChange={setWorkDays} />
      <Num label="Əmək haqqı saxlanılan iş günü" value={paid} onChange={setPaid} />
      <Num label="Sonuncu bir günlük əmək haqqı" value={last} onChange={setLast} />
      <Check label="Sonuncu gündən aşağı olmasın (177.3-1)" value={floor} onChange={setFloor} />
    </Layout>
  );
}

function Termination({ emp }: { emp: Emp | null }) {
  const [tenure, setTenure] = useState(emp ? yearsSince(emp.startDate) : 3);
  const [average, setAverage] = useState(grossOf(emp) || 1500);
  const [reason, setReason] = useState<hr.TerminationReason>("reduction");
  const [noticeDate, setNoticeDate] = useState(today());
  const t = hr.termination({ tenureYears: tenure, averageMonthly: average, reason });
  return (
    <Layout
      employee={emp}
      title="İxtisar, işdənçıxarma müavinəti və xəbərdarlıq"
      result={
        <Result
          articles={[...t.articles, "69.1"]}
          notes={t.notes}
          rows={[
            ["Xəbərdarlıq müddəti", t.noticeWeeks ? `azı ${t.noticeWeeks} təqvim həftəsi` : "—"],
            ["Müavinət əmsalı", t.severanceMultiplier ? `${t.severanceMultiplier} × orta aylıq` : "—"],
            ["İşdənçıxarma müavinəti (minimum)", azn(t.severance), true],
            ["Xəbərdarlıq əvəzi birdəfəlik ödəniş (işçinin razılığı ilə)", t.noticeWeeks ? `${azn(t.noticePay)} (${t.noticeMultiplier} × orta aylıq)` : "—"],
            ["İşçi ərizə verərsə: ən tez xitam", hr.resignationDate(noticeDate) || "—"],
            ["Sınaq müddətinin həddi", (() => { const p = hr.probationLimit(null); return `${p.value} ${p.unit} (6 aya qədər müqavilədə 2 həftə)`; })()],
          ]}
        />
      }
    >
      <Num label="İşəgötürəndə əmək stajı (il)" value={tenure} step={0.5} onChange={setTenure} />
      <Num label="Orta aylıq əmək haqqı (AZN)" value={average} onChange={setAverage} />
      <Field label="Xitam əsası">
        <select value={reason} onChange={(e) => setReason(e.target.value as hr.TerminationReason)}>
          <option value="reduction">Ştatların / işçi sayının ixtisarı</option>
          <option value="liquidation">Müəssisənin ləğvi</option>
          <option value="other">Digər əsas</option>
        </select>
      </Field>
      <Field label="Ərizə tarixi (işçi təşəbbüsü ilə)"><input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} /></Field>
    </Layout>
  );
}

function ExtraWork({ emp }: { emp: Emp | null }) {
  const [salary, setSalary] = useState(grossOf(emp) || 1600);
  const [norm, setNorm] = useState(168);
  const [over, setOver] = useState(2);
  const [rest, setRest] = useState(8);
  const [within, setWithin] = useState(true);
  const [night, setNight] = useState(0);
  const [percent, setPercent] = useState(0);
  const [tariff, setTariff] = useState(grossOf(emp) || 1600);
  const o = hr.overtimePay({ monthlySalary: salary, normHours: norm, hours: over });
  const d = hr.restDayPay({ monthlySalary: salary, normHours: norm, hours: rest, withinMonthlyNorm: within });
  const n = hr.nightPay({ monthlySalary: salary, normHours: norm, nightHours: night, supplementPercent: percent });
  const idle = hr.twoThirdsPay(tariff, "downtime");
  return (
    <Layout
      employee={emp}
      title="İş vaxtından artıq, istirahət günü, gecə işi və boşdayanma"
      result={
        <Result
          articles={["164", "165", "166", "169", "100"]}
          notes={[...o.notes, ...d.notes, ...n.notes, "Bir saatın dəyəri aylıq maaşın aylıq norma saatına bölünməsi ilə götürülür — Məcəllə bölmə qaydasını yazmır, adi mühasibat təcrübəsidir. Norma saatını istehsalat təqvimindən götürün."]}
          rows={[
            ["Saatlıq maaş", azn(o.rate.hourly)],
            ["Gündəlik maaş", azn(o.rate.daily)],
            ["İş vaxtından artıq iş (2 qat)", azn(o.total), true],
            ["İstirahət/bayram günü işi (maaşa əlavə)", azn(d.extra), true],
            ["Gecə işinə əlavə", azn(n.extra), true],
            ["Boşdayanma (2/3)", azn(idle.amount), true],
          ]}
        />
      }
    >
      <Num label="Aylıq maaş (AZN)" value={salary} onChange={setSalary} />
      <Num label="Aylıq iş vaxtı norması (saat)" value={norm} onChange={setNorm} />
      <Num label="İş vaxtından artıq saat" value={over} step={0.5} onChange={setOver} />
      <Num label="İstirahət/bayram günü işlənən saat" value={rest} step={0.5} onChange={setRest} />
      <Check label="İş aylıq norma çərçivəsindədir" value={within} onChange={setWithin} />
      <Num label="Gecə saatı (22:00–06:00)" value={night} step={0.5} onChange={setNight} />
      <Num label="Gecə əlavəsi (%) — müqavilədə" value={percent} onChange={setPercent} />
      <Num label="Tarif (vəzifə) maaşı — boşdayanma" value={tariff} onChange={setTariff} />
    </Layout>
  );
}

function Deductions({ emp }: { emp: Emp | null }) {
  const [due, setDue] = useState(emp?.pay?.net || 1000);
  const [kind, setKind] = useState<hr.DeductionKind>("general");
  const [percent, setPercent] = useState("");
  const r = hr.deductionLimit(due, kind, percent === "" ? null : Number(percent));
  const [salary, setSalary] = useState(grossOf(emp) || 1500);
  const [worked, setWorked] = useState(15);
  const [normDays, setNormDays] = useState(22);
  return (
    <Layout
      employee={emp}
      title="Tutulmaların həddi və yarımçıq ay"
      result={
        <Result
          articles={[...r.articles, "171"]}
          notes={r.notes}
          rows={[
            ["Qanunun həddi (maksimum)", `${Math.round(r.maxShare * 100)}%`],
            ["Tətbiq olunan faiz", `${Math.round(r.share * 10000) / 100}%${r.capped ? " (həddə endirildi)" : ""}`],
            ["Tutulan məbləğ", azn(r.maximum), true],
            ["İşçidə qalmalı", azn(r.left)],
            ["Yarımçıq ay üçün əmək haqqı", azn(hr.proratedSalary(salary, worked, normDays)), true],
          ]}
        />
      }
    >
      <Num label="İşçiyə verilməli əmək haqqı (AZN)" value={due} onChange={setDue} />
      <Field label="Tutulma növü">
        <select value={kind} onChange={(e) => setKind(e.target.value as hr.DeductionKind)}>
          <option value="general">Ümumi hal (20%)</option>
          <option value="writ">İcra sənədləri (50%)</option>
          <option value="alimony">Aliment, sağlamlığa/cinayət zərəri (70%)</option>
        </select>
      </Field>
      <Field label="Tutulma faizi (boş = qanunun həddi qədər)">
        <input type="number" min={0} max={100} step={0.5} value={percent} placeholder={String(Math.round(r.maxShare * 100))} onChange={(e) => setPercent(e.target.value)} />
      </Field>
      <Num label="Aylıq maaş" value={salary} onChange={setSalary} />
      <Num label="İşlənmiş iş günü" value={worked} onChange={setWorked} />
      <Num label="Aydakı norma iş günü" value={normDays} onChange={setNormDays} />
    </Layout>
  );
}

function Taxes({ emp }: { emp: Emp | null }) {
  const [amount, setAmount] = useState(1180);
  const [mode, setMode] = useState<"add" | "extract">("extract");
  const [turnover, setTurnover] = useState(10000);
  const [rate, setRate] = useState(2);
  const v = hr.vat(amount, mode);
  return (
    <Layout
      employee={emp}
      title="ƏDV, sadələşdirilmiş vergi, sahibkar gəlir vergisi"
      result={
        <Result
          articles={["173.1", "220", "101.3"]}
          notes={["ƏDV dərəcəsi 18%; sadələşdirilmiş vergi 2% (xüsusi hallarda 6–8%); vergi uçotunda olan fərdi sahibkarın gəlirindən 20%."]}
          rows={[
            ["ƏDV-siz məbləğ", azn(v.net)],
            ["ƏDV (18%)", azn(v.vat), true],
            ["ƏDV-li məbləğ", azn(v.gross)],
            ["Sadələşdirilmiş vergi", azn(hr.simplifiedTax(turnover, rate).tax), true],
            ["Sahibkar gəlir vergisi (20%)", azn(hr.entrepreneurIncomeTax(turnover).tax)],
          ]}
        />
      }
    >
      <Num label="Məbləğ (ƏDV üçün)" value={amount} onChange={setAmount} />
      <Field label="ƏDV">
        <select value={mode} onChange={(e) => setMode(e.target.value as "add" | "extract")}>
          <option value="extract">Məbləğin içindən ayır</option>
          <option value="add">Məbləğin üstünə əlavə et</option>
        </select>
      </Field>
      <Num label="Dövriyyə / vergiyə cəlb olunan gəlir" value={turnover} onChange={setTurnover} />
      <Num label="Sadələşdirilmiş vergi dərəcəsi (%)" value={rate} step={0.5} onChange={setRate} />
    </Layout>
  );
}

function WorkDays({ emp }: { emp: Emp | null }) {
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [start, setStart] = useState(emp?.startDate && emp.startDate > yearStart ? emp.startDate : yearStart);
  const [end, setEnd] = useState(`${new Date().getFullYear()}-12-31`);
  const r = hr.workingDaysBetween(start, end);
  return (
    <Layout
      employee={emp}
      title="İş günləri (istehsalat təqvimi)"
      result={
        r ? (
          <Result
            articles={["89", "104", "105"]}
            notes={["Bayram günləri və istirahət günlərinə təsadüf edən bayramların keçirildiyi günlər iş günü sayılmır. Qısaldılmış (bayram qabağı) günlər iş günü sayılır."]}
            rows={[
              ["Təqvim günü", `${r.calendarDays}`],
              ["İş günü", `${r.workDays}`, true],
              ["İstirahət günü", `${r.weekendDays}`],
              ["Bayram və qeyri-iş günü", `${r.holidayDays}`],
              ["İş saatı (8 saat × iş günü)", `${r.hours}`],
            ]}
          />
        ) : (
          <p className="muted">Tarixləri düzgün daxil edin.</p>
        )
      }
    >
      <Field label="Başlanğıc"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <Field label="Son"><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
    </Layout>
  );
}

function Maternity({ emp }: { emp: Emp | null }) {
  const [expected, setExpected] = useState(today());
  const [actual, setActual] = useState("");
  const [hard, setHard] = useState(false);
  const [multiple, setMultiple] = useState(false);
  const [agri, setAgri] = useState(false);
  const [earnings, setEarnings] = useState(String(grossOf(emp) || 1500));
  const [percent, setPercent] = useState(hr.MATERNITY_BENEFIT_PERCENT);
  const r = hr.maternityLeave({ expectedBirth: expected, actualBirth: actual, hardBirth: hard, multiple, agriculture: agri });
  const benefit = r ? hr.insuranceBenefit(parseMonths(earnings), r.totalDays, percent, "maternity") : null;
  return (
    <Layout
      employee={emp}
      title="Hamiləlik və doğuş məzuniyyəti və müavinəti"
      result={
        r && benefit ? (
          <Result
            articles={[...r.articles, ...benefit.articles]}
            notes={[...r.notes.filter((n) => !n.startsWith("Müavinətin məbləği")), ...benefit.notes]}
            rows={[
              ["Məzuniyyətin başlanğıcı", r.start],
              ["Doğuşdan əvvəl", `${r.beforeDays} gün`],
              ["Doğuşdan sonra", `${r.afterDays} gün`],
              ["Cəmi", `${r.totalDays} gün`, true],
              ["Son gün", r.end],
              ["İşə çıxış", r.returnDate, true],
              ["Ata üçün ödənişli məzuniyyət", `${hr.PATERNITY_LEAVE_DAYS} gün`],
              ["Orta aylıq əmək haqqı", azn(benefit.averageMonthly)],
              ["Bir günlük müavinət", azn(benefit.benefitDaily)],
              ["Hamiləlik və doğuş müavinəti", azn(benefit.amount), true],
            ]}
          />
        ) : (
          <p className="muted">Gözlənilən doğuş tarixini daxil edin.</p>
        )
      }
    >
      <Field label="Gözlənilən doğuş tarixi"><input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></Field>
      <Field label="Faktiki doğuş tarixi (məlumdursa)"><input type="date" value={actual} onChange={(e) => setActual(e.target.value)} /></Field>
      <Check label="Çətin doğuş" value={hard} onChange={setHard} />
      <Check label="İki və daha çox uşaq" value={multiple} onChange={setMultiple} />
      <Check label="Kənd təsərrüfatı istehsalında çalışır" value={agri} onChange={setAgri} />
      <Field label="Son 12 ayın əmək haqqı (vergiyə cəlb olunan, aylıq; vergül/boşluqla ayırın)"><input value={earnings} onChange={(e) => setEarnings(e.target.value)} /></Field>
      <Field label="Müavinətin faizi (%)"><input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} /></Field>
    </Layout>
  );
}

function Sick({ emp }: { emp: Emp | null }) {
  const [start, setStart] = useState(today());
  const [days, setDays] = useState(7);
  const [earnings, setEarnings] = useState(String(grossOf(emp) || 1500));
  const [percent, setPercent] = useState(hr.SICK_BENEFIT_PERCENT);
  const b = hr.insuranceBenefit(parseMonths(earnings), days, percent, "sick");
  const end = days > 0 ? hr.addDays(start, days - 1) : "";
  return (
    <Layout
      employee={emp}
      title="Xəstəlik (müvəqqəti əmək qabiliyyətsizliyi) müavinəti"
      result={
        <Result
          articles={b.articles}
          notes={b.notes}
          rows={[
            ["Xəstəlik dövrü", end ? `${start} – ${end}` : "—"],
            ["Təqvim günü", `${b.days} gün`],
            ["Orta aylıq əmək haqqı", azn(b.averageMonthly)],
            ["Bir günlük orta (÷ 30,4)", azn(b.dailyRate)],
            ["Bir günlük müavinət", azn(b.benefitDaily)],
            ["Müavinət", azn(b.amount), true],
          ]}
        />
      }
    >
      <Field label="Xəstəliyin başlanğıcı"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <Field label="Təqvim günü"><input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
      <Field label="Son 12 ayın əmək haqqı (vergiyə cəlb olunan, aylıq; vergül/boşluqla ayırın)"><input value={earnings} onChange={(e) => setEarnings(e.target.value)} /></Field>
      <Field label="Müavinətin faizi (%)"><input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} /></Field>
    </Layout>
  );
}

function Service({ emp }: { emp: Emp | null }) {
  const [text, setText] = useState(emp?.startDate ? `${emp.startDate} – ${today()}` : "2018-03-01 – 2021-05-31\n2022-01-10 – 2026-01-09");
  const periods = text
    .split(/\n/)
    .map((line) => line.match(/(\d{4}-\d{2}-\d{2})\D+(\d{4}-\d{2}-\d{2})/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => ({ start: m[1], end: m[2] }));
  const r = hr.serviceLength(periods);
  return (
    <Layout
      employee={emp}
      title="İş stajı"
      result={
        <Result
          articles={["116", "132"]}
          notes={["Əmək məzuniyyətinə görə staj bir işəgötürəndə faktiki işlənmiş dövrdən və əmək qabiliyyətinin müvəqqəti itirildiyi, orta əmək haqqı saxlanılan dövrlərdən ibarətdir. Pensiya stajı başqa qaydalarla hesablanır."]}
          rows={[
            ["Dövr sayı", `${periods.length}`],
            ["Cəmi staj", r.text, true],
            ["Məzuniyyətə görə əlavə gün", `${hr.tenureLeaveDays(r.totalDays / 360)} gün`],
          ]}
        />
      }
    >
      <Field label="Hər sətirdə bir dövr: 2020-01-01 – 2022-06-30">
        <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
    </Layout>
  );
}

function Settlement({ emp }: { emp: Emp | null }) {
  const [salary, setSalary] = useState(grossOf(emp) || 1500);
  const [worked, setWorked] = useState(10);
  const [norm, setNorm] = useState(22);
  const [unused, setUnused] = useState(emp?.vacation ? Math.max(0, Math.round(emp.vacation.remaining * 10) / 10) : 12);
  const [daily, setDaily] = useState(grossOf(emp) ? Math.round((grossOf(emp) / 30.4) * 100) / 100 : 49.34);
  const [severance, setSeverance] = useState(0);
  const [sector, setSector] = useState<"private" | "public">(emp?.sector || "private");
  const r = hr.finalSettlement({
    monthlySalary: salary, workedDays: worked, normDays: norm, unusedLeaveDays: unused, leaveDailyRate: daily,
    severance, sector, calculate: (gross, s) => calculateFromGross(gross, s),
  });
  return (
    <Layout
      employee={emp}
      title="Son haqq-hesab"
      result={
        <Result
          articles={r.articles}
          notes={r.notes}
          rows={[
            ["Son ayın işlənmiş günlərinin maaşı", azn(r.salaryForWorkedDays)],
            ["İstifadə edilməmiş məzuniyyət kompensasiyası", azn(r.leaveCompensation)],
            ["Vergiyə cəlb olunan cəmi (gross)", azn(r.taxable)],
            ["Gəlir vergisi", azn(r.incomeTax)],
            ["Sosial, işsizlik və tibbi sığorta (işçi)", azn(r.employeeInsurance)],
            ["Ələ keçən (net)", azn(r.net), true],
            ["İşdənçıxarma müavinəti (vergisiz)", azn(r.severance)],
            ["Ödəniləcək cəmi", azn(r.toPay), true],
          ]}
        />
      }
    >
      <Num label="Aylıq maaş (gross)" value={salary} onChange={setSalary} />
      <Num label="Son ayda işlənmiş gün" value={worked} onChange={setWorked} />
      <Num label="Aydakı norma iş günü" value={norm} onChange={setNorm} />
      <Num label="İstifadə edilməmiş əsas məzuniyyət (gün)" value={unused} onChange={setUnused} />
      <Num label="Bir günlük məzuniyyət məbləği" value={daily} step={0.01} onChange={setDaily} />
      <Num label="İşdənçıxarma müavinəti" value={severance} onChange={setSeverance} />
      <Field label="Sektor">
        <select value={sector} onChange={(e) => setSector(e.target.value as "private" | "public")}>
          <option value="private">Qeyri-neft özəl</option>
          <option value="public">Dövlət / neft-qaz</option>
        </select>
      </Field>
    </Layout>
  );
}

const TABS = [
  { id: "salary", label: "Maaş (gross ↔ net)" },
  { id: "vacation", label: "Məzuniyyət" },
  { id: "unused", label: "Məzuniyyət kompensasiyası" },
  { id: "average", label: "Orta əmək haqqı" },
  { id: "termination", label: "İxtisar / xitam" },
  { id: "settlement", label: "Son haqq-hesab" },
  { id: "workdays", label: "İş günləri" },
  { id: "maternity", label: "Hamiləlik və doğuş" },
  { id: "sick", label: "Xəstəlik müavinəti" },
  { id: "service", label: "İş stajı" },
  { id: "extra", label: "Artıq iş, gecə, boşdayanma" },
  { id: "deductions", label: "Tutulmalar" },
  { id: "taxes", label: "ƏDV və vergilər" },
] as const;

// Open to everyone and also inside the candidate and company areas. All figures come from lib/hr-calc.ts
// (Labor Code and Tax Code) and lib/salary.ts, which the payroll section will use as well.
export function HrCalculators({
  employer = false,
  api,
  notify,
}: {
  employer?: boolean;
  api?: (path: string, body?: unknown) => Promise<any>;
  notify?: (message: string) => void;
}) {
  const tell = notify || ((message: string) => window.alert(message));
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("salary");
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [empId, setEmpId] = useState("");
  useEffect(() => {
    if (!employer) return;
    fetch("/api/joblink/company/employees", { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<{ employees?: Emp[] }>) : { employees: [] }))
      .then((data) => {
        const list = (data.employees || []).filter((e) => e.status !== "left");
        setEmployees(list);
        // The employee card sends the person here with the id kept for one visit.
        try {
          const wanted = window.sessionStorage.getItem("joblink-calc-employee");
          window.sessionStorage.removeItem("joblink-calc-employee");
          if (wanted && list.some((e) => e.id === wanted)) setEmpId(wanted);
        } catch {
          // Without storage the employee is picked by hand.
        }
      })
      .catch(() => undefined);
  }, [employer]);
  const emp = employees.find((e) => e.id === empId) || null;
  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState(false);
  const needle = search.toLocaleLowerCase("az").trim();
  const matches = employees
    .filter((e) => !needle || `${e.name} ${e.position} ${e.department}`.toLocaleLowerCase("az").includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name, "az"))
    .slice(0, 12);
  return (
    <div className="hr-calcs">
      {employer && !!employees.length && (
        <section className="panel calc-employee">
          <label className="field">
            <span>İşçi axtar və seç (məlumatlar avtomatik dolur)</span>
            <input
              value={search}
              placeholder="Ad, vəzifə və ya departament yazın"
              autoComplete="off"
              onFocus={() => setPicking(true)}
              onBlur={() => window.setTimeout(() => setPicking(false), 150)}
              onChange={(e) => {
                setSearch(e.target.value);
                setPicking(true);
              }}
            />
          </label>
          {picking && (
            <ul className="emp-results" role="listbox">
              {matches.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={e.id === empId}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setEmpId(e.id);
                      setSearch("");
                      setPicking(false);
                    }}
                  >
                    <strong>{e.name}</strong>
                    <small>{[e.position || "vəzifəsiz", e.department].filter(Boolean).join(" · ")}</small>
                  </button>
                </li>
              ))}
              {!matches.length && <li className="muted emp-none">Uyğun işçi tapılmadı.</li>}
            </ul>
          )}
          {emp && (
            <p className="emp-chosen">
              Seçilib: <b>{empLabel(emp)}</b>{" "}
              <button type="button" className="text-button" onClick={() => setEmpId("")}>
                Təmizlə
              </button>
            </p>
          )}
          {emp && !grossOf(emp) && <small className="muted">Bu işçinin maaşı daxil edilməyib və ya sizin rolunuz maaşı görmür — maaş sahələrini əl ilə doldurun.</small>}
        </section>
      )}
      <div className="calc-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "primary" : "ghost"} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "salary" && (
        <SalaryCalculator
          key={empId}
          employer={employer}
          api={api}
          notify={tell}
          initial={emp && emp.salary ? { amount: emp.salary, from: emp.salaryType || "gross", sector: emp.sector || "private", reduction: emp.taxReduction || 0 } : undefined}
        />
      )}
      {tab === "vacation" && <Vacation key={empId} emp={emp} />}
      {tab === "unused" && <Unused key={empId} emp={emp} />}
      {tab === "average" && <Average key={empId} emp={emp} />}
      {tab === "termination" && <Termination key={empId} emp={emp} />}
      {tab === "settlement" && <Settlement key={empId} emp={emp} />}
      {tab === "workdays" && <WorkDays key={empId} emp={emp} />}
      {tab === "maternity" && <Maternity key={empId} emp={emp} />}
      {tab === "sick" && <Sick key={empId} emp={emp} />}
      {tab === "service" && <Service key={empId} emp={emp} />}
      {tab === "extra" && <ExtraWork key={empId} emp={emp} />}
      {tab === "deductions" && <Deductions key={empId} emp={emp} />}
      {tab === "taxes" && <Taxes key={empId} emp={emp} />}
      <p className="muted fine-print">
        Hesablamalar məlumat xarakterlidir; kollektiv/əmək müqaviləsi qanundan yüksək şərtlər nəzərdə tuta bilər. Rəsmi
        sənədləşmədən əvvəl mühasib və ya hüquqşünasla yoxlayın.
      </p>
    </div>
  );
}
