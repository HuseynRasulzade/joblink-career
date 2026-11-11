// A person hired through a vacancy gets the branch, department, section and position of the staff table row the vacancy was opened for.
// What the vacancy does not carry is filled from the staff table when that is unambiguous (every matching row agrees on it).
export type PlaceUnit = { branch?: string; department: string; section: string; position: string };
export type Place = { branch: string; department: string; section: string; position: string };

const key = (v: string | undefined) => (v || "").toLocaleLowerCase("az").replace(/\s+/g, " ").trim();

export function resolveStaffPlace(units: PlaceUnit[], want: Partial<Place>): Place {
  const out: Place = { branch: (want.branch || "").trim(), department: (want.department || "").trim(), section: (want.section || "").trim(), position: (want.position || "").trim() };
  const fields = ["branch", "department", "section", "position"] as const;
  const matches = units.filter((u) => fields.every((f) => !out[f] || key(u[f]) === key(out[f])));
  if (!matches.length) return out;
  for (const f of fields) {
    if (out[f]) continue;
    const values = [...new Set(matches.map((u) => (u[f] || "").trim()))];
    if (values.length === 1 && values[0]) out[f] = values[0];
  }
  return out;
}
