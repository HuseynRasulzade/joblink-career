// The official per-diem norms of a business trip: Cabinet of Ministers decision of 25 January 2008, No. 14, "Ezamiyyə xərclərinin
// normaları haqqında", in the consolidated text with the changes up to 26 October 2026. The norm of one day covers the hotel
// (70 %) and the daily costs (food, city transport, communication); the fare to the place is paid on documents.
import { FOREIGN_NORMS, type ForeignNorm, type NormCurrency } from "./trip-norms-data.ts";
export { FOREIGN_NORMS, type ForeignNorm, type NormCurrency } from "./trip-norms-data.ts";

export const NORMS_SOURCE = "Azərbaycan Respublikası Nazirlər Kabinetinin 25.01.2008-ci il tarixli 14 nömrəli qərarı (26.10.2026-cı il dəyişikliklərinədək)";
export const HOTEL_SHARE = 0.7; // of the norm of one day inside the country
export const NO_RECEIPT_HOTEL_PART = 0.5; // without hotel documents half of the hotel part is paid (item 1-1)

// Inside the country, AZN a day.
export const DOMESTIC_NORMS = [
  { id: "baku", label: "Bakı şəhəri", norm: 125, names: ["baki", "baku"] },
  { id: "nakhchivan", label: "Naxçıvan şəhəri", norm: 100, names: ["naxcivan", "nakhchivan", "nakhichevan"] },
  { id: "ganja", label: "Gəncə şəhəri", norm: 95, names: ["gence", "ganja"] },
  { id: "sumgait", label: "Sumqayıt şəhəri", norm: 95, names: ["sumqayit", "sumgait"] },
] as const;
export const DOMESTIC_OTHER = 90; // other cities, district centres, towns and villages

export const CURRENCY_NAME: Record<NormCurrency, string> = { USD: "ABŞ dolları", EUR: "avro", GBP: "İngiltərə funt sterlinqi", JPY: "Yapon iyeni" };
export const fold = (value: string) =>
  String(value ?? "")
    .toLocaleLowerCase("az")
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Names people write for a country or a city of the table: English forms and places that sit in a country of the table.
const ALIASES: Record<string, string> = {
  turkey: "Türkiyə", turkiye: "Türkiyə", istanbul: "Türkiyə", ankara: "Türkiyə", antalya: "Türkiyə", izmir: "Türkiyə",
  russia: "Rusiya Federasiyası", rusiya: "Rusiya Federasiyası", moscow: "Rusiya Federasiyası", moskva: "Rusiya Federasiyası", "saint petersburg": "Rusiya Federasiyası",
  germany: "Almaniya", berlin: "Almaniya", munich: "Almaniya", frankfurt: "Almaniya",
  france: "Fransa", paris: "Fransa", italy: "İtaliya", rome: "İtaliya", roma: "İtaliya", milan: "İtaliya",
  spain: "İspaniya", madrid: "İspaniya", barcelona: "İspaniya", england: "Böyük Britaniya", uk: "Böyük Britaniya", "united kingdom": "Böyük Britaniya", london: "Böyük Britaniya",
  usa: "ABŞ", "united states": "ABŞ", america: "ABŞ", "new york": "ABŞ", washington: "ABŞ", "los angeles": "ABŞ",
  uae: "Birləşmiş Ərəb Əmirlikləri", dubai: "Birləşmiş Ərəb Əmirlikləri", dubay: "Birləşmiş Ərəb Əmirlikləri", "abu dhabi": "Birləşmiş Ərəb Əmirlikləri", emirates: "Birləşmiş Ərəb Əmirlikləri",
  georgia: "Gürcüstan", tbilisi: "Gürcüstan", batumi: "Gürcüstan", kazakhstan: "Qazaxıstan", almaty: "Qazaxıstan", astana: "Qazaxıstan",
  uzbekistan: "Özbəkistan", tashkent: "Özbəkistan", iran: "İran", tehran: "İran", tehran2: "İran", china: "Çin Xalq Respublikası", cin: "Çin Xalq Respublikası", beijing: "Çin Xalq Respublikası", shanghai: "Çin Xalq Respublikası",
  japan: "Yaponiya", tokyo: "Yaponiya", korea: "Koreya Respublikası", "south korea": "Koreya Respublikası", seoul: "Koreya Respublikası",
  india: "Hindistan", "new delhi": "Hindistan", switzerland: "İsveçrə", zurich: "İsveçrə", geneva: "İsveçrə", bern: "İsveçrə", austria: "Avstriya", vienna: "Avstriya",
  poland: "Polşa", warsaw: "Polşa", czechia: "Çexiya", "czech republic": "Çexiya", prague: "Çexiya", hungary: "Macarıstan", budapest: "Macarıstan",
  netherlands: "Niderland", amsterdam: "Niderland", belgium: "Belçika", brussels: "Belçika", sweden: "İsveç", stockholm: "İsveç", norway: "Norveç", oslo: "Norveç",
  greece: "Yunanıstan", athens: "Yunanıstan", cyprus: "Kipr", egypt: "Misir", cairo: "Misir", qatar: "Qətər", doha: "Qətər", saudi: "Səudiyyə Ərəbistanı", "saudi arabia": "Səudiyyə Ərəbistanı", riyadh: "Səudiyyə Ərəbistanı",
  israel: "İsrail", "tel aviv": "İsrail", ukraine: "Ukrayna", kyiv: "Ukrayna", kiev: "Ukrayna", belarus: "Belarus", minsk: "Belarus", malaysia: "Malayziya", singapore: "Sinqapur", thailand: "Tailand", bangkok: "Tailand",
  canada: "Kanada", mexico: "Meksika", brazil: "Braziliya", argentina: "Argentina", australia: "Avstraliya və Okeaniya", sydney: "Avstraliya və Okeaniya",
};

// English spellings of the cities that have their own figure, as the table writes them.
const CITY_FRAGMENT: Record<string, string> = {
  "new york": "nyu york", moscow: "moskva", "saint petersburg": "sankt peterburq", kyiv: "kiyev", kiev: "kiyev", tashkent: "daskend", almaty: "almati", astana: "astana",
  zurich: "surix", geneva: "cenevre", bern: "bern", riga: "riqa", vilnius: "vilnus", tallinn: "tallin", ashgabat: "asqabad", bishkek: "biskek", dushanbe: "dusenbe", london: "london", paris: "paris", istanbul: "istanbul", ankara: "ankara", tbilisi: "tbilisi", minsk: "minsk",
};
const norm = (n: ForeignNorm) => n.country;
const countryKey = new Map(FOREIGN_NORMS.map((n) => [fold(norm(n)), n]));
// "Moskva və Sankt-Peterburq şəhərləri" -> moskva, sankt peterburq
const cityKeys = FOREIGN_NORMS.flatMap((n) => n.cities.flatMap((c) => c.name.replace(/şəhərləri|şəhəri/g, "").split(/,| və /).map((part) => ({ key: fold(part), country: n, city: c }))).filter((x) => x.key));

export type NormResult =
  | { kind: "domestic"; label: string; amount: number; currency: "AZN"; hotel: number; daily: number; noReceipt: number }
  | { kind: "foreign"; label: string; amount: number; currency: NormCurrency; country: string; cityRate: boolean };

// The norm for a destination written by a person. `abroad` is the flag of the trip: a foreign country found in the text is
// foreign even when the flag is not set; a destination that is not in the table is domestic when the flag is not set.
export function lookupNorm(destination: string, abroad = false): NormResult | null {
  const text = fold(destination);
  if (!text) return null;
  const word = (key: string) => (` ${text} `).includes(` ${key} `);
  // A foreign place first, by a city of the table, a country or an alias.
  for (const c of cityKeys) {
    if (word(c.key)) return { kind: "foreign", label: `${c.country.country}, ${c.city.name}`, amount: c.city.norm, currency: c.country.currency, country: c.country.country, cityRate: true };
  }
  for (const [key, n] of countryKey) {
    if (word(key)) return { kind: "foreign", label: n.country, amount: n.norm, currency: n.currency, country: n.country, cityRate: false };
  }
  for (const [alias, country] of Object.entries(ALIASES)) {
    if (word(alias)) {
      const n = countryKey.get(fold(country));
      if (!n) continue;
      // Istanbul and Ankara have their own figure, Moscow too: look the alias up among the cities of that country.
      const fragment = CITY_FRAGMENT[alias] ?? alias;
      const own = n.cities.find((c) => fold(c.name).includes(fragment));
      return own
        ? { kind: "foreign", label: `${n.country}, ${own.name}`, amount: own.norm, currency: n.currency, country: n.country, cityRate: true }
        : { kind: "foreign", label: n.country, amount: n.norm, currency: n.currency, country: n.country, cityRate: false };
    }
  }
  if (abroad) return null;
  const home = DOMESTIC_NORMS.find((d) => d.names.some((name) => word(name)));
  const amount = home ? home.norm : DOMESTIC_OTHER;
  return { kind: "domestic", label: home ? home.label : "Digər şəhərlər, rayon mərkəzləri, qəsəbələr və kəndlər", amount, currency: "AZN", ...domesticParts(amount) };
}

// The parts of a domestic norm: the hotel share, the rest for daily costs, and what is paid without hotel documents.
export function domesticParts(amount: number) {
  const hotel = Math.round(amount * HOTEL_SHARE * 100) / 100;
  const daily = Math.round((amount - hotel) * 100) / 100;
  return { hotel, daily, noReceipt: Math.round((daily + hotel * NO_RECEIPT_HOTEL_PART) * 100) / 100 };
}

// AZN a day: a domestic norm is already in AZN; a foreign one is multiplied by the rate of its currency (the official rate of the Central Bank on the trip date).
export function azNPerDay(result: NormResult, rates: Partial<Record<NormCurrency, number>>): number | null {
  if (result.kind === "domestic") return result.amount;
  const rate = rates[result.currency];
  return rate && rate > 0 ? Math.round(result.amount * rate * 100) / 100 : null;
}
