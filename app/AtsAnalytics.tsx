"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { createXlsxBook } from "@/lib/xlsx";
import type { AtsReport } from "@/lib/ats-analytics";

type Notify = (message: string) => void;
type Response = { range: number; truncated?: boolean; jobs: { id: string; title: string }[]; report: AtsReport };
const SOURCE_LABEL: Record<string, string> = { platform: "Platforma (müraciət)", invite: "Dəvət", "company-invite": "Şirkət dəvəti", import: "İdxal", referral: "Tövsiyə", external: "Xarici lent", linkedin: "LinkedIn", "talent-pool": "İstedad bazası" };
const pct = (v: number | null) => (v === null ? "—" : `${v}%`);
const day = (v: number | null) => (v === null ? "—" : `${v} gün`);

// The hiring analytics: where candidates are lost, how long each step takes, which source brings the hires, why people are turned down.
export default function AtsAnalytics({ notify }: { notify: Notify }) {
  const [range, setRange] = useState(180);
  const [stale, setStale] = useState(7);
  const [jobId, setJobId] = useState("");
  const [data, setData] = useState<Response | null>(null);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    setData(null);
    fetch(`/api/joblink/hr/ats/analytics?days=${range}&stale=${stale}${jobId ? `&jobId=${encodeURIComponent(jobId)}` : ""}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as Response & { error?: string };
        if (!r.ok) throw new Error(body.error || "Sorğu tamamlanmadı.");
        setData(body);
      })
      .catch((error) => notifyRef.current((error as Error).message));
  }, [range, stale, jobId]);
  useEffect(load, [load]);
  function exportExcel() {
    if (!data) return;
    const r = data.report;
    const bytes = createXlsxBook([
      { name: "Qıf", headers: ["Mərhələ", "Namizəd sayı", "Əvvəlkindən (%)", "Başlanğıcdan (%)"], rows: r.funnel.map((f) => [f.step, f.count, f.fromPrevious ?? "", f.fromStart ?? ""]) },
      { name: "Mərhələdə müddət", headers: ["Mərhələ", "Median (gün)", "Say"], rows: r.timeInStep.map((t) => [t.step, t.medianDays ?? "", t.samples]) },
      { name: "Mənbələr", headers: ["Mənbə", "Müraciət", "Müsahibə", "Təklif", "İşə qəbul", "Müsahibəyə keçid (%)", "İşə qəbul (%)"], rows: r.sources.map((s) => [SOURCE_LABEL[s.source] || s.source, s.applied, s.interview, s.offer, s.hired, s.interviewRate, s.hireRate]) },
      { name: "Rədd səbəbləri", headers: ["Səbəb", "Say"], rows: r.rejections.map((x) => [x.reason, x.count]) },
      { name: "Vakansiyalar", headers: ["Vakansiya", "Müraciət", "Müsahibə", "Təklif", "İşə qəbul", "Açıq (gün)"], rows: r.jobs.map((j) => [j.title, j.applied, j.interview, j.offer, j.hired, j.openDays]) },
      { name: "Dayanmışlar", headers: ["Namizəd", "Vakansiya", "Status", "Mərhələ", "Hərəkətsiz (gün)"], rows: r.stale.map((s) => [s.candidate, s.jobTitle, s.status, s.stage, s.idleDays]) },
    ]);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ise-qebul-analitika-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
  const r = data?.report;
  const top = r?.funnel[0]?.count || 0;
  const maxReason = Math.max(1, ...(r?.rejections.map((x) => x.count) || [1]));
  return (
    <div className="company-page">
      <div className="admin-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap", marginBottom: 12 }}>
        <select aria-label="Dövr" value={range} onChange={(e) => setRange(Number(e.target.value))}>
          {[30, 90, 180, 365].map((d) => <option key={d} value={d}>Son {d} gün</option>)}
        </select>
        <select aria-label="Vakansiya" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          <option value="">Bütün vakansiyalar</option>
          {(data?.jobs || []).map((j) => <option key={j.id} value={j.id}>{j.title || "Adsız vakansiya"}</option>)}
        </select>
        <select aria-label="Dayanma həddi" value={stale} onChange={(e) => setStale(Number(e.target.value))}>
          {[3, 5, 7, 14, 21].map((d) => <option key={d} value={d}>{d}+ gün hərəkətsiz = dayanıb</option>)}
        </select>
        <button type="button" className="secondary" disabled={!r} onClick={exportExcel}><Download size={14} /> Excel</button>
      </div>
      {!r ? <p className="muted loading-line">Yüklənir…</p> : !r.total ? <p className="admin-empty">Bu dövrdə müraciət yoxdur.</p> : (
        <>
          {data?.truncated && <p className="notice" role="status">Çox müraciət var: ən son 4000-i hesablanıb. Dövrü qısaldın.</p>}
          <div className="staff-kpis" style={{ marginBottom: 12 }}>
            <div className="staff-kpi"><small>Müraciət</small><strong>{r.total}</strong><span>{r.open} aktiv</span></div>
            <div className="staff-kpi"><small>İşə qəbul</small><strong>{r.funnel[4].count}</strong><span>{pct(r.funnel[4].fromStart)} müraciətdən</span></div>
            <div className="staff-kpi"><small>İşə qəbul müddəti (median)</small><strong>{day(r.timeToHire.medianDays)}</strong><span>{r.timeToHire.hired ? `orta ${day(r.timeToHire.averageDays)}, ${r.timeToHire.hired} nəfər` : "hələ işə qəbul yoxdur"}</span></div>
            <div className="staff-kpi"><small>Uyğun deyil</small><strong>{r.rejected}</strong><span>{r.total ? Math.round((r.rejected / r.total) * 100) : 0}% müraciətlərdən</span></div>
            <div className={`staff-kpi${r.stale.length ? " staff-kpi-warn" : ""}`}><small>Dayanmış namizəd</small><strong>{r.stale.length}</strong><span>{stale}+ gün hərəkətsiz</span></div>
          </div>

          <section className="panel">
            <h4 style={{ marginTop: 0 }}>İşə qəbul qıfı</h4>
            <div role="table" aria-label="İşə qəbul qıfı">
              {r.funnel.map((f, i) => (
                <div key={f.step} role="row" style={{ display: "grid", gridTemplateColumns: "150px 1fr 150px", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span role="cell">{f.step}</span>
                  <span role="cell" style={{ background: "var(--line, #e5e7eb)", borderRadius: 4, height: 18, display: "block" }}>
                    <span style={{ display: "block", height: "100%", width: `${top ? Math.max(2, (f.count / top) * 100) : 0}%`, background: "var(--accent, #0f766e)", borderRadius: 4 }} />
                  </span>
                  <span role="cell"><b>{f.count}</b>{i > 0 && <small className="muted"> · əvvəlkindən {pct(f.fromPrevious)}</small>}</span>
                </div>
              ))}
            </div>
            <p className="muted">«Müsahibə», «Təklif» və «İşə qəbul» keçmiş statuslardan hesablanır: işə qəbul edilən namizəd aralıq mərhələlərdən də keçmiş sayılır.</p>
          </section>

          <section className="panel">
            <h4 style={{ marginTop: 0 }}>Mərhələdə keçən müddət (median)</h4>
            <table className="admin-table"><thead><tr><th>Mərhələ</th><th>Median</th><th>Ölçü sayı</th></tr></thead><tbody>
              {r.timeInStep.map((t) => <tr key={t.step}><td>{t.step}</td><td>{day(t.medianDays)}</td><td>{t.samples}</td></tr>)}
            </tbody></table>
          </section>

          <section className="panel">
            <h4 style={{ marginTop: 0 }}>Mənbələr: hansı mənbə işə qəbul gətirir</h4>
            <table className="admin-table"><thead><tr><th>Mənbə</th><th>Müraciət</th><th>Müsahibə</th><th>Təklif</th><th>İşə qəbul</th><th>İşə qəbul faizi</th></tr></thead><tbody>
              {r.sources.map((s) => <tr key={s.source}><td>{SOURCE_LABEL[s.source] || s.source}</td><td>{s.applied}</td><td>{s.interview} <small className="muted">({s.interviewRate}%)</small></td><td>{s.offer}</td><td>{s.hired}</td><td>{s.hireRate}%</td></tr>)}
            </tbody></table>
          </section>

          <section className="panel">
            <h4 style={{ marginTop: 0 }}>Namizəd niyə rədd edilib</h4>
            {r.rejections.length ? r.rejections.map((x) => (
              <div key={x.reason} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 40px", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span>{x.reason}</span>
                <span style={{ background: "var(--line, #e5e7eb)", borderRadius: 4, height: 14, display: "block" }}><span style={{ display: "block", height: "100%", width: `${(x.count / maxReason) * 100}%`, background: "var(--accent, #0f766e)", borderRadius: 4 }} /></span>
                <b>{x.count}</b>
              </div>
            )) : <p className="admin-empty">Səbəb göstərilmiş rədd yoxdur. Rədd edəndə səbəbi seçin: hesabat buradan qurulur.</p>}
          </section>

          <section className="panel">
            <h4 style={{ marginTop: 0 }}>Vakansiyalar üzrə</h4>
            <table className="admin-table"><thead><tr><th>Vakansiya</th><th>Müraciət</th><th>Müsahibə</th><th>Təklif</th><th>İşə qəbul</th><th>Açıq</th></tr></thead><tbody>
              {r.jobs.map((j) => <tr key={j.jobId}><td>{j.title || "Adsız"}</td><td>{j.applied}</td><td>{j.interview}</td><td>{j.offer}</td><td>{j.hired}</td><td>{j.openDays} gün</td></tr>)}
            </tbody></table>
          </section>

          <section className="panel">
            <h4 style={{ marginTop: 0 }}>Dayanmış namizədlər ({r.stale.length})</h4>
            {r.stale.length ? (
              <table className="admin-table"><thead><tr><th>Namizəd</th><th>Vakansiya</th><th>Status</th><th>Hərəkətsiz</th></tr></thead><tbody>
                {r.stale.map((s) => <tr key={s.applicationId}><td>{s.candidate || "—"}</td><td>{s.jobTitle || "—"}</td><td>{s.status}{s.stage ? <small className="skill-description">{s.stage}</small> : null}</td><td className={s.idleDays >= stale * 2 ? "danger-text" : undefined}>{s.idleDays} gün</td></tr>)}
              </tbody></table>
            ) : <p className="admin-empty">Dayanmış namizəd yoxdur.</p>}
            <p className="muted">Namizədlərə «Namizədlər» bölməsindən baxın və statusu yeniləyin. Namizədlərə cavab verməmək işə qəbul brendinə zərər verir.</p>
          </section>
        </>
      )}
    </div>
  );
}
