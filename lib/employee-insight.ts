// Small pure helpers for the employee section: duplicate groups, the median of a salary list, the readiness of a successor.
export type DupPerson = { id: string; name: string; email: string; startDate: string; fin: string; department: string };
export type DupGroup = { reason: string; people: DupPerson[] };

// People who look like one person: the same FİN, the same e-mail, or the same name with the same start day.
export function duplicateGroups(people: DupPerson[]): DupGroup[] {
  const lower = (v: string) => v.trim().toLocaleLowerCase("az").replace(/\s+/g, " ");
  const out: DupGroup[] = [];
  const seen = new Set<string>();
  const add = (reason: string, key: (p: DupPerson) => string) => {
    const by = new Map<string, DupPerson[]>();
    for (const p of people) {
      const k = key(p);
      if (!k) continue;
      by.set(k, [...(by.get(k) || []), p]);
    }
    for (const group of by.values()) {
      if (group.length < 2) continue;
      const signature = group.map((p) => p.id).sort().join("|");
      if (seen.has(signature)) continue;
      seen.add(signature);
      out.push({ reason, people: group });
    }
  };
  add("Eyni FİN", (p) => p.fin.trim().toUpperCase());
  add("Eyni e-poçt", (p) => lower(p.email));
  add("Eyni ad və işə başlama tarixi", (p) => (p.name && p.startDate ? `${lower(p.name)}|${p.startDate}` : ""));
  return out;
}

export function median(values: number[]): number | null {
  const list = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!list.length) return null;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : Math.round(((list[mid - 1] + list[mid]) / 2) * 100) / 100;
}

export function percentile(values: number[], p: number): number | null {
  const list = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!list.length) return null;
  const at = (list.length - 1) * p;
  const lo = Math.floor(at), hi = Math.ceil(at);
  return Math.round((list[lo] + (list[hi] - list[lo]) * (at - lo)) * 100) / 100;
}

export const READINESS: Record<string, string> = { now: "Hazırdır", year: "1 ilə hazır olar", later: "Daha uzun inkişaf lazımdır" };
