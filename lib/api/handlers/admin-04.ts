// admin: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { COUNTRIES, canonicalUniversity, setCustomUniversities } from "@/lib/university-catalog";
import { HttpError, jsonBody, str } from "@/lib/server";
import { JOB_TITLE_FAMILIES, canonicalJobTitle } from "@/lib/job-title-catalog";
import { MAJOR_FIELDS, canonicalMajor, setCustomMajors } from "@/lib/major-catalog";
import { duplicateGroups, mergedAliases, parseEducationCsv, parseTitleCsv, translationIssues } from "@/lib/catalog-check";
import { readCustomEducation } from "@/lib/api-core";
import { exportSkillCatalog, ok, readCatalogSection, skillCatalogScope } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_admin_04(c: Pick<RouteCtx, "catalogEntries" | "customSkills" | "db" | "id" | "path" | "request" | "requestUrl">): Promise<Response | undefined> {
  const { catalogEntries, customSkills, db, id, path, request, requestUrl } = c;
  if (request.method === "GET" && path === "admin/catalog-check") {
      const entries = await catalogEntries();
      return ok({
        counts: Object.fromEntries(
          ["skill", "job-title", "certification", "university", "major"].map((kind) => [kind, entries.filter((e) => e.kind === kind).length]),
        ),
        translation: translationIssues(entries).slice(0, 300),
        duplicates: duplicateGroups(entries).slice(0, 100),
      });
    }
  if (request.method === "POST" && path === "admin/catalog-merge") {
      const body = await jsonBody(request);
      const kind = str(body.kind, 20);
      const table =
        kind === "skill" ? "custom_skills" : kind === "job-title" ? "custom_job_titles" : kind === "university" || kind === "major" ? "custom_education_items" : "";
      if (!table) throw new HttpError(400, "Bu kataloqda birləşdirmə dəstəklənmir.");
      const keepId = str(body.keepId, 100);
      const dropId = str(body.mergeId, 100);
      if (!keepId || keepId === dropId) throw new HttpError(400, "İki fərqli qeyd seçin.");
      const entries = (await catalogEntries()).filter((e) => e.kind === kind);
      const keep = entries.find((e) => e.id === keepId);
      const drop = entries.find((e) => e.id === dropId);
      if (!keep || !drop) throw new HttpError(404, "Qeyd tapılmadı.");
      const aliases = mergedAliases(keep, drop);
      const now = new Date().toISOString();
      await db.batch([
        db.prepare(`UPDATE ${table} SET aliases=? WHERE id=?`).bind(JSON.stringify(aliases), keepId),
        db.prepare(`DELETE FROM ${table} WHERE id=?`).bind(dropId),
        db
          .prepare("INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)")
          .bind(crypto.randomUUID(), id, "catalog-merged", kind, keepId, JSON.stringify({ kept: keep.label, merged: drop.label }), now),
      ]);
      return ok({ ok: true, kept: keep.label, aliases });
    }
  if (request.method === "POST" && path === "admin/job-titles/import") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new HttpError(403, "Bu sorğuya icazə verilmir.");
      const raw = await request.text();
      if (raw.length > 400_000) throw new HttpError(413, "Fayl çox böyükdür.");
      let csv = "";
      try {
        csv = String((JSON.parse(raw) as { csv?: unknown }).csv || "");
      } catch {
        throw new HttpError(400, "Məlumat oxunmadı.");
      }
      const { rows, issues } = parseTitleCsv(csv, JOB_TITLE_FAMILIES);
      if (!rows.length && !issues.length) throw new HttpError(400, "Faylda sətir tapılmadı.");
      const now = new Date().toISOString();
      let added = 0;
      for (const row of rows) {
        const known = [row.label, row.labelEn, ...row.aliases].map((value) => canonicalJobTitle(value)).find(Boolean);
        if (known) {
          issues.push({ line: row.line, label: row.label, reason: `Artıq kataloqdadır: ${known.label}` });
          continue;
        }
        try {
          await db
            .prepare("INSERT INTO custom_job_titles(id,label,label_en,family,aliases,created_by,created) VALUES(?,?,?,?,?,?,?)")
            .bind(crypto.randomUUID(), row.label, row.labelEn, row.family, JSON.stringify(row.aliases), id, now)
            .run();
          added++;
        } catch {
          issues.push({ line: row.line, label: row.label, reason: "Yazıla bilmədi (təkrar ad)" });
        }
      }
      if (added)
        await db
          .prepare("INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)")
          .bind(crypto.randomUUID(), id, "job-titles-imported", "job-title", "bulk", JSON.stringify({ added, skipped: issues.length }), now)
          .run();
      return ok({ ok: true, added, issues: issues.sort((a, b) => a.line - b.line) });
    }
  if (request.method === "POST" && path === "admin/education/import") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new HttpError(403, "Bu sorğuya icazə verilmir.");
      const raw = await request.text();
      if (raw.length > 400_000) throw new HttpError(413, "Fayl çox böyükdür.");
      let csv = "";
      try {
        csv = String((JSON.parse(raw) as { csv?: unknown }).csv || "");
      } catch {
        throw new HttpError(400, "Məlumat oxunmadı.");
      }
      const { rows, issues } = parseEducationCsv(csv, { university: COUNTRIES, major: MAJOR_FIELDS });
      if (!rows.length && !issues.length) throw new HttpError(400, "Faylda sətir tapılmadı.");
      const education = await readCustomEducation(db);
      setCustomUniversities(education.universities);
      setCustomMajors(education.majors);
      const now = new Date().toISOString();
      let added = 0;
      for (const row of rows) {
        const known = [row.label, row.labelEn, row.labelRu, ...row.aliases]
          .map((value) => (row.kind === "university" ? canonicalUniversity(value) : canonicalMajor(value)))
          .find(Boolean);
        if (known) {
          issues.push({ line: row.line, label: row.label, reason: `Artıq siyahıdadır: ${known.label}` });
          continue;
        }
        try {
          await db
            .prepare("INSERT INTO custom_education_items(id,kind,label,label_en,label_ru,extra,aliases,created_by,created) VALUES(?,?,?,?,?,?,?,?,?)")
            .bind(crypto.randomUUID(), row.kind, row.label, row.labelEn, row.labelRu, row.extra, JSON.stringify(row.aliases), id, now)
            .run();
          added++;
        } catch {
          issues.push({ line: row.line, label: row.label, reason: "Yazıla bilmədi (təkrar ad)" });
        }
      }
      if (added)
        await db
          .prepare("INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)")
          .bind(crypto.randomUUID(), id, "education-imported", "education", "bulk", JSON.stringify({ added, skipped: issues.length }), now)
          .run();
      return ok({ ok: true, added, issues: issues.sort((a, b) => a.line - b.line) });
    }
  if (request.method === "GET" && path === "admin/backup") {
      const tables: Record<string, string> = {
        accounts: "SELECT id,name,role,status,created FROM accounts",
        profiles: "SELECT user_id,data,active FROM profiles",
        jobs: "SELECT id,owner,data,status,created FROM jobs",
        applications: "SELECT * FROM applications",
        company_profiles: "SELECT company_id,data,verification_status FROM company_profiles",
        custom_skills: "SELECT * FROM custom_skills",
        custom_job_titles: "SELECT * FROM custom_job_titles",
        custom_certifications: "SELECT * FROM custom_certifications",
        custom_education_items: "SELECT * FROM custom_education_items",
        app_settings: "SELECT * FROM app_settings",
      };
      const copy: Record<string, unknown[]> = {};
      for (const [name, sql] of Object.entries(tables)) {
        const rows = await db.prepare(`${sql} LIMIT 20000`).all().catch(() => ({ results: [] as unknown[] }));
        copy[name] = rows.results;
      }
      const now = new Date().toISOString();
      await db
        .prepare("INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), id, "backup-exported", "system", "backup", JSON.stringify(Object.fromEntries(Object.entries(copy).map(([k, v]) => [k, v.length]))), now)
        .run();
      return new Response(JSON.stringify({ exportedAt: now, tables: copy }), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="joblink-backup-${now.slice(0, 10)}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }
  if (request.method === "POST" && path === "admin/job-titles") {
      const body = await jsonBody(request);
      const label = str(body.label, 120).replace(/\s+/g, " ");
      const labelEn = str(body.labelEn, 120).replace(/\s+/g, " ");
      const family = str(body.family, 40);
      const aliases = (
        Array.isArray(body.aliases)
          ? body.aliases
          : str(body.aliases, 600).split(/[,;\n]/)
      )
        .map((value: unknown) => str(value, 120).replace(/\s+/g, " "))
        .filter(Boolean)
        .slice(0, 15);
      if (label.length < 2 || labelEn.length < 2 || !JOB_TITLE_FAMILIES[family])
        throw new HttpError(
          400,
          "Vəzifə adı hər iki dildə və peşə qrupu tələb olunur.",
        );
      const duplicate = [label, labelEn, ...aliases]
        .map((value) => canonicalJobTitle(value))
        .find(Boolean);
      if (duplicate)
        throw new HttpError(
          409,
          `Bu vəzifə artıq kataloqdadır: ${duplicate.label}.`,
        );
      const titleId = crypto.randomUUID();
      const now = new Date().toISOString();
      const threadId = str(body.threadId, 100);
      const statements = [
        db
          .prepare(
            "INSERT INTO custom_job_titles(id,label,label_en,family,aliases,created_by,created) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            titleId,
            label,
            labelEn,
            family,
            JSON.stringify(aliases),
            id,
            now,
          ),
        db
          .prepare(
            "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            "job-title-created",
            "job-title",
            titleId,
            JSON.stringify({ label, labelEn, family }),
            now,
          ),
      ];
      if (threadId)
        statements.push(
          db
            .prepare(
              "UPDATE support_threads SET status='done',updated=? WHERE id=?",
            )
            .bind(now, threadId),
          db
            .prepare(
              "INSERT INTO support_messages(id,thread_id,author_id,author_role,body,created) VALUES(?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              threadId,
              id,
              "admin",
              `“${label}” vəzifəsi kataloqa əlavə edildi. İndi onu siyahıdan seçə bilərsiniz.`,
              now,
            ),
        );
      try {
        await db.batch(statements);
      } catch {
        throw new HttpError(409, "Bu adda vəzifə artıq mövcuddur.");
      }
      return ok(
        {
          ok: true,
          title: {
            id: `admin:${titleId}`,
            label,
            labelEn,
            family,
            aliases: [label, labelEn, ...aliases],
          },
        },
        201,
      );
    }
  if (request.method === "GET" && path === "admin/skills/catalog") {
      const scope = skillCatalogScope(requestUrl);
      const result = await readCatalogSection(db, customSkills, scope);
      return ok({
        ...result,
        page: scope.page,
        pageCount: Math.max(1, Math.ceil(result.total / 100)),
      });
    }
  if (request.method === "GET" && path === "admin/skills/export") {
      const scope = skillCatalogScope(requestUrl);
      const exportAll = requestUrl.searchParams.get("all") === "1";
      const workbook = await exportSkillCatalog(
        db,
        customSkills,
        scope,
        exportAll,
      );
      const suffix = exportAll
        ? "all"
        : `${scope.dimension}-${scope.value || "catalog"}`
            .toLocaleLowerCase("en")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 60);
      return new Response(Uint8Array.from(workbook).buffer, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `attachment; filename="joblink-skills-${suffix || "catalog"}.xlsx"`,
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }
  return undefined;
}
