// The tax and insurance parameter sets the admin added (with the day each takes effect) are kept in `app_settings`; the built-in 2026 set
// stays in the code (`lib/salary.ts`). The sets are loaded at most once a minute per server instance and always after the admin saves.
import { normalizeTaxParams, setExtraTaxParams, type TaxParams } from "./salary.ts";

export const TAX_SETS_KEY = "tax_param_sets";
export const MAX_TAX_SETS = 30;
type Db = D1Database;
let loadedAt = 0;

// Reads the saved list; a set that no longer passes the checks is skipped, never breaking a calculation.
export function parseTaxSets(raw: string | null | undefined): TaxParams[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const out: TaxParams[] = [];
    for (const item of list.slice(0, MAX_TAX_SETS)) {
      try {
        out.push(normalizeTaxParams(item));
      } catch {
        // skipped
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function loadTaxParams(db: Db, force = false) {
  if (!force && Date.now() - loadedAt < 60_000) return;
  loadedAt = Date.now();
  try {
    const row = await db.prepare("SELECT value FROM app_settings WHERE key=?").bind(TAX_SETS_KEY).first<{ value: string }>();
    setExtraTaxParams(parseTaxSets(row?.value));
  } catch {
    // no saved sets (or the table is not there yet): the built-in set stays
  }
}

export async function saveTaxParams(db: Db, list: TaxParams[]) {
  const clean = list.slice(0, MAX_TAX_SETS).sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));
  await db
    .prepare("INSERT INTO app_settings(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated")
    .bind(TAX_SETS_KEY, JSON.stringify(clean), new Date().toISOString())
    .run();
  setExtraTaxParams(clean);
  loadedAt = Date.now();
  return clean;
}
