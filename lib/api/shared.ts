// Helpers of the JobMatch API that do not depend on one request (moved out of route.ts).
import { type Job, type Profile, sampleJobs, match, sampleProfile } from "@/lib/model";
import { normalizeSkills, SKILL_CATALOG, normalizeSkillKey, type SkillDefinition } from "@/lib/skill-catalog";
import { cleanOrgName } from "@/lib/org-names";
import { bestCatalogMatch } from "@/lib/job-title-match";
import { canonicalOrg } from "@/lib/staff-db";
import { normalizeRate, type PlanUnit, type PlanPerson, bandConflicts, conflictMessage, placeProblem } from "@/lib/staff-plan";
import { HttpError, str, runtime, recordAiUsage } from "@/lib/server";
import { employeePay, freeStaffPlaces } from "@/lib/payroll";
import { taxReduction } from "@/lib/employee-rights";
import { parseProfile } from "@/lib/employee-profile";
import { checkVacancyAgainstPlan } from "@/lib/vacancy-plan";
import { createXlsx } from "@/lib/xlsx";
import { WORLD_SKILLS } from "@/lib/world-skills-data";
import { mailConfigured, sendMail } from "@/lib/mail";
import { type CertificationDefinition, CERTIFICATION_CATEGORIES, detectCertifications } from "@/lib/certification-catalog";
import { type JobTitleDefinition, canonicalJobTitle } from "@/lib/job-title-catalog";
import { DOCUMENT_CHECK_PROMPT, normalizeAiCheck } from "@/lib/verification";
import { supportTopicLabel } from "@/lib/support-topics";
import { quiet } from "@/lib/quiet";
import { type PlatformDay, setPlatformCalendar, PLATFORM_KINDS } from "@/lib/calendar-az";
import { cleanErrorMessage, cleanWhere, errorFingerprint } from "@/lib/error-log";
import { type Branch, type BranchLink, type BranchRule, type BranchSales, type AllocationMode } from "@/lib/branches";

export const dynamic = "force-dynamic";

export type Row = {
  id: string;
  owner: string;
  data: string;
  status: string;
  created: string;
  job_id: string;
  candidate_id: string;
  user_id: string;
  auto: number;
};

export const normalizedJobRecord = (
  value: unknown,
  customSkills: string[] = [],
): Job => {
  void customSkills;
  const job = value as Job;
  return {
    ...job,
    skills: normalizeSkills(job?.skills, { allowCustom: true, max: 30 }),
  };
};

export const normalizedProfileRecord = (
  value: unknown,
  customSkills: string[] = [],
): Profile => {
  void customSkills;
  const profile = value as Profile;
  return {
    ...profile,
    skills: normalizeSkills(profile?.skills, { allowCustom: true, max: 50 }),
  };
};

export const OPEN_JOBS_SQL = `SELECT j.* FROM jobs j LEFT JOIN accounts a ON a.id=j.owner
  WHERE j.status='published' AND COALESCE(a.status,'active')='active'
  AND (COALESCE(json_extract(j.data,'$.deadline'),'')='' OR json_extract(j.data,'$.deadline')>=date('now'))`;

export async function verifiedCompanyIds(db: D1Database): Promise<Set<string>> {
  const rows = await db
    .prepare(
      "SELECT company_id FROM company_profiles WHERE verification_status='verified'",
    )
    .all<{ company_id: string }>()
    .catch(() => ({ results: [] as { company_id: string }[] }));
  return new Set(rows.results.map((r) => r.company_id));
}

export function publicJob(job: Job, includeStages = false): Job {
  const copy: Job = { ...job };
  delete copy.reason;
  delete copy.reasonNote;
  if (!includeStages) delete copy.stages;
  return copy;
}

export const DEMO_JOBS_WHEN_EMPTY = (realCount: number) =>
  realCount ? [] : sampleJobs;

export function ok(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export type CustomSkillRow = {
  id: string;
  label: string;
  label_en: string;
  category: string;
  category_en: string;
  aliases: string;
  created: string;
};

export type EscoSkillRow = {
  uri: string;
  label_en: string;
  normalized_label: string;
  alternative_labels: string;
  description_en: string;
  skill_type: string;
  reuse_level: string;
};

export async function readCustomSkills(db: D1Database) {
  const rows = await db
    .prepare(
      "SELECT id,label,label_en,category,category_en,aliases,created FROM custom_skills ORDER BY category,label",
    )
    .all<CustomSkillRow>();
  return rows.results.map((row) => ({
    id: `admin:${row.id}`,
    label: row.label,
    labelEn: row.label_en,
    category: row.category,
    categoryEn: row.category_en,
    aliases: (() => {
      try {
        const parsed = JSON.parse(row.aliases);
        return Array.isArray(parsed)
          ? parsed.filter((x): x is string => typeof x === "string")
          : [];
      } catch {
        return [];
      }
    })(),
    source: "admin" as const,
    created: row.created,
  }));
}

export function parsedStringArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export type PositionResult = { name: string; original: string; matched: "exact" | "close" | null; requested: "new" | "known" | null };

export async function resolvePosition(db: D1Database, companyId: string, input: string): Promise<PositionResult> {
  const original = cleanOrgName(input);
  if (!original) return { name: "", original, matched: null, requested: null };
  const match = bestCatalogMatch(original);
  const name = await canonicalOrg(db, companyId, "position", match ? match.title.label : original);
  if (match) return { name, original, matched: match.how, requested: null };
  const known = await db
    .prepare("SELECT 1 AS yes FROM support_threads WHERE topic='job-title' AND lower(subject)=lower(?) LIMIT 1")
    .bind(name)
    .first();
  if (known) return { name, original, matched: null, requested: "known" };
  const today = await db
    .prepare("SELECT COUNT(*) AS n FROM support_threads WHERE topic='job-title' AND user_id=? AND created>=datetime('now','-1 day')")
    .bind(companyId)
    .first<{ n: number }>();
  if (Number(today?.n) >= 30) return { name, original, matched: null, requested: "known" };
  await createSupportThread(db, {
    userId: companyId,
    role: "company",
    topic: "job-title",
    subject: name,
    body: `Şirkət ştat cədvəlinə kataloqda olmayan vəzifə adı əlavə edib: “${name}”. Ümumi vəzifə kataloquna əlavə edilməsi xahiş olunur.`,
    meta: { label: name, source: "staff-plan" },
  });
  return { name, original, matched: null, requested: "new" };
}

export type StaffInput = { branch?: string; department: string; section: string; position: string; planned: number; salaryCents: number; note: string; rate?: number; salaryMaxCents?: number };

export async function ensureBranch(db: D1Database, companyId: string, raw: string): Promise<string> {
  const name = String(raw || "").trim().slice(0, 120);
  if (!name) return "";
  // Compared here, not in SQL: its lower() knows no Azerbaijani İ and ı.
  const all = (await db.prepare("SELECT name FROM branches WHERE company_id=?").bind(companyId).all<{ name: string }>().catch(() => ({ results: [] as { name: string }[] }))).results;
  const found = all.find((b) => b.name.trim().toLocaleLowerCase("az") === name.toLocaleLowerCase("az"));
  if (found) return found.name;
  await db.prepare("INSERT INTO branches(id,company_id,name,code,city,active,created) VALUES(?,?,?,'','',1,?)").bind(crypto.randomUUID(), companyId, name, new Date().toISOString()).run();
  return name;
}

export async function saveStaffUnit(
  db: D1Database,
  companyId: string,
  unitId: string,
  unit: StaffInput,
) {
  const department = await canonicalOrg(db, companyId, "department", unit.department);
  unit = {
    ...unit,
    branch: await ensureBranch(db, companyId, unit.branch || ""),
    department,
    section: await canonicalOrg(db, companyId, "section", unit.section, department),
    position: (await resolvePosition(db, companyId, unit.position)).name,
  };
  const rate = normalizeRate(unit.rate ?? 1);
  const salaryMaxCents = Math.max(unit.salaryCents, Math.round(Number(unit.salaryMaxCents) || 0));
  const now = new Date().toISOString();
  if (unitId) {
    const result = await db
      .prepare("UPDATE staff_units SET branch=?,department=?,section=?,position=?,planned=?,rate=?,salary_cents=?,salary_max_cents=?,note=?,updated=? WHERE id=? AND company_id=?")
      .bind(unit.branch || "", unit.department, unit.section, unit.position, unit.planned, rate, unit.salaryCents, salaryMaxCents, unit.note, now, unitId, companyId)
      .run();
    if (!result.meta.changes) throw new HttpError(404, "Ştat sətri tapılmadı.");
    return unitId;
  }
  const count = await db.prepare("SELECT COUNT(*) AS n FROM staff_units WHERE company_id=?").bind(companyId).first<{ n: number }>();
  if (Number(count?.n) >= 1000) throw new HttpError(409, "Ştat cədvəlində ən çox 1000 sətir ola bilər.");
  const created = crypto.randomUUID();
  await db
    .prepare("INSERT INTO staff_units(id,company_id,branch,department,section,position,planned,rate,salary_cents,salary_max_cents,note,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(created, companyId, unit.branch || "", unit.department, unit.section, unit.position, unit.planned, rate, unit.salaryCents, salaryMaxCents, unit.note, now)
    .run();
  return created;
}

export async function loadPlanData(db: D1Database, companyId: string) {
  const [units, people] = await Promise.all([
    db
      .prepare("SELECT id,branch,department,section,position,planned,rate,salary_cents,salary_max_cents,note FROM staff_units WHERE company_id=? ORDER BY branch,department,section,position")
      .bind(companyId)
      .all<{ id: string; branch: string; department: string; section: string; position: string; planned: number; rate: number; salary_cents: number; salary_max_cents: number; note: string }>(),
    db
      .prepare("SELECT id,name,department,section,position,status,salary_cents,salary_type,sector,profile FROM company_employees WHERE company_id=? AND status IN ('active','leave')")
      .bind(companyId)
      .all<{ id: string; name: string; department: string; section: string; position: string; status: string; salary_cents: number; salary_type: string; sector: string; profile: string }>(),
  ]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const planUnits: (PlanUnit & { note: string })[] = units.results.map((u) => ({
    id: u.id,
    branch: u.branch || "",
    department: u.department,
    section: u.section,
    position: u.position,
    planned: u.planned,
    rate: normalizeRate(u.rate),
    salaryMin: u.salary_cents / 100,
    salaryMax: Math.max(u.salary_cents, u.salary_max_cents || 0) / 100,
    note: u.note,
  }));
  // The branches each person works in (a row of a branch takes only people of that branch).
  const linkRows = (await db.prepare("SELECT l.employee_id,b.name FROM employee_branches l JOIN branches b ON b.id=l.branch_id WHERE l.company_id=?").bind(companyId).all<{ employee_id: string; name: string }>().catch(() => ({ results: [] as { employee_id: string; name: string }[] }))).results;
  const branchesOf = new Map<string, string[]>();
  for (const l of linkRows) branchesOf.set(l.employee_id, [...(branchesOf.get(l.employee_id) || []), l.name]);
  const planPeople: (PlanPerson & { name: string })[] = people.results.map((p) => ({
    id: p.id,
    branches: branchesOf.get(p.id) || [],
    name: p.name,
    department: p.department,
    section: p.section,
    position: p.position,
    status: p.status,
    gross: p.salary_cents > 0 ? employeePay(p.salary_cents / 100, p.salary_type === "net" ? "net" : "gross", p.sector === "public" ? "public" : "private", taxReduction(parseProfile(p.profile), todayIso)).gross : 0,
  }));
  return { units: planUnits, people: planPeople };
}

export async function staffBandProblem(
  db: D1Database,
  companyId: string,
  changes: { id?: string; branch?: string; department: string; section: string; position: string; planned: number; rate?: number; salaryCents: number; salaryMaxCents?: number }[],
): Promise<string> {
  if (!changes.some((c) => c.salaryCents > 0 || (c.salaryMaxCents || 0) > 0)) return "";
  const plan = await loadPlanData(db, companyId);
  const units: PlanUnit[] = plan.units.map((u) => ({ id: u.id, branch: u.branch, department: u.department, section: u.section, position: u.position, planned: u.planned, rate: u.rate, salaryMin: u.salaryMin, salaryMax: u.salaryMax }));
  const same = (a: string, b: string) => a.trim().toLocaleLowerCase("az") === b.trim().toLocaleLowerCase("az");
  const touched = new Set<string>();
  changes.forEach((c, index) => {
    const position = bestCatalogMatch(c.position)?.title.label || c.position;
    const existing = units.find((u) => (c.id && u.id === c.id) || (!c.id && same(u.branch || "", c.branch || "") && same(u.department, c.department) && same(u.section, c.section) && same(u.position, position)));
    const next: PlanUnit = {
      id: existing?.id || `new-${index}`,
      branch: c.branch || "",
      department: c.department,
      section: c.section,
      position,
      planned: c.planned,
      rate: normalizeRate(c.rate ?? 1),
      salaryMin: c.salaryCents / 100,
      salaryMax: Math.max(c.salaryCents, c.salaryMaxCents || 0) / 100,
    };
    if (existing) Object.assign(existing, next);
    else units.push(next);
    touched.add(next.id);
  });
  const found = bandConflicts(units, plan.people).filter((c) => touched.has(c.unit.id));
  return found.length ? conflictMessage(found) : "";
}

export async function setPlanStatus(db: D1Database, companyId: string, status: "draft" | "pending" | "approved") {
  await db
    .prepare("INSERT INTO staff_plan_state(company_id,status,updated) VALUES(?,?,?) ON CONFLICT(company_id) DO UPDATE SET status=excluded.status,updated=excluded.updated")
    .bind(companyId, status, new Date().toISOString())
    .run();
}

export async function applyStaffRows(db: D1Database, companyId: string, rows: StaffInput[]) {
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const department = await canonicalOrg(db, companyId, "department", row.department);
    const section = await canonicalOrg(db, companyId, "section", row.section, department);
    const position = (await resolvePosition(db, companyId, row.position)).name;
    const branch = await ensureBranch(db, companyId, row.branch || "");
    const found = await db
      .prepare("SELECT id FROM staff_units WHERE company_id=? AND lower(branch)=lower(?) AND lower(department)=lower(?) AND lower(section)=lower(?) AND lower(position)=lower(?)")
      .bind(companyId, branch, department, section, position)
      .first<{ id: string }>();
    await saveStaffUnit(db, companyId, found?.id || "", { ...row, branch, department, section, position });
    if (found) updated++;
    else created++;
  }
  return { created, updated };
}

export async function absorbLegacyHeadcount(db: D1Database, companyId: string) {
  const legacy = await db
    .prepare("SELECT department,planned FROM headcount_plan WHERE company_id=?")
    .bind(companyId)
    .all<{ department: string; planned: number }>()
    .catch(() => ({ results: [] as { department: string; planned: number }[] }));
  for (const row of legacy.results) {
    const has = await db
      .prepare("SELECT 1 AS yes FROM staff_units WHERE company_id=? AND lower(department)=lower(?)")
      .bind(companyId, row.department)
      .first();
    if (!has) await saveStaffUnit(db, companyId, "", { department: row.department, section: "", position: "", planned: row.planned, salaryCents: 0, note: "" });
    await db.prepare("DELETE FROM headcount_plan WHERE company_id=? AND department=?").bind(companyId, row.department).run();
  }
}

export async function setDepartmentPlan(db: D1Database, companyId: string, department: string, planned: number | null) {
  const units = await db
    .prepare("SELECT id FROM staff_units WHERE company_id=? AND lower(department)=lower(?)")
    .bind(companyId, department)
    .all<{ id: string }>();
  if (units.results.length > 1)
    throw new HttpError(409, `“${department}” departamentinin ${units.results.length} ştat sətri var. Dəyişikliyi ştat cədvəlində edin.`);
  if (planned === null) {
    if (units.results[0]) await db.prepare("DELETE FROM staff_units WHERE id=? AND company_id=?").bind(units.results[0].id, companyId).run();
    return;
  }
  if (units.results[0]) {
    await db.prepare("UPDATE staff_units SET planned=?,updated=? WHERE id=? AND company_id=?").bind(planned, new Date().toISOString(), units.results[0].id, companyId).run();
    return;
  }
  await saveStaffUnit(db, companyId, "", { department, section: "", position: "", planned, salaryCents: 0, note: "" });
}

export async function staffPlaces(db: D1Database, companyId: string, department: string) {
  const [units, people, open] = await Promise.all([
    db
      .prepare("SELECT id,department,section,position,planned FROM staff_units WHERE company_id=?")
      .bind(companyId)
      .all<{ id: string; department: string; section: string; position: string; planned: number }>(),
    db
      .prepare("SELECT department,section,position,status FROM company_employees WHERE company_id=? AND status IN ('active','leave')")
      .bind(companyId)
      .all<{ department: string; section: string; position: string; status: string }>(),
    db
      .prepare("SELECT COUNT(*) AS n FROM jobs WHERE owner=? AND status IN ('published','pending_approval') AND lower(COALESCE(json_extract(data,'$.department'),''))=lower(?)")
      .bind(companyId, department)
      .first<{ n: number }>(),
  ]);
  return freeStaffPlaces(units.results, people.results, Number(open?.n) || 0, department);
}

// Taking on a person needs a free place in the staff table (see placeProblem); throws 409 when the position is full.
export async function assertStaffPlace(db: D1Database, companyId: string, person: { branch?: string; department: string; section?: string; position: string }, reserved: PlanPerson[] = []) {
  const plan = await loadPlanData(db, companyId);
  const problem = placeProblem(plan.units, [...plan.people, ...reserved], { id: "", department: person.department || "", section: person.section || "", position: person.position || "", branches: person.branch ? [person.branch] : undefined });
  if (problem) throw new HttpError(409, problem);
}

export async function assertVacancyPlan(db: D1Database, companyId: string, job: { id?: string; branch?: string; reason?: string; department?: string; section?: string; title?: string; minSalary?: number; maxSalary?: number; salaryKind?: string }) {
  const [plan, openRows] = await Promise.all([
    loadPlanData(db, companyId),
    db
      .prepare("SELECT id,data FROM jobs WHERE owner=? AND status IN ('published','pending_approval')")
      .bind(companyId)
      .all<{ id: string; data: string }>(),
  ]);
  const open = openRows.results
    .filter((r) => r.id !== job.id)
    .map((r) => {
      try {
        const d = JSON.parse(r.data) as { branch?: string; department?: string; section?: string; title?: string; reason?: string };
        return { branch: String(d.branch || ""), department: String(d.department || ""), section: String(d.section || ""), title: String(d.title || ""), reason: String(d.reason || "") };
      } catch {
        return { department: "", section: "", title: "" };
      }
    });
  const canon = (position: string) => bestCatalogMatch(position)?.title.label || position;
  const toGross = (amount: number, kind: string) => (kind === "net" ? employeePay(amount, "net", "private", 0)?.gross || amount : amount);
  const result = checkVacancyAgainstPlan(
    plan.units.map((u) => ({ id: u.id, branch: u.branch, department: u.department, section: u.section, position: u.position, planned: u.planned, rate: u.rate, salaryMin: u.salaryMin, salaryMax: u.salaryMax })),
    plan.people,
    open,
    { branch: String(job.branch || "").trim(), department: String(job.department || ""), section: String(job.section || ""), title: String(job.title || ""), reason: String(job.reason || ""), minSalary: Number(job.minSalary) || 0, maxSalary: Number(job.maxSalary) || 0, salaryKind: String(job.salaryKind || "") },
    canon,
    toGross,
  );
  if (!result.ok) throw new HttpError(409, result.message);
}

export function escoSkillDefinition(row: EscoSkillRow) {
  return {
    id: `esco:${row.uri.split("/").pop() || row.uri}`,
    uri: row.uri,
    label: row.label_en,
    labelEn: row.label_en,
    category: "ESCO",
    categoryEn: "ESCO",
    aliases: parsedStringArray(row.alternative_labels),
    description: row.description_en,
    skillType: row.skill_type,
    reuseLevel: row.reuse_level,
    source: "esco" as const,
  };
}

export type SkillSectionDimension = "curated" | "skillType" | "reuseLevel";

export type SkillSection = {
  key: string;
  dimension: SkillSectionDimension;
  value: string;
  label: string;
  labelEn: string;
  count: number;
  source: "joblink" | "esco";
};

export const escoSectionLabels: Record<string, { az: string; en: string }> = {
  skill: { az: "Peşəkar bacarıqlar", en: "Skills and competences" },
  knowledge: { az: "Bilik sahələri", en: "Knowledge" },
  "transversal skills and competences": {
    az: "Transversal bacarıqlar",
    en: "Transversal skills and competences",
  },
  "cross-sector skills and competences": {
    az: "Sektorlararası bacarıqlar",
    en: "Cross-sector skills and competences",
  },
  "sector-specific skills and competences": {
    az: "Sektora xas bacarıqlar",
    en: "Sector-specific skills and competences",
  },
  "sector specific skills and competences": {
    az: "Sektora xas bacarıqlar",
    en: "Sector-specific skills and competences",
  },
  "occupation-specific skills and competences": {
    az: "Peşəyə xas bacarıqlar",
    en: "Occupation-specific skills and competences",
  },
  "occupation specific skills and competences": {
    az: "Peşəyə xas bacarıqlar",
    en: "Occupation-specific skills and competences",
  },
  unclassified: { az: "Təsnif edilməyən", en: "Unclassified" },
};

export function escoSectionLabel(value: string) {
  return escoSectionLabels[value] || { az: value, en: value };
}

export async function readSkillSections(
  db: D1Database,
  customSkills: Awaited<ReturnType<typeof readCustomSkills>>,
) {
  const curated = [
    ...SKILL_CATALOG.map((skill) => ({ ...skill, source: "system" as const })),
    ...customSkills,
  ];
  const curatedGroups = new Map<string, SkillSection>();
  for (const skill of curated) {
    const key = skill.category;
    const existing = curatedGroups.get(key);
    if (existing) existing.count += 1;
    else
      curatedGroups.set(key, {
        key: `curated:${key}`,
        dimension: "curated",
        value: key,
        label: key,
        labelEn: skill.categoryEn || key,
        count: 1,
        source: "joblink",
      });
  }
  const escoGroups = await db
    .prepare(
      `SELECT 'skillType' AS dimension,
      CASE WHEN skill_type='' THEN 'unclassified' ELSE skill_type END AS value,COUNT(*) AS count
    FROM esco_skills GROUP BY CASE WHEN skill_type='' THEN 'unclassified' ELSE skill_type END
    UNION ALL
    SELECT 'reuseLevel' AS dimension,
      CASE WHEN reuse_level='' THEN 'unclassified' ELSE reuse_level END AS value,COUNT(*) AS count
    FROM esco_skills GROUP BY CASE WHEN reuse_level='' THEN 'unclassified' ELSE reuse_level END`,
    )
    .all<{
      dimension: "skillType" | "reuseLevel";
      value: string;
      count: number;
    }>();
  const sections: SkillSection[] = [...curatedGroups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "az"),
  );
  for (const group of escoGroups.results) {
    const labels = escoSectionLabel(group.value);
    sections.push({
      key: `${group.dimension}:${group.value}`,
      dimension: group.dimension,
      value: group.value,
      label: labels.az,
      labelEn: labels.en,
      count: Number(group.count) || 0,
      source: "esco",
    });
  }
  return sections;
}

export function skillCatalogScope(url: URL) {
  const dimensionValue = url.searchParams.get("dimension");
  const dimension: SkillSectionDimension =
    dimensionValue === "skillType" || dimensionValue === "reuseLevel"
      ? dimensionValue
      : "curated";
  return {
    dimension,
    value: str(url.searchParams.get("value"), 120),
    query: normalizeSkillKey(str(url.searchParams.get("q"), 70)),
    page: Math.max(1, Math.min(500, Number(url.searchParams.get("page")) || 1)),
  };
}

export async function readCatalogSection(
  db: D1Database,
  customSkills: Awaited<ReturnType<typeof readCustomSkills>>,
  scope: ReturnType<typeof skillCatalogScope>,
  perPage = 100,
) {
  if (scope.dimension === "curated") {
    const needle = scope.query;
    const all = [
      ...SKILL_CATALOG.map((skill) => ({
        ...skill,
        source: "system" as const,
      })),
      ...customSkills,
    ]
      .filter((skill) => !scope.value || skill.category === scope.value)
      .filter(
        (skill) =>
          !needle ||
          [
            skill.label,
            skill.labelEn,
            skill.category,
            skill.categoryEn,
            ...skill.aliases,
          ].some((value) => normalizeSkillKey(value).includes(needle)),
      );
    const start = (scope.page - 1) * perPage;
    return { skills: all.slice(start, start + perPage), total: all.length };
  }
  const column = scope.dimension === "skillType" ? "skill_type" : "reuse_level";
  const value = scope.value === "unclassified" ? "" : scope.value;
  const where = [`${column}=?`];
  const bindings: Array<string | number> = [value];
  if (scope.query) {
    const escaped = scope.query.replace(/[\\%_]/g, "\\$&");
    where.push(
      `(normalized_label LIKE ? ESCAPE '\\' OR normalized_alternatives LIKE ? ESCAPE '\\')`,
    );
    bindings.push(`%${escaped}%`, `%${escaped}%`);
  }
  const condition = where.join(" AND ");
  const count = await db
    .prepare(`SELECT COUNT(*) AS count FROM esco_skills WHERE ${condition}`)
    .bind(...bindings)
    .first<{ count: number }>();
  const rows = await db
    .prepare(
      `SELECT uri,label_en,normalized_label,alternative_labels,description_en,skill_type,reuse_level
    FROM esco_skills WHERE ${condition} ORDER BY label_en LIMIT ? OFFSET ?`,
    )
    .bind(...bindings, perPage, (scope.page - 1) * perPage)
    .all<EscoSkillRow>();
  return {
    skills: rows.results.map(escoSkillDefinition),
    total: Number(count?.count) || 0,
  };
}

export async function exportSkillCatalog(
  db: D1Database,
  customSkills: Awaited<ReturnType<typeof readCustomSkills>>,
  scope: ReturnType<typeof skillCatalogScope>,
  exportAll: boolean,
) {
  const curated = [
    ...SKILL_CATALOG.map((skill) => ({ ...skill, source: "system" as const })),
    ...customSkills,
  ].filter(
    (skill) =>
      exportAll ||
      (scope.dimension === "curated" &&
        (!scope.value || skill.category === scope.value)),
  );
  let esco: ReturnType<typeof escoSkillDefinition>[] = [];
  if (exportAll || scope.dimension !== "curated") {
    const column =
      scope.dimension === "skillType" ? "skill_type" : "reuse_level";
    const value = scope.value === "unclassified" ? "" : scope.value;
    const where = exportAll ? "" : `WHERE ${column}=?`;
    const statement =
      db.prepare(`SELECT uri,label_en,normalized_label,alternative_labels,description_en,skill_type,reuse_level
      FROM esco_skills ${where} ORDER BY label_en`);
    const rows = exportAll
      ? await statement.all<EscoSkillRow>()
      : await statement.bind(value).all<EscoSkillRow>();
    esco = rows.results.map(escoSkillDefinition);
  }
  const rows = [
    ...curated.map((skill) => [
      skill.label,
      skill.labelEn,
      skill.category,
      "",
      "",
      skill.source === "admin" ? "Admin" : "JobMatch",
      skill.aliases.join("; "),
      "",
    ]),
    ...esco.map((skill) => [
      skill.label,
      skill.labelEn,
      escoSectionLabel(skill.reuseLevel || skill.skillType || "unclassified")
        .az,
      skill.skillType,
      skill.reuseLevel,
      "ESCO",
      skill.aliases.join("; "),
      skill.uri,
    ]),
  ];
  return createXlsx(
    [
      "Bacarıq",
      "English",
      "Bölmə",
      "Bacarıq növü",
      "İstifadə səviyyəsi",
      "Mənbə",
      "Sinonimlər",
      "ESCO URI",
    ],
    rows,
    "Bacarıqlar",
  );
}

export async function searchEscoSkills(db: D1Database, rawQuery: string, limit = 12) {
  const query = normalizeSkillKey(rawQuery).slice(0, 70);
  if (query.length < 2) return [];
  const escaped = query.replace(/[\\%_]/g, "\\$&");
  const contains = `%${escaped}%`;
  const prefix = `${escaped}%`;
  const rows = await db
    .prepare(
      `SELECT uri,label_en,normalized_label,alternative_labels,description_en,skill_type,reuse_level
    FROM esco_skills
    WHERE normalized_label LIKE ? ESCAPE '\\' OR normalized_alternatives LIKE ? ESCAPE '\\'
    ORDER BY CASE WHEN normalized_label=? THEN 0 WHEN normalized_label LIKE ? ESCAPE '\\' THEN 1 ELSE 2 END,label_en
    LIMIT ?`,
    )
    .bind(contains, contains, query, prefix, Math.max(1, Math.min(20, limit)))
    .all<EscoSkillRow>();
  return [
    ...rows.results.map(escoSkillDefinition),
    ...searchWorldSkills(query, 6),
  ].slice(0, Math.max(1, Math.min(20, limit)) + 6);
}

export const worldSkillKeys = new Map<string, string>();

export function worldSkillIndex() {
  if (!worldSkillKeys.size)
    for (const name of WORLD_SKILLS) worldSkillKeys.set(normalizeSkillKey(name), name);
  return worldSkillKeys;
}

export function searchWorldSkills(query: string, limit: number) {
  if (query.length < 2) return [];
  const found: { name: string; rank: number }[] = [];
  for (const [key, name] of worldSkillIndex()) {
    const rank = key === query ? 0 : key.startsWith(query) ? 1 : key.split(" ").some((w) => w.startsWith(query)) ? 2 : query.length >= 3 && key.includes(query) ? 3 : 9;
    if (rank < 9) found.push({ name, rank });
  }
  return found
    .sort((a, b) => a.rank - b.rank || a.name.length - b.name.length)
    .slice(0, limit)
    .map(({ name }) => ({
      id: `esco:onet-${normalizeSkillKey(name).replace(/[^a-z0-9]+/g, "-")}`,
      uri: "",
      label: name,
      labelEn: name,
      category: "O*NET",
      categoryEn: "O*NET",
      aliases: [] as string[],
      description: "",
      skillType: "",
      reuseLevel: "",
      source: "esco" as const,
    }));
}

export async function allowedEscoLabels(db: D1Database, values: unknown) {
  const input = (Array.isArray(values) ? values : [])
    .filter((value): value is string => typeof value === "string")
    .slice(0, 50);
  const keys = [...new Set(input.map(normalizeSkillKey).filter(Boolean))];
  if (!keys.length) return [];
  const placeholders = keys.map(() => "?").join(",");
  const rows = await db
    .prepare(
      `SELECT label_en FROM esco_skills WHERE normalized_label IN (${placeholders})`,
    )
    .bind(...keys)
    .all<{ label_en: string }>();
  const world = worldSkillIndex();
  return [
    ...rows.results.map((row) => row.label_en),
    ...keys.flatMap((key) => (world.has(key) ? [world.get(key)!] : [])),
  ];
}

export type AnySkill =
  | ReturnType<typeof escoSkillDefinition>
  | (SkillDefinition & { source: "system" | "admin" });

export function editDistance(left: string, right: string) {
  const a = normalizeSkillKey(left);
  const b = normalizeSkillKey(right);
  if (!a) return b.length;
  if (!b) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

export function similarityScore(query: string, skill: AnySkill) {
  const needle = normalizeSkillKey(query);
  const values = [skill.label, skill.labelEn, ...skill.aliases]
    .map(normalizeSkillKey)
    .filter(Boolean);
  return Math.max(
    ...values.map((value) => {
      if (value === needle) return 1;
      if (value.includes(needle) || needle.includes(value)) return 0.92;
      return (
        1 -
        editDistance(needle, value) / Math.max(needle.length, value.length, 1)
      );
    }),
  );
}

export async function findExistingSkill(
  db: D1Database,
  customSkills: Awaited<ReturnType<typeof readCustomSkills>>,
  values: string[],
) {
  const keys = [...new Set(values.map(normalizeSkillKey).filter(Boolean))];
  const curated: AnySkill[] = [
    ...SKILL_CATALOG.map((skill) => ({ ...skill, source: "system" as const })),
    ...customSkills,
  ];
  const local = curated.find((skill) =>
    [skill.label, skill.labelEn, ...skill.aliases].some((value) =>
      keys.includes(normalizeSkillKey(value)),
    ),
  );
  if (local) return local;
  for (const key of keys.slice(0, 8)) {
    const row = await db
      .prepare(
        `SELECT uri,label_en,normalized_label,alternative_labels,description_en,skill_type,reuse_level
      FROM esco_skills WHERE normalized_label=? OR (' | ' || normalized_alternatives || ' | ') LIKE ? LIMIT 1`,
      )
      .bind(key, `% | ${key} | %`)
      .first<EscoSkillRow>();
    if (row) return escoSkillDefinition(row);
  }
  return null;
}

export async function similarSkillCandidates(
  db: D1Database,
  customSkills: Awaited<ReturnType<typeof readCustomSkills>>,
  query: string,
) {
  const local: AnySkill[] = [
    ...SKILL_CATALOG.map((skill) => ({ ...skill, source: "system" as const })),
    ...customSkills,
  ];
  const tokens = normalizeSkillKey(query)
    .split(" ")
    .filter((token) => token.length >= 2)
    .slice(0, 4);
  let esco: AnySkill[] = [];
  if (tokens.length) {
    const clauses = tokens
      .map(() => "(normalized_label LIKE ? OR normalized_alternatives LIKE ?)")
      .join(" OR ");
    const bindings = tokens.flatMap((token) => {
      const fragment = token
        .slice(0, Math.min(4, token.length))
        .replace(/[\\%_]/g, "\\$&");
      return [`%${fragment}%`, `%${fragment}%`];
    });
    const rows = await db
      .prepare(
        `SELECT uri,label_en,normalized_label,alternative_labels,description_en,skill_type,reuse_level
      FROM esco_skills WHERE ${clauses} LIMIT 80`,
      )
      .bind(...bindings)
      .all<EscoSkillRow>();
    esco = rows.results.map(escoSkillDefinition);
  }
  return [...local, ...esco]
    .map((skill) => ({ skill, score: similarityScore(query, skill) }))
    .filter((entry) => entry.score >= 0.34)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map((entry) => entry.skill);
}

export async function notifyAdminOfSkillRequest(
  db: D1Database,
  requestId: string,
  details: {
    input: string;
    label: string;
    labelEn: string;
    category: string;
    role: string;
    userEmail: string;
  },
) {
  const settings = runtime();
  const recipient = settings.ADMIN_EMAIL || "ec.alizade99@gmail.com";
  if (!mailConfigured(settings)) return "queued";
  try {
    const text = [
      "JobMatch kataloquna yeni bacarıq əlavə edildi.",
      `Təklif: ${details.input}`,
      `Kataloq adı: ${details.label} / ${details.labelEn}`,
      `Kateqoriya: ${details.category}`,
      `İstifadəçi rolu: ${details.role}`,
      `İstifadəçi: ${details.userEmail || "göstərilməyib"}`,
    ].join("\n");
    await sendMail(settings, {
      to: recipient,
      subject: `Yeni bacarıq: ${details.label}`,
      text,
    });
    await db
      .prepare(
        "UPDATE skill_requests SET email_status='sent',email_error='' WHERE id=?",
      )
      .bind(requestId)
      .run();
    return "sent";
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 300)
        : "Email sending failed";
    await db
      .prepare(
        "UPDATE skill_requests SET email_status='failed',email_error=? WHERE id=?",
      )
      .bind(message, requestId)
      .run();
    return "failed";
  }
}

export type CustomCertificationRow = {
  id: string;
  name: string;
  issuer: string;
  category: string;
  aliases: string;
  skills: string;
  levels: string;
  created: string;
};

export async function readCustomCertifications(
  db: D1Database,
): Promise<CertificationDefinition[]> {
  try {
    const rows = await db
      .prepare(
        "SELECT id,name,issuer,category,aliases,skills,levels,created FROM custom_certifications ORDER BY category,name",
      )
      .all<CustomCertificationRow>();
    return rows.results.map((row) => {
      const levels = parsedStringArray(row.levels);
      return {
        id: `admin:${row.id}`,
        name: row.name,
        issuer: row.issuer,
        category: row.category,
        categoryEn: CERTIFICATION_CATEGORIES[row.category] || row.category,
        aliases: [row.name, ...parsedStringArray(row.aliases)],
        skills: parsedStringArray(row.skills),
        ...(levels.length ? { levels } : {}),
      };
    });
  } catch {
    // Table not migrated yet: only the static catalog is available.
    return [];
  }
}

export async function readCustomJobTitles(
  db: D1Database,
): Promise<JobTitleDefinition[]> {
  try {
    const rows = await db
      .prepare(
        "SELECT id,label,label_en,family,aliases FROM custom_job_titles ORDER BY label",
      )
      .all<{
        id: string;
        label: string;
        label_en: string;
        family: string;
        aliases: string;
      }>();
    return rows.results.map((row) => ({
      id: `admin:${row.id}`,
      label: row.label,
      labelEn: row.label_en,
      family: row.family,
      aliases: [row.label, row.label_en, ...parsedStringArray(row.aliases)],
    }));
  } catch {
    return [];
  }
}

export async function aiDocumentCheck(
  doc: { name: string; type: string; data: string },
  claim: string,
) {
  const settings = runtime();
  if (!settings.OPENAI_API_KEY) return null;
  const content =
    doc.type === "application/pdf"
      ? {
          type: "input_file",
          filename: doc.name || "document.pdf",
          file_data: `data:application/pdf;base64,${doc.data}`,
        }
      : {
          type: "input_image",
          image_url: `data:${doc.type};base64,${doc.data}`,
          detail: "high",
        };
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: settings.OPENAI_MODEL || "gpt-5.2",
        instructions: DOCUMENT_CHECK_PROMPT,
        input: [
          {
            role: "user",
            content: [
              content,
              {
                type: "input_text",
                text: `Return the json object. CLAIM:\n${claim}`,
              },
            ],
          },
        ],
        store: false,
        max_output_tokens: 2000,
      }),
      signal: AbortSignal.timeout(90000),
    });
    await recordAiUsage({
      feature: "doc-check",
      provider: "openai",
      user: "",
      charsIn: claim.length + 2000,
      charsOut: 0,
      error: !response.ok,
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      output?: { content?: { type: string; text?: string }[] }[];
    };
    const text =
      body.output
        ?.flatMap((item) => item.content || [])
        .filter((item) => item.type === "output_text")
        .map((item) => item.text)
        .join("\n") || "";
    return normalizeAiCheck(
      JSON.parse(
        text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim(),
      ),
    );
  } catch {
    return null;
  }
}

export async function sendAdminEmail(subject: string, text: string) {
  const settings = runtime();
  if (!mailConfigured(settings)) return "queued";
  try {
    await sendMail(settings, {
      to: settings.ADMIN_EMAIL || "ec.alizade99@gmail.com",
      subject,
      text,
    });
    return "sent";
  } catch {
    return "failed";
  }
}

export async function createSupportThread(
  db: D1Database,
  input: {
    userId: string;
    role: string;
    topic: string;
    subject: string;
    body: string;
    meta?: Record<string, unknown>;
    attachment?: { name: string; type: string; data: string };
  },
) {
  const threadId = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        "INSERT INTO support_threads(id,user_id,user_role,topic,subject,status,meta,created,updated) VALUES(?,?,?,?,?,'new',?,?,?)",
      )
      .bind(
        threadId,
        input.userId,
        input.role,
        input.topic,
        input.subject,
        JSON.stringify(input.meta || {}),
        now,
        now,
      ),
    db
      .prepare(
        "INSERT INTO support_messages(id,thread_id,author_id,author_role,body,attachment_name,attachment_type,attachment_data,created) VALUES(?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        threadId,
        input.userId,
        input.role,
        input.body,
        input.attachment?.name || "",
        input.attachment?.type || "",
        input.attachment?.data || "",
        now,
      ),
  ]);
  await sendAdminEmail(
    `JobMatch sorğusu: ${supportTopicLabel(input.topic)} — ${input.subject}`,
    [
      `Mövzu: ${supportTopicLabel(input.topic)}`,
      `Rol: ${input.role}`,
      `Başlıq: ${input.subject}`,
      "",
      input.body,
    ].join("\n"),
  );
  return threadId;
}

export async function createConversation(
  db: D1Database,
  input: {
    userId: string;
    role: string;
    title: string;
    contextType: string;
    contextId: string;
  },
) {
  const now = new Date().toISOString();
  const conversation = {
    id: crypto.randomUUID(),
    title: input.title || "Yeni söhbət",
    context_id: input.contextId,
  };
  await db
    .prepare(
      "INSERT INTO ai_conversations(id,user_id,role,title,context_type,context_id,created,updated) VALUES(?,?,?,?,?,?,?,?)",
    )
    .bind(
      conversation.id,
      input.userId,
      input.role,
      conversation.title,
      input.contextType,
      input.contextId,
      now,
      now,
    )
    .run();
  return conversation;
}

export async function saveConversationTurn(
  db: D1Database,
  conversationId: string,
  userText: string,
  assistantText: string,
  data: Record<string, unknown>,
) {
  const now = new Date();
  const later = new Date(now.getTime() + 1).toISOString();
  await db.batch([
    db
      .prepare(
        "INSERT INTO ai_messages(id,conversation_id,author,content,data,created) VALUES(?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        conversationId,
        "user",
        userText.slice(0, 5000),
        "{}",
        now.toISOString(),
      ),
    db
      .prepare(
        "INSERT INTO ai_messages(id,conversation_id,author,content,data,created) VALUES(?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        conversationId,
        "assistant",
        assistantText.slice(0, 8000),
        JSON.stringify(data),
        later,
      ),
    db
      .prepare("UPDATE ai_conversations SET updated=? WHERE id=?")
      .bind(later, conversationId),
  ]);
}

try {
  match(sampleProfile, sampleJobs[0]);
  detectCertifications("ACCA, IELTS 7.0, PMP warm-up");
  canonicalJobTitle("Baş mühasib");
} catch (error) {
  // Warming up is only an optimisation.
  quiet("route-catch", error);
}

export const PLATFORM_CALENDAR_KEY = "platform-calendar";

export let platformCalendarLoaded = 0;

export async function loadPlatformCalendar(db: D1Database, force = false) {
  if (!force && Date.now() - platformCalendarLoaded < 60_000) return;
  const row = await db.prepare("SELECT value FROM app_settings WHERE key=?").bind(PLATFORM_CALENDAR_KEY).first<{ value: string }>().catch(() => null);
  let list: PlatformDay[] = [];
  try {
    list = row ? (JSON.parse(row.value) as PlatformDay[]) : [];
  } catch {
    list = [];
  }
  setPlatformCalendar(list.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day) && (PLATFORM_KINDS as readonly string[]).includes(d.kind)));
  platformCalendarLoaded = Date.now();
}

export let sharedListsAt = 0;

export let sharedListsCache: { customSkills: Awaited<ReturnType<typeof readCustomSkills>>; customCerts: Awaited<ReturnType<typeof readCustomCertifications>>; customTitles: Awaited<ReturnType<typeof readCustomJobTitles>> } | null = null;

export function dropSharedLists() {
  sharedListsAt = 0;
}

export async function sharedLists(db: D1Database) {
  if (sharedListsCache && Date.now() - sharedListsAt < 30_000) return sharedListsCache;
  const [customSkills, customCerts, customTitles] = await Promise.all([readCustomSkills(db), readCustomCertifications(db), readCustomJobTitles(db)]);
  sharedListsCache = { customSkills, customCerts, customTitles };
  sharedListsAt = Date.now();
  return sharedListsCache;
}

export async function keepProfileVersion(
  db: D1Database,
  userId: string,
  next: string,
  force = false,
) {
  try {
    const current = await db
      .prepare("SELECT data FROM profiles WHERE user_id=?")
      .bind(userId)
      .first<{ data: string }>();
    if (!current || current.data === next) return;
    const last = await db
      .prepare(
        "SELECT created FROM profile_versions WHERE user_id=? ORDER BY created DESC LIMIT 1",
      )
      .bind(userId)
      .first<{ created: string }>();
    if (!force && last && Date.now() - Date.parse(last.created) < 10 * 60000)
      return;
    await db
      .prepare(
        "INSERT INTO profile_versions(id,user_id,data,created) VALUES(?,?,?,?)",
      )
      .bind(crypto.randomUUID(), userId, current.data, new Date().toISOString())
      .run();
    await db
      .prepare(
        "DELETE FROM profile_versions WHERE user_id=? AND id NOT IN (SELECT id FROM profile_versions WHERE user_id=? ORDER BY created DESC LIMIT 10)",
      )
      .bind(userId, userId)
      .run();
  } catch (error) {
    // Versions are a convenience; saving the profile must not depend on them.
    quiet("route-catch", error);
  }
}

export async function logError(
  source: "server" | "client",
  message: unknown,
  where: unknown,
) {
  try {
    const db = runtime().DB;
    const text = cleanErrorMessage(message);
    if (!db || !text) return;
    const place = cleanWhere(where);
    const day = new Date().toISOString().slice(0, 10);
    // At most 300 rows a day, so a broken page cannot fill the database.
    const today = await db
      .prepare("SELECT COUNT(*) AS n FROM error_log WHERE created>=?")
      .bind(day)
      .first<{ n: number }>();
    if (Number(today?.n) >= 300) return;
    await db
      .prepare(
        "INSERT INTO error_log(id,created,source,message,where_at,fingerprint) VALUES(?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        new Date().toISOString(),
        source,
        text,
        place,
        await errorFingerprint(source, text, place),
      )
      .run();
    await db
      .prepare("DELETE FROM error_log WHERE created<?")
      .bind(new Date(Date.now() - 30 * 86400000).toISOString())
      .run();
  } catch (error) {
    // Logging must never break a request.
    quiet("route-catch", error);
  }
}

export type SwapRow = { id: string; day: string; from_employee: string; to_employee: string; note: string; status: string; decided_by_name: string; created: string; from_name: string; to_name: string; from_shift: string | null; to_shift: string | null };

export type EffectRow = { id: string; order_id: string; employee_id: string; kind: string; effective_date: string; status: string; plan: string; before: string; summary: string; applied_at: string; reverted_at: string; reverted_by: string };

export type PayrollShared = {
    salaryHistory?: Promise<{ employee_id: string; effective_from: string; salary_cents: number; salary_type: string }[]>;
    rates?: Promise<{ key: string; value: string }[]>;
    gross?: Promise<Map<string, Map<string, number>>>; // approved month -> employee -> gross pay, read from the frozen snapshots
    grossSince?: string;
  };

export type BranchCtx = { branches: Branch[]; links: BranchLink[]; rules: BranchRule[]; sales: BranchSales[]; mode: AllocationMode };

export type LeaveRow = { id: string; employee_id: string; year: number; start_date: string; end_date: string; days: number; status: string; proposed_by: string; note: string; decided_by_name: string; decided_at: string };

export type CaseRow = { id: string; employee_id: string; status: string; planned_end: string; checklist: string; exit_interview: string; note: string; created: string; closed_at: string };

export type AssetRow = { id: string; name: string; category: string; serial: string; inventory_no: string; value_cents: number; status: string; note: string };

export type TripRow = { id: string; employee_id: string; destination: string; purpose: string; start_date: string; end_date: string; daily_cents: number; advance_cents: number; status: string; requested_by: string; decided_by_name: string; settled_cents: number; abroad: number; manager_status: string; manager_name: string; manager_note: string };

export type ReferralRow = { id: string; employee_id: string; job_id: string; job_title: string; candidate_name: string; candidate_phone: string; candidate_email: string; note: string; status: string; bonus_cents: number; bonus_paid_at: string; created: string };

export type ExpenseDbRow = { id: string; category: string; title: string; department: string; employee_id: string; amount: number; expense_date: string; payee: string; note: string; status: string; paid_on: string; pay_method: string; pay_from: string; pay_ref: string; approved_by: string; created_by: string; order_no: string; ordered_at: string; external_id: string; source: string };

export type LedgerOp = { month: string; monthStatus: string; date: string; type: string; title: string; amount: number; balance: number; counts: boolean; note: string };

export type BankAccountRow = { id: string; label: string; bank_name: string; bank_code: string; swift: string; iban: string; account_number: string; voen: string; holder: string; currency: string; auto: string; is_default: number };

export type BatchRow = { id: string; month: string; kind: string; account_id: string; status: string; source: string; total_cents: number; item_count: number; items: string; skipped: string; note: string; created_by_name: string; approved_by_name: string; approved_at: string; sent_at: string; paid_at: string; created: string; first_approved_name: string; first_approved_by: string };

export type OrderDbRow = { id: string; employee_id?: string; kind: string; number: string; order_date: string; input: string; signers: string; status: string; holder: string; history: string; created_by: string; created: string };

export type InterviewRow = {
    id: string;
    application_id: string;
    job_id: string;
    company_id: string;
    candidate_id: string;
    scheduled_at: string;
    duration_min: number;
    kind: string;
    location: string;
    note: string;
    panel: string;
    slots: string;
    status: string;
    candidate_note: string;
    created_by: string;
    rating: number;
    feedback: string;
    decision: string;
    round: string;
    questions: string;
    created: string;
    job_title: string;
    candidate: string;
    application_status: string;
    created_by_name?: string;
    job_data?: string;
  };

export type InvApp = { id: string; status: string; candidate_id: string; job_id: string; title: string };

export type Person = { userId: string; name: string; role: string };
