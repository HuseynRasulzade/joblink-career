"use client";
import { useCallback, useEffect, useState } from "react";

type Notify = (message: string) => void;
type Series = { month: string; headcount: number; joined: number; left: number; turnover: number };
type Data = { targets: Record<string, number>; canPlan: boolean; series: Series[]; forecast: { month: string; headcount: number }[]; planFact: { department: string; planned: number; filled: number; unplaced: number; units: number }[]; alerts: { level: "red" | "amber"; text: string }[]; planned: number; filled: number; expectedExits?: { month: string; count: number }[]; avgFillDays?: number | null };

const W = 640, H = 220, PAD = 36;
// Headcount line with the forecast dashed, joiners and leavers as bars below: plain SVG, no library.
function Chart({ series, forecast, targets }: { series: Series[]; forecast: Data["forecast"]; targets: Record<string, number> }) {
  const months = [...series.map((s) => s.month), ...forecast.map((f) => f.month)];
  const planPoints = months.map((m, i) => (targets[m] === undefined ? null : { i, v: targets[m] })).filter((p): p is { i: number; v: number } => p !== null);
  const all = [...series.map((s) => s.headcount), ...forecast.map((f) => f.headcount), ...planPoints.map((p) => p.v)];
  const max = Math.max(1, ...all);
  const min = Math.max(0, Math.min(...all) - 1);
  const count = series.length + forecast.length;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, count - 1);
  const y = (v: number) => H - PAD - ((v - min) / Math.max(1, max - min)) * (H - PAD * 2);
  const line = series.map((s, i) => `${i ? "L" : "M"}${x(i)},${y(s.headcount)}`).join(" ");
  const dash = [series[series.length - 1] && { headcount: series[series.length - 1].headcount }, ...forecast].map((f, i) => `${i ? "L" : "M"}${x(series.length - 1 + i)},${y(f.headcount)}`).join(" ");
  const barMax = Math.max(1, ...series.map((s) => Math.max(s.joined, s.left)));
  const planPath = planPoints.map((p, k) => `${k ? "L" : "M"}${x(p.i)},${y(p.v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H + 90}`} role="img" aria-label="İşçi sayının aylar üzrə dəyişməsi və proqnoz" style={{ width: "100%", maxWidth: W }}>
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="currentColor" opacity={0.2} />
      <text x={4} y={y(max) + 4} fontSize={11} fill="currentColor">{max}</text>
      <text x={4} y={y(min) + 4} fontSize={11} fill="currentColor">{min}</text>
      {planPath && <path d={planPath} fill="none" stroke="#b45309" strokeWidth={2} strokeDasharray="2 4" />}
      {planPoints.map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={3} fill="#b45309"><title>{`${months[p.i]}: plan ${p.v}`}</title></circle>)}
      <path d={line} fill="none" stroke="var(--accent, #0f766e)" strokeWidth={2.5} />
      {forecast.length > 0 && <path d={dash} fill="none" stroke="var(--accent, #0f766e)" strokeWidth={2.5} strokeDasharray="6 5" opacity={0.7} />}
      {series.map((s, i) => (
        <g key={s.month}>
          <circle cx={x(i)} cy={y(s.headcount)} r={3.5} fill="var(--accent, #0f766e)">
            <title>{`${s.month}: ${s.headcount} işçi, ${s.joined} qəbul, ${s.left} çıxış`}</title>
          </circle>
          {i % 2 === 0 && <text x={x(i)} y={H - PAD + 16} fontSize={10} textAnchor="middle" fill="currentColor">{s.month.slice(2)}</text>}
          <rect x={x(i) - 8} y={H + 20 - (s.joined / barMax) * 34} width={7} height={(s.joined / barMax) * 34} fill="#16a34a"><title>{`${s.month}: ${s.joined} nəfər işə qəbul`}</title></rect>
          <rect x={x(i) + 1} y={H + 20} width={7} height={(s.left / barMax) * 34} fill="#dc2626"><title>{`${s.month}: ${s.left} nəfər çıxıb`}</title></rect>
        </g>
      ))}
      {forecast.map((f, i) => (
        <g key={f.month}>
          <circle cx={x(series.length + i)} cy={y(f.headcount)} r={3.5} fill="none" stroke="var(--accent, #0f766e)" strokeWidth={2}>
            <title>{`${f.month}: təxminən ${f.headcount} işçi (proqnoz)`}</title>
          </circle>
          <text x={x(series.length + i)} y={H - PAD + 16} fontSize={10} textAnchor="middle" fill="currentColor" opacity={0.7}>{f.month.slice(2)}</text>
        </g>
      ))}
      <text x={PAD} y={H + 75} fontSize={11} fill="currentColor">Yaşıl: işə qəbul · Qırmızı: çıxış · Qırıq xətt: proqnoz · Narıncı nöqtəli xətt: plan (təsdiqlənmiş ştat cəmi)</text>
    </svg>
  );
}

// Staff plan against people really working, per department, as bars.
function PlanBars({ rows }: { rows: Data["planFact"] }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.planned, r.filled)));
  return (
    <div>
      {rows.map((r) => (
        <div key={r.department} style={{ display: "grid", gridTemplateColumns: "150px 1fr 90px", gap: 8, alignItems: "center", margin: "4px 0" }}>
          <span>{r.department || "Departamentsiz"}</span>
          <div style={{ position: "relative", height: 14, background: "var(--surface-2, #eef2f1)", borderRadius: 4 }}>
            <div style={{ position: "absolute", inset: 0, width: `${(r.planned / max) * 100}%`, border: "1px dashed var(--muted, #667)", borderRadius: 4 }} title={`Ştat: ${r.planned}`} />
            <div style={{ height: "100%", width: `${(r.filled / max) * 100}%`, background: r.filled > r.planned && r.planned > 0 ? "#dc2626" : "var(--accent, #0f766e)", borderRadius: 4 }} title={`Faktiki: ${r.filled}`} />
          </div>
          <small>{r.filled} / {r.planned}</small>
        </div>
      ))}
    </div>
  );
}

async function post(path: string, body: unknown) {
  const r = await fetch(`/api/joblink/${path}`, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = (await r.json().catch(() => ({}))) as { error?: string; pending?: boolean };
  if (!r.ok) throw new Error(d.error || "Saxlanmadı.");
  return d;
}

// The plan of a year: one figure for each month, or a year-end figure spread in a straight line from today's number.
// A department's own plan, changed on the spot when it is one row of the staff table (more rows are changed in the table).
function DeptPlan({ row, notify, onSaved }: { row: Data["planFact"][number]; notify: Notify; onSaved: () => void }) {
  const [value, setValue] = useState(String(row.planned));
  async function save() {
    try {
      const r = await post("company/headcount/save", { department: row.department, planned: value === "" ? null : Number(value) });
      notify(r.pending ? "Ştat planı kilidlidir: dəyişiklik direktorun təsdiqinə göndərildi." : "Departament planı saxlanıldı.");
      onSaved();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (row.units > 1) return <small className="muted">{row.units} sətir: ştat cədvəlində dəyişin</small>;
  return (
    <span className="admin-actions">
      <input inputMode="numeric" aria-label={`${row.department} planı`} style={{ width: 64 }} value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="button" disabled={value === String(row.planned)} onClick={() => void save()}>Saxla</button>
    </span>
  );
}

export default function HrTrends({ notify, editable = false, onOpenPlan }: { notify: Notify; editable?: boolean; locked?: boolean; year?: string; onOpenPlan?: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(() => {
    fetch("/api/joblink/company/hr-trends", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        const d = (await r.json().catch(() => ({}))) as Data & { error?: string };
        if (!r.ok) throw new Error(d.error || "Hesabat yüklənmədi.");
        setData(d);
      })
      .catch((e) => notify((e as Error).message));
  }, [notify]);
  useEffect(load, [load]);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const last = data.series[data.series.length - 1];
  return (
    <div className="company-page">
      <p className="muted">Son 12 ayda işçi sayı, işə qəbul və çıxış; növbəti 3 ay üçün proqnoz son 6 ayın orta işə qəbul və çıxışına əsaslanır (sadə tendensiya, vəd deyil). Aşağıda ştat cədvəli ilə faktiki işçi sayı müqayisə olunur.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <div className="panel" style={{ flex: "1 1 140px" }}><small className="muted">İndi işçi</small><div style={{ fontSize: 22, fontWeight: 700 }}>{last?.headcount ?? 0}</div></div>
        <div className="panel" style={{ flex: "1 1 140px" }}><small className="muted">Ştat / faktiki</small><div style={{ fontSize: 22, fontWeight: 700 }}>{data.planned} / {data.filled}</div></div>
        <div className="panel" style={{ flex: "1 1 140px" }}><small className="muted">Bu ay dövriyyə</small><div style={{ fontSize: 22, fontWeight: 700 }}>{last?.turnover ?? 0}%</div></div>
        <div className="panel" style={{ flex: "1 1 140px" }}><small className="muted">3 aya proqnoz</small><div style={{ fontSize: 22, fontWeight: 700 }}>{data.forecast[data.forecast.length - 1]?.headcount ?? "—"}</div></div>
      </div>
      {(data.expectedExits?.some((e) => e.count > 0) || data.avgFillDays != null) && (
        <div className="panel">
          {data.expectedExits?.some((e) => e.count > 0) && <p style={{ margin: "0 0 6px" }}><b>Gözlənilən çıxışlar (müqavilə bitməsi və ya təyin olunmuş çıxış tarixi):</b> {data.expectedExits.filter((e) => e.count > 0).map((e) => `${e.month}: ${e.count} nəfər`).join(" · ")}. Bu yerlər üçün əvvəlcədən vakansiya açmaq olar.</p>}
          {data.avgFillDays != null && <p style={{ margin: 0 }}><b>Yerin orta dolma müddəti:</b> {data.avgFillDays} gün (vakansiya açılandan işçi kartı yaranana qədər). Yeni yer üçün işə qəbul tarixini buna görə planlayın.</p>}
        </div>
      )}
      <div className="panel"><Chart series={data.series} forecast={data.forecast} targets={data.targets} /></div>
      {data.canPlan && editable && (
        <div className="panel">
          <b>Plan xətti təsdiqlənmiş ştat planından (büdcədən) gəlir.</b>{" "}
          <span className="muted">
            {Object.keys(data.targets).length
              ? `Qrafikdə narıncı xətt təsdiqlənmiş planın ştat cəmidir (${Object.values(data.targets)[0]} nəfər). Say dəyişəndə plan yenidən təsdiqlənməlidir.`
              : "Bu il üçün plan hələ təsdiqlənməyib, ona görə qrafikdə plan xətti yoxdur. Ştat planını qurub yuxarıdakı «Planı təsdiqlə» (və ya «Təsdiqə göndər») düyməsini basın."}
          </span>
        </div>
      )}
      {data.canPlan && !editable && onOpenPlan && <div className="panel"><b>Plan harada dəyişdirilir?</b> <span className="muted">Ştat planı və büdcə bir yerdə, «Plan və fakt» bölməsində yazılır, silinir və təsdiqlənir.</span> <button type="button" className="secondary" onClick={onOpenPlan}>Plan və fakt bölməsinə keç</button></div>}
      <h4>Plan-fakt: ştat cədvəli və faktiki işçi</h4>
      {!!data.alerts.length && (
        <ul style={{ paddingLeft: 18 }}>
          {data.alerts.map((a) => (
            <li key={a.text} style={{ color: a.level === "red" ? "var(--danger, #b42318)" : undefined }}>{a.text}</li>
          ))}
        </ul>
      )}
      {data.planFact.length ? <div className="panel"><PlanBars rows={data.planFact} />{data.canPlan && editable && (<div style={{ margin: "10px 0" }}><b>Departament planını dəyiş</b>{data.planFact.map((r) => (<div key={r.department} style={{ display: "flex", gap: 8, alignItems: "center", margin: "4px 0" }}><span style={{ width: 150 }}>{r.department || "Departamentsiz"}</span><DeptPlan row={r} notify={notify} onSaved={load} /></div>))}</div>)}<small className="muted">Qırıq çərçivə: ştat · dolu zolaq: faktiki (qırmızı: ştatdan artıq)</small></div> : <p className="admin-empty">Ştat cədvəli hələ doldurulmayıb.</p>}
    </div>
  );
}
