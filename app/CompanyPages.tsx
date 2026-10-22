"use client";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Building2, CheckCircle2, Download, FileText, Plus, Receipt, Trash2, UserPlus, Users, XCircle } from "lucide-react";
import { COMPANY_SIZES, type CompanyDetails, type CompanyPermission, type JobApproval } from "@/lib/company";
import { Field, Modal } from "./components";
import { formatDate } from "@/lib/dates";
import { siteLanguage } from "./i18n";

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
const day = (value: string) => (value ? formatDate(value, siteLanguage()) : "—");
const when = (value: string) => (value ? formatDate(value, siteLanguage(), { time: true }) : "—");
const azn = (value: number) => `${value.toLocaleString("az-AZ", { maximumFractionDigits: 2 })} AZN`;

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
function useLoad<T>(path: string, notify: Notify) {
  const [data, setData] = useState<T | null>(null);
  const load = useCallback(() => {
    request<T>(path).then(setData).catch((error) => notify((error as Error).message));
  }, [path, notify]);
  useEffect(load, [load]);
  return [data, load] as const;
}
function ReportButton({ kind, label }: { kind: string; label: string }) {
  return (
    <a className="secondary report-button" href={`/api/joblink/company/report?kind=${kind}`} download>
      <Download size={14} /> {label}
    </a>
  );
}

// ---------- Dashboard and reports ----------
type Dashboard = {
  totals: {
    activeJobs: number; pendingJobs: number; applications: number; autoApplications: number; hired: number; employees: number;
    offerAcceptance: number | null; testsSubmitted: number; testsAssigned: number; avgDaysToHire: number | null;
  };
  byStatus: Record<string, number>;
  days: { date: string; count: number }[];
  perJob: { id: string; title: string; status: string; applications: number; interview: number; offered: number; hired: number }[];
};
const FUNNEL = ["Göndərildi", "Baxışda", "Müsahibə", "Təklif edildi", "İşə qəbul edildi", "Uyğun deyil"];
export function CompanyDashboard({ me, notify }: { me: CompanyMe | null; notify: Notify }) {
  const [data] = useLoad<Dashboard>("company/dashboard", notify);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const t = data.totals;
  const peak = Math.max(1, ...data.days.map((d) => d.count));
  const reports = me?.permissions.includes("reports");
  const cards: [string, string | number, string?][] = [
    ["Aktiv vakansiyalar", t.activeJobs, t.pendingJobs ? `${t.pendingJobs} təsdiq gözləyir` : undefined],
    ["Müraciətlər", t.applications, t.autoApplications ? `${t.autoApplications} AI avtomatik` : undefined],
    ["İşə qəbul", t.hired, t.avgDaysToHire !== null ? `orta ${t.avgDaysToHire} gün` : undefined],
    ["Təkliflərin qəbulu", t.offerAcceptance === null ? "—" : `${t.offerAcceptance}%`],
    ["Testlər", `${t.testsSubmitted}/${t.testsAssigned}`, "təhvil / göndərilib"],
    ["İşçilər", t.employees],
  ];
  return (
    <div className="company-page">
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
        <h3>Son 30 gündə müraciətlər</h3>
        <div className="bar-chart" role="img" aria-label="Son 30 gündə gündəlik müraciətlər">
          {data.days.map((d) => (
            <span key={d.date} title={`${day(d.date)}: ${d.count}`} style={{ height: `${Math.max(3, (d.count / peak) * 100)}%` }} />
          ))}
        </div>
      </section>
      <section className="panel">
        <h3>Müraciət mərhələləri</h3>
        <div className="funnel">
          {FUNNEL.map((status) => {
            const value = data.byStatus[status] || 0;
            return (
              <div key={status} className="funnel-row">
                <span>{status}</span>
                <div><i style={{ width: `${t.applications ? (value / t.applications) * 100 : 0}%` }} /></div>
                <b>{value}</b>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h3>Vakansiyalar üzrə</h3>
          {reports && (
            <div className="admin-actions">
              <ReportButton kind="jobs" label="Vakansiyalar XLSX" />
              <ReportButton kind="applications" label="Müraciətlər XLSX" />
            </div>
          )}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Vakansiya</th><th>Status</th><th>Müraciət</th><th>Müsahibə</th><th>Təklif</th><th>İşə qəbul</th></tr></thead>
            <tbody>
              {data.perJob.map((j) => (
                <tr key={j.id}><td><strong>{j.title}</strong></td><td>{j.status}</td><td>{j.applications}</td><td>{j.interview}</td><td>{j.offered}</td><td>{j.hired}</td></tr>
              ))}
              {!data.perJob.length && <tr><td colSpan={6}><p className="admin-empty">Hələ vakansiya yoxdur.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ---------- Vacancy approvals ----------
type ApprovalJob = { id: string; status: string; title: string; city: string; reason?: string; created: string; approval?: JobApproval; canDecide: boolean };
export function ApprovalsPage({ notify, onChange }: { notify: Notify; onChange: () => void }) {
  const [data, load] = useLoad<{ jobs: ApprovalJob[] }>("company/approvals", notify);
  const [notes, setNotes] = useState<Record<string, string>>({});
  async function decide(job: ApprovalJob, decision: "approve" | "reject") {
    try {
      const result = await request<{ status: string }>("company/approve", { jobId: job.id, decision, note: notes[job.id] || "" });
      notify(result.status === "published" ? "Vakansiya təsdiqləndi və yayımlandı." : result.status === "rejected" ? "Vakansiya rədd edildi." : "Təsdiqləndi; direktor təsdiqi gözlənilir.");
      load();
      onChange();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="company-page">
      <p className="muted">Şöbə rəhbəri və ya rekruterin yaratdığı vakansiya əvvəlcə HR meneceri, sonra direktor tərəfindən təsdiqlənir və yalnız bundan sonra yayımlanır.</p>
      {data.jobs.map((job) => (
        <article key={job.id} className="panel approval-card">
          <div className="section-heading">
            <div>
              <h3>{job.title}</h3>
              <p>{job.city} · göndərən: {job.approval?.requestedByName || "—"} · {when(job.approval?.requestedAt || job.created)}</p>
              {job.reason && <p className="muted">Daxili səbəb: {job.reason}</p>}
            </div>
            <span className={`admin-status ${job.status === "rejected" ? "archived" : "paused"}`}>{job.status === "rejected" ? "Rədd edildi" : "Təsdiq gözləyir"}</span>
          </div>
          <ol className="approval-steps">
            {job.approval?.steps.map((step) => (
              <li key={step.role} className={step.decision || "waiting"}>
                {step.decision === "approved" ? <CheckCircle2 size={16} /> : step.decision === "rejected" ? <XCircle size={16} /> : <span className="dot" />}
                <div>
                  <strong>{step.role === "hr" ? "HR meneceri" : "Direktor"}</strong>
                  <small>{step.decision ? `${step.byName} · ${when(step.at)}` : "Gözləyir"}</small>
                  {step.note && <small>“{step.note}”</small>}
                </div>
              </li>
            ))}
          </ol>
          {job.canDecide && (
            <div className="approval-actions">
              <input placeholder="Qeyd (rədd üçün məcburi)" value={notes[job.id] || ""} onChange={(e) => setNotes({ ...notes, [job.id]: e.target.value })} />
              <button className="secondary" onClick={() => decide(job, "reject")}>Rədd et</button>
              <button className="primary" onClick={() => decide(job, "approve")}>Təsdiqlə</button>
            </div>
          )}
        </article>
      ))}
      {!data.jobs.length && <p className="admin-empty">Təsdiq gözləyən vakansiya yoxdur.</p>}
    </div>
  );
}

// ---------- Team ----------
type Team = {
  owner: { id: string; name: string; email: string } | null;
  members: { id: string; email: string; role: string; department: string; status: string; name: string; created: string }[];
  roles: { id: string; label: string; description: string }[];
  canManage: boolean;
};
type Invite = { id: string; role: string; department: string; company: string; created: string };
export function TeamPage({ me, notify, onJoined }: { me: CompanyMe | null; notify: Notify; onJoined: () => void }) {
  const [team, load] = useLoad<Team>("company/team", notify);
  const [invites, loadInvites] = useLoad<{ invites: Invite[] }>("company/invites", notify);
  const [form, setForm] = useState({ email: "", role: "manager", department: "" });
  const [audit, setAudit] = useState<{ action: string; target: string; detail: string; created: string; actor: string }[] | null>(null);
  const roleName = (id: string) => team?.roles.find((r) => r.id === id)?.label || id;
  async function invite(event: React.FormEvent) {
    event.preventDefault();
    try {
      await request("company/team/invite", form);
      notify("Dəvət göndərildi. İstifadəçi bu e-poçtla şirkət hesabı kimi daxil olub dəvəti qəbul etməlidir.");
      setForm({ ...form, email: "", department: "" });
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
          <h3><UserPlus size={18} /> Komanda dəvətləri</h3>
          {invites.invites.map((inv) => (
            <div key={inv.id} className="exam-row">
              <div><strong>{inv.company}</strong><small>{roleName(inv.role)}{inv.department ? ` · ${inv.department}` : ""}</small></div>
              <div className="admin-actions">
                <button onClick={async () => { await act("company/invites/respond", { id: inv.id, accept: false }, "Dəvət rədd edildi."); loadInvites(); }}>Rədd et</button>
                <button className="primary" onClick={async () => { await act("company/invites/respond", { id: inv.id, accept: true }, "Komandaya qoşuldunuz."); loadInvites(); onJoined(); }}>Qəbul et</button>
              </div>
            </div>
          ))}
        </section>
      )}
      {me && <p className="muted">Sizin rolunuz: <b>{me.roleLabel}</b>{me.member && <> · <button className="text-button" onClick={async () => { if (window.confirm("Komandadan çıxmaq istəyirsiniz?")) { await act("company/leave", {}, "Komandadan çıxdınız."); onJoined(); } }}>Komandadan çıx</button></>}</p>}
      {team?.canManage && (
        <form className="panel team-invite" onSubmit={invite}>
          <h3><UserPlus size={18} /> Komandaya üzv dəvət et</h3>
          <div className="form-grid">
            <Field label="E-poçt"><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Rol">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {team.roles.filter((r) => r.id !== "owner" && (r.id !== "director" || me?.role === "owner")).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Şöbə"><input value={form.department} placeholder="Məsələn: Maliyyə" onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
          </div>
          <small className="skill-picker-help">{team.roles.find((r) => r.id === form.role)?.description}</small>
          <button className="primary"><Plus size={14} /> Dəvət et</button>
        </form>
      )}
      <section className="panel">
        <h3><Users size={18} /> Komanda</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Ad / e-poçt</th><th>Rol</th><th>Şöbə</th><th>Status</th>{team?.canManage && <th></th>}</tr></thead>
            <tbody>
              {team?.owner && (
                <tr><td><strong>{team.owner.name}</strong><small className="skill-description">{team.owner.email}</small></td><td>Hesab sahibi</td><td>—</td><td><span className="admin-status active">Aktiv</span></td>{team.canManage && <td />}</tr>
              )}
              {team?.members.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name || "—"}</strong><small className="skill-description">{m.email}</small></td>
                  <td>
                    {team.canManage ? (
                      <select value={m.role} aria-label="Rol" onChange={(e) => act("company/team/update", { id: m.id, role: e.target.value, department: m.department }, "Rol dəyişdirildi.")}>
                        {team.roles.filter((r) => r.id !== "owner").map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    ) : roleName(m.role)}
                  </td>
                  <td>{m.department || "—"}</td>
                  <td><span className={`admin-status ${m.status === "active" ? "active" : "paused"}`}>{m.status === "active" ? "Aktiv" : "Dəvət gözləyir"}</span></td>
                  {team.canManage && (
                    <td><button aria-label="Çıxar" onClick={() => window.confirm(`${m.email} komandadan çıxarılsın?`) && act("company/team/remove", { id: m.id }, "Üzv çıxarıldı.")}><Trash2 size={14} /></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {team?.canManage && (
        <section className="panel">
          <div className="section-heading">
            <h3>Fəaliyyət jurnalı</h3>
            <button onClick={() => request<{ events: NonNullable<typeof audit> }>("company/audit").then((d) => setAudit(d.events)).catch((e) => notify((e as Error).message))}>Göstər</button>
          </div>
          {audit && (
            <ol className="event-timeline">
              {audit.map((e, i) => (
                <li key={i}><time>{when(e.created)}</time><span>{e.actor} — {AUDIT_LABELS[e.action] || e.action}{e.target && !/^[0-9a-f-]{36}$/.test(e.target) ? `: ${e.target}` : ""}</span>{e.detail && <small>{e.detail}</small>}</li>
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
  "member-invited": "üzv dəvət etdi",
  "member-role": "rolu dəyişdi",
  "member-removed": "üzvü çıxardı",
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
type ProfileData = { details: CompanyDetails; docName: string; verification: string; verificationLabel: string; note: string; submittedAt: string; reviewedAt: string; canEdit: boolean };
export function CompanyProfilePage({ notify, onChange }: { notify: Notify; onChange: () => void }) {
  const [data, load] = useLoad<ProfileData>("company/profile", notify);
  const [details, setDetails] = useState<CompanyDetails | null>(null);
  const [doc, setDoc] = useState<{ name: string; type: string; data: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (data) setDetails(data.details); }, [data]);
  if (!data || !details) return <p className="muted">Yüklənir…</p>;
  const set = (key: keyof CompanyDetails, value: string) => setDetails({ ...details, [key]: value });
  const fields: [keyof CompanyDetails, string, string?][] = [
    ["legalName", "Hüquqi ad"], ["voen", "VÖEN", "10 rəqəm"], ["director", "Direktor (Ad Soyad)"], ["legalAddress", "Hüquqi ünvan"],
    ["phone", "Telefon"], ["email", "Rəsmi e-poçt"], ["website", "Vebsayt"], ["industry", "Sahə"], ["bankName", "Bank"], ["iban", "Hesab (IBAN)"],
  ];
  async function save() {
    setBusy(true);
    try {
      const result = await request<{ verification: string }>("company/profile", { details, document: doc || undefined });
      notify(doc ? "Sənəd yükləndi. Administrator yoxladıqdan sonra şirkətiniz təsdiqlənəcək." : result.verification === "none" && data?.verification === "verified" ? "Hüquqi məlumat dəyişdiyi üçün yenidən yoxlama tələb olunur." : "Şirkət məlumatları yadda saxlanıldı.");
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
          {data.docName && <a href="/api/joblink/company/verification-doc" target="_blank" rel="noreferrer"><FileText size={13} /> {data.docName}</a>}
        </div>
      </section>
      <section className="panel">
        <h3><Building2 size={18} /> Şirkət rekvizitləri</h3>
        <fieldset disabled={!data.canEdit} className="plain-fieldset">
          <div className="form-grid">
            {fields.map(([key, label, placeholder]) => (
              <Field key={key} label={label}><input value={details[key]} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} /></Field>
            ))}
            <Field label="İşçi sayı">
              <select value={details.size} onChange={(e) => set("size", e.target.value)}>
                <option value="">Seçin</option>
                {COMPANY_SIZES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Şirkət haqqında"><textarea rows={4} value={details.about} onChange={(e) => set("about", e.target.value)} /></Field>
          {data.verification !== "verified" && (
            <div className="field">
              <span>VÖEN şəhadətnaməsi (PDF və ya şəkil, maks. 1 MB)</span>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 1024 * 1024) return notify("Fayl 1 MB-dan böyük olmamalıdır.");
                  const reader = new FileReader();
                  reader.onload = () => setDoc({ name: file.name, type: file.type, data: String(reader.result).split(",")[1] || "" });
                  reader.readAsDataURL(file);
                }}
              />
            </div>
          )}
          <button className="primary" disabled={busy} onClick={save}>{doc ? "Saxla və yoxlamaya göndər" : "Yadda saxla"}</button>
        </fieldset>
        {!data.canEdit && <p className="muted fine-print">Rekvizitləri yalnız hesab sahibi, direktor və HR dəyişə bilər.</p>}
      </section>
    </div>
  );
}

// ---------- Current employees ----------
type Employee = { id: string; name: string; position: string; department: string; email: string; phone: string; startDate: string; status: string; source: string; salary: number | null };
const EMPLOYEE_STATUS: Record<string, string> = { active: "İşləyir", leave: "Məzuniyyətdə", left: "İşdən çıxıb" };
export function EmployeesPage({ notify }: { notify: Notify }) {
  const [data, load] = useLoad<{ employees: Employee[]; showSalary: boolean; canEdit: boolean }>("company/employees", notify);
  const [editing, setEditing] = useState<Partial<Employee> | null>(null);
  const [query, setQuery] = useState("");
  async function save() {
    try {
      await request("company/employees/save", editing);
      notify("İşçi məlumatı yadda saxlanıldı.");
      setEditing(null);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  const list = data.employees.filter((e) => `${e.name} ${e.position} ${e.department}`.toLocaleLowerCase("az").includes(query.toLocaleLowerCase("az")));
  const payroll = data.showSalary ? data.employees.filter((e) => e.status !== "left").reduce((sum, e) => sum + (e.salary || 0), 0) : 0;
  return (
    <div className="company-page">
      <div className="section-heading">
        <input className="search-input" placeholder="Ad, vəzifə və ya şöbə" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="admin-actions">
          <ReportButton kind="employees" label="XLSX" />
          {data.canEdit && <button className="primary" onClick={() => setEditing({ status: "active" })}><Plus size={14} /> İşçi əlavə et</button>}
        </div>
      </div>
      {data.showSalary && <p className="muted">Aylıq əmək haqqı fondu: <b>{azn(payroll)}</b>. Maaşlar yalnız HR, direktor və hesab sahibinə görünür.</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Ad Soyad</th><th>Vəzifə</th><th>Şöbə</th><th>İşə başlama</th><th>Status</th>{data.showSalary && <th>Maaş</th>}{data.canEdit && <th></th>}</tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td><strong>{e.name}</strong><small className="skill-description">{e.email}{e.source === "hired" ? " · Joblink ilə işə qəbul" : ""}</small></td>
                <td>{e.position || "—"}</td>
                <td>{e.department || "—"}</td>
                <td>{day(e.startDate)}</td>
                <td>{EMPLOYEE_STATUS[e.status] || e.status}</td>
                {data.showSalary && <td>{e.salary ? azn(e.salary) : "—"}</td>}
                {data.canEdit && (
                  <td className="admin-actions">
                    <button onClick={() => setEditing(e)}>Düzəlt</button>
                    <button aria-label="Sil" onClick={async () => { if (!window.confirm(`${e.name} siyahıdan silinsin?`)) return; try { await request("company/employees/remove", { id: e.id }); load(); } catch (error) { notify((error as Error).message); } }}><Trash2 size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7}><p className="admin-empty">İşçi yoxdur. Joblink ilə işə qəbul etdiyiniz namizədlər bura avtomatik əlavə olunur.</p></td></tr>}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal title={editing.id ? "İşçini düzəlt" : "Yeni işçi"} onClose={() => setEditing(null)}>
          <div className="offer-composer">
            <div className="form-grid">
              <Field label="Ad Soyad"><input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Vəzifə"><input value={editing.position || ""} onChange={(e) => setEditing({ ...editing, position: e.target.value })} /></Field>
              <Field label="Şöbə"><input value={editing.department || ""} onChange={(e) => setEditing({ ...editing, department: e.target.value })} /></Field>
              <Field label="İşə başlama"><input type="date" value={editing.startDate || ""} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} /></Field>
              <Field label="E-poçt"><input value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
              <Field label="Telefon"><input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
              <Field label="Aylıq maaş (AZN)"><input type="number" min={0} value={editing.salary ?? ""} onChange={(e) => setEditing({ ...editing, salary: Number(e.target.value) })} /></Field>
              <Field label="Status">
                <select value={editing.status || "active"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  {Object.entries(EMPLOYEE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            <button className="primary" onClick={save}>Yadda saxla</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------- Invoices and payments ----------
type Billing = {
  invoices: { id: string; description: string; amount_cents: number; paid_cents: number; outstanding_cents: number; due_date: string; state: string; created: string }[];
  payments: { id: string; amount_cents: number; method: string; reference: string; paid_at: string; description: string }[];
  summary: { billed: number; paid: number; outstanding: number; overdue: number };
};
const INVOICE_STATE: Record<string, string> = { open: "Ödəniş gözləyir", paid: "Ödənilib", overdue: "Gecikir", cancelled: "Ləğv edilib" };
export function BillingPage({ notify }: { notify: Notify }) {
  const [data] = useLoad<Billing>("company/billing", notify);
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="company-page">
      <div className="kpi-grid">
        <div className="kpi"><small>Hesablanıb</small><strong>{azn(data.summary.billed)}</strong></div>
        <div className="kpi"><small>Ödənilib</small><strong>{azn(data.summary.paid)}</strong></div>
        <div className="kpi"><small>Qalıq borc</small><strong>{azn(data.summary.outstanding)}</strong>{data.summary.overdue > 0 && <span className="danger-text">{data.summary.overdue} gecikən hesab</span>}</div>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h3><Receipt size={18} /> Hesab-fakturalar</h3>
          <ReportButton kind="invoices" label="XLSX" />
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Təsvir</th><th>Məbləğ</th><th>Ödənilib</th><th>Qalıq</th><th>Son tarix</th><th>Status</th></tr></thead>
            <tbody>
              {data.invoices.map((i) => (
                <tr key={i.id}>
                  <td><strong>{i.description}</strong><small className="skill-description">{day(i.created)}</small></td>
                  <td>{azn(i.amount_cents / 100)}</td>
                  <td>{azn(i.paid_cents / 100)}</td>
                  <td>{azn(i.outstanding_cents / 100)}</td>
                  <td>{day(i.due_date)}</td>
                  <td><span className={`admin-status ${i.state === "paid" ? "active" : i.state === "overdue" ? "archived" : "paused"}`}>{INVOICE_STATE[i.state]}</span></td>
                </tr>
              ))}
              {!data.invoices.length && <tr><td colSpan={6}><p className="admin-empty">Hesab-faktura yoxdur.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h3>Ödəniş tarixçəsi</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Tarix</th><th>Hesab</th><th>Məbləğ</th><th>Üsul</th><th>Referans</th></tr></thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id}><td>{day(p.paid_at)}</td><td>{p.description || "—"}</td><td>{azn(p.amount_cents / 100)}</td><td>{p.method}</td><td>{p.reference || "—"}</td></tr>
              ))}
              {!data.payments.length && <tr><td colSpan={5}><p className="admin-empty">Ödəniş qeydə alınmayıb.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ---------- Admin: company verification queue ----------
type VerificationRow = { company_id: string; name: string; data: CompanyDetails; doc_name: string; verification_status: string; verification_note: string; submitted_at: string; reviewed_at: string };
export function AdminCompanies({ notify }: { notify: Notify }) {
  const [data, load] = useLoad<{ companies: VerificationRow[] }>("admin/company-verifications", notify);
  const [notes, setNotes] = useState<Record<string, string>>({});
  async function decide(companyId: string, decision: "verified" | "rejected") {
    try {
      await request("admin/company-verify", { companyId, decision, note: notes[companyId] || "" });
      notify(decision === "verified" ? "Şirkət təsdiqləndi." : "Yoxlama rədd edildi.");
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
          <thead><tr><th>Şirkət</th><th>VÖEN / rekvizit</th><th>Sənəd</th><th>Status</th><th>Qərar</th></tr></thead>
          <tbody>
            {data.companies.map((c) => (
              <tr key={c.company_id}>
                <td><strong>{c.data.legalName || c.name}</strong><small className="skill-description">{c.name}</small></td>
                <td>{c.data.voen || "—"}<small className="skill-description">{c.data.director}{c.data.legalAddress ? ` · ${c.data.legalAddress}` : ""}</small></td>
                <td>{c.doc_name ? <a href={`/api/joblink/admin/company-doc?id=${encodeURIComponent(c.company_id)}`} target="_blank" rel="noreferrer"><FileText size={13} /> {c.doc_name}</a> : "—"}<small className="skill-description">{c.submitted_at ? when(c.submitted_at) : ""}</small></td>
                <td><span className={`admin-status ${c.verification_status === "verified" ? "active" : c.verification_status === "pending" ? "paused" : "archived"}`}>{c.verification_status}</span>{c.verification_note && <small className="skill-description">{c.verification_note}</small>}</td>
                <td>
                  {c.doc_name && c.verification_status === "pending" ? (
                    <div className="approval-actions">
                      <input placeholder="Qeyd (rədd üçün məcburi)" value={notes[c.company_id] || ""} onChange={(e) => setNotes({ ...notes, [c.company_id]: e.target.value })} />
                      <button onClick={() => decide(c.company_id, "rejected")}>Rədd et</button>
                      <button className="primary" onClick={() => decide(c.company_id, "verified")}>Təsdiqlə</button>
                    </div>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {!data.companies.length && <tr><td colSpan={5}><p className="admin-empty">Yoxlama sorğusu yoxdur.</p></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
