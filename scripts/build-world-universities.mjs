// Builds public/data/world-universities.json: a compact list of the world's
// universities that are not already in the curated catalog. The source is the
// MIT-licensed Hipo/university-domains-list (see THIRD_PARTY_NOTICES.md).
//   node --experimental-strip-types scripts/build-world-universities.mjs [source.json]
// Without an argument the source is downloaded from GitHub.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { UNIVERSITIES, normalizeUniversityKey } from "../lib/university-catalog.ts";

const SOURCE = "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json";
const raw = process.argv[2]
  ? JSON.parse(readFileSync(process.argv[2], "utf8"))
  : await (await fetch(SOURCE)).json();

const known = new Set();
for (const u of UNIVERSITIES) for (const a of u.aliases) known.add(normalizeUniversityKey(a));

const seen = new Set();
const out = [];
let curated = 0;
let duplicates = 0;
for (const row of raw) {
  const name = String(row.name || "").replace(/\s+/g, " ").trim();
  const country = String(row.alpha_two_code || "").toUpperCase();
  const key = normalizeUniversityKey(name);
  if (name.length < 4 || !/^[A-Z]{2}$/.test(country) || !key) continue;
  if (known.has(key)) {
    curated++;
    continue;
  }
  const unique = `${country}|${key}`;
  if (seen.has(unique)) {
    duplicates++;
    continue;
  }
  seen.add(unique);
  out.push([name, country]);
}
out.sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/world-universities.json", import.meta.url), JSON.stringify(out));
console.log(`${out.length} written; ${curated} already curated, ${duplicates} duplicates dropped`);
