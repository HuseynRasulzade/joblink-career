import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const VERSION = "v1.2.1";
const PAGE_SIZE = 500;
const ROWS_PER_FILE = 500;
const API = "https://ec.europa.eu/esco/api/resource/skill";
const SCHEME = "http://data.europa.eu/esco/concept-scheme/skills";
const outputDirectory = path.resolve(process.argv[2] || ".esco-import");

const normalize = (value) =>
  String(value || "")
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}+#/]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const sql = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;

async function fetchPage(offset) {
  const url = new URL(API);
  url.search = new URLSearchParams({
    isInScheme: SCHEME,
    language: "en",
    offset: String(offset),
    limit: String(PAGE_SIZE),
    selectedVersion: VERSION,
    viewObsolete: "false",
  });
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`ESCO API ${response.status}: ${await response.text()}`);
  return response.json();
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const rows = [];
const firstPage = await fetchPage(0);
const total = Number(firstPage.total) || 0;
const pageCount = Math.ceil(total / PAGE_SIZE);
const pages = [firstPage];
for (let start = 1; start < pageCount; start += 6) {
  const batch = Array.from({ length: Math.min(6, pageCount - start) }, (_, index) => start + index);
  pages.push(...await Promise.all(batch.map(fetchPage)));
  process.stdout.write(`\rFetched ${Math.min((start + batch.length) * PAGE_SIZE, total)} / ${total}`);
}
for (const page of pages) {
  for (const concept of Object.values(page._embedded || {})) {
    const label = String(concept.preferredLabel?.en || concept.title || "").trim();
    const uri = String(concept.uri || "").trim();
    if (!label || !uri) continue;
    const alternatives = Array.isArray(concept.alternativeLabel?.en)
      ? concept.alternativeLabel.en.map((value) => String(value).trim()).filter(Boolean)
      : [];
    rows.push({
      uri,
      label,
      normalizedLabel: normalize(label),
      alternatives,
      normalizedAlternatives: alternatives.map(normalize).filter(Boolean).join(" | "),
      description: String(concept.description?.en?.literal || "").trim(),
      skillType: String(concept._links?.hasSkillType?.[0]?.title || concept.skillType || "").trim(),
      reuseLevel: String(concept._links?.hasReuseLevel?.[0]?.title || concept.reuseLevel || "").trim(),
    });
  }
}

const updated = new Date().toISOString();
const manifest = {
  source: API,
  version: VERSION,
  fetchedAt: updated,
  count: rows.length,
  files: [],
};

for (let start = 0; start < rows.length; start += ROWS_PER_FILE) {
  const part = rows.slice(start, start + ROWS_PER_FILE);
  const index = Math.floor(start / ROWS_PER_FILE);
  const filename = `${String(index).padStart(3, "0")}-esco-skills.sql`;
  const statements = part.map((row) =>
    `INSERT OR REPLACE INTO esco_skills(uri,label_en,normalized_label,alternative_labels,normalized_alternatives,description_en,skill_type,reuse_level,source_version,updated) VALUES(${[
      row.uri,
      row.label,
      row.normalizedLabel,
      JSON.stringify(row.alternatives),
      row.normalizedAlternatives,
      row.description,
      row.skillType,
      row.reuseLevel,
      VERSION,
      updated,
    ].map(sql).join(",")});`,
  );
  if (index === 0) statements.unshift("DELETE FROM esco_skills;");
  await writeFile(path.join(outputDirectory, filename), `${statements.join("\n")}\n`);
  manifest.files.push(filename);
}

await writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
process.stdout.write(`\nPrepared ${rows.length} ESCO skills in ${manifest.files.length} SQL files.\n`);
