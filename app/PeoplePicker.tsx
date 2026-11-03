"use client";
import { useMemo, useState } from "react";

export type PickPerson = { id: string; name: string; department?: string; position?: string };

const fold = (v: string) => v.toLocaleLowerCase("az").replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g");
const PAGE = 100;

// A list to pick people from that stays usable with hundreds or thousands of them: search, department filter,
// "select all that match", only the chosen ones, and the list shows 100 at a time.
export default function PeoplePicker({ people, selected, onChange, height = 260, label = "İşçilər" }: { people: PickPerson[]; selected: string[]; onChange: (ids: string[]) => void; height?: number; label?: string }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [onlyChosen, setOnlyChosen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const chosen = useMemo(() => new Set(selected), [selected]);
  const departments = useMemo(() => [...new Set(people.map((p) => p.department || "").filter(Boolean))].sort((a, b) => a.localeCompare(b, "az")), [people]);
  const matches = useMemo(() => {
    const needle = fold(query.trim());
    return people.filter((p) => (!department || p.department === department) && (!onlyChosen || chosen.has(p.id)) && (!needle || fold(`${p.name} ${p.department || ""} ${p.position || ""}`).includes(needle)));
  }, [people, query, department, onlyChosen, chosen]);
  const visible = matches.slice(0, shown);
  const allMatching = matches.length > 0 && matches.every((p) => chosen.has(p.id));
  const toggle = (id: string, on: boolean) => onChange(on ? [...selected, id] : selected.filter((x) => x !== id));
  const selectMatching = () => onChange([...new Set([...selected, ...matches.map((p) => p.id)])]);
  const clearMatching = () => {
    const ids = new Set(matches.map((p) => p.id));
    onChange(selected.filter((x) => !ids.has(x)));
  };
  return (
    <div className="people-picker" role="group" aria-label={label}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <input className="search-input" style={{ flex: "1 1 220px" }} type="search" aria-label="Axtar" placeholder={`Ad, vəzifə və ya şöbə üzrə axtar (${people.length} nəfər)`} value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} />
        {departments.length > 1 && (
          <select aria-label="Departament" value={department} onChange={(e) => { setDepartment(e.target.value); setShown(PAGE); }}>
            <option value="">Bütün departamentlər</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8, fontSize: 13 }}>
        <button type="button" className="secondary" disabled={!matches.length || allMatching} onClick={selectMatching}>Siyahıdakı {matches.length} nəfəri seç</button>
        <button type="button" className="ghost" disabled={!selected.length} onClick={() => (query || department ? clearMatching() : onChange([]))}>{query || department ? "Siyahıdakıların seçimini götür" : "Seçimi təmizlə"}</button>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={onlyChosen} onChange={(e) => { setOnlyChosen(e.target.checked); setShown(PAGE); }} /> Yalnız seçilənlər</label>
        <b aria-live="polite" style={{ marginLeft: "auto" }}>{selected.length} seçilib</b>
      </div>
      <div className="admin-table-wrap" style={{ maxHeight: height, overflowY: "auto" }}>
        {visible.map((p) => (
          <label key={p.id} className="check-row" style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 6px" }}>
            <input type="checkbox" checked={chosen.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} />
            <span>{p.name}</span>
            {(p.position || p.department) && <small className="skill-description" style={{ marginLeft: "auto" }}>{[p.position, p.department].filter(Boolean).join(" · ")}</small>}
          </label>
        ))}
        {!matches.length && <p className="admin-empty">Heç kim tapılmadı.</p>}
        {matches.length > shown && <button type="button" className="text-button" onClick={() => setShown(shown + PAGE)}>Daha {Math.min(PAGE, matches.length - shown)} nəfər göstər ({matches.length - shown} qalıb)</button>}
      </div>
    </div>
  );
}
