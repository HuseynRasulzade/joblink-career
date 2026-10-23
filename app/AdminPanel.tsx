"use client";
import { formatDate } from "@/lib/dates";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Banknote,
  CircleDollarSign,
  CheckCircle2,
  CirclePause,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  FolderTree,
  Download,
  Plus,
  ReceiptText,
  Tags,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { localizeTree } from "./i18n";
import { invalidateRuntimeSkills } from "./components";
import AdminCertifications, { type AdminCertificationData } from "./AdminCertifications";
import AdminJobTitles from "./AdminJobTitles";
import AdminEducation from "./AdminEducation";
import AdminMatching from "./AdminMatching";
import type { JobTitleDefinition } from "@/lib/job-title-catalog";

type AdminData = {
  metrics: Record<string, number>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: "candidate" | "company" | "admin";
    status: "active" | "suspended";
    created: string;
    has_profile: number;
    title: string;
    jobs_count: number;
    applications_count: number;
  }>;
  jobs: Array<{
    id: string;
    title: string;
    company: string;
    category: string;
    city: string;
    status: "published" | "paused" | "archived";
    created: string;
    ownerName: string;
    applicationsCount: number;
  }>;
  applications: Array<{
    id: string;
    job_id: string;
    candidate_id: string;
    status: string;
    created: string;
    auto: number;
    candidate_name: string;
    candidate_title: string;
    job_title: string;
    company: string;
  }>;
  audit: Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    created: string;
    admin_name: string;
  }>;
  system: {
    aiEnabled: boolean;
    aiProvider: string;
    authentication: string;
    cvStorage: string;
    environment: string;
    skillEmailConfigured: boolean;
  };
  billing: {
    summary: {
      billed_cents: number;
      paid_cents: number;
      outstanding_cents: number;
      overdue_count: number;
      invoice_count: number;
    };
    invoices: Array<{
      id: string;
      account_id: string;
      account_name: string;
      account_email: string;
      description: string;
      amount_cents: number;
      paid_cents: number;
      outstanding_cents: number;
      currency: string;
      due_date: string;
      status: string;
      payment_status: "paid" | "partial" | "overdue" | "unpaid" | "cancelled";
      created: string;
    }>;
    payments: Array<{
      id: string;
      invoice_id: string;
      account_name: string;
      invoice_description: string;
      amount_cents: number;
      currency: string;
      method: string;
      reference: string;
      note: string;
      paid_at: string;
    }>;
  };
  skills: Array<{
    id: string;
    label: string;
    labelEn: string;
    category: string;
    categoryEn: string;
    aliases: string[];
    source: "system" | "admin" | "esco";
    created?: string;
    description?: string;
    skillType?: string;
    reuseLevel?: string;
    uri?: string;
  }>;
  escoSkillCount: number;
  skillSections: Array<{
    key: string;
    dimension: "curated" | "skillType" | "reuseLevel";
    value: string;
    label: string;
    labelEn: string;
    count: number;
    source: "joblink" | "esco";
  }>;
  skillRequests: Array<{
    id: string;
    user_name: string;
    user_email: string;
    user_role: string;
    input_label: string;
    canonical_label: string;
    canonical_label_en: string;
    category: string;
    decision: "created" | "matched";
    confidence: number;
    reason: string;
    email_status: "sent" | "queued" | "failed" | "not_needed";
    created: string;
  }>;
  certifications: AdminCertificationData;
  jobTitles: { custom: JobTitleDefinition[]; total: number };
  relations: Array<{ kind: string; actor_role: string; target_role: string; created: string; actor_name: string; target_name: string }>;
};

const empty: AdminData = {
  metrics: {},
  users: [],
  jobs: [],
  applications: [],
  audit: [],
  system: {
    aiEnabled: false,
    aiProvider: "—",
    authentication: "—",
    cvStorage: "—",
    environment: "production",
    skillEmailConfigured: false,
  },
  billing: {
    summary: { billed_cents: 0, paid_cents: 0, outstanding_cents: 0, overdue_count: 0, invoice_count: 0 },
    invoices: [],
    payments: [],
  },
  skills: [],
  escoSkillCount: 0,
  skillSections: [],
  skillRequests: [],
  certifications: { custom: [], total: 0, usage: {} },
  jobTitles: { custom: [], total: 0 },
  relations: [],
};

function money(cents: number, currency = "AZN", language: "az" | "en" = "az") {
  return new Intl.NumberFormat(language === "en" ? "en-GB" : "az-AZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100);
}

function date(value: string, language: "az" | "en") {
  return formatDate(value, language);
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    active: "Aktiv",
    suspended: "Dayandırılıb",
    published: "Yayımlanıb",
    paused: "Dayandırılıb",
    archived: "Arxivlənib",
    paid: "Ödənilib",
    partial: "Qismən ödənilib",
    overdue: "Gecikib",
    unpaid: "Ödənilməyib",
    cancelled: "Ləğv edilib",
  };
  return labels[value] || value;
}

export default function AdminPanel({
  page,
  api,
  notify,
  language,
}: {
  page: string;
  api: (path: string, body?: unknown) => Promise<any>;
  notify: (message: string) => void;
  language: "az" | "en";
}) {
  const [data, setData] = useState<AdminData>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [billingForm, setBillingForm] = useState<"invoice" | "payment" | "">("");
  const [invoiceForm, setInvoiceForm] = useState({ accountId: "", description: "", amount: "", dueDate: "", vatPercent: 0 });
  const [paymentForm, setPaymentForm] = useState({ invoiceId: "", amount: "", method: "bank", reference: "", note: "", paidAt: new Date().toISOString().slice(0, 10) });
  const [skillForm, setSkillForm] = useState({ label: "", labelEn: "", category: "", categoryEn: "", aliases: "" });
  const [skillFormOpen, setSkillFormOpen] = useState(false);
  const [selectedSkillSection, setSelectedSkillSection] = useState("");
  const [skillCatalog, setSkillCatalog] = useState({ skills: [] as AdminData["skills"], total: 0, page: 1, pageCount: 1 });
  const [skillCatalogLoading, setSkillCatalogLoading] = useState(false);
  const [skillCatalogPage, setSkillCatalogPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      setData(await api("admin"));
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setQuery("");
    setStatus("");
    setBillingForm("");
    setSkillCatalogPage(1);
  }, [page]);

  const activeSkillSection = data.skillSections.find((section) => section.key === selectedSkillSection) || data.skillSections[0];

  useEffect(() => {
    if (page !== "admin-skills" || !activeSkillSection) return;
    let active = true;
    setSkillCatalogLoading(true);
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        dimension: activeSkillSection.dimension,
        value: activeSkillSection.value,
        page: String(skillCatalogPage),
      });
      if (query.trim()) params.set("q", query.trim());
      void api(`admin/skills/catalog?${params}`)
        .then((result) => {
          if (active) setSkillCatalog({
            skills: Array.isArray(result.skills) ? result.skills : [],
            total: Number(result.total) || 0,
            page: Number(result.page) || 1,
            pageCount: Math.max(1, Number(result.pageCount) || 1),
          });
        })
        .catch(() => { if (active) setSkillCatalog({ skills: [], total: 0, page: 1, pageCount: 1 }); })
        .finally(() => { if (active) setSkillCatalogLoading(false); });
    }, 220);
    return () => { active = false; window.clearTimeout(timer); };
  }, [activeSkillSection?.key, api, page, query, skillCatalogPage]);

  async function action(
    entityType: "user" | "job" | "invoice",
    entityId: string,
    nextAction: string,
    confirmation: string,
  ) {
    if (!window.confirm(confirmation)) return;
    setBusy(`${entityType}:${entityId}`);
    try {
      await api("admin/action", { entityType, entityId, action: nextAction });
      notify("Administrator əməliyyatı tamamlandı.");
      await load();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function createInvoice(event: React.FormEvent) {
    event.preventDefault();
    setBusy("billing:invoice");
    try {
      await api("admin/billing/invoice", {
        ...invoiceForm,
        amountCents: Math.round(Number(invoiceForm.amount.replace(",", ".")) * 100),
      });
      notify("Hesab-faktura yaradıldı.");
      setInvoiceForm({ accountId: "", description: "", amount: "", dueDate: "", vatPercent: 0 });
      setBillingForm("");
      await load();
    } catch (error) { notify((error as Error).message); }
    finally { setBusy(""); }
  }

  async function recordPayment(event: React.FormEvent) {
    event.preventDefault();
    setBusy("billing:payment");
    try {
      await api("admin/billing/payment", {
        ...paymentForm,
        amountCents: Math.round(Number(paymentForm.amount.replace(",", ".")) * 100),
      });
      notify("Ödəniş qeydə alındı.");
      setPaymentForm({ invoiceId: "", amount: "", method: "bank", reference: "", note: "", paidAt: new Date().toISOString().slice(0, 10) });
      setBillingForm("");
      await load();
    } catch (error) { notify((error as Error).message); }
    finally { setBusy(""); }
  }

  function exportBilling() {
    const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = data.billing.invoices.map((item) => [item.account_name, item.account_email, item.description, item.amount_cents / 100, item.paid_cents / 100, item.outstanding_cents / 100, item.due_date, item.payment_status]);
    const csv = [["Hesab", "E-poçt", "Təyinat", "Məbləğ (AZN)", "Ödənilib", "Borc", "Son tarix", "Status"], ...rows].map((row) => row.map(quote).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `joblink-billing-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  async function createSkill(event: React.FormEvent) {
    event.preventDefault();
    setBusy("skill:create");
    try {
      await api("admin/skills", { ...skillForm, aliases: skillForm.aliases.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean) });
      invalidateRuntimeSkills();
      notify("Yeni bacarıq ümumi kataloqa əlavə edildi.");
      setSkillForm({ label: "", labelEn: "", category: "", categoryEn: "", aliases: "" });
      setSkillFormOpen(false);
      await load();
    } catch (error) { notify((error as Error).message); }
    finally { setBusy(""); }
  }

  function exportSkills(exportAll = false) {
    if (!exportAll && !activeSkillSection) return;
    const params = new URLSearchParams();
    if (exportAll) params.set("all", "1");
    else {
      params.set("dimension", activeSkillSection.dimension);
      params.set("value", activeSkillSection.value);
    }
    const link = document.createElement("a");
    link.href = `/api/joblink/admin/skills/export?${params}`;
    link.click();
  }

  const filteredUsers = useMemo(() => {
    const needle = query.toLocaleLowerCase("az");
    return data.users.filter(
      (user) =>
        (!status || user.status === status || user.role === status) &&
        [user.name, user.email, user.title, user.role]
          .join(" ")
          .toLocaleLowerCase("az")
          .includes(needle),
    );
  }, [data.users, query, status]);

  const filteredJobs = useMemo(() => {
    const needle = query.toLocaleLowerCase("az");
    return data.jobs.filter(
      (job) =>
        (!status || job.status === status) &&
        [job.title, job.company, job.ownerName, job.category, job.city]
          .join(" ")
          .toLocaleLowerCase("az")
          .includes(needle),
    );
  }, [data.jobs, query, status]);

  const filteredInvoices = useMemo(() => {
    const needle = query.toLocaleLowerCase("az");
    return data.billing.invoices.filter((invoice) =>
      (!status || invoice.payment_status === status) &&
      [invoice.account_name, invoice.account_email, invoice.description].join(" ").toLocaleLowerCase("az").includes(needle));
  }, [data.billing.invoices, query, status]);

  const skillSectionGroups = useMemo(() => ({
    curated: data.skillSections.filter((section) => section.dimension === "curated"),
    skillType: data.skillSections.filter((section) => section.dimension === "skillType"),
    reuseLevel: data.skillSections.filter((section) => section.dimension === "reuseLevel"),
  }), [data.skillSections]);

  if (loading && !data.users.length)
    return localizeTree(
      <section className="admin-loading" role="status">
        <ShieldCheck size={28} />
        <div><strong>Admin panel hazırlanır</strong><span>Platform məlumatları yüklənir…</span></div>
      </section>,
      language,
    );

  const toolbar = (options: Array<[string, string]>) => (
    <div className="admin-toolbar">
      <label className="admin-search">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ad, e-poçt, şirkət və ya vakansiya axtar…"
        />
      </label>
      <select value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="">Bütün statuslar</option>
        {options.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select>
    </div>
  );

  return localizeTree(
    <div className="admin-panel">
      <section className="admin-hero">
        <div>
          <span className="admin-kicker"><ShieldCheck size={15} /> JOBLINK CONTROL CENTER</span>
          <h1>
            {page === "admin-users" ? "İstifadəçilər" :
              page === "admin-jobs" ? "Vakansiya moderasiyası" :
                page === "admin-applications" ? "Müraciət axını" :
                  page === "admin-billing" ? "Ödənişlər və borclar" :
                    page === "admin-skills" ? "Bacarıqlar kataloqu" :
                    page === "admin-certifications" ? "Sertifikatlar kataloqu" :
                    page === "admin-job-titles" ? "Vəzifələr kataloqu" :
                    page === "admin-matching" ? "Uyğunluq balı" :
                    page === "admin-education" ? "Təhsil kataloqu" :
                    page === "admin-relations" ? "İzləmə və bloklar" :
                  page === "admin-system" ? "Sistem və audit" : "Platforma icmalı"}
          </h1>
          <p>Platformanın təhlükəsizliyi, məzmun keyfiyyəti və əməliyyat göstəriciləri bir yerdə.</p>
        </div>
        <div className="admin-live"><i /><span>Production</span><strong>Operational</strong></div>
      </section>

      {page === "admin-overview" && (
        <>
          <div className="admin-metrics">
            {[
              [Users, "Ümumi istifadəçi", data.metrics.total_users || 0, `${data.metrics.candidates || 0} namizəd`],
              [Building2, "Şirkət hesabı", data.metrics.companies || 0, "Təsdiqlənmiş giriş"],
              [BriefcaseBusiness, "Aktiv vakansiya", data.metrics.published_jobs || 0, `${data.metrics.paused_jobs || 0} dayandırılıb`],
              [FileCheck2, "Müraciətlər", data.metrics.applications || 0, `${data.metrics.applications_30d || 0} son 30 gündə`],
            ].map(([Icon, title, value, note]) => {
              const MetricIcon = Icon as typeof Users;
              return <article className="admin-metric" key={String(title)}>
                <span><MetricIcon size={20} /></span>
                <p>{String(title)}</p><strong>{String(value)}</strong><small>{String(note)}</small>
              </article>;
            })}
          </div>
          <div className="admin-overview-grid">
            <section className="panel admin-chart-card">
              <div className="section-heading"><div><h2>Platforma fəaliyyəti</h2><p>Əsas əməliyyat göstəriciləri</p></div><Activity size={20} /></div>
              <div className="admin-bars">
                {[
                  ["Aktiv profillər", data.metrics.active_profiles || 0, data.metrics.total_users || 1],
                  ["Yayımlanmış vakansiyalar", data.metrics.published_jobs || 0, Math.max(data.jobs.length, 1)],
                  ["Son 30 gün müraciətləri", data.metrics.applications_30d || 0, Math.max(data.metrics.applications || 1, 1)],
                ].map(([label, value, total]) => <div key={String(label)}><span>{String(label)}<b>{String(value)}</b></span><i><em style={{width:`${Math.min(100, Number(value)/Number(total)*100)}%`}} /></i></div>)}
              </div>
            </section>
            <section className="panel admin-attention">
              <div className="section-heading"><div><h2>Diqqət tələb edir</h2><p>Operativ yoxlama siyahısı</p></div><AlertTriangle size={20} /></div>
              <ul>
                <li><span><CirclePause size={17} /> Dayandırılmış vakansiyalar</span><b>{data.metrics.paused_jobs || 0}</b></li>
                <li><span><UserRound size={17} /> Dayandırılmış hesablar</span><b>{data.metrics.suspended_users || 0}</b></li>
                <li><span><Sparkles size={17} /> AI xidməti</span><b className={data.system.aiEnabled ? "ok" : "warning"}>{data.system.aiEnabled ? "Aktiv" : "Yoxlayın"}</b></li>
              </ul>
            </section>
          </div>
          <section className="panel admin-recent">
            <div className="section-heading"><div><h2>Son inzibati fəaliyyət</h2><p>Bütün dəyişikliklər audit jurnalına yazılır</p></div></div>
            {data.audit.length ? data.audit.slice(0, 6).map((item) => <div className="audit-row" key={item.id}><span><ShieldCheck size={16} /></span><div><strong>{item.admin_name}</strong><p>{item.entity_type} · {item.action}</p></div><time>{date(item.created, language)}</time></div>) : <p className="admin-empty">Hələ inzibati dəyişiklik edilməyib.</p>}
          </section>
        </>
      )}

      {page === "admin-users" && (
        <section className="panel admin-table-card">
          <div className="section-heading"><div><h2>İstifadəçi idarəetməsi</h2><p>{filteredUsers.length} hesab göstərilir</p></div></div>
          {toolbar([["candidate","Namizəd"],["company","Şirkət"],["active","Aktiv"],["suspended","Dayandırılıb"]])}
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>İstifadəçi</th><th>Hesab növü</th><th>Fəaliyyət</th><th>Qeydiyyat</th><th>Status</th><th /></tr></thead><tbody>
            {filteredUsers.map((user) => <tr key={user.id}><td><div className="admin-person"><span>{user.name?.[0] || "J"}</span><div><strong>{user.name}</strong><small>{user.email || user.title || "Profil məlumatı yoxdur"}</small></div></div></td><td><span className="admin-role">{user.role === "company" ? "Şirkət" : user.role === "admin" ? "Admin" : "Namizəd"}</span></td><td><b>{user.role === "company" ? `${user.jobs_count} vakansiya` : `${user.applications_count} müraciət`}</b></td><td>{date(user.created, language)}</td><td><span className={`admin-status ${user.status}`}>{statusLabel(user.status)}</span></td><td>{user.role !== "admin" && <button className="admin-action" disabled={busy===`user:${user.id}`} onClick={() => action("user",user.id,user.status === "active" ? "suspend" : "activate",user.status === "active" ? `${user.name} hesabını dayandırmaq istəyirsiniz?` : `${user.name} hesabını aktivləşdirmək istəyirsiniz?`)}>{user.status === "active" ? "Dayandır" : "Aktivləşdir"}</button>}</td></tr>)}
          </tbody></table></div>
        </section>
      )}

      {page === "admin-jobs" && (
        <section className="panel admin-table-card">
          <div className="section-heading"><div><h2>Vakansiya moderasiyası</h2><p>{filteredJobs.length} vakansiya göstərilir</p></div></div>
          {toolbar([["published","Yayımlanıb"],["paused","Dayandırılıb"],["archived","Arxivlənib"]])}
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Vakansiya</th><th>Şirkət</th><th>Müraciət</th><th>Tarix</th><th>Status</th><th /></tr></thead><tbody>
            {filteredJobs.map((job) => <tr key={job.id}><td><div className="admin-job"><strong>{job.title}</strong><small>{job.category} · {job.city}</small></div></td><td>{job.company || job.ownerName}</td><td><b>{job.applicationsCount}</b></td><td>{date(job.created, language)}</td><td><span className={`admin-status ${job.status}`}>{statusLabel(job.status)}</span></td><td><div className="admin-actions">{job.status !== "published" && <button disabled={busy===`job:${job.id}`} onClick={() => action("job",job.id,"publish",`“${job.title}” vakansiyasını yayımlamaq istəyirsiniz?`)}>Yayımla</button>}{job.status === "published" && <button disabled={busy===`job:${job.id}`} onClick={() => action("job",job.id,"pause",`“${job.title}” vakansiyasını dayandırmaq istəyirsiniz?`)}>Dayandır</button>}{job.status !== "archived" && <button disabled={busy===`job:${job.id}`} onClick={() => action("job",job.id,"archive",`“${job.title}” vakansiyasını arxivləmək istəyirsiniz?`)}>Arxivlə</button>}</div></td></tr>)}
          </tbody></table></div>
        </section>
      )}

      {page === "admin-applications" && (
        <section className="panel admin-table-card">
          <div className="section-heading"><div><h2>Müraciət monitorinqi</h2><p>{data.applications.length} platforma müraciəti</p></div></div>
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Namizəd</th><th>Vakansiya</th><th>Şirkət</th><th>Növ</th><th>Status</th><th>Tarix</th></tr></thead><tbody>
            {data.applications.map((item) => <tr key={item.id}><td><div className="admin-job"><strong>{item.candidate_name}</strong><small>{item.candidate_title}</small></div></td><td>{item.job_title}</td><td>{item.company || "—"}</td><td><span className="admin-role">{item.auto ? "AI avtomatik" : "Əl ilə"}</span></td><td><span className="admin-status published">{item.status}</span></td><td>{date(item.created, language)}</td></tr>)}
          </tbody></table></div>
        </section>
      )}

      {page === "admin-billing" && (
        <>
          <div className="billing-summary-grid">
            {[
              [ReceiptText, "Ümumi hesablanıb", data.billing.summary.billed_cents, `${data.billing.summary.invoice_count || 0} hesab-faktura`],
              [Banknote, "Daxil olan ödəniş", data.billing.summary.paid_cents, "Qeydə alınmış ödənişlər"],
              [CircleDollarSign, "Qalıq borc", data.billing.summary.outstanding_cents, `${data.billing.summary.overdue_count || 0} gecikmiş hesab`],
            ].map(([Icon, label, value, note]) => {
              const ItemIcon = Icon as typeof ReceiptText;
              return <article className="billing-summary" key={String(label)}><span><ItemIcon size={20} /></span><div><small>{String(label)}</small><strong>{money(Number(value), "AZN", language)}</strong><p>{String(note)}</p></div></article>;
            })}
          </div>

          <section className="panel admin-table-card billing-card">
            <div className="section-heading billing-heading">
              <div><h2>Maliyyə reyestri</h2><p>Kimin ödədiyini, qismən ödənişləri və qalıq borcları izləyin</p></div>
              <div className="billing-head-actions">
                <button className="billing-secondary" onClick={exportBilling}><Download size={16} /> CSV endir</button>
                <button className="billing-secondary" onClick={() => setBillingForm(billingForm === "payment" ? "" : "payment")}><Banknote size={16} /> Ödəniş yaz</button>
                <button className="billing-primary" onClick={() => setBillingForm(billingForm === "invoice" ? "" : "invoice")}><Plus size={16} /> Hesab yarat</button>
              </div>
            </div>

            {billingForm === "invoice" && <form className="billing-form" onSubmit={createInvoice}>
              <div className="billing-form-title"><div><strong>Yeni hesab-faktura</strong><span>İstifadəçi və ya şirkət üçün ödənilməli məbləğ yaradın</span></div></div>
              <label><span>Hesab *</span><select required value={invoiceForm.accountId} onChange={(e) => setInvoiceForm({...invoiceForm,accountId:e.target.value})}><option value="">Hesab seçin</option>{data.users.filter((u) => u.role !== "admin" && u.status === "active").map((u) => <option key={u.id} value={u.id}>{u.name} — {u.email || (u.role === "company" ? "Şirkət" : "Namizəd")}</option>)}</select></label>
              <label className="wide"><span>Təyinat *</span><input required maxLength={160} value={invoiceForm.description} onChange={(e) => setInvoiceForm({...invoiceForm,description:e.target.value})} placeholder="Məsələn: Premium şirkət paketi — oktyabr" /></label>
              <label><span>Məbləğ (AZN) *</span><input required min="0.01" max="1000000" step="0.01" inputMode="decimal" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({...invoiceForm,amount:e.target.value})} placeholder="0.00" /></label>
              <label><span>ƏDV (məbləğə daxildir)</span><select value={invoiceForm.vatPercent} onChange={(e) => setInvoiceForm({...invoiceForm,vatPercent:Number(e.target.value)})}><option value={0}>ƏDV yoxdur</option><option value={18}>18% ƏDV daxil</option></select></label>
              <label><span>Son ödəniş tarixi *</span><input required type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({...invoiceForm,dueDate:e.target.value})} /></label>
              <div className="billing-form-actions"><button type="button" onClick={() => setBillingForm("")}>Ləğv et</button><button className="billing-primary" disabled={busy === "billing:invoice"}>Hesab-fakturanı yarat</button></div>
            </form>}

            {billingForm === "payment" && <form className="billing-form" onSubmit={recordPayment}>
              <div className="billing-form-title"><div><strong>Ödənişi qeydə al</strong><span>Qismən və ya tam ödənişi uyğun hesab-fakturaya bağlayın</span></div></div>
              <label className="wide"><span>Hesab-faktura *</span><select required value={paymentForm.invoiceId} onChange={(e) => { const invoice=data.billing.invoices.find((item)=>item.id===e.target.value); setPaymentForm({...paymentForm,invoiceId:e.target.value,amount:invoice ? (invoice.outstanding_cents/100).toFixed(2) : ""}); }}><option value="">Ödənilməmiş hesab seçin</option>{data.billing.invoices.filter((i) => i.status === "open" && i.outstanding_cents > 0).map((i) => <option key={i.id} value={i.id}>{i.account_name} — {i.description} — {money(i.outstanding_cents,i.currency,language)} qalıq</option>)}</select></label>
              <label><span>Ödənilən məbləğ (AZN) *</span><input required min="0.01" step="0.01" inputMode="decimal" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm,amount:e.target.value})} placeholder="0.00" /></label>
              <label><span>Ödəniş tarixi *</span><input required type="date" value={paymentForm.paidAt} onChange={(e) => setPaymentForm({...paymentForm,paidAt:e.target.value})} /></label>
              <label><span>Ödəniş üsulu *</span><select value={paymentForm.method} onChange={(e) => setPaymentForm({...paymentForm,method:e.target.value})}><option value="bank">Bank köçürməsi</option><option value="card">Kart</option><option value="cash">Nağd</option><option value="other">Digər</option></select></label>
              <label><span>Tranzaksiya / qəbz №</span><input maxLength={100} value={paymentForm.reference} onChange={(e) => setPaymentForm({...paymentForm,reference:e.target.value})} placeholder="İstinad nömrəsi" /></label>
              <label className="wide"><span>Qeyd</span><input maxLength={300} value={paymentForm.note} onChange={(e) => setPaymentForm({...paymentForm,note:e.target.value})} placeholder="Əlavə qeyd (istəyə bağlı)" /></label>
              <div className="billing-form-actions"><button type="button" onClick={() => setBillingForm("")}>Ləğv et</button><button className="billing-primary" disabled={busy === "billing:payment"}>Ödənişi təsdiqlə</button></div>
            </form>}

            {toolbar([["paid","Ödənilib"],["partial","Qismən ödənilib"],["overdue","Gecikib"],["unpaid","Ödənilməyib"],["cancelled","Ləğv edilib"]])}
            <div className="admin-table-wrap"><table className="admin-table billing-table"><thead><tr><th>Müştəri / hesab</th><th>Təyinat</th><th>Hesablanıb</th><th>Ödənilib</th><th>Qalıq borc</th><th>Son tarix</th><th>Status</th><th /></tr></thead><tbody>
              {filteredInvoices.map((item) => <tr key={item.id}><td><div className="admin-person"><span>{item.account_name?.[0] || "J"}</span><div><strong>{item.account_name}</strong><small>{item.account_email}</small></div></div></td><td><div className="admin-job"><strong>{item.description}</strong><small>#{item.id.slice(0,8)}</small></div></td><td><b>{money(item.amount_cents,item.currency,language)}</b></td><td className="billing-paid">{money(item.paid_cents,item.currency,language)}</td><td className={item.outstanding_cents ? "billing-debt" : "billing-zero"}><b>{money(item.outstanding_cents,item.currency,language)}</b></td><td>{date(item.due_date,language)}</td><td><span className={`admin-status ${item.payment_status}`}>{statusLabel(item.payment_status)}</span></td><td><div className="admin-actions">{item.status === "open" && item.outstanding_cents > 0 && <button onClick={() => {setPaymentForm({...paymentForm,invoiceId:item.id,amount:(item.outstanding_cents/100).toFixed(2)});setBillingForm("payment");window.scrollTo({top:0,behavior:"smooth"});}}>Ödəniş yaz</button>}{item.status === "open" && item.paid_cents === 0 && <button disabled={busy===`invoice:${item.id}`} onClick={() => action("invoice",item.id,"cancel",`“${item.description}” hesab-fakturasını ləğv etmək istəyirsiniz?`)}>Ləğv et</button>}</div></td></tr>)}
              {!filteredInvoices.length && <tr><td colSpan={8}><p className="admin-empty">Bu filtrə uyğun hesab-faktura yoxdur.</p></td></tr>}
            </tbody></table></div>
          </section>

          <section className="panel admin-table-card billing-history">
            <div className="section-heading"><div><h2>Ödəniş tarixçəsi</h2><p>{data.billing.payments.length} ödəniş qeydə alınıb</p></div></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tarix</th><th>Ödəyən</th><th>Təyinat</th><th>Üsul</th><th>İstinad</th><th>Məbləğ</th></tr></thead><tbody>{data.billing.payments.map((payment) => <tr key={payment.id}><td>{date(payment.paid_at,language)}</td><td><b>{payment.account_name}</b></td><td><div className="admin-job"><strong>{payment.invoice_description}</strong><small>{payment.note || `#${payment.invoice_id.slice(0,8)}`}</small></div></td><td><span className="admin-role">{{bank:"Bank köçürməsi",card:"Kart",cash:"Nağd",other:"Digər"}[payment.method] || payment.method}</span></td><td>{payment.reference || "—"}</td><td className="billing-paid"><b>+ {money(payment.amount_cents,payment.currency,language)}</b></td></tr>)}</tbody></table></div>
          </section>
        </>
      )}

      {page === "admin-skills" && (
        <>
          <div className="skill-admin-metrics">
            <article><span><Tags size={19} /></span><div><small>Ümumi bacarıq</small><strong>{data.skills.length + data.escoSkillCount}</strong></div></article>
            <article><span><Sparkles size={19} /></span><div><small>Admin tərəfindən əlavə</small><strong>{data.skills.filter((skill) => skill.source === "admin").length}</strong></div></article>
            <article><span><Tags size={19} /></span><div><small>ESCO bacarıqları</small><strong>{data.escoSkillCount}</strong></div></article>
            <article><span><FolderTree size={19} /></span><div><small>İstifadəçi təklifləri</small><strong>{data.skillRequests.filter((request) => request.decision === "created").length}</strong></div></article>
          </div>
          <section className="panel admin-table-card skill-request-card">
            <div className="section-heading"><div><h2>AI ilə əlavə edilən bacarıqlar</h2><p>İşçi və işəgötürən təklifləri, AI qərarı və admin bildirişinin vəziyyəti</p></div><Sparkles size={20} /></div>
            {!data.system.skillEmailConfigured && <p className="skill-email-warning"><AlertTriangle size={16} /> E-poçt göndərişi üçün Cloudflare Email Sending domeni aktiv deyil. Bildirişlər admin panelində saxlanılır.</p>}
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tarix</th><th>İstifadəçi</th><th>Yazılan</th><th>Nəticə</th><th>AI uyğunluğu</th><th>Bildiriş</th></tr></thead><tbody>
              {data.skillRequests.map((request) => <tr key={request.id}><td>{date(request.created,language)}</td><td><div className="admin-job"><strong>{request.user_name}</strong><small>{request.user_email || request.user_role}</small></div></td><td>{request.input_label}</td><td><div className="admin-job"><strong>{request.canonical_label}</strong><small>{request.canonical_label_en} · {request.category}</small></div></td><td><span className="admin-role">{Math.round(Number(request.confidence) * 100)}% · {request.decision === "created" ? "Yeni" : "Mövcud"}</span></td><td><span className={`admin-status ${request.email_status === "sent" ? "active" : request.email_status === "failed" ? "suspended" : "unpaid"}`}>{request.email_status === "sent" ? "E-poçt göndərildi" : request.email_status === "failed" ? "E-poçt xətası" : request.email_status === "not_needed" ? "Lazım deyil" : "Panelə göndərildi"}</span></td></tr>)}
              {!data.skillRequests.length && <tr><td colSpan={6}><p className="admin-empty">Hələ istifadəçi tərəfindən yeni bacarıq əlavə edilməyib.</p></td></tr>}
            </tbody></table></div>
          </section>
          <section className="panel admin-table-card skill-admin-card">
            <div className="section-heading billing-heading">
              <div><h2>Ortaq bacarıqlar kataloqu</h2><p>Hər bölməni açın, daxilindəki bacarıqlara baxın və Excel formatında endirin</p></div>
              <div className="billing-head-actions">
                <button className="billing-secondary" onClick={() => exportSkills(true)}><Download size={16} /> Hamısını XLSX</button>
                <button className="billing-primary" onClick={() => setSkillFormOpen((value) => !value)}><Plus size={16} /> Yeni bacarıq</button>
              </div>
            </div>

            {skillFormOpen && <form className="billing-form skill-admin-form" onSubmit={createSkill}>
              <div className="billing-form-title"><div><strong>Yeni kataloq bacarığı</strong><span>Dublikatların qarşısını almaq üçün Azərbaycan və İngilis adlarını dəqiq yazın</span></div></div>
              <label><span>Azərbaycan dilində ad *</span><input required maxLength={70} value={skillForm.label} onChange={(e) => setSkillForm({...skillForm,label:e.target.value})} placeholder="Məsələn: Maliyyə modelləşdirilməsi" /></label>
              <label><span>İngilis dilində ad *</span><input required maxLength={70} value={skillForm.labelEn} onChange={(e) => setSkillForm({...skillForm,labelEn:e.target.value})} placeholder="For example: Financial Modeling" /></label>
              <label><span>Azərbaycan dilində kateqoriya *</span><input required list="skill-category-list" maxLength={60} value={skillForm.category} onChange={(e) => setSkillForm({...skillForm,category:e.target.value})} placeholder="Maliyyə" /><datalist id="skill-category-list">{Array.from(new Set(data.skills.map((skill) => skill.category))).map((category) => <option key={category} value={category} />)}</datalist></label>
              <label><span>İngilis dilində kateqoriya *</span><input required maxLength={60} value={skillForm.categoryEn} onChange={(e) => setSkillForm({...skillForm,categoryEn:e.target.value})} placeholder="Finance" /></label>
              <label className="wide"><span>Sinonimlər və alternativ yazılışlar</span><textarea rows={3} maxLength={500} value={skillForm.aliases} onChange={(e) => setSkillForm({...skillForm,aliases:e.target.value})} placeholder="Vergül ilə ayırın: financial modelling, maliyyə modeli" /><small>Axtarış zamanı bu yazılışların hamısı eyni bacarığa yönləndiriləcək.</small></label>
              <div className="billing-form-actions"><button type="button" onClick={() => setSkillFormOpen(false)}>Ləğv et</button><button className="billing-primary" disabled={busy === "skill:create"}>Kataloqa əlavə et</button></div>
            </form>}

            <div className="skill-section-browser">
              {([
                ["Joblink kateqoriyaları", "CV və vakansiyalarda istifadə olunan əsas kateqoriyalar", skillSectionGroups.curated],
                ["ESCO bacarıq növləri", "Peşəkar bacarıqları bilik sahələrindən ayırır", skillSectionGroups.skillType],
                ["ESCO istifadə səviyyələri", "Bacarığın müxtəlif peşə və sektorlar üzrə tətbiq sahəsi", skillSectionGroups.reuseLevel],
              ] as const).map(([title, note, sections]) => (
                <section className="skill-section-group" key={title}>
                  <div><h3>{title}</h3><p>{note}</p></div>
                  <div className="skill-section-grid">
                    {sections.map((section) => <button
                      type="button"
                      className={activeSkillSection?.key === section.key ? "active" : ""}
                      key={section.key}
                      onClick={() => { setSelectedSkillSection(section.key); setSkillCatalogPage(1); setQuery(""); }}
                    >
                      <span><strong>{language === "en" ? section.labelEn : section.label}</strong><small>{section.source === "esco" ? "ESCO" : "Joblink"}</small></span>
                      <b>{section.count.toLocaleString(language === "en" ? "en-GB" : "az-AZ")}</b>
                    </button>)}
                  </div>
                </section>
              ))}
            </div>

            <div className="skill-catalog-heading">
              <div>
                <span>{activeSkillSection?.source === "esco" ? "ESCO BÖLMƏSİ" : "JOBLINK BÖLMƏSİ"}</span>
                <h3>{activeSkillSection ? (language === "en" ? activeSkillSection.labelEn : activeSkillSection.label) : "Bacarıqlar"}</h3>
                <p>{skillCatalog.total.toLocaleString(language === "en" ? "en-GB" : "az-AZ")} bacarıq</p>
              </div>
              <button className="billing-secondary" disabled={!activeSkillSection || skillCatalogLoading} onClick={() => exportSkills(false)}><Download size={16} /> Bu bölməni XLSX</button>
            </div>
            <div className="admin-toolbar skill-catalog-toolbar">
              <label className="admin-search">
                <Search size={17} />
                <input value={query} onChange={(event) => { setQuery(event.target.value); setSkillCatalogPage(1); }} placeholder="Bu bölmədə bacarıq axtar…" />
              </label>
              {skillCatalogLoading && <span className="skill-catalog-loading">Yüklənir…</span>}
            </div>
            <div className="admin-table-wrap"><table className="admin-table skill-admin-table"><thead><tr><th>Bacarıq</th><th>İngilis versiyası</th><th>Kateqoriya</th><th>Sinonimlər</th><th>Mənbə</th></tr></thead><tbody>
              {skillCatalog.skills.map((skill) => <tr key={skill.id}><td><strong>{skill.label}</strong>{skill.description && <small className="skill-description">{skill.description}</small>}</td><td>{skill.labelEn}</td><td><span className="admin-role">{skill.source === "esco" ? (skill.reuseLevel || skill.skillType || "ESCO") : skill.category}</span></td><td><div className="skill-alias-preview">{skill.aliases.slice(0,4).map((alias) => <span key={alias}>{alias}</span>)}{skill.aliases.length > 4 && <small>+{skill.aliases.length - 4}</small>}</div></td><td><span className={`skill-source ${skill.source}`}>{skill.source === "admin" ? "Admin" : skill.source === "esco" ? "ESCO" : "Sistem"}</span></td></tr>)}
              {!skillCatalog.skills.length && !skillCatalogLoading && <tr><td colSpan={5}><p className="admin-empty">Bu bölmədə uyğun bacarıq tapılmadı.</p></td></tr>}
            </tbody></table></div>
            {skillCatalog.pageCount > 1 && <nav className="skill-pagination" aria-label="Bacarıq səhifələri">
              <button type="button" disabled={skillCatalogPage <= 1 || skillCatalogLoading} onClick={() => setSkillCatalogPage((pageNumber) => Math.max(1, pageNumber - 1))}><ChevronLeft size={16} /> Əvvəlki</button>
              <span>{skillCatalog.page} / {skillCatalog.pageCount}</span>
              <button type="button" disabled={skillCatalogPage >= skillCatalog.pageCount || skillCatalogLoading} onClick={() => setSkillCatalogPage((pageNumber) => Math.min(skillCatalog.pageCount, pageNumber + 1))}>Növbəti <ChevronRight size={16} /></button>
            </nav>}
          </section>
        </>
      )}

      {page === "admin-certifications" && (
        <AdminCertifications
          data={data.certifications || empty.certifications}
          api={api}
          notify={notify}
          reload={load}
          language={language}
        />
      )}

      {page === "admin-job-titles" && (
        <AdminJobTitles
          custom={data.jobTitles?.custom || []}
          api={api}
          notify={notify}
          reload={load}
          language={language}
        />
      )}

      {page === "admin-education" && <AdminEducation api={api} notify={notify} language={language} />}
      {page === "admin-matching" && <AdminMatching api={api} notify={notify} />}

      {page === "admin-relations" && (
        <>
          <div className="skill-admin-metrics">
            <article><span><Users size={19} /></span><div><small>Namizəd → şirkət izləmələri</small><strong>{(data.relations || []).filter((r) => r.kind === "follow" && r.actor_role === "candidate").length}</strong></div></article>
            <article><span><Users size={19} /></span><div><small>Şirkət → namizəd izləmələri</small><strong>{(data.relations || []).filter((r) => r.kind === "follow" && r.actor_role === "company").length}</strong></div></article>
            <article><span><AlertTriangle size={19} /></span><div><small>Bloklar</small><strong>{(data.relations || []).filter((r) => r.kind === "block").length}</strong></div></article>
            <article><span><Activity size={19} /></span><div><small>Ümumi qeyd</small><strong>{(data.relations || []).length}</strong></div></article>
          </div>
          <section className="panel admin-table-card">
            <div className="section-heading"><div><h2>İzləmə və bloklar</h2><p>Namizədlərin şirkətləri və şirkətlərin namizədləri izləməsi və ya bloklaması</p></div></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Kim</th><th>Əməliyyat</th><th>Kimi</th><th>Tarix</th></tr></thead><tbody>
              {(data.relations || []).map((r, i) => (
                <tr key={i}>
                  <td><div className="admin-job"><strong>{r.actor_name}</strong><small>{r.actor_role === "company" ? "Şirkət" : "Namizəd"}</small></div></td>
                  <td><span className={`admin-status ${r.kind === "block" ? "suspended" : "active"}`}>{r.kind === "block" ? "Blokladı" : "İzləyir"}</span></td>
                  <td><div className="admin-job"><strong>{r.target_name}</strong><small>{r.target_role === "company" ? "Şirkət" : "Namizəd"}</small></div></td>
                  <td>{date(r.created, language)}</td>
                </tr>
              ))}
              {!(data.relations || []).length && <tr><td colSpan={4}><p className="admin-empty">Hələ qeyd yoxdur.</p></td></tr>}
            </tbody></table></div>
          </section>
        </>
      )}

      {page === "admin-system" && (
        <div className="admin-system-grid">
          <section className="panel admin-system-card"><div className="section-heading"><div><h2>Sistem vəziyyəti</h2><p>Production konfiqurasiyası</p></div><CheckCircle2 size={20} /></div>{[
            ["Mühit", data.system.environment], ["AI provayderi", data.system.aiProvider], ["AI bağlantısı", data.system.aiEnabled ? "Aktiv" : "Aktiv deyil"], ["Giriş sistemi", data.system.authentication], ["CV saxlanması", data.system.cvStorage],
          ].map(([key,value]) => <div className="system-row" key={key}><span>{key}</span><strong>{value}</strong></div>)}</section>
          <section className="panel admin-audit-card"><div className="section-heading"><div><h2>Audit jurnalı</h2><p>Son 100 administrator əməliyyatı</p></div><ShieldCheck size={20} /></div>{data.audit.length ? data.audit.map((item) => <div className="audit-row" key={item.id}><span><ArrowUpRight size={15} /></span><div><strong>{item.action}</strong><p>{item.entity_type} · {item.entity_id.slice(0,8)}…</p></div><time>{date(item.created, language)}</time></div>) : <p className="admin-empty">Audit jurnalı boşdur.</p>}</section>
        </div>
      )}
    </div>,
    language,
  );
}
