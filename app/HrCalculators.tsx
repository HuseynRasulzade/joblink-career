"use client";
import { useMemo, useState, type ReactNode } from "react";
import * as hr from "@/lib/hr-calc";
import { SalaryCalculator } from "./SalaryCalculator";
import { Field } from "./components";

const azn = (v: number) => `${v.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
const today = () => new Date().toISOString().slice(0, 10);

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
  return (
    <section className="panel calc-result">
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
const Layout = ({ title, children, result }: { title: string; children: ReactNode; result: ReactNode }) => (
  <div className="calc-page">
    <section className="panel calc-form">
      <h3>{title}</h3>
      <div className="form-grid">{children}</div>
    </section>
    {result}
  </div>
);

function Vacation() {
  const [extended, setExtended] = useState(false);
  const [tenure, setTenure] = useState(3);
  const [kids, setKids] = useState(0);
  const [childRight, setChildRight] = useState(false);
  const [disabledChild, setDisabledChild] = useState(false);
  const [harmful, setHarmful] = useState(0);
  const [start, setStart] = useState(today());
  const [earnings, setEarnings] = useState("1500");
  const [daysText, setDaysText] = useState("");
  const e = hr.vacationEntitlement({ extendedMain: extended, tenureYears: tenure, childrenUnder14: kids, eligibleForChildLeave: childRight, hasDisabledChild: disabledChild, harmfulConditionsDays: harmful });
  const days = daysText === "" ? e.total : Number(daysText);
  const dates = useMemo(() => hr.vacationDates(start, days), [start, days]);
  const pay = hr.vacationPay(parseMonths(earnings), days, start);
  return (
    <Layout
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

function Unused() {
  const [hire, setHire] = useState("2024-03-01");
  const [end, setEnd] = useState(today());
  const [main, setMain] = useState(21);
  const [used, setUsed] = useState(0);
  const [earnings, setEarnings] = useState("1500");
  const r = hr.unusedLeaveCompensation({ hireDate: hire, endDate: end, mainLeaveDays: main, usedDays: used, monthlyEarnings: parseMonths(earnings) });
  return (
    <Layout
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

function Average() {
  const [earnings, setEarnings] = useState(3000);
  const [workDays, setWorkDays] = useState(43);
  const [paid, setPaid] = useState(5);
  const [last, setLast] = useState(0);
  const [floor, setFloor] = useState(false);
  const r = hr.averageDailyEarnings({ earnings, workingDays: workDays, paidDays: paid, lastDailyPay: last, floorToLastDay: floor });
  return (
    <Layout
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

function Termination() {
  const [tenure, setTenure] = useState(3);
  const [average, setAverage] = useState(1500);
  const [reason, setReason] = useState<hr.TerminationReason>("reduction");
  const [noticeDate, setNoticeDate] = useState(today());
  const t = hr.termination({ tenureYears: tenure, averageMonthly: average, reason });
  return (
    <Layout
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

function ExtraWork() {
  const [salary, setSalary] = useState(1600);
  const [norm, setNorm] = useState(168);
  const [over, setOver] = useState(2);
  const [rest, setRest] = useState(8);
  const [within, setWithin] = useState(true);
  const [night, setNight] = useState(0);
  const [percent, setPercent] = useState(0);
  const [tariff, setTariff] = useState(1600);
  const o = hr.overtimePay({ monthlySalary: salary, normHours: norm, hours: over });
  const d = hr.restDayPay({ monthlySalary: salary, normHours: norm, hours: rest, withinMonthlyNorm: within });
  const n = hr.nightPay({ monthlySalary: salary, normHours: norm, nightHours: night, supplementPercent: percent });
  const idle = hr.twoThirdsPay(tariff, "downtime");
  return (
    <Layout
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

function Deductions() {
  const [due, setDue] = useState(1000);
  const [kind, setKind] = useState<hr.DeductionKind>("general");
  const r = hr.deductionLimit(due, kind);
  const [salary, setSalary] = useState(1500);
  const [worked, setWorked] = useState(15);
  const [normDays, setNormDays] = useState(22);
  return (
    <Layout
      title="Tutulmaların həddi və yarımçıq ay"
      result={
        <Result
          articles={[...r.articles, "171"]}
          notes={r.notes}
          rows={[
            ["Tutulmanın maksimum payı", `${r.share * 100}%`],
            ["Maksimum tutula bilən", azn(r.maximum), true],
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
      <Num label="Aylıq maaş" value={salary} onChange={setSalary} />
      <Num label="İşlənmiş iş günü" value={worked} onChange={setWorked} />
      <Num label="Aydakı norma iş günü" value={normDays} onChange={setNormDays} />
    </Layout>
  );
}

function Taxes() {
  const [amount, setAmount] = useState(1180);
  const [mode, setMode] = useState<"add" | "extract">("extract");
  const [turnover, setTurnover] = useState(10000);
  const [rate, setRate] = useState(2);
  const v = hr.vat(amount, mode);
  return (
    <Layout
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

const TABS = [
  { id: "salary", label: "Maaş (gross ↔ net)" },
  { id: "vacation", label: "Məzuniyyət" },
  { id: "unused", label: "Məzuniyyət kompensasiyası" },
  { id: "average", label: "Orta əmək haqqı" },
  { id: "termination", label: "İxtisar / xitam" },
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
  return (
    <div className="hr-calcs">
      <div className="calc-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "primary" : "ghost"} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "salary" && <SalaryCalculator employer={employer} api={api} notify={tell} />}
      {tab === "vacation" && <Vacation />}
      {tab === "unused" && <Unused />}
      {tab === "average" && <Average />}
      {tab === "termination" && <Termination />}
      {tab === "extra" && <ExtraWork />}
      {tab === "deductions" && <Deductions />}
      {tab === "taxes" && <Taxes />}
      <p className="muted fine-print">
        Hesablamalar məlumat xarakterlidir; kollektiv/əmək müqaviləsi qanundan yüksək şərtlər nəzərdə tuta bilər. Rəsmi
        sənədləşmədən əvvəl mühasib və ya hüquqşünasla yoxlayın.
      </p>
    </div>
  );
}
