// Builds public/data/world-job-titles.json: the occupations of the European ESCO
// classification (v1.2.1, CC BY 4.0) as a plain array of English names (ESCO has no Russian or Turkish labels). They
// are suggestions in the title field next to the curated catalog, not matching data.
//   node --experimental-strip-types scripts/build-world-job-titles.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { canonicalJobTitle, normalizeJobTitleKey } from "../lib/job-title-catalog.ts";

const API = "https://ec.europa.eu/esco/api/search";
const PAGE = 100;
// The search endpoint is far lighter than the resource listing (about 200 KB a page).
const page = async (offset, tries = 4) => {
  const url = `${API}?${new URLSearchParams({ type: "occupation", language: "en", limit: String(PAGE), offset: String(offset), full: "false", selectedVersion: "v1.2.1" })}`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`ESCO ${r.status}`);
    return r.json();
  } catch (error) {
    if (tries <= 1) throw error;
    return page(offset, tries - 1);
  }
};

const first = await page(0);
const pages = [first];
// "offset" is the page number here, not a row offset.
for (let n = 1; n * PAGE < first.total; n++) pages.push(await page(n));
const results = pages.flatMap((p) => p._embedded?.results || []);

const clean = (s) => String(s || "").split("/")[0].replace(/\s+/g, " ").trim();
const seen = new Set();
const rows = [];
{
  for (const c of results) {
    const en = clean(c.title);
    const key = normalizeJobTitleKey(en);
    if (!en || !key || canonicalJobTitle(en) || seen.has(key)) continue;
    seen.add(key);
    rows.push(en);
  }
}
rows.sort((a, b) => a.localeCompare(b));
mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/world-job-titles.json", import.meta.url), JSON.stringify(rows));
console.log(`${rows.length} occupations (${first.total} in ESCO, the rest already in the catalog)`);
