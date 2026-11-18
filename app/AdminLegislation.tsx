"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, Scale, Trash2 } from "lucide-react";

type Param = { name: string; value: string; article: string; effective: string };
type Analysis = { summary: string; parameters: Param[] };
type Doc = { id: string; title: string; category: string; effective_date: string; note: string; file_name: string; file_type: string; size: number; analysis: Analysis | null; created: string };

const CATEGORIES: { id: string; label: string }[] = [
  { id: "labour", label: "Əmək Məcəlləsi" },
  { id: "tax", label: "Vergi Məcəlləsi" },
  { id: "social", label: "Sosial sığorta / pensiya" },
  { id: "decision", label: "Nazirlər Kabineti qərarı" },
  { id: "calendar", label: "İstehsalat təqvimi (rəsmi)" },
  { id: "other", label: "Digər qanun və normativ aktlar" },
];
const label = (id: string) => CATEGORIES.find((c) => c.id === id)?.label || id;
const size = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Admin page: the library of legislation. Any file type can be uploaded (PDF, Word, Excel, scans, text...); the AI summarises it and lists
// the numbers (rates, limits, deadlines) so the admin can compare them with the calculators. Nothing changes the calculators by itself.
export default function AdminLegislation({ api, notify }: { api: (path: string, body?: unknown) => Promise<unknown>; notify: (message: string) => void }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [form, setForm] = useState({ title: "", category: "labour", effectiveDate: "", note: "", analyze: true });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState("");
  const load = useCallback(() => {
    (api("admin/legal") as Promise<{ documents: Doc[] }>).then((d) => setDocs(d.documents)).catch((e) => notify((e as Error).message));
  }, [api, notify]);
  useEffect(load, [load]);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return notify("Fayl 8 MB-dan böyükdür.");
    setBusy(true);
    try {
      const encoded = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Fayl oxunmadı."));
        reader.readAsDataURL(file);
      });
      const result = (await api("admin/legal/upload", { ...form, title: form.title || file.name, name: file.name, type: file.type, data: encoded })) as { id: string; analysis: Analysis | null; analysisError: string };
      notify(result.analysis ? "Sənəd yükləndi və xülasə çıxarıldı." : `Sənəd yükləndi.${result.analysisError ? ` ${result.analysisError}` : ""}`);
      setForm({ ...form, title: "", note: "", effectiveDate: "" });
      setOpen(result.id);
      load();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reanalyze(id: string) {
    setBusy(true);
    try {
      await api("admin/legal/analyze", { id });
      notify("Xülasə yeniləndi.");
      setOpen(id);
      load();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!window.confirm("Sənəd silinsin?")) return;
    try {
      await api("admin/legal/delete", { id });
      load();
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <div className="company-page">
      <section className="panel">
        <h3><Scale size={18} /> Qanunvericilik kitabxanası</h3>
        <p className="muted">
          Əmək, Vergi və Sosial sığorta qanunlarını, Nazirlər Kabineti qərarlarını və digər sənədləri istənilən formatda yükləyin (PDF, Word, Excel, şəkil/skan, mətn və s., ən çox 8 MB). AI sənədin xülasəsini və içindəki rəqəmləri (faiz, hədd, müddət, maddə nömrəsi)
          çıxarır; siz onları kalkulyatorlarla tutuşdurub lazım olanı yeniləyirsiniz. Sənəd heç vaxt hesablamaları öz-özünə dəyişmir.
        </p>
        <div className="form-grid">
          <label>Ad<input className="admin-input" value={form.title} placeholder="Boşdursa fayl adı" onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>
            Növ
            <select className="admin-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label>Qüvvəyə minmə tarixi<input className="admin-input" type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} /></label>
          <label>Qeyd<input className="admin-input" value={form.note} maxLength={500} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
        </div>
        <div className="admin-actions" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <label className="primary" style={{ cursor: "pointer" }}>
            {busy ? "Yüklənir…" : "Fayl seç və yüklə"}
            <input type="file" hidden disabled={busy} onChange={onFile} />
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={form.analyze} onChange={(e) => setForm({ ...form, analyze: e.target.checked })} /> AI ilə xülasə və rəqəmlər çıxar
          </label>
        </div>
      </section>

      <section className="panel">
        <h3>Yüklənmiş sənədlər</h3>
        {!docs ? (
          <p className="muted loading-line">Yüklənir…</p>
        ) : !docs.length ? (
          <p className="admin-empty">Hələ sənəd yoxdur.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Sənəd</th><th>Növ</th><th>Qüvvəyə minir</th><th>Fayl</th><th /></tr></thead>
              <tbody>
                {docs.map((d) => (
                  <>
                    <tr key={d.id}>
                      <td><button type="button" className="text-button" onClick={() => setOpen(open === d.id ? "" : d.id)}><b>{d.title}</b></button>{d.note && <small className="muted" style={{ display: "block" }}>{d.note}</small>}</td>
                      <td>{label(d.category)}</td>
                      <td>{d.effective_date || "—"}</td>
                      <td>{d.file_name} · {size(d.size)}</td>
                      <td>
                        <span className="admin-actions">
                          <a className="secondary" href={`/api/joblink/admin/legal/file?id=${encodeURIComponent(d.id)}`} download aria-label="Yüklə"><Download size={14} /></a>
                          <button type="button" aria-label="Sil" onClick={() => remove(d.id)}><Trash2 size={14} /></button>
                        </span>
                      </td>
                    </tr>
                    {open === d.id && (
                      <tr key={`${d.id}-a`}>
                        <td colSpan={5}>
                          {d.analysis ? (
                            <>
                              <p>{d.analysis.summary}</p>
                              {!!d.analysis.parameters.length && (
                                <table className="admin-table">
                                  <thead><tr><th>Parametr</th><th>Dəyər</th><th>Maddə</th><th>Qüvvəyə minir</th></tr></thead>
                                  <tbody>{d.analysis.parameters.map((p, i) => <tr key={i}><td>{p.name}</td><td>{p.value}</td><td>{p.article}</td><td>{p.effective}</td></tr>)}</tbody>
                                </table>
                              )}
                            </>
                          ) : (
                            <p className="muted">Xülasə yoxdur.</p>
                          )}
                          <div className="admin-actions"><button type="button" className="secondary" disabled={busy} onClick={() => reanalyze(d.id)}>AI ilə xülasəni yenilə</button></div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
