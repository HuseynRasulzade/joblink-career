"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  Receipt,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { REJECTION_NOTE_TEMPLATES, waitingLabel } from "@/lib/review-queue";
import {
  COMPANY_SIZES,
  ROLE_PRESETS,
  profileCompleteness,
  VOEN_LOOKUP_URL,
  VOEN_TYPE_LABEL,
  validVoen,
  voenType,
  type CompanyDetails,
  type TaxCheck,
  type CompanyPermission,
  type JobApproval,
} from "@/lib/company";
import { Field, Modal } from "./components";
import { formatDate } from "@/lib/dates";
import { VACANCY_REASONS } from "@/lib/recruitment";
import type { WorkforceMetrics } from "@/lib/workforce";
import { siteLanguage } from "./i18n";
import { DOC_KINDS, OTHER_TYPE, docLabel } from "@/lib/employee-docs";
import HrDocsPanel from "./HrDocsPanel";
import SalaryHistory from "./SalaryHistory";
import { BulkLinkCodes, EmployeeLinkPanel, EmployeePayPanel, EmployeeProfilePanel, OrderMaker, OrgNameInput, SheetImport, StaffTable, useOrgNames } from "./StaffPages";

export type CompanyMe = {
  company: { id: string; name: string } | null;
  role: string;
  roleLabel: string;
  permissions: CompanyPermission[];
  member: boolean;
  verification: string;
  awaitingApproval: number;
};
type Notify = (message: string) => void;
const day = (value: string) =>
  value ? formatDate(value, siteLanguage()) : "—";
const when = (value: string) =>
  value ? formatDate(value, siteLanguage(), { time: true }) : "—";
const azn = (value: number) =>
  `${value.toLocaleString("az-AZ", { maximumFractionDigits: 2 })} AZN`;

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) throw new Error(data.error || "Sorğu tamamlanmadı.");
  return data;
}
function useLoad<T>(path: string, notify: Notify) {
  const [data, setData] = useState<T | null>(null);
  // `notify` is a new function on every render of the page above; keeping it out of
  // the dependencies stops the same request being sent again after each re-render.
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<T>(path)
      .then(setData)
      .catch((error) => notifyRef.current((error as Error).message));
  }, [path]);
  useEffect(load, [load]);
  return [data, load] as const;
}
function ReportButton({
  kind,
  label,
  query = "",
}: {
  kind: string;
  label: string;
  query?: string;
}) {
  return (
    <a
      className="secondary report-button"
      href={`/api/joblink/company/report?kind=${kind}${query ? `&${query}` : ""}`}
      download
    >
      <Download size={14} /> {label}
    </a>
  );
}

// Weekly or monthly summary by e-mail (and in the notification bell).
function DigestCard({ notify }: { notify: Notify }) {
  const [state, setState] = useState<{
    frequency: string;
    lastSent: string;
    allowed: boolean;
  } | null>(null);
  useEffect(() => {
    request<{ frequency: string; lastSent: string; allowed: boolean }>(
      "company/digest",
    )
      .then(setState)
      .catch(() => setState(null));
  }, []);
  if (!state?.allowed) return null;
  async function change(frequency: string) {
    try {
      await request("company/digest", { frequency });
      setState((v) => (v ? { ...v, frequency } : v));
      notify(
        frequency === "off"
          ? "Avtomatik hesabat söndürüldü."
          : frequency === "weekly"
            ? "Hər bazar ertəsi həftəlik hesabat göndəriləcək."
            : "Hər ayın 1-də aylıq hesabat göndəriləcək.",
      );
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <section className="panel">
      <h3>Avtomatik hesabat</h3>
      <p className="muted fine-print">
        Yeni müraciətlər, işə qəbul və diqqət tələb edən işlərin qısa icmalı
        e-poçtunuza (və bildirişlərə) göndərilir. E-poçt yalnız platformada
        e-poçt göndərmə qurulubsa gedir.
      </p>
      <Field label="Tezlik">
        <select
          value={state.frequency}
          onChange={(e) => change(e.target.value)}
        >
          <option value="off">Göndərilməsin</option>
          <option value="weekly">Həftəlik (bazar ertəsi)</option>
          <option value="monthly">Aylıq (ayın 1-i)</option>
        </select>
      </Field>
      {state.lastSent && (
        <p className="muted fine-print">
          Son göndərilmə: {when(state.lastSent)}
        </p>
      )}
    </section>
  );
}

// ---------- Dashboard and reports ----------
type Dashboard = {
  totals: {
    activeJobs: number;
    pendingJobs: number;
    applications: number;
    autoApplications: number;
    hired: number;
    employees: number;
    offerAcceptance: number | null;
    testsSubmitted: number;
    testsAssigned: number;
    avgDaysToHire: number | null;
    strongApplicants?: number;
    scoredApplicants?: number;
  };
  byStatus: Record<string, number>;
  days: { date: string; count: number }[];
  perJob: {
    id: string;
    title: string;
    status: string;
    viewers?: number;
    conversion?: number | null;
    applications: number;
    interview: number;
    offered: number;
    hired: number;
  }[];
  scope?: { from: string; to: string; jobId: string; ownOnly: boolean };
  jobsList?: { id: string; title: string }[];
  funnel?: { stage: string; reached: number; fromPrevious: number | null }[];
  sources?: { id: string; label: string; count: number }[];
  trend?: {
    month: string;
    applications: number;
    hires: number;
    avgDaysToHire: number | null;
  }[];
  delta?: {
    period: {
      current: { from: string; to: string };
      previous: { from: string; to: string };
      days: number;
    };
    applications: { current: number; previous: number; change: number | null };
    hired: { current: number; previous: number; change: number | null };
  };
};
const changeText = (change: number | null | undefined) =>
  change === null || change === undefined
    ? "əvvəlki dövrdə məlumat yoxdur"
    : `${change > 0 ? "+" : ""}${change}% əvvəlki dövrə görə`;
const FUNNEL = [
  "Göndərildi",
  "Baxışda",
  "Müsahibə",
  "Təklif edildi",
  "İşə qəbul edildi",
  "Uyğun deyil",
];
export function CompanyDashboard({
  me,
  notify,
}: {
  me: CompanyMe | null;
  notify: Notify;
}) {
  const [filter, setFilter] = useState({ from: "", to: "", jobId: "" });
  const query = new URLSearchParams(
    Object.entries(filter).filter(([, v]) => v),
  ).toString();
  const [data] = useLoad<Dashboard>(
    `company/dashboard${query ? `?${query}` : ""}`,
    notify,
  );
  const [jobOptions, setJobOptions] = useState<{ id: string; title: string }[]>(
    [],
  );
  useEffect(() => {
    if (data?.jobsList && !filter.jobId) setJobOptions(data.jobsList);
  }, [data, filter.jobId]);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const t = data.totals;
  const peak = Math.max(1, ...data.days.map((d) => d.count));
  const reports = me?.permissions.includes("reports");
  const cards: [string, string | number, string?][] = [
    [
      "Aktiv vakansiyalar",
      t.activeJobs,
      t.pendingJobs ? `${t.pendingJobs} təsdiq gözləyir` : undefined,
    ],
    [
      "Müraciətlər",
      t.applications,
      [
        t.autoApplications ? `${t.autoApplications} AI avtomatik` : "",
        data.delta
          ? `son ${data.delta.period.days} gün: ${data.delta.applications.current} (${changeText(data.delta.applications.change)})`
          : "",
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    ],
    [
      "İşə qəbul",
      t.hired,
      [
        t.avgDaysToHire !== null ? `orta ${t.avgDaysToHire} gün` : "",
        data.delta
          ? `son ${data.delta.period.days} gün: ${data.delta.hired.current} (${changeText(data.delta.hired.change)})`
          : "",
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    ],
    [
      "Təkliflərin qəbulu",
      t.offerAcceptance === null ? "—" : `${t.offerAcceptance}%`,
    ],
    [
      "Güclü namizədlər",
      t.scoredApplicants
        ? `${Math.round(((t.strongApplicants || 0) / t.scoredApplicants) * 100)}%`
        : "—",
      t.scoredApplicants
        ? `${t.strongApplicants}/${t.scoredApplicants} müraciət, uyğunluq 70% və yuxarı`
        : undefined,
    ],
    [
      "Testlər",
      `${t.testsSubmitted}/${t.testsAssigned}`,
      "təhvil / göndərilib",
    ],
    ["İşçilər", t.employees],
  ];
  return (
    <div className="company-page">
      <div className="form-grid">
        <Field label="Başlanğıc tarixi">
          <input
            type="date"
            value={filter.from}
            onChange={(e) => setFilter({ ...filter, from: e.target.value })}
          />
        </Field>
        <Field label="Son tarix">
          <input
            type="date"
            value={filter.to}
            onChange={(e) => setFilter({ ...filter, to: e.target.value })}
          />
        </Field>
        <Field label="Vakansiya">
          <select
            value={filter.jobId}
            onChange={(e) => setFilter({ ...filter, jobId: e.target.value })}
          >
            <option value="">Hamısı</option>
            {jobOptions.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {data.scope?.ownOnly && (
        <p className="muted fine-print">
          Yalnız sizin yaratdığınız vakansiyalar göstərilir.
        </p>
      )}
      <div className="admin-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            document.body.classList.add("print-report");
            window.addEventListener(
              "afterprint",
              () => document.body.classList.remove("print-report"),
              { once: true },
            );
            window.print();
          }}
        >
          PDF kimi saxla / çap et
        </button>
      </div>
      <div className="kpi-grid">
        {cards.map(([label, value, hint]) => (
          <div className="kpi" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            {hint && <span>{hint}</span>}
          </div>
        ))}
      </div>
      <section className="panel">
        <h3>
          {filter.from && filter.to
            ? "Seçilmiş dövrdə müraciətlər"
            : "Son 30 gündə müraciətlər"}
        </h3>
        <div
          className="bar-chart"
          role="img"
          aria-label="Son 30 gündə gündəlik müraciətlər"
        >
          {data.days.map((d) => (
            <span
              key={d.date}
              title={`${day(d.date)}: ${d.count}`}
              style={{ height: `${Math.max(3, (d.count / peak) * 100)}%` }}
            />
          ))}
        </div>
        <div
          className="muted fine-print"
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <span>{day(data.days[0]?.date || "")}</span>
          <span>
            ən çox: {peak > 1 || data.days.some((d) => d.count) ? peak : 0}{" "}
            müraciət / gün
          </span>
          <span>{day(data.days[data.days.length - 1]?.date || "")}</span>
        </div>
      </section>
      <section className="panel">
        <h3>Müraciət mərhələləri</h3>
        <p className="muted fine-print">
          Hər müraciət çatdığı ən son mərhələdə sayılır (işə qəbul olunan
          müraciət əvvəlki mərhələlərdən də keçib). “Uyğun deyil” statusu
          mərhələyə daxil edilmir.
        </p>
        <div className="funnel">
          {(
            data.funnel ||
            FUNNEL.slice(0, 5).map((stage) => ({
              stage,
              reached: data.byStatus[stage] || 0,
              fromPrevious: null,
            }))
          ).map((row) => {
            const total = data.funnel?.[0]?.reached || t.applications;
            return (
              <div key={row.stage} className="funnel-row">
                <span>{row.stage}</span>
                <div>
                  <i
                    style={{
                      width: `${total ? (row.reached / total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <b>
                  {row.reached}
                  {row.fromPrevious !== null ? ` · ${row.fromPrevious}%` : ""}
                </b>
              </div>
            );
          })}
          <div className="funnel-row">
            <span>Uyğun deyil</span>
            <div>
              <i
                style={{
                  width: `${t.applications ? ((data.byStatus["Uyğun deyil"] || 0) / t.applications) * 100 : 0}%`,
                }}
              />
            </div>
            <b>{data.byStatus["Uyğun deyil"] || 0}</b>
          </div>
        </div>
        {!!data.sources?.length && (
          <>
            <h3 style={{ marginTop: 16 }}>Müraciət mənbəyi</h3>
            <div className="funnel">
              {data.sources.map((row) => (
                <div key={row.id} className="funnel-row">
                  <span>{row.label}</span>
                  <div>
                    <i
                      style={{
                        width: `${t.applications ? (row.count / t.applications) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <b>{row.count}</b>
                </div>
              ))}
            </div>
            <p className="muted fine-print">
              Xarici kanallar üçün “Vakansiyalarım” bölməsində kanal seçib
              izləmə linki kopyalayın və həmin kanalda paylaşın.
            </p>
          </>
        )}
      </section>
      {reports && <DigestCard notify={notify} />}
      {data.trend && (
        <section className="panel">
          <h3>Aylar üzrə trend (son 6 ay)</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ay</th>
                  <th>Müraciət</th>
                  <th>İşə qəbul</th>
                  <th>Orta işə qəbul müddəti</th>
                </tr>
              </thead>
              <tbody>
                {data.trend.map((m) => (
                  <tr key={m.month}>
                    <td>{m.month}</td>
                    <td>{m.applications}</td>
                    <td>{m.hires}</td>
                    <td>
                      {m.avgDaysToHire === null
                        ? "—"
                        : `${m.avgDaysToHire} gün`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <h3>Vakansiyalar üzrə</h3>
          {reports && (
            <div className="admin-actions">
              <ReportButton
                kind="jobs"
                label="Vakansiyalar XLSX"
                query={query}
              />
              <ReportButton
                kind="applications"
                label="Müraciətlər XLSX"
                query={query}
              />
              {me?.permissions.includes("tests") && !data.scope?.ownOnly && (
                <ReportButton kind="tests" label="Testlər XLSX" query={query} />
              )}
              {me?.permissions.includes("offers") && !data.scope?.ownOnly && (
                <ReportButton
                  kind="offers"
                  label="Təkliflər XLSX"
                  query={query}
                />
              )}
            </div>
          )}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vakansiya</th>
                <th>Status</th>
                <th>Baxan namizəd</th>
                <th>Müraciət</th>
                <th>Konversiya</th>
                <th>Müsahibə</th>
                <th>Təklif</th>
                <th>İşə qəbul</th>
              </tr>
            </thead>
            <tbody>
              {data.perJob.map((j) => (
                <tr key={j.id}>
                  <td>
                    <strong>{j.title}</strong>
                  </td>
                  <td>{j.status}</td>
                  <td>{j.viewers ?? 0}</td>
                  <td>{j.applications}</td>
                  <td>
                    {j.conversion === null || j.conversion === undefined
                      ? "—"
                      : `${j.conversion}%`}
                  </td>
                  <td>{j.interview}</td>
                  <td>{j.offered}</td>
                  <td>{j.hired}</td>
                </tr>
              ))}
              {!data.perJob.length && (
                <tr>
                  <td colSpan={8}>
                    <p className="admin-empty">Hələ vakansiya yoxdur.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ---------- Vacancy approvals ----------
type ApprovalJob = {
  id: string;
  status: string;
  title: string;
  city: string;
  reason?: string;
  created: string;
  approval?: JobApproval;
  canDecide: boolean;
  canResubmit?: boolean;
  category?: string;
  mode?: string;
  type?: string;
  minYears?: number;
  maxYears?: number;
  minSalary?: number;
  maxSalary?: number;
  skills?: string[];
  description?: string;
  requirements?: string;
  deadline?: string;
  workSchedule?: string;
  benefits?: string;
};
export function ApprovalsPage({
  notify,
  onChange,
}: {
  notify: Notify;
  onChange: () => void;
}) {
  const [data, load] = useLoad<{ jobs: ApprovalJob[] }>(
    "company/approvals",
    notify,
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<ApprovalJob | null>(null);
  const [edit, setEdit] = useState({
    description: "",
    requirements: "",
    minSalary: 0,
    maxSalary: 0,
  });
  async function resubmit() {
    if (!editing) return;
    try {
      await request("company/approvals/resubmit", {
        jobId: editing.id,
        job: edit,
      });
      notify("Vakansiya düzəlişlərlə yenidən təsdiqə göndərildi.");
      setEditing(null);
      load();
      onChange();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function decide(job: ApprovalJob, decision: "approve" | "reject") {
    try {
      const result = await request<{ status: string }>("company/approve", {
        jobId: job.id,
        decision,
        note: notes[job.id] || "",
      });
      notify(
        result.status === "published"
          ? "Vakansiya təsdiqləndi və yayımlandı."
          : result.status === "rejected"
            ? "Vakansiya rədd edildi."
            : "Təsdiqləndi; direktor təsdiqi gözlənilir.",
      );
      load();
      onChange();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  // Approves every ticked vacancy; each one is checked on its own, so a failure does not stop the rest.
  async function approvePicked() {
    let done = 0;
    let failed = "";
    for (const jobId of picked) {
      try {
        await request("company/approve", {
          jobId,
          decision: "approve",
          note: "",
        });
        done++;
      } catch (error) {
        failed = (error as Error).message;
      }
    }
    setPicked([]);
    notify(
      failed
        ? `${done} vakansiya təsdiqləndi. Biri alınmadı: ${failed}`
        : `${done} vakansiya təsdiqləndi.`,
    );
    load();
    onChange();
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  const decidable = data.jobs.filter((job) => job.canDecide);
  return (
    <div className="company-page">
      <p className="muted">
        Şöbə rəhbəri və ya rekruterin yaratdığı vakansiya şirkətin təsdiq
        zəncirinə görə (standart: əvvəlcə HR meneceri, sonra direktor)
        təsdiqlənir və yalnız bundan sonra yayımlanır.
      </p>
      {decidable.length > 1 && (
        <div className="form-actions">
          <button
            className="secondary"
            onClick={() =>
              setPicked(
                picked.length === decidable.length
                  ? []
                  : decidable.map((job) => job.id),
              )
            }
          >
            {picked.length === decidable.length
              ? "Seçimi təmizlə"
              : `Hamısını seç (${decidable.length})`}
          </button>
          <button
            className="primary"
            disabled={!picked.length}
            onClick={approvePicked}
          >
            Seçilənləri təsdiqlə ({picked.length})
          </button>
        </div>
      )}
      {data.jobs.map((job) => (
        <article key={job.id} className="panel approval-card">
          {job.canDecide && decidable.length > 1 && (
            <label className="approval-pick">
              <input
                type="checkbox"
                checked={picked.includes(job.id)}
                onChange={(e) =>
                  setPicked(
                    e.target.checked
                      ? [...picked, job.id]
                      : picked.filter((x) => x !== job.id),
                  )
                }
              />{" "}
              Toplu təsdiq üçün seç
            </label>
          )}
          <div className="section-heading">
            <div>
              <h3>{job.title}</h3>
              <p>
                {job.city} · göndərən: {job.approval?.requestedByName || "—"} ·{" "}
                {when(job.approval?.requestedAt || job.created)}
              </p>
              {job.reason && (
                <p className="muted">Daxili səbəb: {job.reason}</p>
              )}
              {job.status === "pending_approval" &&
                (() => {
                  const days = Math.floor(
                    (Date.now() -
                      Date.parse(job.approval?.requestedAt || job.created)) /
                      86400000,
                  );
                  return days >= 2 ? (
                    <p className="muted">⏱ {days} gündür gözləyir</p>
                  ) : null;
                })()}
            </div>
            <span
              className={`admin-status ${job.status === "rejected" ? "archived" : "paused"}`}
            >
              {job.status === "rejected" ? "Rədd edildi" : "Təsdiq gözləyir"}
            </span>
          </div>
          <details>
            <summary>Vakansiyanın tam məzmunu</summary>
            <p>
              <b>Kateqoriya:</b> {job.category || "—"} · <b>İş rejimi:</b>{" "}
              {job.mode || "—"} · <b>Məşğulluq:</b> {job.type || "—"}
            </p>
            <p>
              <b>Təcrübə:</b> {job.minYears ?? 0}–{job.maxYears ?? 0} il ·{" "}
              <b>Maaş:</b>{" "}
              {job.minSalary || job.maxSalary
                ? `${job.minSalary || 0}–${job.maxSalary || 0} AZN`
                : "göstərilməyib"}
              {job.deadline ? ` · son tarix ${day(job.deadline)}` : ""}
            </p>
            {!!job.skills?.length && (
              <p>
                <b>Bacarıqlar:</b> {job.skills.join(", ")}
              </p>
            )}
            {job.description && (
              <p>
                <b>Təsvir:</b>
                <br />
                {job.description}
              </p>
            )}
            {job.requirements && (
              <p>
                <b>Tələblər:</b>
                <br />
                {job.requirements}
              </p>
            )}
            {job.benefits && (
              <p>
                <b>Üstünlüklər:</b> {job.benefits}
              </p>
            )}
          </details>
          <ol className="approval-steps">
            {job.approval?.steps.map((step) => (
              <li key={step.role} className={step.decision || "waiting"}>
                {step.decision === "approved" ? (
                  <CheckCircle2 size={16} />
                ) : step.decision === "rejected" ? (
                  <XCircle size={16} />
                ) : (
                  <span className="dot" />
                )}
                <div>
                  <strong>
                    {step.role === "hr" ? "HR meneceri" : "Direktor"}
                  </strong>
                  <small>
                    {step.decision
                      ? `${step.byName} · ${when(step.at)}`
                      : "Gözləyir"}
                  </small>
                  {step.note && <small>“{step.note}”</small>}
                </div>
              </li>
            ))}
          </ol>
          {job.canResubmit && (
            <div className="approval-actions">
              <button
                className="primary"
                onClick={() => {
                  setEditing(job);
                  setEdit({
                    description: job.description || "",
                    requirements: job.requirements || "",
                    minSalary: job.minSalary || 0,
                    maxSalary: job.maxSalary || 0,
                  });
                }}
              >
                Düzəliş et və yenidən göndər
              </button>
            </div>
          )}
          {job.canDecide && (
            <div className="approval-actions">
              <input
                placeholder="Qeyd (rədd üçün məcburi)"
                value={notes[job.id] || ""}
                onChange={(e) =>
                  setNotes({ ...notes, [job.id]: e.target.value })
                }
              />
              <button
                className="secondary"
                onClick={() => decide(job, "reject")}
              >
                Rədd et
              </button>
              <button
                className="primary"
                onClick={() => decide(job, "approve")}
              >
                Təsdiqlə
              </button>
            </div>
          )}
        </article>
      ))}
      {!data.jobs.length && (
        <p className="admin-empty">Təsdiq gözləyən vakansiya yoxdur.</p>
      )}
      <RequestApprovals notify={notify} onChange={onChange} />
      <DelegationPanel notify={notify} />
      {editing && (
        <Modal
          title={`Yenidən göndər — ${editing.title}`}
          onClose={() => setEditing(null)}
        >
          <div className="offer-composer">
            <Field label="Təsvir">
              <textarea
                rows={4}
                value={edit.description}
                onChange={(e) =>
                  setEdit({ ...edit, description: e.target.value })
                }
              />
            </Field>
            <Field label="Tələblər">
              <textarea
                rows={3}
                value={edit.requirements}
                onChange={(e) =>
                  setEdit({ ...edit, requirements: e.target.value })
                }
              />
            </Field>
            <div className="form-grid">
              <Field label="Minimum maaş (AZN)">
                <input
                  type="number"
                  min={0}
                  value={edit.minSalary}
                  onChange={(e) =>
                    setEdit({ ...edit, minSalary: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Maksimum maaş (AZN)">
                <input
                  type="number"
                  min={0}
                  value={edit.maxSalary}
                  onChange={(e) =>
                    setEdit({ ...edit, maxSalary: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <p className="muted fine-print">
              Əvvəlki qərarlar tarixçədə saxlanılır; təsdiq mərhələləri yenidən
              başlayır.
            </p>
            <button className="primary" onClick={resubmit}>
              Yenidən təsdiqə göndər
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------- Offers and salary changes that wait for a director ----------
type ApprovalRequest = {
  id: string;
  kind: string;
  subject: string;
  requested_by_name: string;
  status: string;
  decided_by_name: string;
  note: string;
  created: string;
  decided: string;
  canDecide: boolean;
  canRespond?: boolean;
  reply?: string;
  escalated_at?: string;
};
const REQUEST_STATUS: Record<string, string> = {
  pending: "Təsdiq gözləyir",
  info: "Əlavə məlumat gözlənilir",
  approved: "Təsdiqləndi",
  rejected: "Rədd edildi",
};
const REQUEST_KIND: Record<string, string> = {
  offer: "İş təklifi",
  salary: "Maaş dəyişikliyi",
  exit: "İşçinin işdən çıxarılması",
  headcount: "Ştat planı dəyişikliyi",
};
type ApprovalRulesData = {
  offers: boolean;
  salaries: boolean;
  exits: boolean;
  headcount: boolean;
  chain: string;
  offerMin: number;
  raisePercent: number;
};
type ApprovalStats = {
  pending: number;
  info: number;
  approved: number;
  rejected: number;
  avgHours: number;
  byDecider: { name: string; count: number; avgHours: number }[];
};
function RequestApprovals({
  notify,
  onChange,
}: {
  notify: Notify;
  onChange: () => void;
}) {
  const [data, load] = useLoad<{ requests: ApprovalRequest[] }>(
    "company/requests",
    notify,
  );
  const [rules, loadRules] = useLoad<{
    rules: ApprovalRulesData;
    canEdit: boolean;
  }>("company/approval-rules", notify);
  const [stats, loadStats] = useLoad<ApprovalStats>(
    "company/approvals/stats",
    notify,
  );
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  async function decide(
    item: ApprovalRequest,
    decision: "approve" | "reject" | "info",
  ) {
    try {
      await request("company/requests/decide", {
        id: item.id,
        decision,
        note: notes[item.id] || "",
      });
      notify(
        decision === "approve"
          ? "Təsdiqləndi."
          : decision === "reject"
            ? "Rədd edildi."
            : "Sual göndərənə göndərildi.",
      );
      load();
      loadStats();
      onChange();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function respond(item: ApprovalRequest) {
    try {
      await request("company/requests/respond", {
        id: item.id,
        reply: replies[item.id] || "",
      });
      notify("Cavab göndərildi, sorğu yenidən təsdiqə düşdü.");
      load();
      loadStats();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function setRule(
    key: keyof ApprovalRulesData,
    value: boolean | string | number,
  ) {
    if (!rules) return;
    try {
      await request("company/approval-rules", { ...rules.rules, [key]: value });
      notify("Təsdiq qaydası yadda saxlanıldı.");
      loadRules();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function approvePicked() {
    let done = 0;
    let failed = "";
    for (const id of picked) {
      try {
        await request("company/requests/decide", {
          id,
          decision: "approve",
          note: "",
        });
        done++;
      } catch (error) {
        failed = (error as Error).message;
      }
    }
    setPicked([]);
    notify(
      failed
        ? `${done} sorğu təsdiqləndi. Biri alınmadı: ${failed}`
        : `${done} sorğu təsdiqləndi.`,
    );
    load();
    onChange();
  }
  const decidable = data?.requests.filter((item) => item.canDecide) || [];
  return (
    <section className="panel">
      <h3>Təklif, maaş, işdən çıxarılma və ştat təsdiqləri</h3>
      {stats && (
        <p className="muted">
          Gözləyən: <b>{stats.pending}</b> · Məlumat gözləyən:{" "}
          <b>{stats.info}</b> · Təsdiqlənən: <b>{stats.approved}</b> · Rədd
          edilən: <b>{stats.rejected}</b>
          {stats.avgHours > 0 && (
            <>
              {" "}
              · Orta qərar müddəti: <b>{stats.avgHours} saat</b>
            </>
          )}{" "}
          ·{" "}
          <a href="/api/joblink/company/report?kind=approvals" download>
            Tarixçəni Excel-ə yüklə
          </a>
        </p>
      )}
      {!!stats?.byDecider.length && (
        <details>
          <summary>Qərar verənlər üzrə</summary>
          <ul className="exam-list">
            {stats.byDecider.map((who) => (
              <li key={who.name} className="exam-row">
                <div>
                  <strong>{who.name}</strong>
                  <small>
                    {who.count} qərar · orta {who.avgHours} saat
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
      {rules && (
        <fieldset className="field approval-rules" disabled={!rules.canEdit}>
          <legend>Direktor təsdiqi tələb olunan əməliyyatlar</legend>
          <label>
            <input
              type="checkbox"
              checked={rules.rules.offers}
              onChange={(e) => setRule("offers", e.target.checked)}
            />{" "}
            İş təklifini direktor (və ya hesab sahibi) təsdiqləməlidir
          </label>
          <label>
            <input
              type="checkbox"
              checked={rules.rules.salaries}
              onChange={(e) => setRule("salaries", e.target.checked)}
            />{" "}
            İşçinin maaş dəyişikliyini direktor (və ya hesab sahibi)
            təsdiqləməlidir
          </label>
          <label>
            <input
              type="checkbox"
              checked={rules.rules.exits}
              onChange={(e) => setRule("exits", e.target.checked)}
            />{" "}
            İşçinin işdən çıxarılmasını direktor təsdiqləməlidir
          </label>
          <label>
            <input
              type="checkbox"
              checked={rules.rules.headcount}
              onChange={(e) => setRule("headcount", e.target.checked)}
            />{" "}
            Ştat planı dəyişikliyini direktor təsdiqləməlidir
          </label>
          <label>
            Təklif həddi (AZN):{" "}
            <input
              type="number"
              min={0}
              max={1000000}
              defaultValue={rules.rules.offerMin}
              key={`min-${rules.rules.offerMin}`}
              aria-label="Təklif həddi"
              onBlur={(e) => setRule("offerMin", Number(e.target.value) || 0)}
            />{" "}
            <small>
              bu məbləğdən aşağı təkliflər təsdiqsiz gedir (0 = hamısı təsdiqə
              düşür)
            </small>
          </label>
          <label>
            Maaş dəyişikliyi həddi (%):{" "}
            <input
              type="number"
              min={0}
              max={500}
              defaultValue={rules.rules.raisePercent}
              key={`pct-${rules.rules.raisePercent}`}
              aria-label="Maaş dəyişikliyi həddi"
              onBlur={(e) =>
                setRule("raisePercent", Number(e.target.value) || 0)
              }
            />{" "}
            <small>
              bundan kiçik dəyişikliklər təsdiqsiz keçir (0 = hamısı təsdiqə
              düşür)
            </small>
          </label>
          <label>
            Vakansiya təsdiq zənciri:{" "}
            <select
              value={rules.rules.chain}
              onChange={(e) => setRule("chain", e.target.value)}
            >
              <option value="both">HR meneceri, sonra direktor</option>
              <option value="hr">Yalnız HR meneceri</option>
              <option value="director">Yalnız direktor</option>
            </select>
          </label>
          {!rules.canEdit && (
            <small className="skill-picker-help">
              Bu qaydaları yalnız direktor və ya hesab sahibi dəyişə bilər.
            </small>
          )}
        </fieldset>
      )}
      {decidable.length > 1 && (
        <div className="form-actions">
          <button
            className="secondary"
            onClick={() =>
              setPicked(
                picked.length === decidable.length
                  ? []
                  : decidable.map((item) => item.id),
              )
            }
          >
            {picked.length === decidable.length
              ? "Seçimi təmizlə"
              : `Hamısını seç (${decidable.length})`}
          </button>
          <button
            className="primary"
            disabled={!picked.length}
            onClick={approvePicked}
          >
            Seçilənləri təsdiqlə ({picked.length})
          </button>
        </div>
      )}
      {data?.requests.map((item) => (
        <article key={item.id} className="approval-card">
          {item.canDecide && decidable.length > 1 && (
            <label className="approval-pick">
              <input
                type="checkbox"
                checked={picked.includes(item.id)}
                onChange={(e) =>
                  setPicked(
                    e.target.checked
                      ? [...picked, item.id]
                      : picked.filter((x) => x !== item.id),
                  )
                }
              />{" "}
              Toplu təsdiq üçün seç
            </label>
          )}
          <div className="section-heading">
            <div>
              <h4>{REQUEST_KIND[item.kind] || item.kind}</h4>
              <p>{item.subject}</p>
              <p className="muted">
                göndərən: {item.requested_by_name || "—"} · {when(item.created)}
              </p>
              {item.status !== "pending" && (
                <p className="muted">
                  {item.decided_by_name} · {when(item.decided)}
                  {item.note ? ` — ${item.note}` : ""}
                </p>
              )}
              {item.reply && (
                <p className="muted">Göndərənin cavabı: {item.reply}</p>
              )}
              {item.status === "pending" &&
                Date.now() - Date.parse(item.created) > 5 * 86_400_000 && (
                  <p className="muted">
                    ⏱ Gecikir
                    {item.escalated_at ? " (hesab sahibinə bildirilib)" : ""}
                  </p>
                )}
            </div>
            <span
              className={`admin-status ${item.status === "approved" ? "active" : item.status === "rejected" ? "archived" : "paused"}`}
            >
              {REQUEST_STATUS[item.status] || item.status}
            </span>
          </div>
          {item.canDecide && (
            <div className="form-actions">
              <input
                placeholder="Qeyd (rədd və sual üçün məcburi)"
                aria-label="Qeyd"
                value={notes[item.id] || ""}
                onChange={(e) =>
                  setNotes({ ...notes, [item.id]: e.target.value })
                }
              />
              <button
                className="secondary"
                onClick={() => decide(item, "info")}
              >
                Məlumat istə
              </button>
              <button
                className="secondary"
                onClick={() => decide(item, "reject")}
              >
                Rədd et
              </button>
              <button
                className="primary"
                onClick={() => decide(item, "approve")}
              >
                Təsdiqlə
              </button>
            </div>
          )}
          {item.canRespond && (
            <div className="form-actions">
              <input
                placeholder="Cavabınız (kifayət qədər izahat yazın)"
                aria-label="Cavab"
                value={replies[item.id] || ""}
                onChange={(e) =>
                  setReplies({ ...replies, [item.id]: e.target.value })
                }
              />
              <button className="primary" onClick={() => respond(item)}>
                Cavab göndər
              </button>
            </div>
          )}
        </article>
      ))}
      {data && !data.requests.length && (
        <p className="admin-empty">
          Təsdiq gözləyən təklif və ya maaş dəyişikliyi yoxdur.
        </p>
      )}
    </section>
  );
}

// ---------- Substitutes ----------
type Delegate = {
  id: string;
  from_name: string;
  to_name: string;
  until: string;
  mine: boolean;
  canRemove: boolean;
};
function DelegationPanel({ notify }: { notify: Notify }) {
  const [data, load] = useLoad<{
    delegates: Delegate[];
    members: { id: string; name: string }[];
    canDelegate: boolean;
  }>("company/delegates", notify);
  const [form, setForm] = useState({ userId: "", until: "" });
  const today = new Date().toISOString().slice(0, 10);
  const last = new Date(Date.now() + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      await request("company/delegates", form);
      notify("Əvəzedici təyin edildi.");
      setForm({ userId: "", until: "" });
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return null;
  return (
    <section className="panel">
      <h3>Əvəzedici</h3>
      <p className="muted">
        Məzuniyyətdə və ya ezamiyyətdə olan təsdiqləyən işçi komanda üzvünü
        müəyyən tarixə qədər (30 günədək) əvəzedici seçə bilər. Əvəzedici onun
        adından vakansiya, təklif və maaş qərarı verə bilər; qərar “(əvəzedici)”
        işarəsi ilə qeyd olunur.
      </p>
      {data.canDelegate && (
        <form className="form-grid" onSubmit={save}>
          <Field label="Əvəzedici">
            <select
              required
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
            >
              <option value="">Üzv seçin</option>
              {data.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tarixədək">
            <input
              type="date"
              required
              min={today}
              max={last}
              value={form.until}
              onChange={(e) => setForm({ ...form, until: e.target.value })}
            />
          </Field>
          <button className="primary">Təyin et</button>
        </form>
      )}
      <ul className="exam-list">
        {data.delegates.map((d) => (
          <li key={d.id} className="exam-row">
            <div>
              <strong>{d.to_name || "—"}</strong>
              <small>
                {d.from_name || "Hesab sahibi"} adından · {d.until} tarixədək
              </small>
            </div>
            {d.canRemove && (
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    await request("company/delegates/delete", { id: d.id });
                    notify("Əvəzedici geri götürüldü.");
                    load();
                  } catch (error) {
                    notify((error as Error).message);
                  }
                }}
              >
                Geri götür
              </button>
            )}
          </li>
        ))}
        {!data.delegates.length && (
          <li className="admin-empty">Aktiv əvəzedici yoxdur.</li>
        )}
      </ul>
    </section>
  );
}

// ---------- Team ----------
type Team = {
  owner: { id: string; name: string; email: string } | null;
  members: {
    id: string;
    email: string;
    role: string;
    department: string;
    grants: string[];
    status: string;
    name: string;
    created: string;
    lastActive?: string;
    expired?: boolean;
  }[];
  inviteDays?: number;
  grantable?: Grantable[];
  permissionInfo?: { id: string; label: string; group: string; description: string; grantable: boolean; sensitive?: boolean }[];
  permissionGroups?: string[];
  matrix?: { role: string; permissions: string[] }[];
  roles: { id: string; label: string; description: string }[];
  canManage: boolean;
};
type Grantable = { id: string; label: string; group: string; description: string; sensitive?: boolean };

// The extra permissions of one person, grouped; what the role already brings is shown ticked and locked.
function GrantPicker({ grantable, value, onChange, rolePermissions }: { grantable: Grantable[]; value: string[]; onChange: (next: string[]) => void; rolePermissions: string[] }) {
  const groups = [...new Set(grantable.map((g) => g.group))];
  return (
    <div className="grant-picker">
      {groups.map((group) => (
        <div key={group} className="grant-group">
          <h5>{group}</h5>
          {grantable
            .filter((g) => g.group === group)
            .map((g) => {
              const byRole = rolePermissions.includes(g.id);
              return (
                <label key={g.id} className={`grant-item${byRole ? " grant-role" : ""}`}>
                  <input
                    type="checkbox"
                    checked={byRole || value.includes(g.id)}
                    disabled={byRole}
                    onChange={(e) => onChange(e.target.checked ? [...value, g.id] : value.filter((x) => x !== g.id))}
                  />
                  <span>
                    <b>{g.label}</b>
                    {g.sensitive && <em className="grant-sensitive"> həssas</em>}
                    {byRole && <em className="grant-by-role"> rolla gəlir</em>}
                    <small>{g.description}</small>
                  </span>
                </label>
              );
            })}
        </div>
      ))}
    </div>
  );
}

// What every role holds by itself.
function RoleMatrix({ team }: { team: Team }) {
  if (!team.matrix || !team.permissionInfo) return null;
  const roles = team.roles;
  return (
    <details className="panel role-matrix">
      <summary>
        <b>Rolların icazələri</b> <small className="muted">— hər rolun özündə nə var</small>
      </summary>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>İcazə</th>
              {roles.map((r) => (
                <th key={r.id}>{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(team.permissionGroups || []).map((group) => [
              <tr key={`g-${group}`} className="staff-department">
                <td colSpan={roles.length + 1}>
                  <b>{group}</b>
                </td>
              </tr>,
              ...team.permissionInfo!
                .filter((p) => p.group === group)
                .map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.label}
                      <small className="skill-description">{p.description}</small>
                    </td>
                    {roles.map((r) => (
                      <td key={r.id}>{team.matrix!.find((m) => m.role === r.id)?.permissions.includes(p.id) ? "✓" : p.grantable ? <span className="muted">əlavə</span> : "—"}</td>
                    ))}
                  </tr>
                )),
            ])}
          </tbody>
        </table>
      </div>
      <small className="skill-picker-help">“əlavə” — rolda yoxdur, amma hesab sahibi bu icazəni konkret şəxsə verə bilər. “—” — yalnız rolla gəlir, ayrıca verilmir.</small>
    </details>
  );
}
type Invite = {
  id: string;
  role: string;
  department: string;
  company: string;
  created: string;
};
export function TeamPage({
  me,
  notify,
  onJoined,
}: {
  me: CompanyMe | null;
  notify: Notify;
  onJoined: () => void;
}) {
  const [team, load] = useLoad<Team>("company/team", notify);
  const [invites, loadInvites] = useLoad<{ invites: Invite[] }>(
    "company/invites",
    notify,
  );
  const [form, setForm] = useState<{
    email: string;
    role: string;
    department: string;
    grants: string[];
  }>({ email: "", role: "manager", department: "", grants: [] });
  const [grantsFor, setGrantsFor] = useState<Team["members"][number] | null>(null);
  const [draftGrants, setDraftGrants] = useState<string[]>([]);
  const [activity, setActivity] = useState<
    | {
        actor: string;
        actor_id: string;
        actions: number;
        last: string;
        kinds: number;
      }[]
    | null
  >(null);
  const [audit, setAudit] = useState<
    | {
        action: string;
        target: string;
        detail: string;
        created: string;
        actor: string;
      }[]
    | null
  >(null);
  const roleName = (id: string) =>
    team?.roles.find((r) => r.id === id)?.label || id;
  async function invite(event: React.FormEvent) {
    event.preventDefault();
    try {
      await request("company/team/invite", form);
      notify(
        "Dəvət göndərildi. İstifadəçi bu e-poçtla şirkət hesabı kimi daxil olub dəvəti qəbul etməlidir.",
      );
      setForm({ ...form, email: "", department: "", grants: [] });
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function act(path: string, body: unknown, message: string) {
    try {
      await request(path, body);
      notify(message);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <div className="company-page">
      {!!invites?.invites.length && (
        <section className="panel invite-banner">
          <h3>
            <UserPlus size={18} /> Komanda dəvətləri
          </h3>
          {invites.invites.map((inv) => (
            <div key={inv.id} className="exam-row">
              <div>
                <strong>{inv.company}</strong>
                <small>
                  {roleName(inv.role)}
                  {inv.department ? ` · ${inv.department}` : ""}
                </small>
              </div>
              <div className="admin-actions">
                <button
                  onClick={async () => {
                    await act(
                      "company/invites/respond",
                      { id: inv.id, accept: false },
                      "Dəvət rədd edildi.",
                    );
                    loadInvites();
                  }}
                >
                  Rədd et
                </button>
                <button
                  className="primary"
                  onClick={async () => {
                    await act(
                      "company/invites/respond",
                      { id: inv.id, accept: true },
                      "Komandaya qoşuldunuz.",
                    );
                    loadInvites();
                    onJoined();
                  }}
                >
                  Qəbul et
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
      {me && (
        <p className="muted">
          Sizin rolunuz: <b>{me.roleLabel}</b>
          {me.member && (
            <>
              {" "}
              ·{" "}
              <button
                className="text-button"
                onClick={async () => {
                  if (window.confirm("Komandadan çıxmaq istəyirsiniz?")) {
                    await act("company/leave", {}, "Komandadan çıxdınız.");
                    onJoined();
                  }
                }}
              >
                Komandadan çıx
              </button>
            </>
          )}
        </p>
      )}
      {team?.canManage && (
        <form className="panel team-invite" onSubmit={invite}>
          <h3>
            <UserPlus size={18} /> Komandaya üzv dəvət et
          </h3>
          <div className="form-grid">
            <Field label="E-poçt">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Hazır şablon">
              <select
                value=""
                onChange={(e) => {
                  const preset = ROLE_PRESETS.find(
                    (p) => p.id === e.target.value,
                  );
                  if (preset)
                    setForm({
                      ...form,
                      role: preset.role,
                      grants: preset.grants.filter((g) =>
                        team.grantable?.some((x) => x.id === g),
                      ),
                    });
                }}
              >
                <option value="">Şablon seçin…</option>
                {ROLE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id} title={p.description}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rol">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {team.roles
                  .filter(
                    (r) =>
                      r.id !== "owner" &&
                      (r.id !== "director" || me?.role === "owner"),
                  )
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Şöbə">
              <input
                value={form.department}
                placeholder="Məsələn: Maliyyə"
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
              />
            </Field>
          </div>
          <small className="skill-picker-help">
            {team.roles.find((r) => r.id === form.role)?.description}
          </small>
          {!!team.grantable?.length && (
            <details className="field grant-details" open={form.grants.length > 0}>
              <summary>
                Əlavə icazələr (rolun üstündən){form.grants.length ? ` — ${form.grants.length} seçilib` : ""}
              </summary>
              <GrantPicker
                grantable={team.grantable}
                value={form.grants}
                rolePermissions={team.matrix?.find((m) => m.role === form.role)?.permissions || []}
                onChange={(grants) => setForm({ ...form, grants })}
              />
            </details>
          )}
          <button className="primary">
            <Plus size={14} /> Dəvət et
          </button>
        </form>
      )}
      {team && <RoleMatrix team={team} />}
      {grantsFor && team?.grantable && (
        <Modal title={`İcazələr: ${grantsFor.name || grantsFor.email}`} onClose={() => setGrantsFor(null)}>
          <div className="offer-composer">
            <p className="muted">
              Rol: <b>{roleName(grantsFor.role)}</b>. Rolun özündə olan icazələr işarəli və kilidlidir; aşağıdakılar bu şəxsə əlavə verilir.
            </p>
            <GrantPicker
              grantable={team.grantable}
              value={draftGrants}
              rolePermissions={team.matrix?.find((x) => x.role === grantsFor.role)?.permissions || []}
              onChange={setDraftGrants}
            />
            <div className="admin-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  void act(
                    "company/team/update",
                    { id: grantsFor.id, role: grantsFor.role, department: grantsFor.department, grants: draftGrants },
                    "İcazələr yeniləndi.",
                  );
                  setGrantsFor(null);
                }}
              >
                Yadda saxla
              </button>
              <button type="button" className="secondary" onClick={() => setDraftGrants([])}>
                Əlavə icazələri sıfırla
              </button>
            </div>
          </div>
        </Modal>
      )}
      <section className="panel">
        <h3>
          <Users size={18} /> Komanda
        </h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ad / e-poçt</th>
                <th>Rol</th>
                <th>Şöbə</th>
                <th>Status</th>
                {team?.canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {team?.owner && (
                <tr>
                  <td>
                    <strong>{team.owner.name}</strong>
                    <small className="skill-description">
                      {team.owner.email}
                    </small>
                  </td>
                  <td>Hesab sahibi</td>
                  <td>—</td>
                  <td>
                    <span className="admin-status active">Aktiv</span>
                  </td>
                  {team.canManage && <td />}
                </tr>
              )}
              {team?.members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.name || "—"}</strong>
                    <small className="skill-description">{m.email}</small>
                  </td>
                  <td>
                    {team.canManage ? (
                      <select
                        value={m.role}
                        aria-label="Rol"
                        onChange={(e) =>
                          act(
                            "company/team/update",
                            {
                              id: m.id,
                              role: e.target.value,
                              department: m.department,
                              grants: m.grants,
                            },
                            "Rol dəyişdirildi.",
                          )
                        }
                      >
                        {team.roles
                          .filter((r) => r.id !== "owner")
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                      </select>
                    ) : (
                      roleName(m.role)
                    )}
                    {team.canManage && !!team.grantable?.length && (
                      <button type="button" className="text-button" onClick={() => {
                          setGrantsFor(m);
                          setDraftGrants(m.grants);
                        }}>
                        İcazələr{m.grants.length ? ` (+${m.grants.length})` : ""}
                      </button>
                    )}
                    {!team.canManage && !!m.grants.length && (
                      <small className="skill-description">Əlavə icazə: {m.grants.length}</small>
                    )}
                  </td>
                  <td>{m.department || "—"}</td>
                  <td>
                    <span
                      className={`admin-status ${m.status === "active" ? "active" : "paused"}`}
                    >
                      {m.status === "active"
                        ? "Aktiv"
                        : m.status === "suspended"
                          ? "Dayandırılıb"
                          : m.expired
                            ? "Dəvətin müddəti bitib"
                            : "Dəvət gözləyir"}
                    </span>
                    {m.status === "active" && (
                      <small className="skill-description">
                        {m.lastActive
                          ? `Son fəaliyyət: ${when(m.lastActive)}`
                          : "Hələ fəaliyyət yoxdur"}
                      </small>
                    )}
                    {m.status === "invited" && (
                      <small className="skill-description">
                        Göndərilib: {when(m.created)} · {team.inviteDays || 14}{" "}
                        gün qüvvədədir
                      </small>
                    )}
                  </td>
                  {team.canManage && (
                    <td>
                      <div className="admin-actions">
                        {m.status === "invited" && (
                          <button
                            onClick={() =>
                              act(
                                "company/team/resend",
                                { id: m.id },
                                "Dəvət yenidən göndərildi.",
                              )
                            }
                          >
                            Yenidən göndər
                          </button>
                        )}
                        {(m.status === "active" ||
                          m.status === "suspended") && (
                          <button
                            onClick={() =>
                              m.status === "active"
                                ? window.confirm(
                                    `${m.email} müvəqqəti dayandırılsın? Rolu saxlanılır, amma şirkət hesabında işləyə bilməz.`,
                                  ) &&
                                  act(
                                    "company/team/status",
                                    { id: m.id, suspended: true },
                                    "Üzv dayandırıldı.",
                                  )
                                : act(
                                    "company/team/status",
                                    { id: m.id, suspended: false },
                                    "Üzvün girişi bərpa olundu.",
                                  )
                            }
                          >
                            {m.status === "active" ? "Dayandır" : "Bərpa et"}
                          </button>
                        )}
                        <button
                          aria-label="Çıxar"
                          onClick={() =>
                            window.confirm(
                              `${m.email} komandadan çıxarılsın?`,
                            ) &&
                            act(
                              "company/team/remove",
                              { id: m.id },
                              "Üzv çıxarıldı.",
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {(team?.canManage || me?.permissions?.includes("audit")) && (
        <section className="panel">
          <div className="section-heading">
            <h3>Fəaliyyət jurnalı</h3>
            <div className="admin-actions">
              <button
                onClick={() =>
                  request<{ members: NonNullable<typeof activity> }>(
                    "company/audit-summary?days=30",
                  )
                    .then((d) => setActivity(d.members))
                    .catch((e) => notify((e as Error).message))
                }
              >
                Üzv fəaliyyəti (30 gün)
              </button>
              <button
                onClick={() =>
                  request<{ events: NonNullable<typeof audit> }>(
                    "company/audit",
                  )
                    .then((d) => setAudit(d.events))
                    .catch((e) => notify((e as Error).message))
                }
              >
                Göstər
              </button>
            </div>
          </div>
          {activity && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Üzv</th>
                    <th>Əməliyyat</th>
                    <th>Fərqli növ</th>
                    <th>Son fəaliyyət</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((m) => (
                    <tr key={m.actor_id}>
                      <td>{m.actor || "Hesab sahibi"}</td>
                      <td>{m.actions}</td>
                      <td>{m.kinds}</td>
                      <td>{when(m.last)}</td>
                    </tr>
                  ))}
                  {!activity.length && (
                    <tr>
                      <td colSpan={4}>
                        <p className="admin-empty">Son 30 gündə qeyd yoxdur.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {audit && (
            <ol className="event-timeline">
              {audit.map((e, i) => (
                <li key={i}>
                  <time>{when(e.created)}</time>
                  <span>
                    {e.actor} — {AUDIT_LABELS[e.action] || e.action}
                    {e.target && !/^[0-9a-f-]{36}$/.test(e.target)
                      ? `: ${e.target}`
                      : ""}
                  </span>
                  {e.detail && <small>{e.detail}</small>}
                </li>
              ))}
              {!audit.length && <li>Qeyd yoxdur.</li>}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
const AUDIT_LABELS: Record<string, string> = {
  "view-payroll": "əmək haqqı cədvəlinə baxdı",
  "view-payslip": "işçinin haqq-hesab vərəqəsinə baxdı",
  "view-salaries": "işçilərin maaşlarına baxdı",
  "view-personal-data": "işçilərin şəxsi məlumatlarına baxdı",
  "view-salary-history": "maaş tarixçəsinə baxdı",
  "view-settlement-report": "hesablaşma hesabatına baxdı",
  "view-fund-report": "kadr və fond hesabatına baxdı",
  "payroll-exported": "əmək haqqı faylı yüklədi",
  "payroll-report-exported": "hesablaşma hesabatını yüklədi",
  "payroll-approved": "əmək haqqı ayını təsdiqlədi",
  "payroll-reopened": "əmək haqqı ayının təsdiqini geri çəkdi",
  "payroll-payment-reversed": "ödənişi geri çəkdi",
  "payroll-batch-approved": "bank ödəniş sənədini təsdiqlədi",
  "payroll-recurring-added": "təkrarlanan maddə əlavə etdi",
  "payroll-inputs-imported": "əmək haqqı məlumatlarını Excel-dən yüklədi",
  "hours-imported": "işlənən saatları Excel-dən yüklədi",
  "test-results-exported": "test nəticələrini Excel-ə yüklədi",
  "test-ai-parse": "test faylını AI ilə oxudu",
  "employee-doc-added": "işçi sənədi əlavə etdi",
  "employee-doc-viewed": "işçi sənədini açdı",
  "employee-doc-deleted": "işçi sənədini sildi",
  "headcount-plan": "ştat planını dəyişdi",
  "offer-template-saved": "təklif şablonu saxladı",
  "member-invited": "üzv dəvət etdi",
  "member-role": "rolu dəyişdi",
  "member-removed": "üzvü çıxardı",
  "approval-requested": "təsdiq sorğusu göndərdi",
  "request-approved": "sorğunu təsdiqlədi",
  "request-rejected": "sorğunu rədd etdi",
  "approval-rules": "təsdiq qaydasını dəyişdi",
  "delegate-set": "əvəzedici təyin etdi",
  "delegate-removed": "əvəzedicini geri götürdü",
  "member-suspended": "üzvü dayandırdı",
  "member-reactivated": "üzvün girişini bərpa etdi",
  "member-invite-resent": "dəvəti yenidən göndərdi",
  "company-gallery": "şirkət qalereyasını dəyişdi",
  "company-logo": "loqonu dəyişdi",
  "member-joined": "komandaya qoşuldu",
  "member-left": "komandadan çıxdı",
  "job-submitted": "vakansiyanı təsdiqə göndərdi",
  "job-published": "vakansiya yayımladı",
  "job-approved": "vakansiyanı təsdiqlədi",
  "job-rejected": "vakansiyanı rədd etdi",
  "company-profile": "şirkət məlumatlarını yenilədi",
  "verification-submitted": "yoxlama sənədini yüklədi",
  "salary-changed": "maaşı dəyişdi",
  "employee-added": "işçi əlavə etdi",
  "employee-removed": "işçini sildi",
  "report-exported": "hesabat yüklədi",
};

// ---------- Company details and verification ----------
type ProfileData = {
  hasLogo?: boolean;
  details: CompanyDetails;
  docName: string;
  verification: string;
  verificationLabel: string;
  note: string;
  submittedAt: string;
  reviewedAt: string;
  canEdit: boolean;
};
// Photos for the public employer page: office, team, events.
function GalleryEditor({
  notify,
  canEdit,
  onCount,
}: {
  notify: Notify;
  canEdit: boolean;
  onCount: (count: number) => void;
}) {
  const [data, load] = useLoad<{ images: string[]; limit: number }>(
    "company/gallery",
    notify,
  );
  const count = data?.images.length ?? 0;
  useEffect(() => onCount(count), [count, onCount]);
  if (!data) return null;
  return (
    <div className="field company-gallery">
      <span>
        Şəkil qalereyası (ofis, komanda; PNG/JPG/WEBP, hər biri 300 KB-a qədər,
        ən çoxu {data.limit})
      </span>
      <div className="gallery-grid">
        {data.images.map((imageId) => (
          <figure key={imageId}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/joblink/companies/image?id=${encodeURIComponent(imageId)}`}
              alt="Şirkət şəkli"
              loading="lazy"
            />
            {canEdit && (
              <button
                type="button"
                aria-label="Şəkli sil"
                onClick={async () => {
                  try {
                    await request("company/gallery/delete", { id: imageId });
                    notify("Şəkil silindi.");
                    load();
                  } catch (error) {
                    notify((error as Error).message);
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </figure>
        ))}
        {!data.images.length && (
          <p className="muted fine-print">Hələ şəkil əlavə edilməyib.</p>
        )}
      </div>
      {canEdit && data.images.length < data.limit && (
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Qalereyaya şəkil əlavə et"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.size > 300_000)
              return notify("Şəkil 300 KB-dan kiçik olmalıdır.");
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                await request("company/gallery", {
                  type: file.type,
                  data: String(reader.result).split(",")[1] || "",
                });
                notify("Şəkil əlavə edildi.");
                load();
              } catch (error) {
                notify((error as Error).message);
              }
            };
            reader.readAsDataURL(file);
          }}
        />
      )}
    </div>
  );
}
export function CompanyProfilePage({
  notify,
  onChange,
}: {
  notify: Notify;
  onChange: () => void;
}) {
  const [data, load] = useLoad<ProfileData>("company/profile", notify);
  const [details, setDetails] = useState<CompanyDetails | null>(null);
  const [doc, setDoc] = useState<{
    name: string;
    type: string;
    data: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [galleryCount, setGalleryCount] = useState(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (data) setDetails(data.details);
  }, [data]);
  if (!data || !details) return <p className="muted">Yüklənir…</p>;
  const set = (key: keyof CompanyDetails, value: string) =>
    setDetails({ ...details, [key]: value });
  const fields: [keyof CompanyDetails, string, string?][] = [
    ["legalName", "Hüquqi ad"],
    ["voen", "VÖEN", "10 rəqəm"],
    ["director", "Direktor (Ad Soyad)"],
    ["legalAddress", "Hüquqi ünvan"],
    ["phone", "Telefon"],
    ["email", "Rəsmi e-poçt"],
    ["website", "Vebsayt"],
    ["industry", "Sahə"],
    ["bankName", "Bank"],
    ["iban", "Hesab (IBAN)"],
  ];
  const publicFields: [keyof CompanyDetails, string, string?][] = [
    ["officeAddress", "Ofis ünvanı (namizədlər görür)"],
    ["mapUrl", "Xəritə linki", "Google Maps / Yandex / 2GIS"],
    ["videoUrl", "Şirkət videosu (link)", "YouTube və s."],
    ["linkedin", "LinkedIn"],
    ["instagram", "Instagram"],
    ["facebook", "Facebook"],
    ["foundedYear", "Yarandığı il", "2012"],
  ];
  async function save() {
    setBusy(true);
    try {
      const result = await request<{ verification: string }>(
        "company/profile",
        { details, document: doc || undefined },
      );
      notify(
        doc
          ? "Sənəd yükləndi. Administrator yoxladıqdan sonra şirkətiniz təsdiqlənəcək."
          : result.verification === "none" && data?.verification === "verified"
            ? "Hüquqi məlumat dəyişdiyi üçün yenidən yoxlama tələb olunur."
            : "Şirkət məlumatları yadda saxlanıldı.",
      );
      setDoc(null);
      load();
      onChange();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="company-page">
      <section className={`panel verification-card ${data.verification}`}>
        <BadgeCheck size={26} />
        <div>
          <strong>{data.verificationLabel}</strong>
          <p>
            {data.verification === "verified"
              ? `Şirkətiniz ${day(data.reviewedAt)} tarixində təsdiqlənib. Vakansiyalarınızda “Təsdiqlənmiş şirkət” nişanı görünür.`
              : data.verification === "pending"
                ? `Sənəd ${day(data.submittedAt)} tarixində göndərilib, administrator yoxlayır.`
                : data.verification === "rejected"
                  ? `Səbəb: ${data.note || "—"}. Düzgün sənədi yenidən yükləyin.`
                  : "e-taxes.gov.az-dan VÖEN qeydiyyat şəhadətnaməsini (və ya çıxarışı) PDF kimi yükləyin. Təsdiqlənmiş şirkətlər namizədlərə daha etibarlı görünür."}
          </p>
          {data.docName && (
            <a
              href="/api/joblink/company/verification-doc"
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={13} /> {data.docName}
            </a>
          )}
        </div>
      </section>
      <section className="panel">
        <h3>
          <Building2 size={18} /> Şirkət rekvizitləri
        </h3>
        <fieldset disabled={!data.canEdit} className="plain-fieldset">
          <div className="form-grid">
            {fields.map(([key, label, placeholder]) => (
              <Field key={key} label={label}>
                <input
                  value={details[key]}
                  placeholder={placeholder}
                  onChange={(e) => set(key, e.target.value)}
                />
              </Field>
            ))}
            <Field label="İşçi sayı">
              <select
                value={details.size}
                onChange={(e) => set("size", e.target.value)}
              >
                <option value="">Seçin</option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <h4>İşəgötürən səhifəsi (namizədlərə görünür)</h4>
          {(() => {
            const done = profileCompleteness(
              details,
              !!data.hasLogo,
              galleryCount,
            );
            return (
              <div className="profile-meter" role="status">
                <div className="meter-track" aria-hidden="true">
                  <div
                    className="meter-fill"
                    style={{ width: `${done.percent}%` }}
                  />
                </div>
                <p>
                  <b>Səhifə {done.percent}% tamamlanıb.</b>
                  {done.missing.length > 0 && (
                    <> Çatışmayanlar: {done.missing.join(", ")}.</>
                  )}
                </p>
              </div>
            );
          })()}
          <div className="form-grid">
            {publicFields.map(([key, label, placeholder]) => (
              <Field key={key} label={label}>
                <input
                  value={details[key]}
                  placeholder={placeholder}
                  onChange={(e) => set(key, e.target.value)}
                />
              </Field>
            ))}
            <Field label="Loqo (PNG/JPG/WEBP, 300 KB-a qədər)">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (file.size > 300_000)
                    return notify("Loqo 300 KB-dan kiçik olmalıdır.");
                  const reader = new FileReader();
                  reader.onload = async () => {
                    try {
                      await request("company/logo", {
                        type: file.type,
                        data: String(reader.result).split(",")[1] || "",
                      });
                      notify("Loqo yeniləndi.");
                    } catch (error) {
                      notify((error as Error).message);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <button
                type="button"
                className="text-button"
                onClick={async () => {
                  await request("company/logo", { remove: true }).catch(
                    () => {},
                  );
                  notify("Loqo silindi.");
                }}
              >
                Loqonu sil
              </button>
            </Field>
          </div>
          <GalleryEditor
            notify={notify}
            canEdit={data.canEdit}
            onCount={setGalleryCount}
          />
          <p className="muted fine-print">
            {validVoen(details.voen) && (
              <>
                VÖEN tipi: <b>{VOEN_TYPE_LABEL[voenType(details.voen)]}</b>
                .{" "}
              </>
            )}
            <a href={VOEN_LOOKUP_URL} target="_blank" rel="noreferrer">
              VÖEN-i rəsmi vergi ödəyicisi səhifəsində yoxla (e-taxes)
            </a>
          </p>
          <Field label="Şirkət haqqında">
            <textarea
              rows={4}
              value={details.about}
              onChange={(e) => set("about", e.target.value)}
            />
          </Field>
          {data.verification !== "verified" && (
            <div className="field">
              <span>VÖEN şəhadətnaməsi (PDF və ya şəkil, maks. 1 MB)</span>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 1024 * 1024)
                    return notify("Fayl 1 MB-dan böyük olmamalıdır.");
                  const reader = new FileReader();
                  reader.onload = () =>
                    setDoc({
                      name: file.name,
                      type: file.type,
                      data: String(reader.result).split(",")[1] || "",
                    });
                  reader.readAsDataURL(file);
                }}
              />
            </div>
          )}
          <button className="primary" disabled={busy} onClick={save}>
            {doc ? "Saxla və yoxlamaya göndər" : "Yadda saxla"}
          </button>
        </fieldset>
        {!data.canEdit && (
          <p className="muted fine-print">
            Rekvizitləri yalnız hesab sahibi, direktor və HR dəyişə bilər.
          </p>
        )}
      </section>
    </div>
  );
}

// ---------- Current employees ----------
type Employee = {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  startDate: string;
  status: string;
  source: string;
  salary: number | null;
  endDate?: string;
  exitType?: string;
  exitReason?: string;
  exitNote?: string;
  probationEnd?: string;
  onboarding?: { total: number; done: number; overdue: number };
  section?: string;
  salaryType?: "gross" | "net";
  salaryFrom?: string;
  sector?: "private" | "public";
  vacationDays?: number;
  vacationUsed?: number;
  profile?: import("@/lib/employee-profile").EmployeeProfile | null;
  linked?: boolean;
  linkPending?: boolean;
  taxReduction?: number;
  staffBand?: { min: number; max: number; side: "" | "below" | "above" } | null;
  tenure?: string;
  vacation?: { entitlement: number; accrued: number; used: number; remaining: number };
  pay?: { net: number; gross: number; superGross: number; incomeTax: number; employeeSocial: number; employeeUnemployment: number; employeeMedical: number } | null;
};
type Option = { id: string; label: string };
const EVENT_LABEL: Record<string, string> = {
  hired: "İşə qəbul",
  left: "İşdən ayrıldı",
  returned: "İşə qayıtdı",
  "leave-start": "Məzuniyyətə çıxdı",
  "leave-end": "Məzuniyyətdən qayıtdı",
  position: "Vəzifə dəyişikliyi",
  department: "Şöbə dəyişikliyi",
  salary: "Maaş dəyişikliyi",
};
const EMPLOYEE_STATUS: Record<string, string> = {
  active: "İşləyir",
  leave: "Məzuniyyətdə",
  left: "İşdən çıxıb",
};
export function EmployeesPage({ notify }: { notify: Notify }) {
  const [data, load] = useLoad<{
    employees: Employee[];
    showSalary: boolean;
    canEdit: boolean;
    canStaff?: boolean;
    canOrders?: boolean;
    canDocs?: boolean;
    canPersonal?: boolean;
    exitTypes: Option[];
    exitReasons: Option[];
  }>("company/employees", notify);
  const [editing, setEditing] = useState<Partial<Employee> | null>(null);
  const [importing, setImporting] = useState(false);
  const [importingProfiles, setImportingProfiles] = useState(false);
  const [bulkCodes, setBulkCodes] = useState(false);
  // The employee list and the staff table are two views of one page, shown one at a time.
  const [view, setView] = useState<"people" | "staff">("people");
  // Extra sections of the employee card open in their own pop-up windows.
  const [panel, setPanel] = useState<"pay" | "orders" | "docs" | "onboarding" | "history" | "profile" | "link" | "hrdocs" | "salaryhist" | null>(null);
  const { names: orgNames, remember: rememberOrg } = useOrgNames();
  const [history, setHistory] = useState<
    {
      type: string;
      from_value: string;
      to_value: string;
      event_date: string;
      actor: string;
    }[]
  >([]);
  useEffect(() => {
    setHistory([]);
    if (editing?.id)
      request<{ events: typeof history }>(
        `company/employee-events?id=${editing.id}`,
      )
        .then((r) => setHistory(r.events))
        .catch(() => {});
  }, [editing?.id]);
  const [query, setQuery] = useState("");
  async function save() {
    try {
      const saved = await request<{
        salaryPending?: boolean;
        exitPending?: boolean;
      }>("company/employees/save", editing);
      const waiting = [
        saved.salaryPending && "maaş dəyişikliyi",
        saved.exitPending && "işdən çıxarılma",
      ].filter(Boolean);
      notify(
        waiting.length
          ? `Digər dəyişikliklər saxlanıldı. ${waiting.join(" və ")} direktorun təsdiqinə göndərildi.`
          : "İşçi məlumatı yadda saxlanıldı.",
      );
      setEditing(null);
      setPanel(null);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  const list = data.employees.filter((e) =>
    `${e.name} ${e.position} ${e.department} ${e.section || ""}`
      .toLocaleLowerCase("az")
      .includes(query.toLocaleLowerCase("az")),
  );
  const active = data.employees.filter((e) => e.status !== "left");
  const payroll = data.showSalary ? active.reduce((sum, e) => sum + (e.pay?.gross || 0), 0) : 0;
  const payrollNet = data.showSalary ? active.reduce((sum, e) => sum + (e.pay?.net || 0), 0) : 0;
  const payrollCost = data.showSalary ? active.reduce((sum, e) => sum + (e.pay?.superGross || 0), 0) : 0;
  return (
    <div className="company-page">
      {data.canStaff && (
        <div className="calc-tabs" role="tablist" aria-label="İşçilər bölməsi">
          <button type="button" role="tab" aria-selected={view === "people"} className={view === "people" ? "primary" : "ghost"} onClick={() => setView("people")}>
            İşçi siyahısı ({active.length})
          </button>
          <button type="button" role="tab" aria-selected={view === "staff"} className={view === "staff" ? "primary" : "ghost"} onClick={() => setView("staff")}>
            Ştat cədvəli
          </button>
        </div>
      )}
      {(view === "people" || !data.canStaff) && (
        <>
      <div className="section-heading">
        <input
          className="search-input"
          placeholder="Ad, vəzifə, departament və ya şöbə"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="admin-actions">
          <ReportButton kind="employees" label="XLSX" />
          {data.canEdit && (
            <button className="secondary" onClick={() => setBulkCodes(true)}>
              İşçi profili kodları
            </button>
          )}
          {data.canPersonal && (
            <button className="secondary" onClick={() => setImportingProfiles(true)}>
              <Download size={14} style={{ transform: "rotate(180deg)" }} /> Şəxsi məlumatları Excel-dən
            </button>
          )}
          {data.canEdit && (
            <button className="secondary" onClick={() => setImporting(true)}>
              <Download size={14} style={{ transform: "rotate(180deg)" }} /> Excel-dən əlavə et
            </button>
          )}
          {data.canEdit && (
            <button
              className="primary"
              onClick={() => setEditing({ status: "active", salaryType: "gross", sector: "private", vacationDays: 21, vacationUsed: 0 })}
            >
              <Plus size={14} /> İşçi əlavə et
            </button>
          )}
        </div>
      </div>
      {data.showSalary && (
        <p className="muted">
          Aylıq fond: gross <b>{azn(payroll)}</b>, net <b>{azn(payrollNet)}</b>, super-gross (işəgötürənin ümumi xərci) <b>{azn(payrollCost)}</b>. Maaşlar yalnız HR,
          direktor və hesab sahibinə görünür.
        </p>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Vəzifə</th>
              <th>Departament / Şöbə</th>
              <th>İşə başlama</th>
              <th>Status</th>
              {data.showSalary && <th>Net</th>}
              {data.showSalary && <th>Gross</th>}
              {data.showSalary && <th>Super-gross</th>}
              <th>Qalan məzuniyyət</th>
              {data.canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td>
                  <strong>{e.name}</strong>
                  <small className="skill-description">
                    {e.email}
                    {e.source === "hired" ? " · Joblink ilə işə qəbul" : ""}
                  </small>
                </td>
                <td>{e.position || "—"}</td>
                <td>
                  {e.department || "—"}
                  {e.section && <small className="skill-description">{e.section}</small>}
                </td>
                <td>
                  {day(e.startDate)}
                  {e.tenure && <small className="skill-description">İşləyib: {e.tenure}</small>}
                  {e.status === "active" && e.probationEnd && (
                    <small
                      className="skill-description"
                      style={{
                        color:
                          e.probationEnd < new Date().toISOString().slice(0, 10)
                            ? "#b45309"
                            : undefined,
                      }}
                    >
                      Sınaq: {day(e.probationEnd)}
                    </small>
                  )}
                  {e.status === "active" &&
                    !!e.onboarding?.total &&
                    e.onboarding.done < e.onboarding.total && (
                      <small
                        className="skill-description"
                        style={{
                          color: e.onboarding.overdue ? "#b45309" : undefined,
                        }}
                      >
                        Adaptasiya: {e.onboarding.done}/{e.onboarding.total}
                        {e.onboarding.overdue
                          ? ` · ${e.onboarding.overdue} gecikib`
                          : ""}
                      </small>
                    )}
                </td>
                <td>
                  {EMPLOYEE_STATUS[e.status] || e.status}
                  {e.status === "left" && e.endDate ? (
                    <small className="skill-description">
                      {day(e.endDate)}
                    </small>
                  ) : null}
                </td>
                {data.showSalary && <td>{e.pay ? azn(e.pay.net) : "—"}</td>}
                {data.showSalary && (
                  <td>
                    {e.pay ? azn(e.pay.gross) : "—"}
                    {e.staffBand?.side && (
                      <small className="danger-text" style={{ display: "block" }}>
                        ştat həddindən {e.staffBand.side === "below" ? "aşağı" : "yuxarı"}: {e.staffBand.min === e.staffBand.max ? azn(e.staffBand.min) : `${azn(e.staffBand.min)} – ${azn(e.staffBand.max)}`}
                      </small>
                    )}
                  </td>
                )}
                {data.showSalary && <td>{e.pay ? azn(e.pay.superGross) : "—"}</td>}
                <td>
                  {e.vacation ? (
                    <span style={{ color: e.vacation.remaining < 0 ? "#b45309" : undefined }}>{e.vacation.remaining} gün</span>
                  ) : (
                    "—"
                  )}
                  {e.vacation && (
                    <small className="skill-description">
                      {e.vacation.used} / {e.vacation.accrued} istifadə
                    </small>
                  )}
                </td>
                {data.canEdit && (
                  <td className="admin-actions">
                    <button onClick={() => setEditing(e)}>Düzəlt</button>
                    <button
                      aria-label="Sil"
                      onClick={async () => {
                        if (!window.confirm(`${e.name} siyahıdan silinsin?`))
                          return;
                        try {
                          await request("company/employees/remove", {
                            id: e.id,
                          });
                          load();
                        } catch (error) {
                          notify((error as Error).message);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={10}>
                  <p className="admin-empty">
                    İşçi yoxdur. Joblink ilə işə qəbul etdiyiniz namizədlər bura
                    avtomatik əlavə olunur.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
      {data.canStaff && view === "staff" && (
        <StaffTable
          notify={notify}
          onEditEmployee={(employeeId) => {
            const person = data.employees.find((x) => x.id === employeeId);
            if (!person) return notify("İşçi tapılmadı.");
            setView("people");
            setEditing(person);
          }}
        />
      )}
      {importing && <SheetImport kind="employees" notify={notify} onClose={() => setImporting(false)} onDone={load} />}
      {bulkCodes && (
        <BulkLinkCodes
          unlinked={data.employees.filter((e) => e.status !== "left" && !e.linked).length}
          withCode={data.employees.filter((e) => e.status !== "left" && !e.linked && e.linkPending).length}
          notify={notify}
          onClose={() => setBulkCodes(false)}
          onDone={load}
        />
      )}
      {importingProfiles && <SheetImport kind="profiles" notify={notify} onClose={() => setImportingProfiles(false)} onDone={load} />}
      {editing && (
        <Modal
          title={editing.id ? "İşçini düzəlt" : "Yeni işçi"}
          onClose={() => {
            setEditing(null);
            setPanel(null);
          }}
        >
          <div className="offer-composer">
            <div className="form-grid">
              <Field label="Ad Soyad">
                <input
                  value={editing.name || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </Field>
              <OrgNameInput label="Vəzifə" kind="position" names={orgNames} onAdded={rememberOrg} value={editing.position || ""} onChange={(position) => setEditing({ ...editing, position })} />
              <OrgNameInput label="Departament" kind="department" names={orgNames} onAdded={rememberOrg} value={editing.department || ""} onChange={(department) => setEditing({ ...editing, department })} />
              <OrgNameInput label="Şöbə" kind="section" names={orgNames} onAdded={rememberOrg} department={editing.department || ""} value={editing.section || ""} onChange={(section) => setEditing({ ...editing, section })} />
              <Field label="İşə başlama">
                <input
                  type="date"
                  value={editing.startDate || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, startDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Sınaq müddətinin sonu">
                <input
                  type="date"
                  value={editing.probationEnd || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, probationEnd: e.target.value })
                  }
                />
              </Field>
              <Field label="E-poçt">
                <input
                  value={editing.email || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
              </Field>
              <Field label="Telefon">
                <input
                  value={editing.phone || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                />
              </Field>
              <Field label="Aylıq maaş (AZN)">
                <input
                  type="number"
                  min={0}
                  value={editing.salary ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, salary: Number(e.target.value) })
                  }
                />
              </Field>
              {editing.id && (
                <Field label="Maaş dəyişirsə: qüvvəyə minmə tarixi (boşdursa bu gün)">
                  <input type="date" value={editing.salaryFrom || ""} onChange={(e) => setEditing({ ...editing, salaryFrom: e.target.value })} />
                </Field>
              )}
              {editing.staffBand && (
                <small className={editing.staffBand.side ? "danger-text" : "skill-picker-help"}>
                  Ştat cədvəlində bu vəzifə üçün maaş həddi (gross): {editing.staffBand.min === editing.staffBand.max ? azn(editing.staffBand.min) : `${azn(editing.staffBand.min)} – ${azn(editing.staffBand.max)}`}.
                  {editing.staffBand.side ? ` Hazırkı maaş həddən ${editing.staffBand.side === "below" ? "aşağıdır" : "yuxarıdır"} — ştatla fərq olmamalıdır.` : " Bu hüdudlardan kənar maaş təyin etmək olmaz."}
                </small>
              )}
              <Field label="Maaş növü">
                <select value={editing.salaryType || "gross"} onChange={(e) => setEditing({ ...editing, salaryType: e.target.value as "gross" | "net" })}>
                  <option value="gross">Gross (vergilərdən əvvəl)</option>
                  <option value="net">Net (əlinə verilən)</option>
                </select>
              </Field>
              <Field label="Vergi sektoru">
                <select value={editing.sector || "private"} onChange={(e) => setEditing({ ...editing, sector: e.target.value as "private" | "public" })}>
                  <option value="private">Özəl, qeyri-neft sektoru</option>
                  <option value="public">Dövlət, neft-qaz sektoru</option>
                </select>
              </Field>
              <Field label="Məzuniyyət (il üçün gün)">
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={editing.vacationDays ?? 21}
                  onChange={(e) => setEditing({ ...editing, vacationDays: Number(e.target.value) })}
                />
              </Field>
              <Field label="İndiyə qədər istifadə olunmuş məzuniyyət (gün)">
                <input
                  type="number"
                  min={0}
                  value={editing.vacationUsed ?? 0}
                  onChange={(e) => setEditing({ ...editing, vacationUsed: Number(e.target.value) })}
                />
              </Field>
              <Field label="Status">
                <select
                  value={editing.status || "active"}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value })
                  }
                >
                  {Object.entries(EMPLOYEE_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              {editing.status === "left" && (
                <>
                  <Field label="Ayrılma tarixi">
                    <input
                      type="date"
                      value={editing.endDate || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, endDate: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Ayrılma növü">
                    <select
                      value={editing.exitType || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, exitType: e.target.value })
                      }
                    >
                      <option value="">Seçin</option>
                      {data.exitTypes.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ayrılma səbəbi">
                    <select
                      value={editing.exitReason || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, exitReason: e.target.value })
                      }
                    >
                      <option value="">Seçin</option>
                      {data.exitReasons.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Qeyd (yalnız HR və direktor görür)">
                    <textarea
                      value={editing.exitNote || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, exitNote: e.target.value })
                      }
                    />
                  </Field>
                </>
              )}
            </div>
            <div className="admin-actions">
              <button type="button" className="primary" onClick={save}>
                Yadda saxla
              </button>
            </div>
            <div className="admin-actions" aria-label="Əlavə bölmələr">
              <button type="button" className="secondary" onClick={() => setPanel("pay")}>
                Maaş hesabı və məzuniyyət
              </button>
              {editing.id && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    try {
                      window.sessionStorage.setItem("joblink-calc-employee", editing.id!);
                    } catch {
                      // The calculators page still opens; the employee is picked there.
                    }
                    window.location.hash = "hr-calculator";
                  }}
                >
                  Kalkulyatorlar
                </button>
              )}
              {editing.id && data.canEdit && (
                <button type="button" className="secondary" onClick={() => setPanel("link")}>
                  İşçi profili{editing.linked ? " ✓" : ""}
                </button>
              )}
              {editing.id && data.canPersonal && (
                <button type="button" className="secondary" onClick={() => setPanel("profile")}>
                  Şəxsi məlumatlar
                </button>
              )}
              {editing.id && data.canOrders && (
                <button type="button" className="secondary" onClick={() => setPanel("orders")}>
                  Əmr sənədləri
                </button>
              )}
              {editing.id && data.showSalary && (
                <button type="button" className="secondary" onClick={() => setPanel("salaryhist")}>
                  Maaş tarixçəsi
                </button>
              )}
              {editing.id && data.canOrders && (
                <button type="button" className="secondary" onClick={() => setPanel("hrdocs")}>
                  Müqavilə və arayış
                </button>
              )}
              {editing.id && data.canDocs && (
                <button type="button" className="secondary" onClick={() => setPanel("docs")}>
                  Sənəd qovluğu
                </button>
              )}
              {editing.id && (
                <button type="button" className="secondary" onClick={() => setPanel("onboarding")}>
                  Adaptasiya siyahısı
                </button>
              )}
              {!!history.length && (
                <button type="button" className="secondary" onClick={() => setPanel("history")}>
                  Hərəkət tarixçəsi
                </button>
              )}
            </div>
            {panel === "pay" && (
              <Modal title={`Maaş hesabı və məzuniyyət: ${editing.name || "işçi"}`} onClose={() => setPanel(null)}>
                <EmployeePayPanel
                  taxReduction={editing.taxReduction || 0}
                  salary={editing.salary || 0}
                  salaryType={editing.salaryType || "gross"}
                  sector={editing.sector || "private"}
                  startDate={editing.startDate || ""}
                  endDate={editing.endDate || ""}
                  status={editing.status || "active"}
                  vacationDays={editing.vacationDays ?? 21}
                  vacationUsed={editing.vacationUsed ?? 0}
                />
              </Modal>
            )}
            {panel === "link" && editing.id && (
              <Modal title={`İşçi profili: ${editing.name || "işçi"}`} onClose={() => setPanel(null)}>
                <EmployeeLinkPanel
                  employeeId={editing.id}
                  name={editing.name || ""}
                  linked={Boolean(editing.linked)}
                  pending={Boolean(editing.linkPending)}
                  notify={notify}
                  onChanged={() => {
                    load();
                    setEditing({ ...editing, linked: false });
                  }}
                />
              </Modal>
            )}
            {panel === "profile" && editing.id && (
              <Modal title={`Şəxsi məlumatlar: ${editing.name || "işçi"}`} onClose={() => setPanel(null)}>
                <EmployeeProfilePanel
                  employeeId={editing.id}
                  initial={editing.profile}
                  notify={notify}
                  onSaved={(profile) => setEditing({ ...editing, profile })}
                />
              </Modal>
            )}
            {panel === "orders" && editing.id && (
              <Modal title={`Əmr sənədləri: ${editing.name || "işçi"}`} onClose={() => setPanel(null)}>
                <OrderMaker
                  employee={{
                    id: editing.id,
                    name: editing.name || "",
                    position: editing.position || "",
                    department: editing.department || "",
                    section: editing.section || "",
                    startDate: editing.startDate || "",
                    salary: editing.salary ?? null,
                    salaryType: editing.salaryType || "gross",
                    probationEnd: editing.probationEnd || "",
                    endDate: editing.endDate || "",
                  }}
                  notify={notify}
                />
              </Modal>
            )}
            {panel === "salaryhist" && editing.id && (
              <Modal title={`Maaş tarixçəsi: ${editing.name || "işçi"}`} onClose={() => setPanel(null)}>
                <SalaryHistory employeeId={editing.id} />
              </Modal>
            )}
            {panel === "hrdocs" && editing.id && (
              <Modal title={`Müqavilə və kadr sənədləri: ${editing.name || "işçi"}`} onClose={() => setPanel(null)}>
                <HrDocsPanel
                  employee={{
                    id: editing.id,
                    name: editing.name || "",
                    position: editing.position || "",
                    department: editing.department || "",
                    section: editing.section || "",
                    startDate: editing.startDate || "",
                    salary: editing.salary ?? null,
                    salaryType: editing.salaryType || "gross",
                    sector: editing.sector || "private",
                    taxReduction: editing.taxReduction || 0,
                    profile: editing.profile || null,
                  }}
                />
              </Modal>
            )}
            {panel === "docs" && editing.id && (
              <Modal title={`Sənəd qovluğu: ${editing.name || "işçi"}`} onClose={() => setPanel(null)}>
                <EmployeeDocuments employeeId={editing.id} notify={notify} />
              </Modal>
            )}
            {panel === "onboarding" && editing.id && (
              <Modal title={`Adaptasiya siyahısı: ${editing.name || "işçi"}`} onClose={() => setPanel(null)}>
                <OnboardingChecklist employeeId={editing.id} notify={notify} onChange={load} />
              </Modal>
            )}
            {panel === "history" && (
              <Modal title={`Hərəkət tarixçəsi: ${editing.name || "işçi"}`} onClose={() => setPanel(null)}>
                <div className="employee-history">
                  <ul>
                    {history.map((h, i) => (
                      <li key={i}>
                        <b>{day(h.event_date)}</b> {EVENT_LABEL[h.type] || h.type}
                        {h.type === "position" || h.type === "department" ? `: ${h.from_value || "—"} → ${h.to_value || "—"}` : ""}
                        {h.actor ? <small className="skill-description"> {h.actor}</small> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </Modal>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------- Invoices and payments ----------
type Billing = {
  invoices: {
    id: string;
    description: string;
    amount_cents: number;
    vat_cents?: number;
    vat_percent?: number;
    paid_cents: number;
    outstanding_cents: number;
    due_date: string;
    state: string;
    created: string;
  }[];
  payments: {
    id: string;
    amount_cents: number;
    method: string;
    reference: string;
    paid_at: string;
    description: string;
  }[];
  summary: {
    billed: number;
    paid: number;
    outstanding: number;
    overdue: number;
  };
};
const INVOICE_STATE: Record<string, string> = {
  open: "Ödəniş gözləyir",
  paid: "Ödənilib",
  overdue: "Gecikir",
  cancelled: "Ləğv edilib",
};
export function BillingPage({ notify }: { notify: Notify }) {
  const [data] = useLoad<Billing>("company/billing", notify);
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="company-page">
      <div className="kpi-grid">
        <div className="kpi">
          <small>Hesablanıb</small>
          <strong>{azn(data.summary.billed)}</strong>
        </div>
        <div className="kpi">
          <small>Ödənilib</small>
          <strong>{azn(data.summary.paid)}</strong>
        </div>
        <div className="kpi">
          <small>Qalıq borc</small>
          <strong>{azn(data.summary.outstanding)}</strong>
          {data.summary.overdue > 0 && (
            <span className="danger-text">
              {data.summary.overdue} gecikən hesab
            </span>
          )}
        </div>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h3>
            <Receipt size={18} /> Hesab-fakturalar
          </h3>
          <ReportButton kind="invoices" label="XLSX" />
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Təsvir</th>
                <th>Məbləğ</th>
                <th>Ödənilib</th>
                <th>Qalıq</th>
                <th>Son tarix</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.description}</strong>
                    <small className="skill-description">
                      {day(i.created)}
                    </small>
                  </td>
                  <td>
                    {azn(i.amount_cents / 100)}
                    {!!i.vat_cents && (
                      <small className="skill-description">
                        o cümlədən ƏDV {i.vat_percent}%:{" "}
                        {azn(i.vat_cents / 100)}
                      </small>
                    )}
                  </td>
                  <td>{azn(i.paid_cents / 100)}</td>
                  <td>{azn(i.outstanding_cents / 100)}</td>
                  <td>{day(i.due_date)}</td>
                  <td>
                    <span
                      className={`admin-status ${i.state === "paid" ? "active" : i.state === "overdue" ? "archived" : "paused"}`}
                    >
                      {INVOICE_STATE[i.state]}
                    </span>
                  </td>
                </tr>
              ))}
              {!data.invoices.length && (
                <tr>
                  <td colSpan={6}>
                    <p className="admin-empty">Hesab-faktura yoxdur.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h3>Ödəniş tarixçəsi</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tarix</th>
                <th>Hesab</th>
                <th>Məbləğ</th>
                <th>Üsul</th>
                <th>Referans</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td>{day(p.paid_at)}</td>
                  <td>{p.description || "—"}</td>
                  <td>{azn(p.amount_cents / 100)}</td>
                  <td>{p.method}</td>
                  <td>{p.reference || "—"}</td>
                </tr>
              ))}
              {!data.payments.length && (
                <tr>
                  <td colSpan={5}>
                    <p className="admin-empty">Ödəniş qeydə alınmayıb.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ---------- Admin: company verification queue ----------
type VerificationRow = {
  company_id: string;
  name: string;
  data: CompanyDetails;
  doc_name: string;
  verification_status: string;
  verification_note: string;
  submitted_at: string;
  reviewed_at: string;
  taxCheck?: TaxCheck | null;
  taxStale?: boolean;
  taxNameMatch?: boolean;
};
export function AdminCompanies({ notify }: { notify: Notify }) {
  const [data, load] = useLoad<{ companies: VerificationRow[] }>(
    "admin/company-verifications",
    notify,
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [taxFor, setTaxFor] = useState<VerificationRow | null>(null);
  const [tax, setTax] = useState({
    payerType: "legal",
    name: "",
    active: true,
    vat: false,
    risky: false,
    debt: 0,
  });
  async function saveTax() {
    if (!taxFor) return;
    try {
      const result = await request<{ taxNameMatch: boolean }>(
        "admin/company-tax-check",
        { companyId: taxFor.company_id, ...tax },
      );
      notify(
        result.taxNameMatch
          ? "e-taxes nəticəsi yazıldı, ad uyğun gəlir."
          : "e-taxes nəticəsi yazıldı, ad şirkətin yazdığı adla uyğun gəlmir.",
      );
      setTaxFor(null);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function decide(companyId: string, decision: "verified" | "rejected") {
    try {
      await request("admin/company-verify", {
        companyId,
        decision,
        note: notes[companyId] || "",
      });
      notify(
        decision === "verified"
          ? "Şirkət təsdiqləndi."
          : "Yoxlama rədd edildi.",
      );
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <section className="panel admin-table-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Şirkət</th>
              <th>VÖEN / rekvizit</th>
              <th>Sənəd</th>
              <th>Status</th>
              <th>Qərar</th>
            </tr>
          </thead>
          <tbody>
            {data.companies.map((c) => (
              <tr key={c.company_id}>
                <td>
                  <strong>{c.data.legalName || c.name}</strong>
                  <small className="skill-description">{c.name}</small>
                </td>
                <td>
                  {c.data.voen || "—"}
                  <small className="skill-description">
                    {validVoen(c.data.voen)
                      ? `${VOEN_TYPE_LABEL[voenType(c.data.voen)]} · `
                      : ""}
                    <a href={VOEN_LOOKUP_URL} target="_blank" rel="noreferrer">
                      e-taxes-də yoxla
                    </a>
                  </small>
                  {c.taxCheck && (
                    <div
                      className="skill-description"
                      style={{
                        whiteSpace: "normal",
                        lineHeight: 1.5,
                        margin: "6px 0",
                      }}
                    >
                      <b>e-taxes:</b> {c.taxCheck.name}
                      <br />
                      {c.taxCheck.payerType === "legal"
                        ? "Hüquqi"
                        : "Fiziki"}{" "}
                      şəxs · {c.taxCheck.active ? "aktiv" : "qeyri-aktiv"} ·{" "}
                      {c.taxCheck.vat
                        ? "ƏDV qeydiyyatındadır"
                        : "ƏDV qeydiyyatında deyil"}
                      <br />
                      {c.taxCheck.risky
                        ? "Riskli vergi ödəyicisi"
                        : "Riskli deyil"}{" "}
                      · borc {azn(c.taxCheck.debt)} ·{" "}
                      {day(c.taxCheck.checkedAt)}
                      <br />
                      <b>
                        {c.taxStale
                          ? "⚠ Nəticə başqa VÖEN üçün yazılıb, yenidən yoxlayın"
                          : c.taxNameMatch
                            ? "✓ Ad şirkətin yazdığı adla uyğundur"
                            : "⚠ Ad şirkətin yazdığı adla uyğun gəlmir"}
                      </b>
                    </div>
                  )}
                  {validVoen(c.data.voen) && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setTaxFor(c);
                        setTax(
                          c.taxCheck && !c.taxStale
                            ? {
                                payerType: c.taxCheck.payerType,
                                name: c.taxCheck.name,
                                active: c.taxCheck.active,
                                vat: c.taxCheck.vat,
                                risky: c.taxCheck.risky,
                                debt: c.taxCheck.debt,
                              }
                            : {
                                payerType:
                                  voenType(c.data.voen) === "individual"
                                    ? "individual"
                                    : "legal",
                                name: "",
                                active: true,
                                vat: false,
                                risky: false,
                                debt: 0,
                              },
                        );
                      }}
                    >
                      {c.taxCheck
                        ? "e-taxes nəticəsini yenilə"
                        : "e-taxes nəticəsini yaz"}
                    </button>
                  )}
                  <small className="skill-description">
                    {c.data.director}
                    {c.data.legalAddress ? ` · ${c.data.legalAddress}` : ""}
                  </small>
                </td>
                <td>
                  {c.doc_name ? (
                    <a
                      href={`/api/joblink/admin/company-doc?id=${encodeURIComponent(c.company_id)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText size={13} /> {c.doc_name}
                    </a>
                  ) : (
                    "—"
                  )}
                  <small className="skill-description">
                    {c.submitted_at ? when(c.submitted_at) : ""}
                    {c.submitted_at && c.verification_status === "pending"
                      ? ` · ${waitingLabel(c.submitted_at)}`
                      : ""}
                  </small>
                </td>
                <td>
                  <span
                    className={`admin-status ${c.verification_status === "verified" ? "active" : c.verification_status === "pending" ? "paused" : "archived"}`}
                  >
                    {c.verification_status}
                  </span>
                  {c.verification_note && (
                    <small className="skill-description">
                      {c.verification_note}
                    </small>
                  )}
                </td>
                <td>
                  {c.doc_name && c.verification_status === "pending" ? (
                    <div className="approval-actions">
                      <select
                        aria-label="Rədd səbəbi şablonu"
                        value=""
                        onChange={(e) => {
                          const tpl = REJECTION_NOTE_TEMPLATES.find(
                            (x) => x.id === e.target.value,
                          );
                          if (tpl)
                            setNotes({ ...notes, [c.company_id]: tpl.text });
                        }}
                      >
                        <option value="">Hazır səbəb…</option>
                        {REJECTION_NOTE_TEMPLATES.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.text.slice(0, 40)}…
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="Qeyd (rədd üçün məcburi)"
                        value={notes[c.company_id] || ""}
                        onChange={(e) =>
                          setNotes({ ...notes, [c.company_id]: e.target.value })
                        }
                      />
                      <button onClick={() => decide(c.company_id, "rejected")}>
                        Rədd et
                      </button>
                      <button
                        className="primary"
                        onClick={() => decide(c.company_id, "verified")}
                      >
                        Təsdiqlə
                      </button>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!data.companies.length && (
              <tr>
                <td colSpan={5}>
                  <p className="admin-empty">Yoxlama sorğusu yoxdur.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {taxFor && (
        <Modal
          title={`e-taxes nəticəsi: ${taxFor.data.legalName || taxFor.name}`}
          onClose={() => setTaxFor(null)}
        >
          <div className="offer-composer">
            <p className="muted fine-print">
              <a href={VOEN_LOOKUP_URL} target="_blank" rel="noreferrer">
                Rəsmi vergi ödəyicisi səhifəsində
              </a>{" "}
              VÖEN <b>{taxFor.data.voen}</b> ilə sorğu edin və nəticəni aşağıya
              köçürün.
            </p>
            <div className="form-grid">
              <Field label="Vergi ödəyicisinin növü">
                <select
                  value={tax.payerType}
                  onChange={(e) =>
                    setTax({ ...tax, payerType: e.target.value })
                  }
                >
                  <option value="legal">Hüquqi şəxs</option>
                  <option value="individual">Fiziki şəxs</option>
                </select>
              </Field>
              <Field label="Vergi ödəyicisinin adı">
                <input
                  value={tax.name}
                  onChange={(e) => setTax({ ...tax, name: e.target.value })}
                />
              </Field>
              <Field label="Aktiv olub-olmaması">
                <select
                  value={tax.active ? "1" : "0"}
                  onChange={(e) =>
                    setTax({ ...tax, active: e.target.value === "1" })
                  }
                >
                  <option value="1">Aktiv</option>
                  <option value="0">Aktiv deyil</option>
                </select>
              </Field>
              <Field label="ƏDV qeydiyyatı">
                <select
                  value={tax.vat ? "1" : "0"}
                  onChange={(e) =>
                    setTax({ ...tax, vat: e.target.value === "1" })
                  }
                >
                  <option value="1">ƏDV qeydiyyatındadır</option>
                  <option value="0">Qeydiyyatda deyil</option>
                </select>
              </Field>
              <Field label="Riskli vergi ödəyicisi">
                <select
                  value={tax.risky ? "1" : "0"}
                  onChange={(e) =>
                    setTax({ ...tax, risky: e.target.value === "1" })
                  }
                >
                  <option value="0">Riskli deyil</option>
                  <option value="1">Riskli</option>
                </select>
              </Field>
              <Field label="Borc (AZN)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={tax.debt}
                  onChange={(e) =>
                    setTax({ ...tax, debt: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <button
              className="primary"
              disabled={tax.name.trim().length < 2}
              onClick={saveTax}
            >
              Yadda saxla
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ---------- Workforce flow ----------
type WorkforceResponse = {
  metrics: WorkforceMetrics;
  exitTypes: Option[];
  exitReasons: Option[];
  canSeeReasons: boolean;
};
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const monthShort = (month: string) => `${month.slice(5)}.${month.slice(2, 4)}`;
export function WorkforcePage({
  me,
  notify,
}: {
  me: CompanyMe | null;
  notify: Notify;
}) {
  const [range, setRange] = useState("12");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [data, setData] = useState<WorkforceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const today = new Date();
  const params = (() => {
    const to = isoDay(today);
    if (range === "year") return `from=${today.getFullYear()}-01-01&to=${to}`;
    if (range === "custom")
      return custom.from && custom.to
        ? `from=${custom.from}&to=${custom.to}`
        : "";
    const start = new Date(today);
    start.setMonth(start.getMonth() - Number(range));
    start.setDate(start.getDate() + 1);
    return `from=${isoDay(start)}&to=${to}`;
  })();
  useEffect(() => {
    if (!params) return;
    setLoading(true);
    request<WorkforceResponse>(`company/workforce?${params}`)
      .then(setData)
      .catch((error) => notify((error as Error).message))
      .finally(() => setLoading(false));
  }, [params, notify]);
  const reportAllowed = me?.permissions.includes("reports");
  const m = data?.metrics;
  const peak = Math.max(
    1,
    ...(m?.months.flatMap((x) => [x.hires, x.exits]) || [1]),
  );
  const reasonLabel = (list: Option[], id: string) =>
    list.find((o) => o.id === id)?.label || id;
  const cards: [string, string | number, string?][] = m
    ? [
        ["İşçi sayı", m.headcountEnd, `dövrün əvvəlində ${m.headcountStart}`],
        ["İşə qəbul", m.hires],
        ["Ayrılan", m.exits],
        [
          "Dövriyyə",
          m.turnoverPercent === null ? "—" : `${m.turnoverPercent}%`,
          m.turnoverAnnualPercent === null
            ? undefined
            : `illik ${m.turnoverAnnualPercent}%`,
        ],
        [
          "İlk 90 gündə ayrılan",
          m.earlyExits,
          m.earlyExitPercent === null
            ? undefined
            : `ayrılanların ${m.earlyExitPercent}%-i`,
        ],
        [
          "Orta staj",
          m.avgTenureMonths === null ? "—" : `${m.avgTenureMonths} ay`,
          m.avgLeaverTenureMonths === null
            ? undefined
            : `ayrılanlarda ${m.avgLeaverTenureMonths} ay`,
        ],
      ]
    : [];
  return (
    <div className="company-page">
      <div className="section-heading">
        <div className="admin-actions">
          <Field label="Dövr">
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="3">Son 3 ay</option>
              <option value="6">Son 6 ay</option>
              <option value="12">Son 12 ay</option>
              <option value="year">Bu il</option>
              <option value="custom">Özəl tarix aralığı</option>
            </select>
          </Field>
          {range === "custom" && (
            <>
              <Field label="Başlanğıc">
                <input
                  type="date"
                  value={custom.from}
                  onChange={(e) =>
                    setCustom({ ...custom, from: e.target.value })
                  }
                />
              </Field>
              <Field label="Son">
                <input
                  type="date"
                  value={custom.to}
                  onChange={(e) => setCustom({ ...custom, to: e.target.value })}
                />
              </Field>
            </>
          )}
        </div>
        {reportAllowed && (
          <div className="admin-actions">
            <ReportButton kind="workforce" label="İşçi axını XLSX" />
            {data?.canSeeReasons && (
              <ReportButton kind="exits" label="Ayrılanlar XLSX" />
            )}
            <ReportButton kind="funnel" label="Qıf XLSX" />
            <ReportButton kind="reasons" label="Vakansiya səbəbləri XLSX" />
          </div>
        )}
      </div>
      {loading && !m && <p className="muted">Yüklənir…</p>}
      {m && (
        <>
          <p className="muted">
            {day(m.from)} – {day(m.to)}
          </p>
          <div className="kpi-grid">
            {cards.map(([label, value, hint]) => (
              <div className="kpi" key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
                {hint && <span>{hint}</span>}
              </div>
            ))}
          </div>
          {!!m.insights.length && (
            <section className="panel">
              <h3>Nəticələr</h3>
              <ul className="insight-list">
                {m.insights.map((i) => (
                  <li key={i.text} className={`insight ${i.level}`}>
                    {i.text}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="panel">
            <h3>Aylar üzrə işə qəbul və ayrılma</h3>
            <div
              className="month-chart"
              role="img"
              aria-label="Aylar üzrə işə qəbul və ayrılan işçilər"
            >
              {m.months.map((x) => (
                <div
                  key={x.month}
                  className="month-col"
                  title={`${x.month}: ${x.hires} işə qəbul, ${x.exits} ayrılan, ay sonu ${x.headcount} işçi`}
                >
                  <div className="month-bars">
                    <span
                      className="hire"
                      style={{
                        height: `${Math.max(x.hires ? 6 : 0, (x.hires / peak) * 100)}%`,
                      }}
                    />
                    <span
                      className="exit"
                      style={{
                        height: `${Math.max(x.exits ? 6 : 0, (x.exits / peak) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>{monthShort(x.month)}</small>
                </div>
              ))}
            </div>
            <p className="muted fine-print">
              <i className="legend hire" /> İşə qəbul{" "}
              <i className="legend exit" /> Ayrılan
            </p>
          </section>
          <section className="panel">
            <h3>Şöbələr üzrə</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Şöbə</th>
                    <th>İşçi sayı</th>
                    <th>İşə qəbul</th>
                    <th>Ayrılan</th>
                    <th>Dövriyyə</th>
                  </tr>
                </thead>
                <tbody>
                  {m.departments.map((d) => (
                    <tr key={d.name}>
                      <td>
                        <strong>{d.name}</strong>
                      </td>
                      <td>{d.headcount}</td>
                      <td>{d.hires}</td>
                      <td>{d.exits}</td>
                      <td>
                        {d.turnoverPercent === null
                          ? "—"
                          : `${d.turnoverPercent}%`}
                      </td>
                    </tr>
                  ))}
                  {!m.departments.length && (
                    <tr>
                      <td colSpan={5}>
                        <p className="admin-empty">
                          İşçi məlumatı yoxdur. “İşçilər” bölməsində işçiləri
                          əlavə edin.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          {!!m.exits && (
            <section className="panel">
              <h3>Necə ayrılıblar</h3>
              <div className="funnel">
                {m.exitTypes.map((t) => (
                  <div key={t.id} className="funnel-row">
                    <span>{reasonLabel(data.exitTypes, t.id)}</span>
                    <div>
                      <i style={{ width: `${(t.count / m.exits) * 100}%` }} />
                    </div>
                    <b>{t.count}</b>
                  </div>
                ))}
              </div>
              {m.exitReasons && (
                <>
                  <h3>Ayrılma səbəbləri</h3>
                  <div className="funnel">
                    {m.exitReasons.map((r) => (
                      <div key={r.id} className="funnel-row">
                        <span>{reasonLabel(data.exitReasons, r.id)}</span>
                        <div>
                          <i
                            style={{ width: `${(r.count / m.exits) * 100}%` }}
                          />
                        </div>
                        <b>{r.count}</b>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {!m.exitReasons && (
                <p className="muted fine-print">
                  Ayrılma səbəbləri yalnız HR, direktor və hesab sahibinə
                  görünür.
                </p>
              )}
            </section>
          )}
          <section className="panel">
            <h3>Vakansiyaların yaradılma səbəbi</h3>
            <p className="muted fine-print">
              Bu məlumat yalnız şirkətə görünür, namizədlər görmür.
            </p>
            <div className="funnel">
              {m.vacancyReasons.map((r) => {
                const total = m.vacancyReasons.reduce((a, b) => a + b.count, 0);
                return (
                  <div key={r.reason} className="funnel-row">
                    <span>
                      {VACANCY_REASONS.find((x) => x.id === r.reason)?.label ||
                        "Göstərilməyib"}
                    </span>
                    <div>
                      <i style={{ width: `${(r.count / total) * 100}%` }} />
                    </div>
                    <b>{r.count}</b>
                  </div>
                );
              })}
              {!m.vacancyReasons.length && (
                <p className="admin-empty">Bu dövrdə vakansiya açılmayıb.</p>
              )}
            </div>
            {m.exits > 0 && (
              <p className="muted">
                Ayrılan işçilər: <b>{m.exits}</b>. “İşçinin çıxması ilə
                əlaqədar” açılan vakansiyalar: <b>{m.replacementOpened}</b>.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ---------- Employee document folder ----------
type EmployeeDoc = {
  id: string;
  category: string;
  subtype: string;
  docNumber: string;
  docDate: string;
  name: string;
  type: string;
  size: number;
  created: string;
};
// ---------- Onboarding checklist ----------
type OnboardingItem = { id: string; title: string; due: string; done: number; done_at: string; done_by: string };
function OnboardingChecklist({
  employeeId,
  notify,
  onChange,
}: {
  employeeId: string;
  notify: Notify;
  onChange: () => void;
}) {
  const [data, load] = useLoad<{ tasks: OnboardingItem[] }>(
    `company/employee-tasks?employeeId=${encodeURIComponent(employeeId)}`,
    notify,
  );
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  async function call(path: string, body: unknown, message?: string) {
    try {
      await request(path, body);
      if (message) notify(message);
      load();
      onChange();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return null;
  const done = data.tasks.filter((task) => task.done).length;
  return (
    <section className="employee-docs">
      <h4>
        Adaptasiya siyahısı
        {!!data.tasks.length && ` (${done}/${data.tasks.length})`}
      </h4>
      <ul className="exam-list">
        {data.tasks.map((task) => (
          <li key={task.id} className="exam-row">
            <label>
              <input
                type="checkbox"
                checked={!!task.done}
                onChange={(e) =>
                  call("company/employee-tasks/toggle", {
                    id: task.id,
                    done: e.target.checked,
                  })
                }
              />{" "}
              <span style={task.done ? { textDecoration: "line-through" } : undefined}>
                {task.title}
              </span>
              <small
                className="skill-description"
                style={{ color: !task.done && task.due && task.due < today ? "#b45309" : undefined }}
              >
                {task.done
                  ? `Tamamlandı ${task.done_by ? `· ${task.done_by}` : ""}`
                  : task.due
                    ? `Son tarix: ${day(task.due)}${task.due < today ? " (gecikib)" : ""}`
                    : "Tarixsiz"}
              </small>
            </label>
            <button
              type="button"
              aria-label="Tapşırığı sil"
              onClick={() => call("company/employee-tasks/delete", { id: task.id })}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {!data.tasks.length && (
          <li className="admin-empty">Hələ tapşırıq yoxdur.</li>
        )}
      </ul>
      <div className="form-actions">
        <input
          aria-label="Yeni tapşırıq"
          placeholder="Yeni tapşırıq"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="date"
          aria-label="Son tarix"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
        <button
          type="button"
          className="secondary"
          onClick={async () => {
            await call("company/employee-tasks/add", { employeeId, title, due });
            setTitle("");
            setDue("");
          }}
        >
          Əlavə et
        </button>
        {!data.tasks.length && (
          <button
            type="button"
            className="primary"
            onClick={() =>
              call(
                "company/employee-tasks/seed",
                { employeeId },
                "Standart adaptasiya siyahısı əlavə edildi.",
              )
            }
          >
            Standart siyahını əlavə et
          </button>
        )}
      </div>
    </section>
  );
}

function EmployeeDocuments({
  employeeId,
  notify,
}: {
  employeeId: string;
  notify: Notify;
}) {
  const [docs, setDocs] = useState<EmployeeDoc[] | null>(null);
  const [category, setCategory] = useState("contract");
  // Which document it is: a listed type, or "Digər" with the person's own words.
  const [subtype, setSubtype] = useState("");
  const [customType, setCustomType] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState("");
  const [busy, setBusy] = useState(false);
  const kind = DOC_KINDS[category] || DOC_KINDS.other;
  const chosenType = category === "other" || subtype === OTHER_TYPE ? customType.trim() : subtype;
  const load = useCallback(
    () =>
      request<{ documents: EmployeeDoc[] }>(
        `company/employee-docs?employeeId=${employeeId}`,
      )
        .then((r) => setDocs(r.documents))
        .catch((e) => notify((e as Error).message)),
    [employeeId, notify],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="employee-history">
      <h4>Sənəd qovluğu</h4>
      <ul>
        {(docs || []).map((d) => (
          <li key={d.id}>
            <a
              href={`/api/joblink/company/employee-doc?id=${d.id}`}
              target="_blank"
              rel="noreferrer"
            >
              {d.name}
            </a>
            <small className="skill-description">
              {" "}
              {docLabel(d)} ·{" "}
              {Math.max(1, Math.round(d.size / 1024))} KB · {day(d.created)}
            </small>
            <button
              type="button"
              aria-label="Sənədi sil"
              onClick={async () => {
                if (!window.confirm(`“${d.name}” silinsin?`)) return;
                try {
                  await request("company/employee-docs/delete", { id: d.id });
                  await load();
                } catch (error) {
                  notify((error as Error).message);
                }
              }}
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
        {docs && !docs.length && <li className="muted">Sənəd yoxdur.</li>}
      </ul>
      <div className="form-grid">
        <Field label="Sənədin qrupu">
          <select
            value={category}
            aria-label="Sənəd qrupu"
            onChange={(e) => {
              setCategory(e.target.value);
              setSubtype("");
              setCustomType("");
            }}
          >
            {Object.entries(DOC_KINDS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        {category !== "other" && (
          <Field label={`Hansı ${kind.label.toLocaleLowerCase("az")}? *`}>
            <select value={subtype} aria-label="Sənədin növü" onChange={(e) => setSubtype(e.target.value)}>
              <option value="">Seçin</option>
              {kind.types.map((type) => (
                <option key={type}>{type}</option>
              ))}
              <option>{OTHER_TYPE}</option>
            </select>
          </Field>
        )}
        {(category === "other" || subtype === OTHER_TYPE) && (
          <Field label="Sənədin adı *">
            <input value={customType} maxLength={80} placeholder="Məsələn, işçinin ərizəsi" onChange={(e) => setCustomType(e.target.value)} />
          </Field>
        )}
        <Field label="Sənədin nömrəsi">
          <input value={docNumber} maxLength={40} onChange={(e) => setDocNumber(e.target.value)} />
        </Field>
        <Field label="Sənədin tarixi">
          <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        </Field>
      </div>
      <div className="admin-actions">
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          disabled={busy || !chosenType}
          title={chosenType ? "" : "Əvvəlcə sənədin hansı sənəd olduğunu seçin"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.size > 1_000_000)
              return notify("Fayl 1 MB-dan kiçik olmalıdır.");
            const reader = new FileReader();
            reader.onload = async () => {
              setBusy(true);
              try {
                await request("company/employee-docs/upload", {
                  employeeId,
                  category,
                  subtype: chosenType,
                  docNumber,
                  docDate,
                  name: file.name,
                  type: file.type,
                  data: String(reader.result).split(",")[1] || "",
                });
                notify("Sənəd əlavə edildi.");
                setSubtype("");
                setCustomType("");
                setDocNumber("");
                setDocDate("");
                await load();
              } catch (error) {
                notify((error as Error).message);
              } finally {
                setBusy(false);
              }
            };
            reader.readAsDataURL(file);
          }}
        />
      </div>
      <small className="skill-picker-help">
        PDF və ya şəkil, 1 MB-a qədər. Yalnız HR, direktor və hesab sahibi
        görür; hər açılış jurnala yazılır. İşçi siyahıdan silinəndə sənədləri də
        silinir.
      </small>
    </div>
  );
}

// ---------- Headcount plan ----------
