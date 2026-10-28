"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { EDUCATION_SAMPLE, JOB_TITLES_SAMPLE, downloadCsv } from "@/lib/sample-files";

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

type Check = {
  counts: Record<string, number>;
  translation: { kind: string; id: string; label: string; problem: string }[];
  duplicates: { kind: string; ids: string[]; labels: string[]; reason: string }[];
};
type ImportResult = { added: number; issues: { line: number; label: string; reason: string }[] };
const KIND: Record<string, string> = {
  skill: "Bacarıq",
  "job-title": "Vəzifə",
  certification: "Sertifikat",
  university: "Universitet",
  major: "İxtisas",
};
const MERGEABLE = new Set(["skill", "job-title", "university", "major"]);

// Upkeep of the catalogs people add to: translation check, duplicates to merge,
// bulk import of job titles and education items, and a manual backup.
export default function AdminCatalogCheck({ notify }: { notify: (message: string) => void }) {
  const [data, setData] = useState<Check | null>(null);
  const [keep, setKeep] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => request<Check>("admin/catalog-check").then(setData).catch((e) => notify((e as Error).message)), [notify]);
  useEffect(() => { void load(); }, [load]);

  async function merge(kind: string, keepId: string, mergeId: string) {
    if (!window.confirm("Qeyd birləşdirilsin? Silinən qeydin adları saxlanan qeydə sinonim kimi əlavə olunacaq.")) return;
    setBusy(true);
    try {
      await request("admin/catalog-merge", { kind, keepId, mergeId });
      notify("Qeydlər birləşdirildi.");
      await load();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importFile(path: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const result = await request<ImportResult>(path, { csv: await file.text() });
      const skipped = result.issues.slice(0, 3).map((i) => `${i.line}. ${i.label}: ${i.reason}`).join("; ");
      notify(`${result.added} qeyd əlavə edildi.${result.issues.length ? ` ${result.issues.length} sətir atlandı: ${skipped}${result.issues.length > 3 ? "…" : ""}` : ""}`);
      await load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="company-page">
      <div className="kpi-grid">
        {Object.entries(KIND).map(([kind, label]) => (
          <div className="kpi" key={kind}><small>{label} (əlavə olunmuş)</small><strong>{data.counts[kind] || 0}</strong></div>
        ))}
        <div className="kpi"><small>Tərcümə qeydləri</small><strong>{data.translation.length}</strong></div>
        <div className="kpi"><small>Təkrar qrupları</small><strong>{data.duplicates.length}</strong></div>
      </div>

      <section className="panel">
        <h3>CSV idxal</h3>
        <p className="muted fine-print">
          Vəzifələr: <code>Ad;Name;Qrup;sinonim1|sinonim2</code>. Təhsil: <code>Növ;Ad;Name;Название;Ölkə/Sahə;sinonim1|sinonim2</code> (növ: universitet və ya ixtisas).
          Artıq olanlar atlanır və hesabatda göstərilir. Bacarıqlar üçün idxal “Bacarıqlar kataloqu” bölməsindədir.
        </p>
        <div className="admin-actions">
          <label className="secondary"><Upload size={15} /> Vəzifələri idxal et<input type="file" hidden accept=".csv,text/csv,text/plain" onChange={(e) => importFile("admin/job-titles/import", e)} /></label>
          <label className="secondary"><Upload size={15} /> Təhsil siyahısını idxal et<input type="file" hidden accept=".csv,text/csv,text/plain" onChange={(e) => importFile("admin/education/import", e)} /></label>
          <button type="button" className="secondary" onClick={() => downloadCsv(JOB_TITLES_SAMPLE, "vezifeler-numune.csv")}><Download size={15} /> Vəzifə nümunəsi (.csv)</button>
          <button type="button" className="secondary" onClick={() => downloadCsv(EDUCATION_SAMPLE, "tehsil-numune.csv")}><Download size={15} /> Təhsil nümunəsi (.csv)</button>
        </div>
      </section>

      <section className="panel">
        <h3>Təkrar ola bilən qeydlər</h3>
        {data.duplicates.map((group, index) => {
          const keepId = keep[index] || group.ids[0];
          return (
            <div key={index} className="repeat-card">
              <b>{KIND[group.kind] || group.kind}</b> · {group.reason}
              {group.ids.map((groupId, i) => (
                <div key={groupId} className="admin-actions">
                  <label>
                    <input type="radio" name={`keep-${index}`} checked={keepId === groupId} onChange={() => setKeep({ ...keep, [index]: groupId })} /> {group.labels[i]}
                  </label>
                  {MERGEABLE.has(group.kind) && keepId !== groupId && (
                    <button disabled={busy} onClick={() => merge(group.kind, keepId, groupId)}>Saxlanana birləşdir</button>
                  )}
                </div>
              ))}
              {!MERGEABLE.has(group.kind) && <small className="muted">Sertifikatlar şəxsi profillərdə nömrə ilə saxlanıldığı üçün avtomatik birləşdirilmir.</small>}
            </div>
          );
        })}
        {!data.duplicates.length && <p className="admin-empty">Təkrar qeyd tapılmadı.</p>}
      </section>

      <section className="panel">
        <h3>Tərcümə yoxlaması</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Növ</th><th>Qeyd</th><th>Problem</th></tr></thead>
            <tbody>
              {data.translation.map((t, i) => <tr key={i}><td>{KIND[t.kind] || t.kind}</td><td>{t.label}</td><td>{t.problem}</td></tr>)}
              {!data.translation.length && <tr><td colSpan={3}><p className="admin-empty">Tərcümə problemi tapılmadı.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted fine-print">Yalnız admin və istifadəçilərin əlavə etdiyi qeydlər yoxlanılır; ilkin kataloq koddadır.</p>
      </section>

      <section className="panel">
        <h3>Ehtiyat nüsxə</h3>
        <p className="muted fine-print">
          Saytı bərpa etmək üçün lazım olan məlumatın (hesab adları, profillər, vakansiyalar, müraciətlər, şirkət profilləri, kataloqlar, ayarlar) əl ilə JSON nüsxəsi. Parollar, sessiyalar və kart məlumatı daxil deyil.
          Fayl şəxsi məlumat saxlayır: təhlükəsiz yerdə saxlayın. Hər yükləmə audit jurnalına yazılır. Cloudflare D1 Time Travel əlavə olaraq son 30 günə qayıtmağa imkan verir.
        </p>
        <div className="admin-actions">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="secondary" href="/api/joblink/admin/backup" download><Download size={15} /> Nüsxəni yüklə (JSON)</a>
        </div>
      </section>
    </div>
  );
}
