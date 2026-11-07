"use client";
import { useEffect, useState } from "react";
import { Banknote, CalendarOff, ChevronRight, ClipboardList, FileCheck2, UserMinus, UserPlus, Users } from "lucide-react";

type Ops = {
  today: string;
  headcount: { active: number; onLeave: number; joined30: number; left30: number };
  away: { name: string; reason: string }[];
  departments: { name: string; count: number }[];
  series: { month: string; headcount: number; joined: number; left: number }[];
  leaves: { name: string; from: string; to: string; days: number; approved: boolean }[];
  ordersWaiting: number;
  requestsNew: number;
  payroll: { month: string; approved: boolean; payDate: string };
};
type Today = { key: string; label: string; count: number; link: string; level: "red" | "amber" | "info"; detail: string[] };

const dmy = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
const daysUntil = (iso: string, today: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
// The attention items that are about papers running out; the rest of "today" lists what waits for a decision.
const DEADLINE_KEYS = ["probation", "contracts", "deadlines"];

function HeadcountChart({ series }: { series: Ops["series"] }) {
  const [hot, setHot] = useState<number | null>(null);
  const w = 520;
  const h = 170;
  const pad = { l: 30, r: 10, t: 12, b: 24 };
  const min = Math.min(...series.map((s) => s.headcount));
  const max = Math.max(...series.map((s) => s.headcount), min + 1);
  const x = (i: number) => pad.l + (i / Math.max(1, series.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);
  const line = series.map((s, i) => `${x(i)},${y(s.headcount)}`).join(" ");
  const area = `${x(0)},${h - pad.b} ${line} ${x(series.length - 1)},${h - pad.b}`;
  const shown = series[hot ?? series.length - 1];
  return (
    <section className="ov-card ov-dark" aria-label="İşçi sayı dinamikası">
      <div className="ov-card-head">
        <h3>İşçi sayı dinamikası</h3>
        <span className="ov-chip">son 12 ay</span>
      </div>
      <p className="ov-big">{shown.headcount}<small> işçi · {MONTHS[Number(shown.month.slice(5, 7)) - 1]} {shown.month.slice(0, 4)}</small></p>
      <p className="ov-empty">{shown.joined} işə qəbul · {shown.left} çıxış</p>
      <svg className="ov-bars" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Ay sonu işçi sayı">
        {[0, 0.5, 1].map((f) => <line key={f} className="ov-grid" x1={pad.l} x2={w - pad.r} y1={pad.t + f * (h - pad.t - pad.b)} y2={pad.t + f * (h - pad.t - pad.b)} />)}
        <polygon points={area} fill="var(--ov-3)" opacity="0.22" />
        <polyline points={line} fill="none" stroke="var(--ov-1b, #9be0d4)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {series.map((s, i) => (
          <g key={s.month} onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)}>
            <rect x={x(i) - 14} y={pad.t} width={28} height={h - pad.t - pad.b} fill="transparent" />
            <circle cx={x(i)} cy={y(s.headcount)} r={hot === i || i === series.length - 1 ? 4.5 : 3} fill="var(--ov-1b, #9be0d4)" stroke="#14201e" strokeWidth="2" />
            {(i % 2 === 1 || i === series.length - 1) && <text className="ov-axis" x={x(i)} y={h - 6} textAnchor="middle">{MONTHS[Number(s.month.slice(5, 7)) - 1]}</text>}
          </g>
        ))}
        <text className="ov-axis" x={pad.l - 6} y={y(max) + 3} textAnchor="end">{max}</text>
        <text className="ov-axis" x={pad.l - 6} y={y(min) + 3} textAnchor="end">{min}</text>
      </svg>
      <details className="ov-table">
        <summary>Rəqəmlər cədvəli</summary>
        <table className="admin-table"><thead><tr><th>Ay</th><th>İşçi</th><th>Qəbul</th><th>Çıxış</th></tr></thead><tbody>{series.map((s) => <tr key={s.month}><td>{s.month}</td><td>{s.headcount}</td><td>{s.joined}</td><td>{s.left}</td></tr>)}</tbody></table>
      </details>
    </section>
  );
}

export default function HrOpsOverview({ go }: { go: (page: string) => void }) {
  const [ops, setOps] = useState<Ops | null>(null);
  const [today, setToday] = useState<Today[]>([]);
  const [failed, setFailed] = useState("");
  useEffect(() => {
    fetch("/api/joblink/company/ops-overview", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as Ops & { error?: string };
        if (!r.ok) throw new Error(body.error || "Yüklənmədi");
        setOps(body);
      })
      .catch((e: Error) => setFailed(e.message));
    fetch("/api/joblink/company/today", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ items?: Today[] }>) : null))
      .then((d) => setToday(d?.items || []))
      .catch(() => setToday([]));
  }, []);
  if (failed) return <p className="notice error">{failed}</p>;
  if (!ops) return <p className="muted">Yüklənir…</p>;
  const hc = ops.headcount;
  const waiting = ops.ordersWaiting + ops.requestsNew;
  const deadlines = today.filter((i) => DEADLINE_KEYS.includes(i.key));
  const decisions = today.filter((i) => !DEADLINE_KEYS.includes(i.key) && i.key !== "birthdays");
  const birthdays = today.find((i) => i.key === "birthdays");
  const payIn = daysUntil(ops.payroll.payDate, ops.today);
  const maxDept = Math.max(1, ...ops.departments.map((d) => d.count));
  return (
    <div className="ov">
      <div className="ov-tiles">
        <div className="ov-tile ov-teal"><span className="ov-tile-icon" aria-hidden="true"><Users size={20} /></span><div className="ov-tile-body"><span className="ov-tile-label">Aktiv işçi</span><strong>{hc.active}</strong><small className="note">{hc.onLeave} nəfər bu gün yoxdur</small></div></div>
        <div className="ov-tile ov-dark"><span className="ov-tile-icon" aria-hidden="true"><UserPlus size={20} /></span><div className="ov-tile-body"><span className="ov-tile-label">İşə qəbul (30 gün)</span><strong>{hc.joined30}</strong><small className="note">{hc.left30} nəfər çıxıb</small></div></div>
        <div className="ov-tile ov-lime"><span className="ov-tile-icon" aria-hidden="true"><FileCheck2 size={20} /></span><div className="ov-tile-body"><span className="ov-tile-label">Gözləyən əmr və ərizə</span><strong>{waiting}</strong><small className="note">{ops.ordersWaiting} imza, {ops.requestsNew} ərizə</small></div></div>
        <div className="ov-tile ov-sand"><span className="ov-tile-icon" aria-hidden="true"><Banknote size={20} /></span><div className="ov-tile-body"><span className="ov-tile-label">{ops.payroll.month} əmək haqqı</span><strong>{ops.payroll.approved ? "Təsdiqlənib" : "Layihə"}</strong><small className="note">ödəniş günü {dmy(ops.payroll.payDate)}{payIn >= 0 ? ` (${payIn} gün)` : ""}</small></div></div>
      </div>

      <div className="ov-row">
        <section className="ov-card" aria-label="Bu gün nə etməli">
          <div className="ov-card-head"><h3>Bu gün nə etməli</h3><span className="ov-chip">{decisions.reduce((t, i) => t + i.count, 0)} iş</span></div>
          {decisions.length === 0 ? <p className="ov-empty">Gözləyən qərar yoxdur.</p> : (
            <ul className="ov-attn-list">
              {decisions.map((i) => (
                <li key={i.key}>
                  <div><b className={i.level === "red" ? "danger-text" : undefined}>{i.count}</b> · {i.label}{i.detail.length > 0 && <small>{i.detail.join(" · ")}</small>}</div>
                  <button type="button" className="secondary" onClick={() => go(i.link)}>Aç</button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ov-card ov-sand" aria-label="Sənəd və müqavilə müddətləri">
          <div className="ov-card-head"><h3>Müddətlər</h3><span className="ov-chip">30 gün</span></div>
          {deadlines.length === 0 ? <p className="ov-empty">Yaxın 30 gündə bitən müqavilə, sınaq müddəti və ya sənəd yoxdur.</p> : (
            <ul className="ov-attn-list">
              {deadlines.map((i) => (
                <li key={i.key}>
                  <div><b className={i.level === "red" ? "danger-text" : undefined}>{i.count}</b> · {i.label}{i.detail.length > 0 && <small>{i.detail.join(" · ")}</small>}</div>
                  <button type="button" className="secondary" onClick={() => go(i.link)}>Aç</button>
                </li>
              ))}
            </ul>
          )}
          {birthdays && <p className="ov-empty">Ad günləri (14 gün): {birthdays.detail.join(" · ")}</p>}
        </section>
      </div>

      <div className="ov-row">
        <HeadcountChart series={ops.series} />
        <section className="ov-card" aria-label="Kim yoxdur">
          <div className="ov-card-head"><h3><CalendarOff size={16} /> Bu gün yoxda olanlar</h3><span className="ov-chip">{ops.away.length}</span></div>
          {ops.away.length === 0 ? <p className="ov-empty">Hamı işdədir.</p> : (
            <ul className="ov-attn-list">{ops.away.map((a) => <li key={a.name + a.reason}><div><b>{a.name}</b><small>{a.reason}</small></div></li>)}</ul>
          )}
          <h3 className="ov-subhead">Yaxın 14 gün məzuniyyət</h3>
          {ops.leaves.length === 0 ? <p className="ov-empty">Planlaşdırılmış məzuniyyət yoxdur.</p> : (
            <ul className="ov-attn-list">{ops.leaves.map((l) => <li key={l.name + l.from}><div><b>{l.name}</b><small>{dm(l.from)} – {dm(l.to)} · {l.days} gün{l.approved ? "" : " (təklif)"}</small></div></li>)}</ul>
          )}
        </section>
      </div>

      <h3 className="ov-section">Kollektiv <button type="button" className="text-button" onClick={() => go("hr-employees")}>İşçilərə keç <ChevronRight size={13} /></button></h3>
      <div className="ov-row">
        <section className="ov-card ov-lime" aria-label="Şöbələr üzrə işçilər">
          <div className="ov-card-head"><h3>Şöbələr üzrə işçilər</h3><span className="ov-chip">{hc.active} işçi</span></div>
          {ops.departments.length === 0 ? <p className="ov-empty">İşçi siyahısı boşdur.</p> : (
            <ul className="ov-hbars">
              {ops.departments.map((d, i) => (
                <li key={d.name} title={`${d.name}: ${d.count} işçi`}>
                  <span className="ov-hname">{d.name}</span>
                  <span className="ov-htrack"><i className={i === 0 ? "top" : ""} style={{ width: `${(d.count / maxDept) * 100}%` }} /></span>
                  <b>{d.count}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ov-card" aria-label="Qısa yollar">
          <div className="ov-card-head"><h3><ClipboardList size={16} /> Tez keçid</h3></div>
          <div className="ops-quick">
            <button type="button" className="secondary" onClick={() => go("hr-orders")}>Yeni əmr</button>
            <button type="button" className="secondary" onClick={() => go("hr-payroll")}>Əmək haqqı</button>
            <button type="button" className="secondary" onClick={() => go("hr-attendance")}>Davamiyyət</button>
            <button type="button" className="secondary" onClick={() => go("hr-people-ops")}>Kadr əməliyyatları</button>
            <button type="button" className="secondary" onClick={() => go("hr-reports")}>Hesabatlar</button>
            <button type="button" className="secondary" onClick={() => go("hr-employees")}><UserMinus size={14} /> İşçi kartları</button>
          </div>
        </section>
      </div>
    </div>
  );
}
