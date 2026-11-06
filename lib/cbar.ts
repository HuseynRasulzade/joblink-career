// Official daily exchange rates of the Central Bank of Azerbaijan (cbar.az): one XML bulletin per day,
// https://www.cbar.az/currencies/DD.MM.YYYY.xml. Rates are published for every calendar day.
export type CbarRate = { code: string; nominal: number; value: number; perUnit: number };
export type CbarBulletin = { date: string; rates: Record<string, CbarRate> };

export const CBAR_PAGE = "https://www.cbar.az/currency/rates";
export const cbarUrl = (isoDay: string) => `https://www.cbar.az/currencies/${isoDay.slice(8, 10)}.${isoDay.slice(5, 7)}.${isoDay.slice(0, 4)}.xml`;
const isoOf = (dmy: string) => (/^\d{2}\.\d{2}\.\d{4}$/.test(dmy) ? `${dmy.slice(6)}-${dmy.slice(3, 5)}-${dmy.slice(0, 2)}` : "");

// Reads the bulletin: the foreign currencies (not the bank metals), each with its nominal (100 for the yen and the ruble).
export function parseCbarXml(xml: string): CbarBulletin | null {
  const date = isoOf(/<ValCurs[^>]*\sDate="([^"]+)"/.exec(xml)?.[1] || "");
  const block = /<ValType Type="Xarici valyutalar">([\s\S]*?)<\/ValType>/.exec(xml)?.[1] || "";
  if (!date || !block) return null;
  const rates: Record<string, CbarRate> = {};
  for (const m of block.matchAll(/<Valute Code="([A-Z]{3})">([\s\S]*?)<\/Valute>/g)) {
    const nominal = Number(/<Nominal>\s*(\d+(?:[.,]\d+)?)/.exec(m[2])?.[1]?.replace(",", ".")) || 1;
    const value = Number(/<Value>\s*([\d.,]+)\s*<\/Value>/.exec(m[2])?.[1]?.replace(",", "."));
    if (!(value > 0) || !(nominal > 0)) continue;
    rates[m[1]] = { code: m[1], nominal, value, perUnit: Math.round((value / nominal) * 1e6) / 1e6 };
  }
  return Object.keys(rates).length ? { date, rates } : null;
}

const shiftDay = (isoDay: string, days: number) => new Date(Date.parse(`${isoDay}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const cache = new Map<string, CbarBulletin>();

// The bulletin of the day; a day with no bulletin falls back to the nearest earlier one (up to a week).
// A day that is already over never changes, so it is kept in memory.
export async function fetchCbarRates(isoDay: string, fetcher: typeof fetch = fetch, today = new Date().toISOString().slice(0, 10)): Promise<CbarBulletin | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return null;
  // The bank does not publish far ahead: a later day uses today's bulletin.
  const start = isoDay > shiftDay(today, 2) ? today : isoDay;
  for (let back = 0; back <= 7; back++) {
    const day = shiftDay(start, -back);
    const cached = cache.get(day);
    if (cached) return cached;
    try {
      const response = await fetcher(cbarUrl(day), { headers: { "User-Agent": "Mozilla/5.0 (compatible; Joblink)" }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) continue;
      const parsed = parseCbarXml(await response.text());
      if (!parsed) continue;
      if (day < today) cache.set(day, parsed);
      return parsed;
    } catch {
      // The bank site is unreachable: the caller falls back to the rates typed by hand.
      return null;
    }
  }
  return null;
}

// AZN for one unit of each currency asked for.
export const perUnitRates = (bulletin: CbarBulletin | null, codes: string[]): Record<string, number> =>
  Object.fromEntries(codes.filter((c) => bulletin?.rates[c]).map((c) => [c, (bulletin as CbarBulletin).rates[c].perUnit]));
