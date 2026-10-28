"use client";
import { formatDate } from "@/lib/dates";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Inbox, Plus, Search, Sparkles, X } from "lucide-react";
import {
  JOB_TITLE_CATALOG,
  fullJobTitleCatalog,
  JOB_TITLE_FAMILIES,
  normalizeJobTitleKey,
  setCustomJobTitles,
  type JobTitleDefinition,
} from "@/lib/job-title-catalog";

type Thread = {
  id: string;
  topic: string;
  subject: string;
  status: string;
  user_name: string;
  user_role: string;
  created: string;
};

export default function AdminJobTitles({
  custom,
  api,
  notify,
  reload,
  language,
}: {
  custom: JobTitleDefinition[];
  api: (path: string, body?: unknown) => Promise<unknown>;
  notify: (message: string) => void;
  reload: () => Promise<void>;
  language: "az" | "en" | "ru";
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [limit, setLimit] = useState(60);
  const [requests, setRequests] = useState<Thread[]>([]);
  const [form, setForm] = useState<{ label: string; labelEn: string; family: string; aliases: string; threadId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Every profession followed by its levels (Kiçik, Böyük, Aparıcı, Baş, rəhbər).
  const catalog = useMemo(() => {
    const levels = new Map<string, JobTitleDefinition[]>();
    for (const title of fullJobTitleCatalog())
      if (title.base) levels.set(title.base, [...(levels.get(title.base) || []), title]);
    return JOB_TITLE_CATALOG.flatMap((title) => [title, ...(levels.get(title.id) || [])]);
  }, []);
  const all = useMemo(() => [...catalog, ...custom], [catalog, custom]);
  const keys = useMemo(() => new Map(all.map((title) => [title.id, title.aliases.map(normalizeJobTitleKey).join("|")])), [all]);
  async function loadRequests() {
    try {
      const response = await fetch("/api/joblink/support", { credentials: "same-origin", cache: "no-store" });
      const data = (await response.json()) as { threads?: Thread[] };
      setRequests((data.threads || []).filter((thread) => thread.topic === "job-title"));
    } catch {
      setRequests([]);
    }
  }
  useEffect(() => {
    // Initial data load; the state update happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRequests();
  }, []);
  const open = requests.filter((thread) => !["done", "rejected"].includes(thread.status));
  const needle = normalizeJobTitleKey(query);
  const rows = all
    .filter((title) => !family || title.family === family)
    .filter((title) => !needle || (keys.get(title.id) || "").includes(needle));
  const number = (value: number) => value.toLocaleString(language === "en" ? "en-GB" : "az-AZ");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const result = (await api("admin/job-titles", form)) as { title: JobTitleDefinition };
      setCustomJobTitles([...custom, result.title]);
      notify(form.threadId ? "Vəzifə əlavə edildi və sorğu tamamlandı." : "Vəzifə kataloqa əlavə edildi.");
      setForm(null);
      await Promise.all([reload(), loadRequests()]);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reject(thread: Thread) {
    const reason = window.prompt("Rədd etmə səbəbi (istifadəçiyə göndəriləcək):", "Bu ad kataloqdakı mövcud vəzifə ilə eynidir.");
    if (reason === null) return;
    try {
      await api("support/reply", { id: thread.id, body: reason || "Sorğu rədd edildi.", status: "rejected" });
      notify("Sorğu rədd edildi.");
      await loadRequests();
    } catch (error) {
      notify((error as Error).message);
    }
  }

  return (
    <>
      <div className="skill-admin-metrics">
        <article><span><BriefcaseBusiness size={19} /></span><div><small>Kataloqdakı vəzifələr</small><strong>{number(all.length)}</strong></div></article>
        <article><span><Sparkles size={19} /></span><div><small>Admin tərəfindən əlavə</small><strong>{number(custom.length)}</strong></div></article>
        <article><span><Inbox size={19} /></span><div><small>Gözləyən sorğular</small><strong>{number(open.length)}</strong></div></article>
        <article><span><BriefcaseBusiness size={19} /></span><div><small>Peşə qrupları</small><strong>{number(Object.keys(JOB_TITLE_FAMILIES).length)}</strong></div></article>
      </div>
      <section className="panel admin-table-card">
        <div className="section-heading"><div><h2>Vəzifə sorğuları</h2><p>İstifadəçilərin kataloqda tapmadığı və əlavə edilməsini istədiyi vəzifələr</p></div><Inbox size={20} /></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Yazılan ad</th><th>İstifadəçi</th><th>Status</th><th>Tarix</th><th></th></tr></thead><tbody>
          {requests.map((thread) => (
            <tr key={thread.id}>
              <td><strong>{thread.subject}</strong></td>
              <td><div className="admin-job"><strong>{thread.user_name}</strong><small>{thread.user_role === "company" ? "Şirkət" : "Namizəd"}</small></div></td>
              <td><span className={`admin-status ${thread.status === "done" ? "active" : thread.status === "rejected" ? "archived" : "paused"}`}>{({ new: "Yeni", read: "Oxundu", in_progress: "İcradadır", done: "Tamamlandı", rejected: "Rədd edildi" } as Record<string, string>)[thread.status] || thread.status}</span></td>
              <td>{formatDate(thread.created, language)}</td>
              <td>{!["done", "rejected"].includes(thread.status) && <div className="admin-actions">
                <button onClick={() => setForm({ label: thread.subject, labelEn: "", family: "", aliases: "", threadId: thread.id })}>Əlavə et</button>
                <button onClick={() => reject(thread)}>Rədd et</button>
              </div>}</td>
            </tr>
          ))}
          {!requests.length && <tr><td colSpan={5}><p className="admin-empty">Hələ vəzifə sorğusu yoxdur.</p></td></tr>}
        </tbody></table></div>
      </section>
      <section className="panel admin-table-card skill-admin-card">
        <div className="section-heading billing-heading">
          <div><h2>Vəzifələr kataloqu</h2><p>Vakansiya adlarında və namizədlərin iş təcrübəsində istifadə olunan ortaq siyahı</p></div>
          <div className="billing-head-actions">
            <button className="billing-primary" onClick={() => setForm({ label: "", labelEn: "", family: "", aliases: "", threadId: "" })}><Plus size={16} /> Yeni vəzifə</button>
          </div>
        </div>
        {form && (
          <form className="billing-form skill-admin-form" onSubmit={save}>
            <div className="billing-form-title"><div><strong>{form.threadId ? "Sorğu əsasında yeni vəzifə" : "Yeni vəzifə"}</strong><span>Təsdiqdən sonra istifadəçiyə avtomatik cavab göndərilir</span></div><button type="button" className="text-button" onClick={() => setForm(null)}><X size={16} /></button></div>
            <label><span>Azərbaycan dilində ad *</span><input required maxLength={120} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
            <label><span>İngilis dilində ad *</span><input required maxLength={120} value={form.labelEn} onChange={(e) => setForm({ ...form, labelEn: e.target.value })} placeholder="For example: Treasury Analyst" /></label>
            <label><span>Peşə qrupu *</span><select required value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })}><option value="">Seçin</option>{Object.entries(JOB_TITLE_FAMILIES).map(([key, value]) => <option key={key} value={key}>{language === "en" ? value.en : value.az}</option>)}</select></label>
            <label className="wide"><span>Alternativ yazılışlar</span><textarea rows={2} maxLength={600} value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="Vergül ilə ayırın (rusca, qısaltma və s.)" /></label>
            <div className="billing-form-actions"><button type="button" onClick={() => setForm(null)}>Ləğv et</button><button className="billing-primary" disabled={busy}>Kataloqa əlavə et</button></div>
          </form>
        )}
        <div className="admin-toolbar skill-catalog-toolbar">
          <label className="admin-search"><Search size={17} /><input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(60); }} placeholder="Vəzifə axtar…" /></label>
          <select value={family} onChange={(e) => { setFamily(e.target.value); setLimit(60); }}><option value="">Bütün peşə qrupları</option>{Object.entries(JOB_TITLE_FAMILIES).map(([key, value]) => <option key={key} value={key}>{language === "en" ? value.en : value.az}</option>)}</select>
        </div>
        <div className="admin-table-wrap"><table className="admin-table skill-admin-table"><thead><tr><th>Vəzifə</th><th>İngilis dilində</th><th>Peşə qrupu</th><th>Alternativ yazılışlar</th><th>Mənbə</th></tr></thead><tbody>
          {rows.slice(0, limit).map((title) => (
            <tr key={title.id}>
              <td><strong>{title.label}</strong></td>
              <td>{title.labelEn}</td>
              <td><span className="admin-role">{language === "en" ? JOB_TITLE_FAMILIES[title.family]?.en : JOB_TITLE_FAMILIES[title.family]?.az}</span></td>
              <td><div className="skill-alias-preview">{title.aliases.slice(2, 5).map((alias) => <span key={alias}>{alias}</span>)}{title.aliases.length > 5 && <small>+{title.aliases.length - 5}</small>}</div></td>
              <td><span className={`skill-source ${title.id.startsWith("admin:") ? "admin" : "system"}`}>{title.id.startsWith("admin:") ? "Admin" : title.base ? "Səviyyə" : "Sistem"}</span></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5}><p className="admin-empty">Uyğun vəzifə tapılmadı.</p></td></tr>}
        </tbody></table></div>
        {rows.length > limit && <nav className="skill-pagination"><span>{number(limit)} / {number(rows.length)}</span><button type="button" onClick={() => setLimit((v) => v + 60)}>Daha çox göstər</button></nav>}
      </section>
    </>
  );
}
