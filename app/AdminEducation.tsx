"use client";
import { formatDate } from "@/lib/dates";
import { useCallback, useEffect, useState } from "react";
import { GraduationCap, Inbox, Plus, Trash2, X } from "lucide-react";
import { COUNTRIES, type University } from "@/lib/university-catalog";
import { MAJOR_FIELDS, type Major } from "@/lib/major-catalog";
import { setCustomUniversities } from "@/lib/university-catalog";
import { setCustomMajors } from "@/lib/major-catalog";

type Thread = { id: string; topic: string; subject: string; status: string; user_name: string; user_role: string; created: string };
type Form = { kind: "university" | "major"; label: string; labelEn: string; labelRu: string; extra: string; aliases: string; threadId: string };
type Data = { universities: University[]; majors: Major[] };
const blank = (kind: Form["kind"], label = "", threadId = ""): Form => ({ kind, label, labelEn: "", labelRu: "", extra: "", aliases: "", threadId });

// Admin page for universities and study programmes that candidates asked to add.
export default function AdminEducation({
  api,
  notify,
  language,
}: {
  api: (path: string, body?: unknown) => Promise<unknown>;
  notify: (message: string) => void;
  language: "az" | "en" | "ru";
}) {
  const [data, setData] = useState<Data>({ universities: [], majors: [] });
  const [requests, setRequests] = useState<Thread[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const loaded = (await api("admin/education")) as Data;
      setData(loaded);
      setCustomUniversities(loaded.universities);
      setCustomMajors(loaded.majors);
      const response = await fetch("/api/joblink/support", { credentials: "same-origin", cache: "no-store" });
      const threads = ((await response.json()) as { threads?: Thread[] }).threads || [];
      setRequests(threads.filter((t) => t.topic === "university" || t.topic === "major"));
    } catch (error) {
      notify((error as Error).message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      await api("admin/education", form);
      notify(form.threadId ? "Siyahıya əlavə edildi və sorğu tamamlandı." : "Siyahıya əlavə edildi.");
      setForm(null);
      await load();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reject(thread: Thread) {
    const reason = window.prompt("Rədd etmə səbəbi (istifadəçiyə göndəriləcək):", "Bu ad siyahıdakı mövcud qeyd ilə eynidir.");
    if (reason === null) return;
    try {
      await api("support/reply", { id: thread.id, body: reason || "Sorğu rədd edildi.", status: "rejected" });
      notify("Sorğu rədd edildi.");
      await load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function remove(id: string, label: string) {
    if (!window.confirm(`“${label}” siyahıdan silinsin? Namizədlərin profilindəki yazı dəyişməz.`)) return;
    try {
      await api("admin/education/delete", { id });
      notify("Silindi.");
      await load();
    } catch (error) {
      notify((error as Error).message);
    }
  }

  const open = requests.filter((t) => !["done", "rejected"].includes(t.status));
  const countryName = (code: string) => COUNTRIES[code]?.[language] || code;
  const fieldName = (id: string) => MAJOR_FIELDS[id]?.[language] || id;
  const items = [
    ...data.universities.map((u) => ({ id: u.id, kind: "Universitet", label: u.label, en: u.labelEn, extra: countryName(u.country) })),
    ...data.majors.map((m) => ({ id: m.id, kind: "İxtisas", label: m.label, en: m.labelEn, extra: fieldName(m.field) })),
  ];

  return (
    <>
      <div className="skill-admin-metrics">
        <article><span><GraduationCap size={19} /></span><div><small>Əlavə olunmuş universitetlər</small><strong>{data.universities.length}</strong></div></article>
        <article><span><GraduationCap size={19} /></span><div><small>Əlavə olunmuş ixtisaslar</small><strong>{data.majors.length}</strong></div></article>
        <article><span><Inbox size={19} /></span><div><small>Gözləyən sorğular</small><strong>{open.length}</strong></div></article>
      </div>
      <section className="panel admin-table-card">
        <div className="section-heading"><div><h2>Sorğular</h2><p>İstifadəçilərin siyahıda tapmadığı universitet və ixtisaslar</p></div><Inbox size={20} /></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Yazılan ad</th><th>Növ</th><th>İstifadəçi</th><th>Status</th><th>Tarix</th><th></th></tr></thead><tbody>
          {requests.map((t) => (
            <tr key={t.id}>
              <td><strong>{t.subject}</strong></td>
              <td>{t.topic === "university" ? "Universitet" : "İxtisas"}</td>
              <td><div className="admin-job"><strong>{t.user_name}</strong><small>{t.user_role === "company" ? "Şirkət" : "Namizəd"}</small></div></td>
              <td><span className={`admin-status ${t.status === "done" ? "active" : t.status === "rejected" ? "archived" : "paused"}`}>{({ new: "Yeni", read: "Oxundu", in_progress: "İcradadır", done: "Tamamlandı", rejected: "Rədd edildi" } as Record<string, string>)[t.status] || t.status}</span></td>
              <td>{formatDate(t.created, language)}</td>
              <td>{!["done", "rejected"].includes(t.status) && <div className="admin-actions">
                <button onClick={() => setForm(blank(t.topic === "university" ? "university" : "major", t.subject, t.id))}>Əlavə et</button>
                <button onClick={() => reject(t)}>Rədd et</button>
              </div>}</td>
            </tr>
          ))}
          {!requests.length && <tr><td colSpan={6}><p className="admin-empty">Hələ sorğu yoxdur.</p></td></tr>}
        </tbody></table></div>
      </section>
      <section className="panel admin-table-card skill-admin-card">
        <div className="section-heading billing-heading">
          <div><h2>Əlavə olunmuş qeydlər</h2><p>Hazır siyahıda olmayan, admin tərəfindən əlavə edilmiş universitet və ixtisaslar</p></div>
          <div className="billing-head-actions">
            <button className="billing-primary" onClick={() => setForm(blank("university"))}><Plus size={16} /> Universitet</button>
            <button className="billing-primary" onClick={() => setForm(blank("major"))}><Plus size={16} /> İxtisas</button>
          </div>
        </div>
        {form && (
          <form className="billing-form skill-admin-form" onSubmit={save}>
            <div className="billing-form-title"><div><strong>{form.kind === "university" ? "Yeni universitet" : "Yeni ixtisas"}{form.threadId ? " (sorğu əsasında)" : ""}</strong><span>Təsdiqdən sonra istifadəçiyə avtomatik cavab göndərilir</span></div><button type="button" className="text-button" onClick={() => setForm(null)}><X size={16} /></button></div>
            <label><span>Azərbaycan dilində ad *</span><input required maxLength={160} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
            <label><span>İngilis dilində ad</span><input maxLength={160} value={form.labelEn} onChange={(e) => setForm({ ...form, labelEn: e.target.value })} /></label>
            <label><span>Rus dilində ad</span><input maxLength={160} value={form.labelRu} onChange={(e) => setForm({ ...form, labelRu: e.target.value })} /></label>
            <label><span>{form.kind === "university" ? "Ölkə *" : "Sahə *"}</span>
              <select required value={form.extra} onChange={(e) => setForm({ ...form, extra: e.target.value })}>
                <option value="">Seçin</option>
                {form.kind === "university"
                  ? Object.keys(COUNTRIES).map((code) => <option key={code} value={code}>{countryName(code)}</option>)
                  : Object.keys(MAJOR_FIELDS).map((id) => <option key={id} value={id}>{fieldName(id)}</option>)}
              </select>
            </label>
            <label className="wide"><span>Alternativ yazılışlar və qısaltmalar</span><textarea rows={2} maxLength={800} value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="Vergül ilə ayırın" /></label>
            <div className="billing-form-actions"><button type="button" onClick={() => setForm(null)}>Ləğv et</button><button className="billing-primary" disabled={busy}>Siyahıya əlavə et</button></div>
          </form>
        )}
        <div className="admin-table-wrap"><table className="admin-table skill-admin-table"><thead><tr><th>Növ</th><th>Ad</th><th>İngilis dilində</th><th>Ölkə / sahə</th><th></th></tr></thead><tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.kind}</td>
              <td><strong>{item.label}</strong></td>
              <td>{item.en}</td>
              <td>{item.extra}</td>
              <td><button aria-label="Sil" onClick={() => remove(item.id, item.label)}><Trash2 size={14} /></button></td>
            </tr>
          ))}
          {!items.length && <tr><td colSpan={5}><p className="admin-empty">Hələ əlavə olunmuş qeyd yoxdur.</p></td></tr>}
        </tbody></table></div>
      </section>
    </>
  );
}
