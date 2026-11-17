"use client";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { COMPANY_ROLES } from "@/lib/company";
import { GUIDE, GUIDE_AUDIENCES, GUIDE_FAQ, type GuideAudience } from "@/lib/guide-content";

// The user guide: pick who you are, read the steps of each task and where it is in the menu.
export default function GuidePage({ initial, go, admin = false }: { initial: GuideAudience; go?: (page: string) => void; admin?: boolean }) {
  const [audience, setAudience] = useState<GuideAudience>(initial);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("az");
  const audiences = GUIDE_AUDIENCES.filter((a) => admin || a.id !== "admin");
  const sections = useMemo(() => GUIDE.filter((s) => (admin || s.audience !== "admin") && (needle ? `${s.title} ${s.summary} ${s.steps.join(" ")}`.toLocaleLowerCase("az").includes(needle) : s.audience === audience)), [audience, needle, admin]);
  const who = GUIDE_AUDIENCES.find((a) => a.id === audience);
  return (
    <div className="company-page guide-page">
      <div className="admin-actions" role="tablist" aria-label="İstifadəçi növü" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        {audiences.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={audience === a.id && !needle} className={audience === a.id && !needle ? "primary" : "secondary"} onClick={() => { setAudience(a.id); setQuery(""); }}>{a.label}</button>
        ))}
        <button type="button" className="secondary" onClick={() => window.print()}><Printer size={14} /> Çap et</button>
      </div>
      <div className="admin-actions" style={{ justifyContent: "flex-start", margin: "10px 0" }}>
        <input aria-label="Təlimatda axtar" placeholder="Təlimatda axtar (məsələn: məzuniyyət, müsahibə, təsdiq)" value={query} onChange={(e) => setQuery(e.target.value)} style={{ minWidth: 320 }} />
      </div>
      <p className="muted">{needle ? `«${query}» üzrə ${sections.length} nəticə (bütün istifadəçi növləri üzrə).` : who?.who}</p>
      {sections.map((s, i) => (
        <details key={s.id} className="panel" open={i === 0 && !needle} style={{ marginBottom: 8 }}>
          <summary><b>{i + 1}. {s.title}</b> <span className="muted">— {s.summary}</span></summary>
          {needle && <small className="skill-description">{GUIDE_AUDIENCES.find((a) => a.id === s.audience)?.label}</small>}
          <ol style={{ marginTop: 8 }}>{s.steps.map((step, k) => <li key={k} style={{ marginBottom: 4 }}>{step}</li>)}</ol>
          <p className="muted">Menyuda: {s.where.map((w) => <b key={w} style={{ marginRight: 8 }}>{w}</b>)}</p>
          {s.tip && <p className="notice" role="note">İpucu: {s.tip}</p>}
        </details>
      ))}
      {!sections.length && <p className="admin-empty">Heç nə tapılmadı. Başqa söz yazın və ya istifadəçi növünü seçin.</p>}
      {audience === "recruit" || audience === "ops" ? (
        <section className="panel">
          <h4 style={{ marginTop: 0 }}>Rollar: kim nəyi görür</h4>
          <table className="admin-table"><thead><tr><th>Rol</th><th>Nə edə bilər</th></tr></thead><tbody>
            {COMPANY_ROLES.map((r) => <tr key={r.id}><td><b>{r.label}</b></td><td>{r.description}</td></tr>)}
          </tbody></table>
        </section>
      ) : null}
      {!needle && (
        <section className="panel">
          <h4 style={{ marginTop: 0 }}>Tez-tez verilən suallar</h4>
          {GUIDE_FAQ.map((f) => <details key={f.q} style={{ marginBottom: 6 }}><summary><b>{f.q}</b></summary><p>{f.a}</p></details>)}
          {go && <p className="muted">Cavab tapmadınız? <button type="button" className="text-button" onClick={() => go(audience === "admin" ? "admin-support" : audience === "recruit" || audience === "ops" ? "hr-support" : "support")}>Dəstəyə yazın</button>.</p>}
        </section>
      )}
    </div>
  );
}
