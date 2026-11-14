"use client";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, MoreVertical } from "lucide-react";
import type { Application } from "@/lib/model";
import { formatDate } from "@/lib/dates";
import { siteLanguage } from "./i18n";
import type { ApplicantAi, ApplicantFit } from "./PipelineBoard";

export type RowAction = { label: string; icon?: ReactNode; run: (application: Application) => void; show?: (application: Application) => boolean; danger?: boolean };

// The status as a small coloured chip (the colour tells the stage at a glance).
const STATUS_TONE: Record<string, string> = {
  Göndərildi: "new",
  Baxışda: "review",
  Müsahibə: "interview",
  "Təklif edildi": "offer",
  "İşə qəbul edildi": "hired",
  "Uyğun deyil": "no",
  "Geri götürülüb": "no",
};
const AI_WORD: Record<string, string> = { interview: "Müsahibə", consider: "Nəzərə al", reject: "Uyğun deyil" };
type SortKey = "name" | "date" | "status" | "fit";

// The applicants of a vacancy as a table: who, when, in which stage, how well they fit; every action sits in the «⋮» menu of the row.
export default function ApplicantsTable({
  rows,
  fits,
  ai,
  statuses,
  withdrawn,
  disabled,
  focusId = "",
  picked,
  onPick,
  onOpen,
  onStatus,
  actions,
}: {
  rows: Application[];
  fits: Record<string, ApplicantFit>;
  ai: Record<string, ApplicantAi>;
  statuses: string[];
  withdrawn: string;
  disabled: boolean;
  focusId?: string;
  picked: string[];
  onPick: (ids: string[], on: boolean) => void;
  onOpen: (application: Application) => void;
  onStatus: (application: Application, status: string) => void;
  actions: RowAction[];
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "fit", dir: -1 });
  const [menu, setMenu] = useState("");
  const [open, setOpen] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (event: Event) => {
      if (!(event.target as HTMLElement)?.closest?.(".apt-menu, .apt-more")) setMenu("");
    };
    const key = (event: KeyboardEvent) => event.key === "Escape" && setMenu("");
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [menu]);
  const scoreOf = (a: Application) => ai[a.id]?.score ?? fits[a.id]?.score ?? 0;
  const sorted = useMemo(() => {
    const value = (a: Application): string | number =>
      sort.key === "name" ? a.profile.name.toLocaleLowerCase("az") : sort.key === "date" ? a.created : sort.key === "status" ? statuses.indexOf(a.status) : scoreOf(a);
    return [...rows].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort, fits, ai, statuses]);
  const ids = sorted.filter((a) => a.status !== withdrawn).map((a) => a.id);
  const allPicked = ids.length > 0 && ids.every((id) => picked.includes(id));
  const head = (key: SortKey, label: string) => (
    <button type="button" className="apt-sort" onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 }))} aria-label={`${label}: sırala`}>
      {label}
      {sort.key === key ? sort.dir === 1 ? <ChevronUp size={13} /> : <ChevronDown size={13} /> : <ChevronsUpDown size={13} />}
    </button>
  );
  return (
    <div className="apt-wrap" ref={box}>
      <table className="apt">
        <thead>
          <tr>
            <th className="apt-check">
              {!disabled && <input type="checkbox" checked={allPicked} onChange={(e) => onPick(ids, e.target.checked)} aria-label="Hamısını seç" />}
            </th>
            <th>{head("name", "Namizəd")}</th>
            <th className="apt-date">{head("date", "Müraciət")}</th>
            <th>{head("status", "Status")}</th>
            <th className="apt-fit">{head("fit", "Uyğunluq")}</th>
            <th aria-label="Əməliyyatlar" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => {
            const fit = fits[a.id];
            const rating = ai[a.id];
            const done = a.status === withdrawn;
            const expanded = open.includes(a.id);
            const available = actions.filter((x) => !x.show || x.show(a));
            return (
              <Fragment key={a.id}>
                <tr className={`${a.id === focusId ? "row-focus" : ""} ${done ? "apt-muted" : ""}`} ref={a.id === focusId ? (el) => el?.scrollIntoView({ block: "center" }) : undefined}>
                  <td className="apt-check">
                    {!disabled && !done && <input type="checkbox" checked={picked.includes(a.id)} onChange={(e) => onPick([a.id], e.target.checked)} aria-label={`${a.profile.name} — seç`} />}
                  </td>
                  <td>
                    <button type="button" className="apt-person" onClick={() => onOpen(a)}>
                      <span className="apt-avatar">{a.profile.name[0]}</span>
                      <span>
                        <b>{a.profile.name}</b>
                        <small>{a.profile.title || "—"}</small>
                      </span>
                    </button>
                  </td>
                  <td className="apt-date">{formatDate(a.created, siteLanguage(), { year: false })}</td>
                  <td>
                    <select
                      className={`apt-status tone-${STATUS_TONE[a.status] || "new"}`}
                      aria-label={`${a.profile.name} — status`}
                      value={a.status}
                      disabled={disabled || done}
                      onChange={(e) => onStatus(a, e.target.value)}
                    >
                      {(done ? [withdrawn] : statuses).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="apt-fit">
                    {fit ? (
                      <button type="button" className="apt-score" onClick={() => setOpen((l) => (expanded ? l.filter((x) => x !== a.id) : [...l, a.id]))} aria-expanded={expanded} title="Səbəbləri göstər">
                        <span className="apt-bar" aria-hidden="true">
                          <i className={`band-${fit.band}`} style={{ width: `${Math.min(100, fit.score)}%` }} />
                        </span>
                        <b>{fit.score}%</b>
                        {rating && <span className={`apt-ai ${rating.recommendation}`}>AI {rating.score}% · {AI_WORD[rating.recommendation] || "Nəzərə al"}</span>}
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="apt-actions">
                    <button type="button" className="apt-more" aria-label={`${a.profile.name} — əməliyyatlar`} aria-haspopup="menu" aria-expanded={menu === a.id} onClick={() => setMenu(menu === a.id ? "" : a.id)}>
                      <MoreVertical size={17} />
                    </button>
                    {menu === a.id && (
                      <div className="apt-menu" role="menu">
                        {available.map((x) => (
                          <button
                            key={x.label}
                            type="button"
                            role="menuitem"
                            className={x.danger ? "danger" : ""}
                            onClick={() => {
                              setMenu("");
                              x.run(a);
                            }}
                          >
                            {x.icon}
                            {x.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
                {expanded && fit && (
                  <tr className="apt-detail">
                    <td />
                    <td colSpan={5}>
                      <div className="apt-reasons">
                        <b>{fit.bandLabel}</b>
                        {fit.strengths.slice(0, 4).map((x) => (
                          <p key={x} className="yes">✓ {x}</p>
                        ))}
                        {fit.risks.slice(0, 4).map((x) => (
                          <p key={x} className="risk">△ {x}</p>
                        ))}
                        {rating && (
                          <div className="apt-ai-text">
                            <b>AI analizi:</b>
                            {rating.strengths && <p className="yes">✓ {rating.strengths}</p>}
                            {rating.gaps && <p className="risk">△ {rating.gaps}</p>}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
