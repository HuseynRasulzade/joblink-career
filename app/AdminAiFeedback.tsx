"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import type { summarizeFeedback } from "@/lib/ai-eval";

type Summary = ReturnType<typeof summarizeFeedback>;
const REC: Record<string, string> = { interview: "Müsahibəyə dəvət", consider: "Nəzərə al", reject: "Uyğun deyil" };
const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

// Employers' feedback on the AI: how often it is right, where it is wrong, and
// whether it beats the plain rules. Read this before changing the AI's instructions.
export default function AdminAiFeedback({ notify }: { notify: (message: string) => void }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    fetch("/api/joblink/admin/ai-feedback", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as { summary?: Summary; error?: string };
        if (!r.ok || !data.summary) throw new Error(data.error || "Sorğu tamamlanmadı.");
        setSummary(data.summary);
      })
      .catch((e) => notify((e as Error).message));
  }, [notify]);
  if (!summary) return <p className="muted">Yüklənir…</p>;
  const recs = ["interview", "consider", "reject"];
  return (
    <div className="company-page">
      <h3>AI-nin dəqiqliyi (işəgötürən rəyləri)</h3>
      <div className="kpi-grid">
        <div className="kpi"><small>Rəy sayı</small><strong>{summary.total}</strong><span>{summary.wrong} “yanlış”</span></div>
        <div className="kpi"><small>AI düz deyib</small><strong>{pct(summary.agreement)}</strong><span>rəylərin payı</span></div>
        <div className="kpi"><small>Orta bal səhvi (AI)</small><strong>{summary.scoreError.aiMeanAbs ?? "—"}</strong><span>{summary.scoreError.n} bal göstərilib</span></div>
        <div className="kpi"><small>Orta bal səhvi (qaydalar)</small><strong>{summary.scoreError.ruleMeanAbs ?? "—"}</strong><span>{summary.aiBeatsRules === null ? "kifayət qədər rəy yoxdur" : summary.aiBeatsRules ? "AI qaydalardan yaxşıdır" : "qaydalar AI-dən yaxşıdır"}</span></div>
      </div>
      {summary.total < 30 && <p className="muted fine-print">Nəticələr 30-dan çox rəydən sonra etibarlı olur. İndi {summary.total} rəy var.</p>}
      <h4>Tövsiyə üzrə</h4>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>AI-nin tövsiyəsi</th><th>Rəy</th><th>Düz</th><th>Uyğunluq</th></tr></thead>
        <tbody>
          {recs.map((r) => <tr key={r}><td>{REC[r]}</td><td>{summary.byRecommendation[r].total}</td><td>{summary.byRecommendation[r].right}</td><td>{pct(summary.byRecommendation[r].agreement)}</td></tr>)}
        </tbody>
      </table></div>
      <h4>AI nə dedi, işəgötürən nə qərar verdi</h4>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>AI \ İşəgötürən</th>{recs.map((r) => <th key={r}>{REC[r]}</th>)}</tr></thead>
        <tbody>
          {recs.map((ai) => <tr key={ai}><td>{REC[ai]}</td>{recs.map((hr) => <td key={hr}>{summary.confusion[ai]?.[hr] || 0}</td>)}</tr>)}
        </tbody>
      </table></div>
      <h4>Son “yanlış” rəylər</h4>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>AI</th><th>İşəgötürən</th><th>Qeyd</th></tr></thead>
        <tbody>
          {summary.recentWrong.map((w, i) => <tr key={i}><td>{REC[w.aiRecommendation] || w.aiRecommendation} · {w.aiScore}</td><td>{[REC[w.hrDecision], w.hrScore !== null ? `bal ${w.hrScore}` : ""].filter(Boolean).join(" · ") || "—"}</td><td>{w.note || "—"}</td></tr>)}
          {!summary.recentWrong.length && <tr><td colSpan={3}><p className="admin-empty">Hələ “yanlış” rəy yoxdur.</p></td></tr>}
        </tbody>
      </table></div>
      <div className="admin-actions">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="secondary" href="/api/joblink/admin/ai-feedback/export" download><Download size={15} /> Rəyləri CSV kimi yüklə</a>
        <button
          className="secondary"
          onClick={async () => {
            if (!window.confirm("Bütün toplanmış rəylər silinsin? Bu, sınaq rəylərini təmizləmək üçündür.")) return;
            try {
              const r = await fetch("/api/joblink/admin/ai-feedback/clear", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
              if (!r.ok) throw new Error("Silinmədi.");
              notify("Rəylər silindi.");
              location.reload();
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          Rəyləri sıfırla
        </button>
      </div>
    </div>
  );
}
