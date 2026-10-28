"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus, Trash2 } from "lucide-react";
import { ATTENDANCE_CODES, attendanceCode, type CalendarDay, type AttendanceSummary } from "@/lib/calendar-az";
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
  overrides: { day: string; kind: "off" | "work"; label: string }[];
  years: number[];
};

const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
const WEEKDAY = ["B", "B.e", "Ç.a", "Ç", "C.a", "C", "Ş"];
const shift = (month: string, by: number) => {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + by, 1));
  return date.toISOString().slice(0, 7);
};
const COLOR: Record<string, string> = { leave: "#e0ecff", absence: "#fde2e0", work: "#e4f3e6" };

export function AttendancePage({ notify }: { notify: Notify }) {
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
                <th key={d.date} title={d.label} style={{ textAlign: "center", padding: "4px 2px", background: d.off ? "#f2f2f2" : undefined, minWidth: 26 }}>
                  {Number(d.date.slice(8))}
                  <br />
                  <small>{WEEKDAY[d.weekday]}</small>
                </th>
              ))}
              <th>Norma</th>
              <th>İşlənib</th>
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
                <td colSpan={sheet.days.length + 4}>
                  <p className="admin-empty">Bu ayda işləyən işçi yoxdur. İşçiləri “İşçilər” səhifəsindən əlavə edin.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Qeyd olunmayan iş günü “işlənib” sayılır. <b>B</b> — bayram və ya köçürülmüş istirahət günü, boz sütun — istirahət. Xanaya basıb həmin günü qeyd edin.{" "}
        {ATTENDANCE_CODES.map((c) => `${c.short} — ${c.label}`).join(" · ")}.
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
                {o.day} — {o.kind === "off" ? "qeyri-iş günü" : "iş günü"} {o.label && `(${o.label})`}{" "}
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
          <Field label="Qeyd">
            <select value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}>
              {ATTENDANCE_CODES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.short} — {c.label}
                </option>
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
