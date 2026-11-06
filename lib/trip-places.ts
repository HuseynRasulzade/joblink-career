// The places a business trip may go to, exactly as the decision of the Cabinet of Ministers of 25 January 2008, No. 14
// names them: inside the country the four cities with their own norm and "other"; abroad the countries of the table
// and the cities that have a figure of their own. The form picks from this list; the server checks the same rule.
import { DOMESTIC_NORMS, DOMESTIC_OTHER, FOREIGN_NORMS, lookupNorm } from "./trip-norms.ts";

export const OTHER_DOMESTIC = "Digər şəhər, rayon mərkəzi, qəsəbə və ya kənd";
export type PlaceOption = { value: string; label: string };

// Inside the country: a named city is written as it is; "other" needs the name of the place (Şəki, Quba…).
export const domesticPlaces = (): PlaceOption[] => [
  ...DOMESTIC_NORMS.map((d) => ({ value: d.label, label: `${d.label} (${d.norm} AZN)` })),
  { value: "", label: `${OTHER_DOMESTIC} (${DOMESTIC_OTHER} AZN)` },
];

// Abroad: every country of the table, and under it the cities with a rate of their own ("Rusiya Federasiyası, Moskva və Sankt-Peterburq şəhərləri").
export const foreignPlaces = (): PlaceOption[] =>
  FOREIGN_NORMS.flatMap((n) => [
    { value: n.country, label: `${n.country} (${n.norm} ${n.currency})` },
    ...n.cities.map((c) => ({ value: `${n.country}, ${c.name}`, label: `${n.country} — ${c.name} (${c.norm} ${n.currency})` })),
  ]);

export type DestinationCheck = { ok: true; abroad: boolean } | { ok: false; error: string };

// A foreign destination must be a country or city of the table. A place of the table written as domestic is taken as foreign;
// anything else without the foreign flag is a place inside the country (the "other" norm applies).
export function checkDestination(destination: string, abroad: boolean): DestinationCheck {
  const text = destination.trim();
  if (text.length < 2) return { ok: false, error: "Təyinat yerini seçin." };
  const found = lookupNorm(text, abroad);
  if (abroad) {
    return found && found.kind === "foreign"
      ? { ok: true, abroad: true }
      : { ok: false, error: "Xarici təyinat qanunun (Nazirlər Kabinetinin 14 nömrəli qərarı) cədvəlindəki ölkə və ya şəhərlərdən seçilməlidir." };
  }
  return { ok: true, abroad: !!found && found.kind === "foreign" };
}
