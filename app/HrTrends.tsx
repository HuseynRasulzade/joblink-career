"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { linearTargets } from "@/lib/hr-trends";

type Notify = (message: string) => void;
type Series = { month: string; headcount: number; joined: number; left: number; turnover: number };
type Data = { targets: Record<string, number>; canPlan: boolean; series: Series[]; forecast: { month: string; headcount: number }[]; planFact: { department: string; planned: number; filled: number; unplaced: number; units: number }[]; alerts: { level: "red" | "amber"; text: string }[]; planned: number; filled: number };

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
      <text x={PAD} y={H + 75} fontSize={11} fill="currentColor">Yaşıl: işə qəbul · Qırmızı: çıxış · Qırıq xətt: proqnoz · Narıncı nöqtəli xətt: plan</text>
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
function PlanEditor({ data, notify, onSaved, year, locked }: { data: Data; notify: Notify; onSaved: () => void; year: string; locked: boolean }) {
  const now = data.series[data.series.length - 1]?.month || new Date().toISOString().slice(0, 7);
  const [values, setValues] = useState<Record<string, string>>({});
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`), [year]);
  const shown = (m: string) => (values[m] !== undefined ? values[m] : data.targets[m] !== undefined ? String(data.targets[m]) : "");
  const current = data.series[data.series.length - 1]?.headcount ?? 0;
  function spread() {
    const target = Number(end);
    if (!Number.isFinite(target) || target < 0) return notify("İlin sonuna hədəf işçi sayını yazın.");
    const from = year === now.slice(0, 4) ? now : `${year}-01`;
    const start = year === now.slice(0, 4) ? current : data.targets[`${Number(year) - 1}-12`] ?? current;
    const next: Record<string, string> = { ...values };
    for (const t of linearTargets(start, target, from, `${year}-12`)) next[t.month] = String(t.target);
    setValues(next);
  }
  async function save() {
    const list = months.filter((m) => values[m] !== undefined).map((m) => ({ month: m, target: values[m] === "" ? null : Number(values[m]) }));
    if (!list.length) return notify("Dəyişiklik yoxdur.");
    setBusy(true);
    try {
      await post("company/hr-trends/targets", { targets: list });
      notify(`${year} planı saxlanıldı.`);
      setValues({});
      onSaved();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function clearYear() {
    if (!window.confirm(`${year}-ci ilin bütün aylıq işçi sayı planı silinsin?`)) return;
    setBusy(true);
    try {
      await post("company/hr-trends/targets", { targets: months.filter((m) => data.targets[m] !== undefined).map((m) => ({ month: m, target: null })) });
      notify(`${year} planı silindi.`);
      setValues({});
      onSaved();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel">
      <h4 style={{ marginTop: 0 }}>Planı təyin et: aylıq hədəf işçi sayı</h4>
      <p className="muted">Hər ay üçün şirkətdə olmalı işçi sayını yazın. Plan qrafikdə narıncı xətt kimi görünür; faktiki say plandan 5%-dən çox (ən azı 1 nəfər) kənara çıxanda xəbərdarlıq çıxır.</p>
      <div className="admin-actions" style={{ flexWrap: "wrap" }}>
        <b>{year}</b>
        <input inputMode="numeric" aria-label="İlin sonuna hədəf" placeholder={`Dekabr hədəfi (indi ${current})`} style={{ width: 190 }} value={end} onChange={(e) => setEnd(e.target.value)} />
        <button type="button" className="secondary" disabled={locked} onClick={spread}>Bərabər paylaşdır</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8, margin: "10px 0", maxWidth: 720 }}>
        {months.map((m) => (
          <label key={m} style={{ display: "grid", gap: 2, fontSize: 12, minWidth: 0 }}>
            {m.slice(5)}. ay
            <input inputMode="numeric" aria-label={`${m} planı`} style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }} value={shown(m)} disabled={locked} onChange={(e) => setValues({ ...values, [m]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className="admin-actions">
        <button type="button" className="primary" disabled={busy || locked} onClick={() => void save()}>Planı saxla</button>
        <button type="button" className="secondary" disabled={busy || locked || !months.some((m) => data.targets[m] !== undefined)} onClick={() => void clearYear()}>{year} planını sil</button>
      </div>
    </div>
  );
}

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

export default function HrTrends({ notify, editable = false, locked = false, year, onOpenPlan }: { notify: Notify; editable?: boolean; locked?: boolean; year?: string; onOpenPlan?: () => void }) {
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
      <div className="panel"><Chart series={data.series} forecast={data.forecast} targets={data.targets} /></div>
      {data.canPlan && editable && <PlanEditor data={data} notify={notify} onSaved={load} year={year || (data.series[data.series.length - 1]?.month || new Date().toISOString().slice(0, 7)).slice(0, 4)} locked={locked} />}
      {data.canPlan && !editable && onOpenPlan && <div className="panel"><b>Plan harada dəyişdirilir?</b> <span className="muted">Aylıq hədəf işçi sayı, ştat və büdcə bir yerdə, «Plan və fakt» bölməsində yazılır, silinir və təsdiqlənir.</span> <button type="button" className="secondary" onClick={onOpenPlan}>Plan və fakt bölməsinə keç</button></div>}
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
