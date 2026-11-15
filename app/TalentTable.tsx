"use client";
import { useMemo, useState, Fragment } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { Profile } from "@/lib/model";
import RowMenu, { type RowMenuItem } from "./RowMenu";

export type TalentRow = {
  id: string;
  profile: Profile;
  ranking: { score: number; matched: string[]; fit?: { band: string; bandLabel: string; strengths: string[]; risks?: string[]; gaps: string[] } } | null;
};

// Suitable candidates as a table (the same look as the applicants): who, the main skills, how well they fit; the actions are in the row's «⋮» menu.
export default function TalentTable({
  rows,
  years,
  onOpen,
  actions,
}: {
  rows: TalentRow[];
  years: (p: Profile) => number;
  onOpen: (row: TalentRow) => void;
  actions: (row: TalentRow) => RowMenuItem[];
}) {
  const [sort, setSort] = useState<{ key: "name" | "fit" | "years"; dir: 1 | -1 }>({ key: "fit", dir: -1 });
  const [open, setOpen] = useState<string[]>([]);
  const sorted = useMemo(() => {
    const value = (r: TalentRow): string | number => (sort.key === "name" ? r.profile.name.toLocaleLowerCase("az") : sort.key === "years" ? years(r.profile) : r.ranking?.score ?? 0);
    return [...rows].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);
  const head = (key: "name" | "fit" | "years", label: string) => (
    <button type="button" className="apt-sort" onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 }))} aria-label={`${label}: sırala`}>
      {label}
      {sort.key === key ? sort.dir === 1 ? <ChevronUp size={13} /> : <ChevronDown size={13} /> : <ChevronsUpDown size={13} />}
    </button>
  );
  return (
    <div className="apt-wrap">
      <table className="apt">
        <thead>
          <tr>
            <th>{head("name", "Namizəd")}</th>
            <th className="apt-date">{head("years", "Təcrübə")}</th>
            <th>Əsas bacarıqlar</th>
            <th>{head("fit", "Uyğunluq")}</th>
            <th aria-label="Əməliyyatlar" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const fit = c.ranking?.fit;
            const expanded = open.includes(c.id);
            return (
              <Fragment key={c.id}>
                <tr>
                  <td>
                    <button type="button" className="apt-person" onClick={() => onOpen(c)}>
                      <span className="apt-avatar">{c.profile.name[0]}</span>
                      <span>
                        <b>{c.profile.name}</b>
                        <small>{c.profile.title || "—"}{c.profile.code && <> · <span className="person-code">{c.profile.code}</span></>}</small>
                      </span>
                    </button>
                  </td>
                  <td className="apt-date">{years(c.profile)} il</td>
                  <td>
                    <div className="skill-tags">{(c.ranking?.matched || []).slice(0, 3).map((s) => <span className="matched" key={s}>{s}</span>)}</div>
                  </td>
                  <td className="apt-fit">
                    {c.ranking ? (
                      <button type="button" className="apt-score" onClick={() => setOpen((l) => (expanded ? l.filter((x) => x !== c.id) : [...l, c.id]))} aria-expanded={expanded} title="Səbəbləri göstər">
                        <span className="apt-bar" aria-hidden="true">
                          <i className={`band-${fit?.band || "good"}`} style={{ width: `${Math.min(100, c.ranking.score)}%` }} />
                        </span>
                        <b>{c.ranking.score}%</b>
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="apt-actions">
                    <RowMenu label={`${c.profile.name} — əməliyyatlar`} items={actions(c)} />
                  </td>
                </tr>
                {expanded && fit && (
                  <tr className="apt-detail">
                    <td colSpan={5}>
                      <div className="apt-reasons">
                        <b>{fit.bandLabel}</b>
                        {fit.strengths.slice(0, 4).map((x) => <p key={x} className="yes">✓ {x}</p>)}
                        {[...(fit.risks || []), ...fit.gaps].slice(0, 4).map((x) => <p key={x} className="risk">△ {x}</p>)}
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
