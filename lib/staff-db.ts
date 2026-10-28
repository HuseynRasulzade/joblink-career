// Database side of the company structure: department and section names, one spelling each, sections
// that belong to a department, and the rename/delete rules. Used by the staff table and the employee form.
import { canonicalOrgName, cleanOrgName, orgKey, uniqueOrgNames } from "./org-names.ts";

export type OrgKind = "department" | "section" | "position";
const COLUMN: Record<OrgKind, string> = { department: "department", section: "section", position: "position" };

// A section's key includes its department, so two departments can have a section of the same name.
const sectionKey = (parent: string, name: string) => (parent ? `${orgKey(parent)}|${orgKey(name)}` : orgKey(name));

// Names kept for a company: the catalog plus every name already used in the staff table or by an employee.
// Sections are those of the given department (and the ones that belong to none), or all when no department is given.
export async function orgNameList(db: D1Database, companyId: string, kind: OrgKind, parent = "") {
  const column = COLUMN[kind];
  const scoped = kind === "section" && parent;
  const rows = await db
    .prepare(
      `SELECT name FROM org_names WHERE company_id=?1 AND kind=?2 ${scoped ? "AND (parent=?3 OR parent='')" : ""}
       UNION SELECT ${column} FROM staff_units WHERE company_id=?1 ${scoped ? "AND lower(department)=lower(?3)" : ""}
       UNION SELECT ${column} FROM company_employees WHERE company_id=?1 AND status<>'removed' ${scoped ? "AND lower(department)=lower(?3)" : ""}`,
    )
    .bind(...(scoped ? [companyId, kind, parent] : [companyId, kind]))
    .all<Record<string, string>>();
  return uniqueOrgNames(rows.results.map((row) => String(Object.values(row)[0] || "")));
}

// The spelling the company already uses for this name; a new name joins the catalog. No duplicates.
export async function canonicalOrg(db: D1Database, companyId: string, kind: OrgKind, name: string, parent = "") {
  const cleaned = cleanOrgName(name);
  if (!cleaned) return "";
  const owner = kind === "section" ? cleanOrgName(parent) : "";
  const { name: canonical } = canonicalOrgName(await orgNameList(db, companyId, kind, owner), cleaned);
  await db
    .prepare("INSERT OR IGNORE INTO org_names(company_id,kind,key,name,parent,created) VALUES(?,?,?,?,?,?)")
    .bind(companyId, kind, kind === "section" ? sectionKey(owner, canonical) : orgKey(canonical), canonical, owner, new Date().toISOString())
    .run();
  return canonical;
}

export type StructureSection = { name: string; units: number; people: number };
export type StructureDepartment = { name: string; sections: StructureSection[]; units: number; people: number };
export type Structure = { departments: StructureDepartment[]; looseSections: StructureSection[] };

// Departments with their sections and how much of the staff table and how many people each holds.
export async function loadStructure(db: D1Database, companyId: string): Promise<Structure> {
  const [departments, catalog, usedUnits, usedPeople] = await Promise.all([
    orgNameList(db, companyId, "department"),
    db
      .prepare("SELECT name,parent FROM org_names WHERE company_id=? AND kind='section'")
      .bind(companyId)
      .all<{ name: string; parent: string }>(),
    db
      .prepare("SELECT department,section,COUNT(*) AS n FROM staff_units WHERE company_id=? GROUP BY department,section")
      .bind(companyId)
      .all<{ department: string; section: string; n: number }>(),
    db
      .prepare("SELECT department,section,COUNT(*) AS n FROM company_employees WHERE company_id=? AND status IN ('active','leave') GROUP BY department,section")
      .bind(companyId)
      .all<{ department: string; section: string; n: number }>(),
  ]);
  const pair = (department: string, section: string) => `${orgKey(department)}|${orgKey(section)}`;
  const units = new Map<string, number>();
  const people = new Map<string, number>();
  const sections = new Map<string, { department: string; name: string }>();
  for (const row of usedUnits.results) {
    units.set(pair(row.department, row.section), (units.get(pair(row.department, row.section)) || 0) + Number(row.n));
    if (row.section && row.department) sections.set(pair(row.department, row.section), { department: row.department, name: row.section });
  }
  for (const row of usedPeople.results) {
    people.set(pair(row.department, row.section), (people.get(pair(row.department, row.section)) || 0) + Number(row.n));
    if (row.section && row.department) sections.set(pair(row.department, row.section), { department: row.department, name: row.section });
  }
  const loose = new Map<string, string>();
  for (const row of catalog.results) {
    if (row.parent) sections.set(pair(row.parent, row.name), { department: row.parent, name: row.name });
    else loose.set(orgKey(row.name), row.name);
  }
  // A section kept without a department that some department already uses is not loose.
  for (const used of sections.values()) loose.delete(orgKey(used.name));
  const forDepartment = (department: string): StructureSection[] =>
    [...sections.values()]
      .filter((s) => orgKey(s.department) === orgKey(department))
      .sort((a, b) => a.name.localeCompare(b.name, "az"))
      .map((s) => ({ name: s.name, units: units.get(pair(department, s.name)) || 0, people: people.get(pair(department, s.name)) || 0 }));
  const out: StructureDepartment[] = departments.map((name) => {
    const list = forDepartment(name);
    return {
      name,
      sections: list,
      units: [...units].filter(([k]) => k.startsWith(`${orgKey(name)}|`)).reduce((s, [, n]) => s + n, 0),
      people: [...people].filter(([k]) => k.startsWith(`${orgKey(name)}|`)).reduce((s, [, n]) => s + n, 0),
    };
  });
  return {
    departments: out,
    looseSections: [...loose.values()].sort((a, b) => a.localeCompare(b, "az")).map((name) => ({ name, units: 0, people: 0 })),
  };
}

// Add a department, or a section under a department; a name that exists is not created again.
export async function addStructure(db: D1Database, companyId: string, departmentInput: string, sectionInput = "") {
  const department = await canonicalOrg(db, companyId, "department", departmentInput);
  const section = sectionInput ? await canonicalOrg(db, companyId, "section", sectionInput, department) : "";
  return { department, section };
}

// Many sections of one department with a handful of queries: the existing names are read once and the
// new ones are written in batches. A name the department already has is not created again.
export async function addSections(db: D1Database, companyId: string, departmentInput: string, names: string[]) {
  const department = await canonicalOrg(db, companyId, "department", departmentInput);
  const known = await orgNameList(db, companyId, "section", department);
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  let created = 0;
  let existing = 0;
  for (const name of names) {
    const match = canonicalOrgName(known, name);
    if (!match.name) continue;
    if (match.existing) {
      existing += 1;
      continue;
    }
    known.push(match.name);
    created += 1;
    statements.push(
      db
        .prepare("INSERT OR IGNORE INTO org_names(company_id,kind,key,name,parent,created) VALUES(?,?,?,?,?,?)")
        .bind(companyId, "section", sectionKey(department, match.name), match.name, department, now),
    );
  }
  for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
  return { department, created, existing };
}

// A department or section that a staff row or an employee still uses cannot be deleted.
export async function deleteStructure(db: D1Database, companyId: string, department: string, section = "") {
  const used = async (table: string, extra = "") =>
    Number(
      (
        await db
          .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE company_id=? AND lower(department)=lower(?) ${section ? "AND lower(section)=lower(?)" : ""} ${extra}`)
          .bind(...(section ? [companyId, department, section] : [companyId, department]))
          .first<{ n: number }>()
      )?.n,
    ) || 0;
  const rows = await used("staff_units");
  const people = await used("company_employees", "AND status<>'removed'");
  if (rows || people) {
    const what = section ? `“${department} / ${section}” şöbəsi` : `“${department}” departamenti`;
    throw Object.assign(new Error(`${what} silinə bilməz: ştat cədvəlində ${rows} sətir, ${people} işçi ona bağlıdır. Əvvəl onları başqa yerə keçirin.`), { status: 409 });
  }
  if (section) {
    await db
      .prepare("DELETE FROM org_names WHERE company_id=? AND kind='section' AND key=?")
      .bind(companyId, sectionKey(department, section))
      .run();
  } else {
    await db.batch([
      db.prepare("DELETE FROM org_names WHERE company_id=? AND kind='department' AND key=?").bind(companyId, orgKey(department)),
      db.prepare("DELETE FROM org_names WHERE company_id=? AND kind='section' AND lower(parent)=lower(?)").bind(companyId, department),
    ]);
  }
}

// A new name for a department or a section: everything that used the old one follows.
export async function renameStructure(db: D1Database, companyId: string, department: string, to: string, section = "") {
  const next = cleanOrgName(to);
  if (next.length < 2) throw Object.assign(new Error("Yeni adı yazın."), { status: 400 });
  const now = new Date().toISOString();
  if (!section) {
    const existing = await orgNameList(db, companyId, "department");
    if (existing.some((n) => orgKey(n) === orgKey(next) && orgKey(n) !== orgKey(department)))
      throw Object.assign(new Error(`“${next}” departamenti artıq var.`), { status: 409 });
    const sectionRows = await db
      .prepare("SELECT name FROM org_names WHERE company_id=? AND kind='section' AND lower(parent)=lower(?)")
      .bind(companyId, department)
      .all<{ name: string }>();
    await db.batch([
      db.prepare("UPDATE staff_units SET department=?,updated=? WHERE company_id=? AND lower(department)=lower(?)").bind(next, now, companyId, department),
      db.prepare("UPDATE company_employees SET department=?,updated=? WHERE company_id=? AND lower(department)=lower(?)").bind(next, now, companyId, department),
      db
        .prepare("UPDATE jobs SET data=json_set(data,'$.department',?) WHERE owner=? AND lower(COALESCE(json_extract(data,'$.department'),''))=lower(?)")
        .bind(next, companyId, department),
      db.prepare("DELETE FROM org_names WHERE company_id=? AND kind='department' AND key=?").bind(companyId, orgKey(department)),
      db.prepare("INSERT OR IGNORE INTO org_names(company_id,kind,key,name,parent,created) VALUES(?,?,?,?,?,?)").bind(companyId, "department", orgKey(next), next, "", now),
      db.prepare("DELETE FROM org_names WHERE company_id=? AND kind='section' AND lower(parent)=lower(?)").bind(companyId, department),
      ...sectionRows.results.map((row) =>
        db.prepare("INSERT OR IGNORE INTO org_names(company_id,kind,key,name,parent,created) VALUES(?,?,?,?,?,?)").bind(companyId, "section", sectionKey(next, row.name), row.name, next, now),
      ),
    ]);
    return next;
  }
  const siblings = await orgNameList(db, companyId, "section", department);
  if (siblings.some((n) => orgKey(n) === orgKey(next) && orgKey(n) !== orgKey(section)))
    throw Object.assign(new Error(`“${department}” departamentində “${next}” şöbəsi artıq var.`), { status: 409 });
  await db.batch([
    db.prepare("UPDATE staff_units SET section=?,updated=? WHERE company_id=? AND lower(department)=lower(?) AND lower(section)=lower(?)").bind(next, now, companyId, department, section),
    db.prepare("UPDATE company_employees SET section=?,updated=? WHERE company_id=? AND lower(department)=lower(?) AND lower(section)=lower(?)").bind(next, now, companyId, department, section),
    db.prepare("DELETE FROM org_names WHERE company_id=? AND kind='section' AND key=?").bind(companyId, sectionKey(department, section)),
    db.prepare("INSERT OR IGNORE INTO org_names(company_id,kind,key,name,parent,created) VALUES(?,?,?,?,?,?)").bind(companyId, "section", sectionKey(department, next), next, department, now),
  ]);
  return next;
}

export type StaffHistoryEntry = { id: string; action: string; target: string; detail: string; created: string; actor: string };
const HISTORY_LABEL: Record<string, string> = {
  "staff-unit": "Ştat sətri dəyişdi",
  "staff-unit-removed": "Ştat sətri silindi",
  "staff-imported": "Excel ilə ştat yükləndi",
  "staff-plan-approved": "Ştat planı təsdiqləndi",
  "headcount-plan": "Departament planı dəyişdi",
  "org-name-added": "Ad kataloqa əlavə edildi",
  "structure-added": "Struktur əlavə edildi",
  "structure-renamed": "Struktur adı dəyişdi",
  "structure-removed": "Struktur silindi",
  "structure-imported": "Struktur Excel ilə yükləndi",
};
export const historyLabel = (action: string) => HISTORY_LABEL[action] || action;

export async function loadStaffHistory(db: D1Database, companyId: string): Promise<StaffHistoryEntry[]> {
  const rows = await db
    .prepare(
      `SELECT c.id,c.action,c.target,c.detail,c.created,COALESCE(a.name,'') AS actor
       FROM company_audit c LEFT JOIN accounts a ON a.id=c.actor_id
       WHERE c.company_id=? AND (c.action LIKE 'staff%' OR c.action LIKE 'headcount%' OR c.action LIKE 'org-%' OR c.action LIKE 'structure%')
       ORDER BY c.created DESC LIMIT 100`,
    )
    .bind(companyId)
    .all<StaffHistoryEntry>()
    .catch(() => ({ results: [] as StaffHistoryEntry[] }));
  return rows.results.map((row) => ({ ...row, action: historyLabel(row.action) }));
}
