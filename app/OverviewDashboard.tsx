"use client";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BriefcaseBusiness, CalendarClock, Eye, Users } from "lucide-react";

type Overview = {
  tiles: { jobs: number; applications: number; apps30: number; appsPrev30: number; interviews14: number; views: number; hired: number; employees: number };
  weeks: { start: string; apps: number; views: number }[];
  statuses: { status: string; count: number }[];
  departments: { name: string; count: number }[];
  tenure: { label: string; count: number }[];
  heat: { start: string; days: (number | null)[] }[];
  hasAttendance: boolean;
};

const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
const WEEKDAY = ["B.e.", "Ç.a.", "Çər.", "C.a.", "Cümə"];
// Ordinal ramp for the stages of a selection, light (early) to dark (late); validated for light and dark surfaces.
const STAGE_COLORS = ["var(--ov-1)", "var(--ov-2)", "var(--ov-3)", "var(--ov-4)", "var(--ov-5)", "var(--ov-6)"];

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 84;
  const h = 28;
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - 3 - (v / max) * (h - 8)}`).join(" ");
  return (
    <svg className="ov-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tile({ icon, label, value, note, delta, spark, tone }: { icon: React.ReactNode; label: string; value: number; note?: string; delta?: number | null; spark?: number[]; tone: "teal" | "dark" | "lime" | "sand" }) {
  return (
    <div className={`ov-tile ov-${tone}`}>
      <span className="ov-tile-icon" aria-hidden="true">{icon}</span>
      <div className="ov-tile-body">
        <span className="ov-tile-label">{label}</span>
        <strong>{value.toLocaleString("az-AZ")}</strong>
        {delta !== undefined && delta !== null && (
          <small className={delta >= 0 ? "up" : "down"}>
            {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {Math.abs(delta)}% <em>son 30 gün</em>
          </small>
        )}
        {note && <small className="note">{note}</small>}
      </div>
      {spark && <Spark values={spark} />}
    </div>
  );
}

// Applications per week: thin bars on a dark card; the tallest week is named, any week shows its number on hover.
function WeeklyBars({ weeks }: { weeks: Overview["weeks"] }) {
  const [hot, setHot] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.map((w) => w.apps));
  const top = weeks.reduce((best, w, i) => (w.apps > weeks[best].apps ? i : best), 0);
  const total = weeks.reduce((s, w) => s + w.apps, 0);
  const shown = hot ?? top;
  return (
    <section className="ov-card ov-dark" aria-label="Müraciətlər həftələr üzrə">
      <div className="ov-card-head">
        <h3>Müraciət dinamikası</h3>
        <span className="ov-chip">son 12 həftə</span>
      </div>
      <p className="ov-big">
        {weeks[shown].apps} <small>müraciət · {dm(weeks[shown].start)} həftəsi</small>
      </p>
      {total === 0 ? (
        <p className="ov-empty">Son 12 həftədə müraciət yoxdur.</p>
      ) : (
        <svg className="ov-bars" viewBox="0 0 360 150" role="img" aria-label={`12 həftədə ${total} müraciət`} onMouseLeave={() => setHot(null)}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1="0" x2="360" y1={130 - f * 110} y2={130 - f * 110} className="ov-grid" />
          ))}
          {weeks.map((w, i) => {
            const bh = Math.max(w.apps ? 4 : 1.5, (w.apps / max) * 110);
            const x = 6 + i * 29.5;
            return (
              <g key={w.start} onMouseEnter={() => setHot(i)} onFocus={() => setHot(i)} tabIndex={0} aria-label={`${dm(w.start)}: ${w.apps} müraciət`}>
                <rect x={x - 3} y="0" width="22" height="150" fill="transparent" />
                <rect x={x} y={130 - bh} width="16" height={bh} rx="4" className={`ov-bar ${i === shown ? "on" : ""}`} />
                {(i % 3 === 0 || i === 11) && <text x={x + 8} y="146" textAnchor="middle" className="ov-axis">{dm(w.start)}</text>}
              </g>
            );
          })}
        </svg>
      )}
      <details className="ov-table">
        <summary>Rəqəmlər cədvəli</summary>
        <table>
          <thead><tr><th>Həftə</th><th>Müraciət</th><th>Vakansiya baxışı</th></tr></thead>
          <tbody>{weeks.map((w) => <tr key={w.start}><td>{dm(w.start)}</td><td>{w.apps}</td><td>{w.views}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

// Where the applications stand: one row per stage, a bar for its share of all applications.
function Stages({ statuses }: { statuses: Overview["statuses"] }) {
  const total = statuses.reduce((s, x) => s + x.count, 0);
  const LABEL: Record<string, string> = { Göndərildi: "Yeni", Baxışda: "Baxışda", Müsahibə: "Müsahibə", "Təklif edildi": "Təklif", "İşə qəbul edildi": "İşə qəbul", "Uyğun deyil": "Uyğun deyil" };
  return (
    <section className="ov-card" aria-label="Müraciət mərhələləri">
      <div className="ov-card-head">
        <h3>Müraciət mərhələləri</h3>
        <span className="ov-chip">{total} müraciət</span>
      </div>
      {total === 0 ? (
        <p className="ov-empty">Hələ müraciət yoxdur.</p>
      ) : (
        <ul className="ov-stages">
          {statuses.map((s, i) => {
            const pct = Math.round((s.count / total) * 100);
            return (
              <li key={s.status} title={`${s.status}: ${s.count} (${pct}%)`}>
                <span className="ov-stage-name">{LABEL[s.status] || s.status}</span>
                <span className="ov-stage-track"><i style={{ width: `${Math.max(s.count ? 3 : 0, pct)}%`, background: STAGE_COLORS[i] }} /></span>
                <b>{s.count}</b>
                <em>{pct}%</em>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Departments({ items, total }: { items: Overview["departments"]; total: number }) {
  const max = Math.max(1, ...items.map((d) => d.count));
  return (
    <section className="ov-card ov-lime" aria-label="Departamentlər üzrə işçilər">
      <div className="ov-card-head">
        <h3>Departamentlər üzrə işçilər</h3>
        <span className="ov-chip">{total} işçi</span>
      </div>
      {items.length === 0 ? (
        <p className="ov-empty">İşçi siyahısı boşdur.</p>
      ) : (
        <ul className="ov-hbars">
          {items.map((d, i) => (
            <li key={d.name} title={`${d.name}: ${d.count} işçi`}>
              <span className="ov-hname">{d.name}</span>
              <span className="ov-htrack"><i className={i === 0 ? "top" : ""} style={{ width: `${(d.count / max) * 100}%` }} /></span>
              <b>{d.count}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Heat({ heat, has }: { heat: Overview["heat"]; has: boolean }) {
  const color = (pct: number | null) => {
    if (pct === null) return "var(--ov-empty)";
    const step = pct >= 98 ? 5 : pct >= 95 ? 4 : pct >= 90 ? 3 : pct >= 80 ? 2 : pct >= 70 ? 1 : 0;
    return STAGE_COLORS[step];
  };
  return (
    <section className="ov-card ov-dark" aria-label="Davamiyyət">
      <div className="ov-card-head">
        <h3>Davamiyyət</h3>
        <span className="ov-chip">son 4 həftə</span>
      </div>
      {!has ? (
        <p className="ov-empty">Davamiyyət qeydləri yoxdur. Tabeldə gün işarələndikcə burada görünəcək.</p>
      ) : (
        <>
          <div className="ov-heat" role="table" aria-label="İşdə olanların faizi">
            <div role="row" className="ov-heat-head"><span />{WEEKDAY.map((d) => <span key={d} role="columnheader">{d}</span>)}</div>
            {heat.map((row) => (
              <div role="row" key={row.start}>
                <span role="rowheader" className="ov-axis">{dm(row.start)}</span>
                {row.days.map((pct, d) => (
                  <span key={d} role="cell" className="ov-cell" style={{ background: color(pct) }} title={pct === null ? "Məlumat yoxdur" : `${WEEKDAY[d]} ${dm(row.start)}: işçilərin ${pct}%-i işdə`}>
                    {pct === null ? "" : pct}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p className="ov-legend"><span>az</span>{STAGE_COLORS.map((c) => <i key={c} style={{ background: c }} />)}<span>çox işdə (%)</span></p>
        </>
      )}
    </section>
  );
}

function Tenure({ items }: { items: Overview["tenure"] }) {
  const max = Math.max(1, ...items.map((t) => t.count));
  const total = items.reduce((s, t) => s + t.count, 0);
  return (
    <section className="ov-card ov-sand" aria-label="İşçilərin staj paylanması">
      <div className="ov-card-head">
        <h3>İş stajı</h3>
        <span className="ov-chip">{total} işçi</span>
      </div>
      {total === 0 ? (
        <p className="ov-empty">İşçi siyahısı boşdur.</p>
      ) : (
        <div className="ov-cols">
          {items.map((t) => (
            <div key={t.label} title={`${t.label}: ${t.count} işçi`}>
              <b>{t.count}</b>
              <i style={{ height: `${Math.max(t.count ? 6 : 2, (t.count / max) * 90)}px` }} />
              <small>{t.label}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// The employer's overview: headline numbers, then how applications move, then the people of the company.
export default function OverviewDashboard({ go }: { go: (page: string) => void }) {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    fetch("/api/joblink/company/overview-charts", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Overview>) : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);
  if (!data) return <div className="ov"><p className="muted">Göstəricilər yüklənir…</p></div>;
  const t = data.tiles;
  const delta = t.appsPrev30 > 0 ? Math.round(((t.apps30 - t.appsPrev30) / t.appsPrev30) * 100) : t.apps30 > 0 ? 100 : null;
  return (
    <div className="ov">
      <div className="ov-tiles">
        <Tile tone="teal" icon={<BriefcaseBusiness size={20} />} label="Aktiv vakansiyalar" value={t.jobs} note={`${t.hired} işə qəbul`} />
        <Tile tone="dark" icon={<Users size={20} />} label="Müraciətlər" value={t.applications} delta={delta} spark={data.weeks.map((w) => w.apps)} />
        <Tile tone="lime" icon={<CalendarClock size={20} />} label="Müsahibələr (14 gün)" value={t.interviews14} note="təyin olunmuş" />
        <Tile tone="sand" icon={<Eye size={20} />} label="Vakansiya baxışları" value={t.views} spark={data.weeks.map((w) => w.views)} note="son 12 həftə" />
      </div>
      <div className="ov-row">
        <WeeklyBars weeks={data.weeks} />
        <Stages statuses={data.statuses} />
      </div>
      <h3 className="ov-section">Kollektiv göstəriciləri <button type="button" className="text-button" onClick={() => go("hr-employees")}>İşçilərə keç ↗</button></h3>
      <div className="ov-row three">
        <Heat heat={data.heat} has={data.hasAttendance} />
        <Departments items={data.departments} total={t.employees} />
        <Tenure items={data.tenure} />
      </div>
    </div>
  );
}
