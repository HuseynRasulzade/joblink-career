"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus, Trash2 } from "lucide-react";
import { ATTENDANCE_CODES, attendanceCode, type CalendarDay, type CalendarOverride, type AttendanceSummary, type MonthSummary } from "@/lib/calendar-az";
import { Field, Modal } from "./components";

type Notify = (message: string) => void;
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Sorğu tamamlanmadı.");
  return data;
}

type SheetEmployee = {
  id: string;
  name: string;
  position: string;
  department: string;
  section: string;
  startDate: string;
  endDate: string;
  status: string;
  marks: Record<string, string>;
  notes: Record<string, string>;
  summary: AttendanceSummary;
};
type Sheet = {
  month: string;
  days: CalendarDay[];
  employees: SheetEmployee[];
  overrides: { day: string; kind: "off" | "work" | "short"; label: string }[];
  years: number[];
};

const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
const WEEKDAY = ["B", "B.e", "Ç.a", "Ç", "C.a", "C", "Ş"];
const shift = (month: string, by: number) => {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + by, 1));
  return date.toISOString().slice(0, 7);
};
const COLOR: Record<string, string> = { leave: "#e0ecff", absence: "#fde2e0", work: "#e4f3e6" };

function AttendanceSheet({ notify }: { notify: Notify }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [department, setDepartment] = useState("");
  const [cell, setCell] = useState<{ employee: SheetEmployee; date: string } | null>(null);
  const [bulk, setBulk] = useState(false);
  const [calendarForm, setCalendarForm] = useState({ day: "", kind: "off", label: "" });
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<Sheet>(`company/attendance?month=${month}`)
      .then(setSheet)
      .catch((error) => notifyRef.current((error as Error).message));
  }, [month]);
  useEffect(load, [load]);
  const departments = useMemo(() => [...new Set((sheet?.employees || []).map((e) => e.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, "az")), [sheet]);
  const rows = (sheet?.employees || []).filter((e) => !department || e.department === department);
  const year = Number(month.slice(0, 4));
  const holidays = (sheet?.days || []).filter((d) => d.off && d.off !== "weekend");
  async function saveCalendar() {
    try {
      await request("company/attendance/calendar", calendarForm);
      setCalendarForm({ day: "", kind: "off", label: "" });
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!sheet) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="company-page">
      <div className="section-heading">
        <div className="admin-actions">
          <button type="button" aria-label="Əvvəlki ay" onClick={() => setMonth(shift(month, -1))}>
            <ChevronLeft size={16} />
          </button>
          <b>
            {MONTHS[Number(month.slice(5, 7)) - 1]} {year}
          </b>
          <button type="button" aria-label="Növbəti ay" onClick={() => setMonth(shift(month, 1))}>
            <ChevronRight size={16} />
          </button>
          <select value={department} aria-label="Departament" onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Bütün departamentlər</option>
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="admin-actions">
          <a className="secondary report-button" href={`/api/joblink/company/report?kind=attendance&month=${month}`} download>
            <Download size={14} /> Excel hesabatı
          </a>
          <button type="button" className="primary" onClick={() => setBulk(true)}>
            <Plus size={14} /> Toplu qeyd (məzuniyyət, xəstəlik…)
          </button>
        </div>
      </div>
      {!sheet.years.includes(year) && (
        <div className="notice" role="status">
          {year}-ci il üçün Ramazan və Qurban bayramı günləri hələ daxil edilməyib (Nazirlər Kabinetinin qərarı ilə bildirilir). Bu günləri aşağıdakı “Şirkət təqvimi”ndə qeyri-iş günü kimi əlavə edin.
        </div>
      )}
      <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
        <table className="admin-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, background: "#fff", minWidth: 170 }}>İşçi</th>
              {sheet.days.map((d) => (
                <th key={d.date} title={d.label} style={{ textAlign: "center", padding: "4px 2px", background: d.off ? "#f2f2f2" : d.short ? "#fff6cc" : undefined, minWidth: 26 }}>
                  {Number(d.date.slice(8))}
                  <br />
                  <small>{d.short ? "7s" : WEEKDAY[d.weekday]}</small>
                </th>
              ))}
              <th>Norma</th>
              <th>İşlənib (gün)</th>
              <th>Saat: faktiki / ödənilən</th>
              <th>Məzuniyyət və s.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td style={{ position: "sticky", left: 0, background: "#fff" }}>
                  <b>{e.name}</b>
                  <small className="skill-description">
                    {[e.department, e.section, e.position].filter(Boolean).join(" · ")}
                  </small>
                </td>
                {sheet.days.map((d) => {
                  const code = e.marks[d.date];
                  const kind = code ? attendanceCode(code) : undefined;
                  const outside = (e.startDate && d.date < e.startDate) || (e.endDate && d.date > e.endDate);
                  return (
                    <td
                      key={d.date}
                      title={[d.label, kind?.label, e.notes[d.date]].filter(Boolean).join(" — ")}
                      onClick={() => !outside && setCell({ employee: e, date: d.date })}
                      style={{
                        textAlign: "center",
                        padding: "4px 2px",
                        cursor: outside ? "default" : "pointer",
                        background: outside ? "#e8e8e8" : kind ? COLOR[kind.counts] : d.off ? "#f2f2f2" : undefined,
                        fontWeight: kind ? 600 : 400,
                      }}
                    >
                      {outside ? "" : kind ? kind.short : d.off ? (d.off === "weekend" ? "" : "B") : ""}
                    </td>
                  );
                })}
                <td>{e.summary.norm}</td>
                <td>
                  <b>{e.summary.worked}</b>
                </td>
                <td>
                  {e.summary.hours} / {e.summary.paidHours}
                </td>
                <td>
                  {ATTENDANCE_CODES.filter((c) => c.id !== "work" && e.summary.byCode[c.id]).map((c) => (
                    <div key={c.id}>
                      {c.short}: {e.summary.byCode[c.id]}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={sheet.days.length + 5}>
                  <p className="admin-empty">Bu ayda işləyən işçi yoxdur. İşçiləri “İşçilər” səhifəsindən əlavə edin.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Qeyd olunmayan iş günü “işlənib” sayılır; uzaqdan iş, ezamiyyət və təlim də işlənmiş gün sayılır. Sarı <b>7s</b> sütunu bayram ərəfəsidir: qısaldılmış gündə 1 saat az işlənir, haqq isə 8 saat üçün tam ödənilir. <b>B</b> — bayram və ya köçürülmüş istirahət günü, boz sütun — istirahət. Xanaya basıb həmin günü qeyd edin.{" "}
        {ATTENDANCE_CODES.filter((c) => c.id !== "work").map((c) => `${c.short} — ${c.label}`).join(" · ")}.
      </p>
      <section className="panel">
        <h4>
          {MONTHS[Number(month.slice(5, 7)) - 1]} ayının qeyri-iş günləri və şirkət təqvimi
        </h4>
        <p className="muted">
          Bayram günləri Əmək Məcəlləsinin 105-ci maddəsinə və Nazirlər Kabinetinin qərarına görə qoyulub. Bayram istirahət gününə və ya başqa bayrama təsadüf edəndə, ondan sonrakı iş günü istirahət sayılır. Kabinetin başqa köçürmələrini (məsələn, işlək şənbə) buradan əlavə edin.
        </p>
        <ul>
          {holidays.map((d) => (
            <li key={d.date}>
              <b>{d.date.slice(8)}.{d.date.slice(5, 7)}</b> — {d.label}
            </li>
          ))}
          {!holidays.length && <li className="muted">Bu ayda bayram günü yoxdur.</li>}
        </ul>
        <div className="form-grid">
          <Field label="Tarix">
            <input type="date" value={calendarForm.day} onChange={(e) => setCalendarForm({ ...calendarForm, day: e.target.value })} />
          </Field>
          <Field label="Növ">
            <select value={calendarForm.kind} onChange={(e) => setCalendarForm({ ...calendarForm, kind: e.target.value })}>
              <option value="off">Qeyri-iş günü</option>
              <option value="work">İş günü (məsələn, işlək şənbə)</option>
              <option value="short">Qısaldılmış gün (7 saat, haqq tam)</option>
            </select>
          </Field>
          <Field label="Qeyd">
            <input value={calendarForm.label} onChange={(e) => setCalendarForm({ ...calendarForm, label: e.target.value })} />
          </Field>
        </div>
        <div className="admin-actions">
          <button type="button" className="secondary" disabled={!calendarForm.day} onClick={() => void saveCalendar()}>
            Şirkət təqviminə əlavə et
          </button>
        </div>
        {!!sheet.overrides.length && (
          <ul>
            {sheet.overrides.map((o) => (
              <li key={o.day}>
                {o.day} — {o.kind === "off" ? "qeyri-iş günü" : o.kind === "short" ? "qısaldılmış gün" : "iş günü"} {o.label && `(${o.label})`}{" "}
                <button
                  type="button"
                  aria-label="Sil"
                  onClick={async () => {
                    await request("company/attendance/calendar", { day: o.day, kind: "" }).catch((error) => notify((error as Error).message));
                    load();
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {cell && <MarkModal employee={cell.employee} date={cell.date} employees={sheet.employees} notify={notify} onClose={() => setCell(null)} onDone={load} />}
      {bulk && <MarkModal employees={sheet.employees} date={`${month}-01`} notify={notify} onClose={() => setBulk(false)} onDone={load} />}
    </div>
  );
}

// Marks one day, or a range of days, of one employee.
function MarkModal({
  employee,
  employees,
  date,
  notify,
  onClose,
  onDone,
}: {
  employee?: SheetEmployee;
  employees: SheetEmployee[];
  date: string;
  notify: Notify;
  onClose: () => void;
  onDone: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(employee?.id || "");
  const [form, setForm] = useState({ from: date, to: date, code: employee?.marks[date] || "annual", note: employee?.notes[date] || "" });
  const [busy, setBusy] = useState(false);
  async function save(code: string) {
    setBusy(true);
    try {
      const result = await request<{ marked: number }>("company/attendance/set", { employeeId, from: form.from, to: form.to, code, note: form.note });
      notify(code ? `${result.marked} gün qeyd olundu.` : "Qeyd silindi.");
      onDone();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const target = employees.find((e) => e.id === employeeId);
  return (
    <Modal title={employee ? `${employee.name}: ${date}` : "Toplu davamiyyət qeydi"} onClose={onClose}>
      <div className="offer-composer">
        {!employee && (
          <Field label="İşçi *">
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">İşçi seçin</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="form-grid">
          <Field label="Başlanğıc">
            <input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value, to: form.to < e.target.value ? e.target.value : form.to })} />
          </Field>
          <Field label="Bitmə (bir gün üçün eyni)">
            <input type="date" min={form.from} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
          </Field>
          <Field label="Səbəb (qeyd növü)">
            <select value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}>
              {[...new Set(ATTENDANCE_CODES.map((c) => c.group))].map((group) => (
                <optgroup key={group} label={group}>
                  {ATTENDANCE_CODES.filter((c) => c.group === group).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.short} — {c.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Əlavə qeyd (sənəd nömrəsi, səbəb)">
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
        </div>
        {form.code === "annual" && <small className="muted">Əmək məzuniyyəti təqvim günü ilə hesablanır, bayram günləri məzuniyyətə daxil edilmir. Qeyd olunan günlər işçinin məzuniyyət qalığından çıxılır.</small>}
        {form.code === "maternity" && <small className="muted">Hamiləlik və doğuş məzuniyyəti müvafiq tibbi sənədə əsasən verilir. Sənədin nömrəsini əlavə qeyddə yazın.</small>}
        <div className="admin-actions">
          <button type="button" className="primary" disabled={busy || !employeeId} onClick={() => void save(form.code)}>
            Qeyd et {target ? `(${target.name})` : ""}
          </button>
          <button type="button" className="secondary" disabled={busy || !employeeId} onClick={() => void save("")}>
            Qeydi sil
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Production calendar of the year ----------
const DAY_COLOR: Record<string, string> = { weekend: "#eceff1", holiday: "#ffd9d4", transfer: "#ffe9c2", company: "#e0d4ff", short: "#fff6cc" };
const MONTH_HEAD = ["B.e", "Ç.a", "Ç", "C.a", "C", "Ş", "B"];

function ProductionCalendar({ notify }: { notify: Notify }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<{ months: MonthSummary[]; overrides: CalendarOverride[]; religiousYears: number[]; hoursPerDay: number } | null>(null);
  const [pick, setPick] = useState<CalendarDay | null>(null);
  const [label, setLabel] = useState("");
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<NonNullable<typeof data>>(`company/calendar?year=${year}`)
      .then(setData)
      .catch((error) => notifyRef.current((error as Error).message));
  }, [year]);
  useEffect(load, [load]);
  async function change(day: string, kind: "off" | "work" | "short" | "") {
    try {
      await request("company/attendance/calendar", { day, kind, label });
      setPick(null);
      setLabel("");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  const total = (key: "calendarDays" | "workDays" | "restDays" | "holidayDays" | "shortDays" | "hours" | "paidHours") => data.months.reduce((sum, m) => sum + m[key], 0);
  const holidays = data.months.flatMap((m) => m.days.filter((d) => d.off && d.off !== "weekend" && d.label));
  return (
    <div className="company-page">
      <div className="section-heading">
        <div className="admin-actions">
          <button type="button" aria-label="Əvvəlki il" onClick={() => setYear(year - 1)}>
            <ChevronLeft size={16} />
          </button>
          <b>{year}-ci ilin istehsalat təqvimi</b>
          <button type="button" aria-label="Növbəti il" onClick={() => setYear(year + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
        <a className="secondary report-button" href={`/api/joblink/company/report?kind=calendar&year=${year}`} download>
          <Download size={14} /> Excel
        </a>
      </div>
      {!data.religiousYears.includes(year) && (
        <div className="notice" role="status">
          {year}-ci il üçün Ramazan və Qurban bayramı günləri Nazirlər Kabinetinin qərarı ilə müəyyən edilir və hələ daxil edilməyib. Qərar çıxandan sonra həmin günləri xanaya basıb “Qeyri-iş günü” kimi əlavə edin.
        </div>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ay</th>
              <th>Təqvim günü</th>
              <th>İş günü</th>
              <th>İstirahət günü</th>
              <th>Bayram və köçürülmüş gün</th>
              <th>Qısaldılmış gün (ərəfə)</th>
              <th>İş saatı (faktiki)</th>
              <th>Ödənilən saat</th>
            </tr>
          </thead>
          <tbody>
            {data.months.map((m) => (
              <tr key={m.month}>
                <td>
                  <b>{MONTHS[m.month - 1]}</b>
                </td>
                <td>{m.calendarDays}</td>
                <td>{m.workDays}</td>
                <td>{m.restDays}</td>
                <td>{m.holidayDays}</td>
                <td>{m.shortDays}</td>
                <td>{m.hours}</td>
                <td>{m.paidHours}</td>
              </tr>
            ))}
            <tr>
              <td>
                <b>İl üzrə</b>
              </td>
              <td>
                <b>{total("calendarDays")}</b>
              </td>
              <td>
                <b>{total("workDays")}</b>
              </td>
              <td>
                <b>{total("restDays")}</b>
              </td>
              <td>
                <b>{total("holidayDays")}</b>
              </td>
              <td>
                <b>{total("shortDays")}</b>
              </td>
              <td>
                <b>{total("hours")}</b>
              </td>
              <td>
                <b>{total("paidHours")}</b>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted">
        <span style={{ background: DAY_COLOR.weekend, padding: "0 6px" }}>istirahət</span>{" "}
        <span style={{ background: DAY_COLOR.holiday, padding: "0 6px" }}>bayram</span>{" "}
        <span style={{ background: DAY_COLOR.transfer, padding: "0 6px" }}>köçürülmüş istirahət günü</span>{" "}
        <span style={{ background: DAY_COLOR.company, padding: "0 6px" }}>şirkətin qeyri-iş günü</span> <span style={{ background: DAY_COLOR.short, padding: "0 6px" }}>qısaldılmış gün (bayram ərəfəsi)</span>. İş saatı həftədə 40 saatla (gündə {data.hoursPerDay} saat) hesablanıb; qısaldılmış gündə 1 saat az işlənir (faktiki saat), amma tam gün üçün ödənilir (ödənilən saat). Günə basıb şirkətiniz üçün qeyri-iş günü və ya işlək gün (məsələn, Kabinetin elan etdiyi işlək şənbə) təyin edin.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
        {data.months.map((m) => {
          const lead = (m.days[0].weekday + 6) % 7;
          return (
            <section key={m.month} className="panel" style={{ padding: 10 }}>
              <b>{MONTHS[m.month - 1]}</b> <small className="muted">· {m.workDays} iş günü, {m.hours} saat (ödənilən {m.paidHours})</small>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginTop: 6, textAlign: "center", fontSize: 12 }}>
                {MONTH_HEAD.map((h) => (
                  <small key={h} className="muted">
                    {h}
                  </small>
                ))}
                {Array.from({ length: lead }, (_, i) => (
                  <span key={`b${i}`} />
                ))}
                {m.days.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    title={d.label}
                    onClick={() => {
                      setPick(d);
                      setLabel(data.overrides.find((o) => o.day === d.date)?.label || "");
                    }}
                    style={{ padding: "4px 0", border: "none", borderRadius: 4, cursor: "pointer", background: d.off ? DAY_COLOR[d.off] : d.short ? DAY_COLOR.short : "#f7fbf7", fontWeight: d.off === "holiday" || d.off === "transfer" ? 700 : 400 }}
                  >
                    {Number(d.date.slice(8))}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <section className="panel">
        <h4>{year}-ci ilin bayram və qeyri-iş günləri</h4>
        <ul>
          {holidays.map((d) => (
            <li key={d.date}>
              <b>
                {d.date.slice(8)}.{d.date.slice(5, 7)}
              </b>{" "}
              — {d.label}
            </li>
          ))}
        </ul>
        <small className="muted">Əmək Məcəlləsinin 105-ci maddəsinə və Nazirlər Kabinetinin qərarına əsasən. Bayram istirahət gününə və ya başqa bayrama təsadüf edəndə ondan sonrakı iş günü istirahət olur.</small>
      </section>
      {pick && (
        <Modal title={`${pick.date.slice(8)}.${pick.date.slice(5, 7)}.${pick.date.slice(0, 4)}`} onClose={() => setPick(null)}>
          <div className="offer-composer">
            <p>
              Hazırda: <b>{pick.off === "" ? (pick.short ? "qısaldılmış iş günü (7 saat, 8 saatlıq haqq)" : "iş günü") : pick.off === "weekend" ? "istirahət günü" : pick.off === "company" ? "şirkətin qeyri-iş günü" : "bayram / köçürülmüş gün"}</b>
              {pick.label ? ` — ${pick.label}` : ""}
            </p>
            <Field label="Qeyd (ad)">
              <input value={label} onChange={(e) => setLabel(e.target.value)} />
            </Field>
            <div className="admin-actions">
              <button type="button" className="secondary" onClick={() => void change(pick.date, "off")}>
                Şirkət üçün qeyri-iş günü
              </button>
              <button type="button" className="secondary" onClick={() => void change(pick.date, "work")}>
                Tam iş günü et
              </button>
              <button type="button" className="secondary" onClick={() => void change(pick.date, "short")}>
                Qısaldılmış gün (7 saat, haqq tam)
              </button>
              {data.overrides.some((o) => o.day === pick.date) && (
                <button type="button" onClick={() => void change(pick.date, "")}>
                  Şirkət dəyişikliyini sil
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function AttendancePage({ notify }: { notify: Notify }) {
  const [tab, setTab] = useState<"sheet" | "calendar">("sheet");
  return (
    <div>
      <div className="admin-actions" role="tablist" style={{ marginBottom: 12 }}>
        <button type="button" role="tab" aria-selected={tab === "sheet"} className={tab === "sheet" ? "primary" : "secondary"} onClick={() => setTab("sheet")}>
          Davamiyyət cədvəli
        </button>
        <button type="button" role="tab" aria-selected={tab === "calendar"} className={tab === "calendar" ? "primary" : "secondary"} onClick={() => setTab("calendar")}>
          İstehsalat təqvimi və bayramlar
        </button>
      </div>
      {tab === "sheet" ? <AttendanceSheet notify={notify} /> : <ProductionCalendar notify={notify} />}
    </div>
  );
}
