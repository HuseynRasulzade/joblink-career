// Comparing a report with the period before it: the filters of that earlier period, and the two results side by side.
export type Cell = string | number;
export type Result = { columns: string[]; rows: Cell[][]; totals?: Cell[]; note?: string };

const shiftMonth = (month: string, by: number) => {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};
const shiftDay = (day: string, by: number) => new Date(Date.parse(`${day}T00:00:00Z`) + by * 86400000).toISOString().slice(0, 10);

// The filters of the period before, or null when the report has no period to step back from.
export function previousFilters(values: Record<string, string>, types: Record<string, string>): Record<string, string> | null {
  const next = { ...values };
  let moved = false;
  for (const [id, type] of Object.entries(types)) {
    if (type === "month" && /^\d{4}-\d{2}$/.test(values[id] || "")) { next[id] = shiftMonth(values[id], -1); moved = true; }
    else if (type === "year" && /^\d{4}$/.test(values[id] || "")) { next[id] = String(Number(values[id]) - 1); moved = true; }
  }
  const from = Object.entries(types).find(([, t]) => t === "from")?.[0];
  const to = Object.entries(types).find(([, t]) => t === "to")?.[0];
  if (!moved && from && to && /^\d{4}-\d{2}-\d{2}$/.test(values[from] || "") && /^\d{4}-\d{2}-\d{2}$/.test(values[to] || "") && values[from] <= values[to]) {
    const span = Math.round((Date.parse(values[to]) - Date.parse(values[from])) / 86400000) + 1;
    next[from] = shiftDay(values[from], -span);
    next[to] = shiftDay(values[from], -1);
    moved = true;
  }
  return moved ? next : null;
}

// The numeric columns (after the first, which names the row) get «earlier» and «change» beside them; rows are matched by their first cell.
export function mergeCompare(current: Result, previous: Result, maxColumns = 4): Result {
  const numeric: number[] = [];
  for (let c = 1; c < current.columns.length && numeric.length < maxColumns; c++) if (current.rows.some((r) => typeof r[c] === "number")) numeric.push(c);
  if (!numeric.length) return current;
  const before = new Map(previous.rows.map((r) => [String(r[0]), r]));
  const round = (v: number) => Math.round(v * 100) / 100;
  const columns = [...current.columns, ...numeric.flatMap((c) => [`${current.columns[c]} (əvvəlki dövr)`, `${current.columns[c]}: dəyişiklik`])];
  const rows = current.rows.map((r) => {
    const old = before.get(String(r[0]));
    return [...r, ...numeric.flatMap((c): Cell[] => { const prev = typeof old?.[c] === "number" ? (old[c] as number) : 0; return [round(prev), round((typeof r[c] === "number" ? (r[c] as number) : 0) - prev)]; })];
  });
  const totals = current.totals && previous.totals
    ? [...current.totals, ...numeric.flatMap((c): Cell[] => { const a = current.totals?.[c], b = previous.totals?.[c]; return typeof a === "number" && typeof b === "number" ? [round(b), round(a - b)] : ["", ""]; })]
    : current.totals ? [...current.totals, ...numeric.flatMap((): Cell[] => ["", ""])] : undefined;
  return { ...current, columns, rows, totals };
}
