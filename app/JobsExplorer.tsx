"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, Bookmark, Building2, CalendarDays, Clock3, MapPin, Search, Sparkles, X } from "lucide-react";
import type { Job } from "@/lib/model";
import { VerifiedBadge } from "./CompaniesPage";

export type ExplorerJob = Job & { ranking: { score: number; aiReason?: unknown } };

const hue = (text: string) => {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};
const dayWord = (value: string) => {
  const days = Math.floor((Date.now() - Date.parse(value)) / 86400000);
  if (!Number.isFinite(days) || days < 0) return "";
  if (days === 0) return "bu gün";
  if (days < 30) return `${days} gün əvvəl`;
  return `${Math.floor(days / 30)} ay əvvəl`;
};
const lines = (text: string) =>
  text
    .split(/\n+|;\s*/)
    .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean);
const money = (j: Job) => (j.minSalary || j.maxSalary ? `${j.minSalary.toLocaleString("fr-FR")}–${j.maxSalary.toLocaleString("fr-FR")} AZN` : "Razılaşma ilə");

function Mark({ company, size = 44 }: { company: string; size?: number }) {
  const h = hue(company);
  return (
    <span className="jx-mark" style={{ width: size, height: size, background: `hsl(${h} 55% 92%)`, color: `hsl(${h} 45% 30%)`, fontSize: size * 0.45 }} aria-hidden="true">
      {company.trim().slice(0, 1).toLocaleUpperCase("az")}
    </span>
  );
}

// One group of filter choices: a click picks a value, a second click clears it. The number is how many vacancies it would show.
function Group<T extends string | number>({ title, options, value, onChange, count }: { title: string; options: { value: T; label: string }[]; value: T | ""; onChange: (v: T | "") => void; count: (v: T) => number }) {
  return (
    <details className="jx-group" open>
      <summary>{title}</summary>
      <div>
        {options.map((o) => (
          <label key={String(o.value)} className="jx-check">
            <input type="checkbox" checked={value === o.value} onChange={() => onChange(value === o.value ? "" : o.value)} />
            <span>{o.label}</span>
            <em>{count(o.value)}</em>
          </label>
        ))}
      </div>
    </details>
  );
}

export default function JobsExplorer({
  jobs,
  all,
  filters,
  setFilters,
  reset,
  saved,
  onSave,
  onOpen,
  onApply,
  applied,
  onTailor,
  signedIn,
  alerts,
  language,
  extra,
}: {
  jobs: ExplorerJob[];
  all: ExplorerJob[];
  filters: { query: string; city: string; mode: string; category: string; type: string; salary: number; experience: string; minScore: number; savedOnly: boolean; matchOnly: boolean; sort: string };
  setFilters: (patch: Partial<{ query: string; city: string; mode: string; category: string; type: string; salary: number; experience: string; minScore: number; savedOnly: boolean; matchOnly: boolean; sort: string }>) => void;
  reset: () => void;
  saved: string[];
  onSave: (j: Job) => void;
  onOpen: (j: Job) => void;
  onApply: (j: Job) => Promise<void> | void;
  applied: (j: Job) => boolean;
  onTailor?: (j: Job) => void;
  signedIn: boolean;
  alerts?: ReactNode;
  language: "az" | "en" | "ru";
  extra?: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [busy, setBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selected = jobs.find((j) => j.id === selectedId) || jobs[0];
  const confirm = !!selected && confirmId === selected.id;
  const setConfirm = (on: boolean) => setConfirmId(on && selected ? selected.id : "");
  const cities = useMemo(() => Array.from(new Set(all.map((j) => j.city).filter(Boolean))).sort(), [all]);
  const categories = useMemo(() => Array.from(new Set(all.map((j) => j.category).filter(Boolean))).sort(), [all]);
  const types = useMemo(() => Array.from(new Set(all.map((j) => j.type).filter(Boolean))).sort(), [all]);
  // How many vacancies a value would show, with every other filter kept.
  const countWith = (patch: Partial<typeof filters>) => {
    const f = { ...filters, ...patch };
    return all.filter(
      (j) =>
        [j.title, j.company, ...j.skills].join(" ").toLocaleLowerCase("az").includes(f.query.toLocaleLowerCase("az")) &&
        (!f.city || j.city === f.city) &&
        (!f.mode || j.mode === f.mode) &&
        (!f.category || j.category === f.category) &&
        j.ranking.score >= f.minScore &&
        j.maxSalary >= f.salary &&
        (!f.type || j.type === f.type) &&
        (!f.experience || j.minYears <= Number(f.experience)) &&
        (!f.savedOnly || saved.includes(j.id)),
    ).length;
  };
  const pick = (j: Job) => {
    // On a phone there is no room for the side panel: the full vacancy page opens.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 980px)").matches) onOpen(j);
    else setSelectedId(j.id);
  };
  const activeCount = [filters.city, filters.mode, filters.category, filters.type, filters.salary, filters.experience, filters.minScore, filters.savedOnly, filters.matchOnly].filter(Boolean).length;
  async function send(j: Job) {
    setBusy(true);
    try {
      await onApply(j);
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="jx">
      <div className="jx-search" role="search">
        <label className="jx-field jx-grow">
          <Search size={17} />
          <input aria-label="Vakansiya axtar" placeholder="Vəzifə, şirkət və ya bacarıq" value={filters.query} onChange={(e) => setFilters({ query: e.target.value })} />
          {filters.query && (
            <button type="button" aria-label="Axtarışı təmizlə" onClick={() => setFilters({ query: "" })}>
              <X size={15} />
            </button>
          )}
        </label>
        <label className="jx-field">
          <MapPin size={17} />
          <select aria-label="Şəhər" value={filters.city} onChange={(e) => setFilters({ city: e.target.value })}>
            <option value="">Bütün şəhərlər</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="jx-field">
          <Clock3 size={17} />
          <select aria-label="Məşğulluq növü" value={filters.type} onChange={(e) => setFilters({ type: e.target.value })}>
            <option value="">Məşğulluq növü</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="jx-field">
          <Building2 size={17} />
          <select aria-label="Maaş aralığı" value={filters.salary} onChange={(e) => setFilters({ salary: Number(e.target.value) })}>
            <option value={0}>Maaş aralığı</option>
            {[500, 1000, 1500, 2000, 2500].map((n) => (
              <option key={n} value={n}>
                {n}+ AZN
              </option>
            ))}
          </select>
        </label>
        <span className="jx-find">{jobs.length} vakansiya</span>
      </div>

      <div className="jx-body">
        <aside className="jx-filters" aria-label="Filtrlər">
          <button type="button" className="jx-filters-toggle" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}>
            Filtrlər{activeCount ? ` (${activeCount})` : ""}
          </button>
          <div className={filtersOpen ? "jx-filters-body open" : "jx-filters-body"}>
            <Group
              title="Məşğulluq növü"
              options={types.map((t) => ({ value: t, label: t }))}
              value={filters.type}
              onChange={(v) => setFilters({ type: String(v) })}
              count={(v) => countWith({ type: String(v) })}
            />
            <Group
              title="İş formatı"
              options={["Ofisdə", "Hibrid", "Uzaqdan"].map((t) => ({ value: t, label: t }))}
              value={filters.mode}
              onChange={(v) => setFilters({ mode: String(v) })}
              count={(v) => countWith({ mode: String(v) })}
            />
            <Group
              title="Sahə"
              options={categories.map((t) => ({ value: t, label: t }))}
              value={filters.category}
              onChange={(v) => setFilters({ category: String(v) })}
              count={(v) => countWith({ category: String(v) })}
            />
            <Group
              title="Təcrübə tələbi"
              options={[
                { value: "0", label: "Təcrübəsiz" },
                { value: "1", label: "1 ilə qədər" },
                { value: "3", label: "3 ilə qədər" },
                { value: "5", label: "5 ilə qədər" },
              ]}
              value={filters.experience}
              onChange={(v) => setFilters({ experience: String(v) })}
              count={(v) => countWith({ experience: String(v) })}
            />
            <Group
              title="Minimum maaş (AZN)"
              options={[1000, 1500, 2000, 2500].map((n) => ({ value: n, label: `${n.toLocaleString("fr-FR")}+` }))}
              value={filters.salary || ""}
              onChange={(v) => setFilters({ salary: Number(v) || 0 })}
              count={(v) => countWith({ salary: Number(v) })}
            />
            <Group
              title="AI uyğunluğu"
              options={[40, 60, 80].map((n) => ({ value: n, label: `${n}% və yuxarı` }))}
              value={filters.minScore || ""}
              onChange={(v) => setFilters({ minScore: Number(v) || 0 })}
              count={(v) => countWith({ minScore: Number(v) })}
            />
            <details className="jx-group" open>
              <summary>Digər</summary>
              <div>
                <label className="jx-check">
                  <input type="checkbox" checked={filters.savedOnly} onChange={(e) => setFilters({ savedOnly: e.target.checked })} />
                  <span>Yadda saxlananlar</span>
                  <em>{saved.length}</em>
                </label>
                <label className="jx-check" title="Profilinizə (bacarıq, təcrübə) və maaş aralığınıza uyğun vakansiyalar">
                  <input type="checkbox" checked={filters.matchOnly} onChange={(e) => setFilters({ matchOnly: e.target.checked })} />
                  <span>Yalnız mənə uyğun</span>
                </label>
              </div>
            </details>
            {alerts}
            {extra}
            <button type="button" className="jx-reset" onClick={reset}>
              Filtrləri sıfırla
            </button>
          </div>
        </aside>

        <section className="jx-list" aria-label="Vakansiyalar">
          <div className="jx-list-head">
            <strong>{jobs.length} vakansiya</strong>
            <select aria-label="Sıralama" value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value })}>
              <option value="match">Ən uyğun əvvəlcə</option>
              <option value="salary">Maaş: çoxdan aza</option>
              <option value="new">Ən yeni əvvəlcə</option>
            </select>
          </div>
          {jobs.length ? (
            jobs.map((j) => (
              <article key={j.id} className={`jx-card ${selected?.id === j.id ? "active" : ""}`}>
                <button type="button" className="jx-card-main" aria-label={`${j.title}, ${j.company}`} aria-current={selected?.id === j.id} onClick={() => pick(j)}>
                  <Mark company={j.company} />
                  <span className="jx-card-text">
                    <b>{j.title}</b>
                    <small>
                      {j.company}
                      {j.city ? ` · ${j.city}` : ""}
                    </small>
                  </span>
                </button>
                <button type="button" className={`jx-heart ${saved.includes(j.id) ? "on" : ""}`} aria-pressed={saved.includes(j.id)} aria-label={saved.includes(j.id) ? `${j.title} yaddaşdan çıxar` : `${j.title} yadda saxla`} onClick={() => onSave(j)}>
                  <Bookmark size={16} fill={saved.includes(j.id) ? "currentColor" : "none"} />
                </button>
                <div className="jx-tags">
                  {j.type && <span>{j.type}</span>}
                  {j.mode && <span>{j.mode}</span>}
                  {j.demo && <span className="warn">Nümunə</span>}
                  {j.external && <span className="warn">Xarici elan</span>}
                </div>
                <div className="jx-card-foot">
                  <strong>{money(j)}</strong>
                  <span className="jx-score">
                    <Sparkles size={11} /> {j.ranking.score}%
                  </span>
                  <small>{dayWord(j.created)}</small>
                </div>
              </article>
            ))
          ) : (
            <div className="jx-empty">
              <p>Bu filtrlərə uyğun vakansiya yoxdur.</p>
              <button type="button" className="secondary" onClick={reset}>
                Filtrləri sıfırla
              </button>
            </div>
          )}
        </section>

        {selected && (
          <article className="jx-detail" aria-label={`${selected.title} təfərrüatı`}>
            <div className="jx-banner" style={{ background: `linear-gradient(120deg, hsl(${hue(selected.company)} 45% 82%), hsl(${(hue(selected.company) + 50) % 360} 50% 90%))` }} />
            <div className="jx-detail-body">
              <div className="jx-detail-logo">
                <Mark company={selected.company} size={64} />
              </div>
              <div className="jx-detail-top">
                <div>
                  <h2>{selected.title}</h2>
                  <p>
                    <b>{selected.company}</b> {selected.companyVerified && <VerifiedBadge small />}
                    {selected.city ? ` · ${selected.city}` : ""}
                  </p>
                </div>
                <div className="jx-detail-side">
                  <button type="button" className={`jx-heart big ${saved.includes(selected.id) ? "on" : ""}`} aria-label="Yadda saxla" aria-pressed={saved.includes(selected.id)} onClick={() => onSave(selected)}>
                    <Bookmark size={18} fill={saved.includes(selected.id) ? "currentColor" : "none"} />
                  </button>
                  <small>
                    <CalendarDays size={13} /> {dayWord(selected.created) || selected.created.slice(0, 10)}
                  </small>
                </div>
              </div>

              <div className="jx-facts">
                <div>
                  <span>Təcrübə</span>
                  <b>{selected.minYears || selected.maxYears ? `${selected.minYears}–${selected.maxYears} ${language === "en" ? "years" : language === "ru" ? "лет" : "il"}` : "Göstərilməyib"}</b>
                </div>
                <div>
                  <span>İş formatı</span>
                  <b>{selected.mode || "—"}</b>
                </div>
                <div>
                  <span>Məşğulluq</span>
                  <b>{selected.type || "—"}</b>
                </div>
                <div>
                  <span>Maaş</span>
                  <b>
                    {money(selected)}
                    {selected.salaryKind ? ` (${selected.salaryKind})` : ""}
                  </b>
                </div>
              </div>

              <div className="jx-actions">
                {selected.demo && <p className="jx-note">Bu elan nümayiş üçündür. Müraciət real şirkətə göndərilmir.</p>}
                {selected.external ? (
                  <a className="primary" href={selected.external.url} target="_blank" rel="noreferrer">
                    Orijinal elana keç <ArrowUpRight size={15} />
                  </a>
                ) : confirm ? (
                  <div className="jx-confirm">
                    <span>
                      CV və əlaqə məlumatlarınız {selected.demo ? "nümunə müraciətdə saxlanacaq" : `${selected.company} ilə paylaşılacaq`}.
                    </span>
                    <button type="button" className="secondary" onClick={() => setConfirm(false)}>
                      Geri
                    </button>
                    <button type="button" className="primary" disabled={busy} onClick={() => send(selected)}>
                      {busy ? "Göndərilir..." : "Təsdiq et və göndər"}
                    </button>
                  </div>
                ) : (
                  <button type="button" className="primary" disabled={applied(selected)} onClick={() => (signedIn ? setConfirm(true) : void onApply(selected))}>
                    {applied(selected) ? "Müraciət göndərilib" : "Müraciət et"}
                  </button>
                )}
                {onTailor && (
                  <button type="button" className="secondary" onClick={() => onTailor(selected)}>
                    Bu vakansiya üçün CV
                  </button>
                )}
                <button type="button" className="secondary" onClick={() => onOpen(selected)}>
                  Tam səhifə <ArrowUpRight size={14} />
                </button>
              </div>

              <section>
                <h3>Uyğunluq</h3>
                <p className="jx-match">
                  <Sparkles size={14} /> Profilinizə {selected.ranking.score}% uyğundur
                  {"aiReason" in selected.ranking && selected.ranking.aiReason ? ` · ${String(selected.ranking.aiReason)}` : ""}
                </p>
              </section>
              <section>
                <h3>İşin təsviri</h3>
                <ul className="jx-bullets">
                  {lines(selected.description).map((l, i) => (
                    <li key={`${i}-${l}`}>{l}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Namizəddən tələb olunanlar</h3>
                <ul className="jx-bullets">
                  {lines(selected.requirements).map((l, i) => (
                    <li key={`${i}-${l}`}>{l}</li>
                  ))}
                </ul>
              </section>
              {!!selected.skills.length && (
                <section>
                  <h3>Bacarıqlar</h3>
                  <div className="jx-tags big">
                    {selected.skills.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                </section>
              )}
              {(selected.workSchedule || selected.benefits) && (
                <section>
                  <h3>İş şəraiti</h3>
                  <ul className="jx-bullets">
                    {selected.workSchedule && <li>İş qrafiki: {selected.workSchedule}</li>}
                    {selected.benefits && lines(selected.benefits).map((l, i) => <li key={`${i}-${l}`}>{l}</li>)}
                  </ul>
                </section>
              )}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
