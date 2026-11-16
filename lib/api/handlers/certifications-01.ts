// certifications: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, profileInput, runtime, str } from "@/lib/server";
import { SKILL_CATALOG, normalizeSkillKey } from "@/lib/skill-catalog";
import { STAGE_VISIBLE_STATUSES } from "@/lib/recruitment";
import { companyDetailsInput } from "@/lib/company";
import { readCustomEducation } from "@/lib/api-core";
import { sampleJobs } from "@/lib/model";
import { summarizeRatings } from "@/lib/reviews";
import { DEMO_JOBS_WHEN_EMPTY, OPEN_JOBS_SQL, Row, logError, normalizedJobRecord, ok, publicJob, searchEscoSkills, verifiedCompanyIds } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_certifications_01(c: Pick<RouteCtx, "customCerts" | "customSkillLabels" | "customSkills" | "customTitles" | "db" | "path" | "request" | "requestUrl" | "user">): Promise<Response | undefined> {
  const { customCerts, customSkillLabels, customSkills, customTitles, db, path, request, requestUrl, user } = c;
  if (request.method === "GET" && path === "certifications")
    return ok({ custom: customCerts });
  if (request.method === "GET" && path === "job-titles")
    return ok({ custom: customTitles });
  if (request.method === "GET" && path === "skills") {
    const query = str(new URL(request.url).searchParams.get("q"), 70);
    const esco = query ? await searchEscoSkills(db, query) : [];
    const key = normalizeSkillKey(query);
    const system = query
      ? SKILL_CATALOG.filter((skill) =>
          [
            skill.label,
            skill.labelEn,
            skill.category,
            skill.categoryEn,
            ...skill.aliases,
          ].some((value) => normalizeSkillKey(value).includes(key)),
        )
          .slice(0, 80)
          .map((skill) => ({ ...skill, source: "system" as const }))
      : [];
    const matchingCustom = query
      ? customSkills.filter((skill) =>
          [
            skill.label,
            skill.labelEn,
            skill.category,
            skill.categoryEn,
            ...skill.aliases,
          ].some((value) => normalizeSkillKey(value).includes(key)),
        )
      : customSkills;
    const seen = new Set<string>();
    return ok({
      skills: [...system, ...matchingCustom, ...esco].filter((skill) => {
        const canonical = normalizeSkillKey(skill.labelEn || skill.label);
        if (!canonical || seen.has(canonical)) return false;
        seen.add(canonical);
        return true;
      }),
    });
  }
  if (request.method === "GET" && path === "companies") {
    const rows = await db
      .prepare(
        `SELECT a.id,a.name,
          (SELECT COUNT(*) FROM jobs j WHERE j.owner=a.id AND j.status='published'
            AND (COALESCE(json_extract(j.data,'$.deadline'),'')='' OR json_extract(j.data,'$.deadline')>=date('now'))) AS open_jobs,
          (SELECT COUNT(*) FROM relations r WHERE r.target_id=a.id AND r.kind='follow') AS followers,
          p.verification_status AS verification, p.data AS details, CASE WHEN COALESCE(p.logo_data,'')<>'' THEN 1 ELSE 0 END AS has_logo
        FROM accounts a LEFT JOIN company_profiles p ON p.company_id=a.id
        WHERE a.role='company' AND COALESCE(a.status,'active')='active'
          AND a.id NOT LIKE 'external-%'
          AND NOT EXISTS(SELECT 1 FROM company_members tm WHERE tm.user_id=a.id AND tm.status IN ('active','suspended'))
          AND ${user ? "NOT EXISTS(SELECT 1 FROM relations r WHERE r.kind='block' AND ((r.actor_id=? AND r.target_id=a.id) OR (r.actor_id=a.id AND r.target_id=?)))" : "1=1"}
        ORDER BY open_jobs DESC, a.name LIMIT 300`,
      )
      .bind(...(user ? [user, user] : []))
      .all<{
        id: string;
        name: string;
        open_jobs: number;
        followers: number;
        verification: string | null;
        details: string | null;
        has_logo: number;
      }>()
      .catch(() => ({
        results: [] as {
          id: string;
          name: string;
          open_jobs: number;
          followers: number;
          verification: string | null;
          details: string | null;
          has_logo: number;
        }[],
      }));
    const gallery = new Map<string, string[]>();
    const images = await db
      .prepare(
        "SELECT id,company_id FROM company_images ORDER BY company_id,position,created",
      )
      .all<{ id: string; company_id: string }>()
      .catch(() => ({ results: [] as { id: string; company_id: string }[] }));
    for (const image of images.results)
      gallery.set(image.company_id, [
        ...(gallery.get(image.company_id) || []),
        image.id,
      ]);
    // Only public profile fields; legal and banking details stay private.
    return ok({
      companies: rows.results.map((r) => {
        const d = companyDetailsInput(r.details ? JSON.parse(r.details) : {});
        return {
          id: r.id,
          name: r.name,
          openJobs: Number(r.open_jobs) || 0,
          followers: Number(r.followers) || 0,
          verified: r.verification === "verified",
          industry: d.industry,
          size: d.size,
          website: d.website,
          about: d.about,
          officeAddress: d.officeAddress,
          mapUrl: d.mapUrl,
          videoUrl: d.videoUrl,
          linkedin: d.linkedin,
          instagram: d.instagram,
          facebook: d.facebook,
          foundedYear: d.foundedYear,
          logo: r.has_logo === 1,
          gallery: gallery.get(r.id) || [],
        };
      }),
    });
  }
  if (request.method === "POST" && path === "client-error") {
    const b = await jsonBody(request);
    await logError("client", b.message, b.where);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "companies/reviews") {
    const companyId = str(requestUrl.searchParams.get("companyId"), 100);
    const rows = await db
      .prepare(
        "SELECT rating,title,body,created FROM company_reviews WHERE company_id=? AND status='approved' ORDER BY created DESC LIMIT 50",
      )
      .bind(companyId)
      .all<{ rating: number; title: string; body: string; created: string }>()
      .catch(() => ({
        results: [] as {
          rating: number;
          title: string;
          body: string;
          created: string;
        }[],
      }));
    const all = await db
      .prepare(
        "SELECT rating FROM company_reviews WHERE company_id=? AND status='approved'",
      )
      .bind(companyId)
      .all<{ rating: number }>()
      .catch(() => ({ results: [] as { rating: number }[] }));
    let mine: {
      rating: number;
      title: string;
      body: string;
      status: string;
      admin_note: string;
    } | null = null;
    let canReview = false;
    if (user) {
      mine = await db
        .prepare(
          "SELECT rating,title,body,status,admin_note FROM company_reviews WHERE company_id=? AND user_id=?",
        )
        .bind(companyId, user)
        .first<{
          rating: number;
          title: string;
          body: string;
          status: string;
          admin_note: string;
        }>()
        .catch(() => null);
      canReview = !!(await db
        .prepare(
          "SELECT 1 FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.candidate_id=? AND j.owner=? LIMIT 1",
        )
        .bind(user, companyId)
        .first()
        .catch(() => null));
    }
    return ok({
      reviews: rows.results,
      summary: summarizeRatings(all.results.map((r) => r.rating)),
      mine,
      canReview,
    });
  }
  if (request.method === "GET" && path === "companies/logo") {
    const row = await db
      .prepare(
        "SELECT logo_type,logo_data FROM company_profiles WHERE company_id=?",
      )
      .bind(str(requestUrl.searchParams.get("id"), 100))
      .first<{ logo_type: string; logo_data: string }>()
      .catch(() => null);
    if (!row?.logo_data) throw new HttpError(404, "Loqo tapılmadı.");
    return new Response(
      Uint8Array.from(atob(row.logo_data), (c) => c.charCodeAt(0)),
      {
        headers: {
          "Content-Type": row.logo_type,
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
  if (request.method === "GET" && path === "companies/image") {
    const row = await db
      .prepare("SELECT type,data FROM company_images WHERE id=?")
      .bind(str(requestUrl.searchParams.get("id"), 100))
      .first<{ type: string; data: string }>()
      .catch(() => null);
    if (!row?.data) throw new HttpError(404, "Şəkil tapılmadı.");
    return new Response(
      Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0)),
      {
        headers: {
          "Content-Type": row.type,
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
  if (request.method === "GET" && path === "state") {
    // Everything this page needs is read together; one D1 round trip each would add up.
    type EventRow = {
      application_id: string;
      type: string;
      from_value: string;
      to_value: string;
      note: string;
      created: string;
    };
    const jobsQuery = user
      ? db
          .prepare(
            `${OPEN_JOBS_SQL} AND NOT EXISTS(SELECT 1 FROM relations r WHERE r.kind='block'
              AND ((r.actor_id=? AND r.target_id=j.owner) OR (r.actor_id=j.owner AND r.target_id=?)))
            ORDER BY j.created DESC LIMIT 200`,
          )
          .bind(user, user)
          .all<Row>()
      : db
          .prepare(`${OPEN_JOBS_SQL} ORDER BY j.created DESC LIMIT 200`)
          .all<Row>();
    const none = Promise.resolve(null);
    const [jobRows, verifiedOwners, profileRow, appRows, eventRows, savedRows, account] =
      await Promise.all([
        jobsQuery,
        verifiedCompanyIds(db),
        user
          ? db.prepare("SELECT data FROM profiles WHERE user_id = ?").bind(user).first<Row>()
          : none,
        user
          ? db
              .prepare(
                `SELECT ap.*,j.data AS job_data FROM applications ap LEFT JOIN jobs j ON j.id=ap.job_id
            WHERE ap.candidate_id = ? ORDER BY ap.created DESC`,
              )
              .bind(user)
              .all<Row & { job_data: string | null }>()
          : none,
        user
          ? db
              .prepare(
                `SELECT e.application_id,e.type,e.from_value,e.to_value,CASE WHEN e.type='rejection' THEN substr(e.note,9) ELSE '' END AS note,e.created FROM application_events e
          JOIN applications a ON a.id=e.application_id WHERE a.candidate_id=? AND (e.type IN ('applied','status','stage','withdrawn','offer') OR (e.type='rejection' AND e.note LIKE 'shared%'))
          ORDER BY e.created`,
              )
              .bind(user)
              .all<EventRow>()
              .catch(() => ({ results: [] as EventRow[] }))
          : none,
        user ? db.prepare("SELECT job_id FROM saved WHERE user_id = ?").bind(user).all<Row>() : none,
        user && runtime().EXTERNAL_AUTH === "password"
          ? db
              .prepare(
                "SELECT name,COALESCE(role,'candidate') AS role,COALESCE(status,'active') AS status FROM accounts WHERE id=?",
              )
              .bind(user)
              .first<{
                name: string;
                role: "candidate" | "company" | "admin";
                status: string;
              }>()
          : none,
      ]);
    let profile = null,
      applications: unknown[] = [],
      saved: string[] = [];
    if (user && appRows && eventRows && savedRows) {
      profile = profileRow
        ? profileInput(JSON.parse(profileRow.data), customSkillLabels, {
            preserveStoredSkills: true,
          })
        : null;
      applications = appRows.results.map((r) => {
        const visible = STAGE_VISIBLE_STATUSES.has(r.status);
        return {
          id: r.id,
          jobId: r.job_id,
          status: r.status,
          stage: visible ? (r as Row & { stage?: string }).stage || "" : "",
          created: r.created,
          profile: profileInput(JSON.parse(r.data), customSkillLabels, {
            preserveStoredSkills: true,
          }),
          auto: r.auto === 1,
          events: eventRows.results.filter((e) => e.application_id === r.id),
          // Keep closed or paused vacancies identifiable in the candidate's
          // history; selection stages only once the application is accepted.
          job: r.job_data
            ? publicJob(
                normalizedJobRecord(JSON.parse(r.job_data), customSkillLabels),
                visible,
              )
            : sampleJobs.find((job) => job.id === r.job_id),
        };
      });
      saved = savedRows.results.map((r) => r.job_id);
    }
    return ok({
      profile,
      account,
      authMode: runtime().EXTERNAL_AUTH || "chatgpt",
      cvStorage: runtime().CV_STORAGE || "r2",
      jobs: [
        ...jobRows.results.map((r) => {
          const job = publicJob(
            normalizedJobRecord(JSON.parse(r.data), customSkillLabels),
          );
          return { ...job, companyVerified: verifiedOwners.has(job.owner) };
        }),
        ...DEMO_JOBS_WHEN_EMPTY(jobRows.results.length).map((job) =>
          normalizedJobRecord(job, customSkillLabels),
        ),
      ],
      applications,
      saved,
      customCertifications: customCerts,
      customJobTitles: customTitles,
      ...(await (async () => {
        const education = await readCustomEducation(db);
        return {
          customUniversities: education.universities,
          customMajors: education.majors,
        };
      })()),
      signedIn: !!user,
      aiEnabled:
        runtime().AI_PROVIDER === "openai"
          ? !!runtime().OPENAI_API_KEY
          : !!(runtime().DEEPSEEK_API_KEY || runtime().OPENAI_API_KEY),
      aiProvider:
        runtime().AI_PROVIDER === "openai"
          ? "OpenAI"
          : runtime().DEEPSEEK_API_KEY
            ? "DeepSeek"
            : "OpenAI",
    });
  }
  return undefined;
}
