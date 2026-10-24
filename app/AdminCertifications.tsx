"use client";
import { useMemo, useState } from "react";
import { Award, BriefcaseBusiness, Download, Plus, Search, Sparkles, Users } from "lucide-react";
import {
  CERTIFICATION_CATALOG,
  CERTIFICATION_CATEGORIES,
  normalizeCertificationKey,
  setCustomCertifications,
  type CertificationDefinition,
} from "@/lib/certification-catalog";
import { SKILL_CATALOG } from "@/lib/skill-catalog";

export type AdminCertificationData = {
  custom: CertificationDefinition[];
  total: number;
  usage: Record<string, { profiles: number; jobs: number; requiredJobs: number }>;
};

const skillLabel = (id: string) => SKILL_CATALOG.find((skill) => skill.id === id)?.label || id;

export default function AdminCertifications({
  data,
  api,
  notify,
  reload,
  language,
}: {
  data: AdminCertificationData;
  api: (path: string, body?: unknown) => Promise<unknown>;
  notify: (message: string) => void;
  reload: () => Promise<void>;
  language: "az" | "en" | "ru";
}) {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", issuer: "", category: "", aliases: "", levels: "", skills: "" });
  const all = useMemo(() => [...CERTIFICATION_CATALOG, ...data.custom], [data.custom]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const definition of all) map.set(definition.category, (map.get(definition.category) || 0) + 1);
    return map;
  }, [all]);
  const usage = (id: string) => data.usage[id] || { profiles: 0, jobs: 0, requiredJobs: 0 };
  const needle = normalizeCertificationKey(query);
  const rows = all
    .filter((definition) => !category || definition.category === category)
    .filter(
      (definition) =>
        !needle ||
        [definition.name, definition.issuer, ...definition.aliases].some((value) =>
          normalizeCertificationKey(value).includes(needle),
        ),
    )
    .sort((a, b) => usage(b.id).profiles + usage(b.id).jobs - (usage(a.id).profiles + usage(a.id).jobs) || a.name.localeCompare(b.name));
  const holders = Object.values(data.usage).reduce((sum, item) => sum + item.profiles, 0);
  const requiring = Object.values(data.usage).reduce((sum, item) => sum + item.jobs, 0);
  const number = (value: number) => value.toLocaleString(language === "en" ? "en-GB" : "az-AZ");

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = (await api("admin/certifications", form)) as { certification: CertificationDefinition };
      setCustomCertifications([...data.custom, result.certification]);
      notify("Yeni sertifikat kataloqa əlavə edildi.");
      setForm({ name: "", issuer: "", category: "", aliases: "", levels: "", skills: "" });
      setFormOpen(false);
      await reload();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="skill-admin-metrics">
        <article><span><Award size={19} /></span><div><small>Kataloqdakı sertifikatlar</small><strong>{number(all.length)}</strong></div></article>
        <article><span><Sparkles size={19} /></span><div><small>Admin tərəfindən əlavə</small><strong>{number(data.custom.length)}</strong></div></article>
        <article><span><Users size={19} /></span><div><small>Profillərdə qeyd olunub</small><strong>{number(holders)}</strong></div></article>
        <article><span><BriefcaseBusiness size={19} /></span><div><small>Aktiv vakansiya tələbləri</small><strong>{number(requiring)}</strong></div></article>
      </div>
      <section className="panel admin-table-card skill-admin-card">
        <div className="section-heading billing-heading">
          <div><h2>Beynəlxalq sertifikatlar kataloqu</h2><p>Namizəd profillərində, vakansiya tələblərində və uyğunluq balında istifadə olunan ortaq siyahı</p></div>
          <div className="billing-head-actions">
            <button className="billing-secondary" onClick={() => { const link = document.createElement("a"); link.href = "/api/joblink/admin/certifications/export"; link.click(); }}><Download size={16} /> Hamısını XLSX</button>
            <button className="billing-primary" onClick={() => setFormOpen((value) => !value)}><Plus size={16} /> Yeni sertifikat</button>
          </div>
        </div>
        {formOpen && (
          <form className="billing-form skill-admin-form" onSubmit={create}>
            <div className="billing-form-title"><div><strong>Yeni sertifikat</strong><span>Kataloqda olmayan yerli və ya sahəyə xas sertifikatı əlavə edin</span></div></div>
            <label><span>Sertifikatın adı *</span><input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Məsələn: ADA University Executive Certificate" /></label>
            <label><span>Verən təşkilat *</span><input required maxLength={160} value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="Məsələn: ADA University" /></label>
            <label><span>Bölmə *</span><select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Bölmə seçin</option>{Object.keys(CERTIFICATION_CATEGORIES).map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label><span>Səviyyələr (aşağıdan yuxarı)</span><input maxLength={300} value={form.levels} onChange={(e) => setForm({ ...form, levels: e.target.value })} placeholder="Vergül ilə: Foundation, Practitioner" /></label>
            <label className="wide"><span>Sübut etdiyi bacarıqlar</span><input list="cert-skill-list" maxLength={500} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Vergül ilə: Maliyyə hesabatlılığı, Audit" /><datalist id="cert-skill-list">{SKILL_CATALOG.map((skill) => <option key={skill.id} value={skill.label} />)}</datalist><small>Yalnız bacarıq kataloqunda olan adlar qəbul edilir.</small></label>
            <label className="wide"><span>Sinonimlər və qısaltmalar</span><textarea rows={2} maxLength={500} value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="Vergül ilə ayırın" /><small>CV-də bu yazılışlar avtomatik tanınacaq.</small></label>
            <div className="billing-form-actions"><button type="button" onClick={() => setFormOpen(false)}>Ləğv et</button><button className="billing-primary" disabled={busy}>Kataloqa əlavə et</button></div>
          </form>
        )}
        <div className="skill-section-browser">
          <section className="skill-section-group">
            <div><h3>Bölmələr</h3><p>Sertifikatlar peşə sahələri üzrə qruplaşdırılıb</p></div>
            <div className="skill-section-grid">
              <button type="button" className={!category ? "active" : ""} onClick={() => { setCategory(""); setLimit(50); }}>
                <span><strong>Bütün bölmələr</strong><small>Joblink</small></span>
                <b>{number(all.length)}</b>
              </button>
              {Object.keys(CERTIFICATION_CATEGORIES).map((name) => (
                <button type="button" key={name} className={category === name ? "active" : ""} onClick={() => { setCategory(name); setLimit(50); }}>
                  <span><strong>{language === "en" ? CERTIFICATION_CATEGORIES[name] : name}</strong><small>Joblink</small></span>
                  <b>{number(counts.get(name) || 0)}</b>
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="admin-toolbar skill-catalog-toolbar">
          <label className="admin-search">
            <Search size={17} />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(50); }} placeholder="Sertifikat, təşkilat və ya qısaltma axtar…" />
          </label>
          <span className="skill-catalog-loading">{number(rows.length)} sertifikat</span>
        </div>
        <div className="admin-table-wrap"><table className="admin-table skill-admin-table"><thead><tr><th>Sertifikat</th><th>Təşkilat</th><th>Səviyyələr</th><th>Sübut etdiyi bacarıqlar</th><th>Profillər</th><th>Vakansiyalar</th><th>Mənbə</th></tr></thead><tbody>
          {rows.slice(0, limit).map((definition) => (
            <tr key={definition.id}>
              <td><strong>{definition.name}</strong><small className="skill-description">{language === "en" ? definition.categoryEn : definition.category}</small></td>
              <td>{definition.issuer}</td>
              <td><div className="skill-alias-preview">{definition.scale ? <span>{definition.scale.min}–{definition.scale.max}</span> : (definition.levels || []).slice(0, 3).map((level) => <span key={level}>{level}</span>)}{(definition.levels?.length || 0) > 3 && <small>+{definition.levels!.length - 3}</small>}</div></td>
              <td><div className="skill-alias-preview">{definition.skills.slice(0, 3).map((id) => <span key={id}>{skillLabel(id)}</span>)}{definition.skills.length > 3 && <small>+{definition.skills.length - 3}</small>}</div></td>
              <td><b>{usage(definition.id).profiles}</b></td>
              <td><b>{usage(definition.id).jobs}</b>{usage(definition.id).requiredJobs > 0 && <small className="skill-description">{usage(definition.id).requiredJobs} məcburi</small>}</td>
              <td><span className={`skill-source ${definition.id.startsWith("admin:") ? "admin" : "system"}`}>{definition.id.startsWith("admin:") ? "Admin" : "Sistem"}</span></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7}><p className="admin-empty">Uyğun sertifikat tapılmadı.</p></td></tr>}
        </tbody></table></div>
        {rows.length > limit && (
          <nav className="skill-pagination" aria-label="Sertifikat siyahısı">
            <span>{number(limit)} / {number(rows.length)}</span>
            <button type="button" onClick={() => setLimit((value) => value + 50)}>Daha çox göstər</button>
          </nav>
        )}
      </section>
    </>
  );
}
