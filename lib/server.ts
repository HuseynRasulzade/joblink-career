import { env } from "cloudflare:workers";
import {
  AUTO_APPLY_FLOOR,
  blankProfile,
  normalizeEmploymentType,
  type Profile,
  type Job,
} from "./model";
import { MAX_CV_TEXT_CHARS } from "./cv-limits";
import {
  BUDGET_EXCEEDED_MESSAGE,
  classifyAiFailure,
  friendlyAiMessage,
  monthSpendUsd,
  readAiBudget,
  readAiHealth,
  writeAiHealth,
  type AiFailure,
} from "./ai-guard";
import {
  normalizeSkills,
  normalizeSkillsWithAllowedCustom,
} from "./skill-catalog";
import {
  normalizeCandidateCertifications,
  normalizeJobCertifications,
} from "./certification-catalog";
import { VACANCY_REASONS, sanitizeStages } from "./recruitment";
export function runtime() {
  return env as unknown as {
    DB: D1Database;
    FILES: R2Bucket;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    AI_PROVIDER?: string;
    DEEPSEEK_API_KEY?: string;
    DEEPSEEK_MODEL?: string;
    ADMIN_EMAIL?: string;
    SITE_URL?: string;
    EMAIL_FROM?: string;
    RESEND_API_KEY?: string;
    EMAIL?: {
      send: (message: {
        to: string[];
        from: { email: string; name?: string };
        subject: string;
        text: string;
        html?: string;
      }) => Promise<unknown>;
    };
    EXTERNAL_AUTH?: string;
    // Cloudflare Turnstile (robot check on sign-in and sign-up); both unset means no check.
    TURNSTILE_SECRET?: string;
    TURNSTILE_SITE_KEY?: string;
    // "1" prints account e-mails (reset and verification links) to the log; for local checks only.
    DEV_MAIL_LOG?: string;
    // "1" turns on package limits; without it everyone keeps full access.
    BILLING_ENFORCED?: string;
    PAYMENT_PROVIDER?: string;
    PLATFORM_LEGAL_NAME?: string;
    PLATFORM_VOEN?: string;
    PLATFORM_ADDRESS?: string;
    PLATFORM_EMAIL?: string;
    CV_STORAGE?: string;
    AI?: {
      run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
    };
  };
}
export async function store() {
  const db = runtime().DB;
  if (!db) throw new Error("Məlumat bazası hazır deyil.");
  return db;
}
export async function optionalIdentity(request: Request) {
  if (runtime().EXTERNAL_AUTH !== "password")
    return request.headers.get("oai-authenticated-user-id");
  const { sessionIdentity } = await import("./external-auth");
  return sessionIdentity(request);
}
export async function identity(request: Request) {
  const id = await optionalIdentity(request);
  if (!id) throw new HttpError(401, "Davam etmək üçün hesabınıza daxil olun.");
  return id;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function str(v: unknown, max = 10000) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function profileJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const serialized = JSON.stringify(value);
    return serialized.length <= 200000
      ? (JSON.parse(serialized) as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
export function profileInput(
  value: unknown,
  allowedCustomSkills: string[] = [],
  options: { preserveStoredSkills?: boolean } = {},
): Profile {
  const p = value as Profile;
  if (!p || typeof p !== "object")
    throw new HttpError(400, "Profil məlumatları düzgün deyil.");
  const clean: Profile = {
    ...blankProfile,
    ...Object.fromEntries(
      [
        "name",
        "title",
        "email",
        "phone",
        "city",
        "summary",
        "languages",
        "certificates",
        "links",
        "cvText",
        "cvName",
      ].map((k) => [
        k,
        str(p[k as keyof Profile], k === "cvText" ? MAX_CV_TEXT_CHARS : 5000),
      ]),
    ),
    skills: options.preserveStoredSkills
      ? normalizeSkills(p.skills, { allowCustom: true, max: 50 })
      : allowedCustomSkills.length
        ? normalizeSkillsWithAllowedCustom(p.skills, allowedCustomSkills, {
            max: 50,
          })
        : normalizeSkills(p.skills, { max: 50 }),
    active: p.active === true,
    mode: ["Hibrid", "Ofisdə", "Uzaqdan"].includes(p.mode) ? p.mode : "Hibrid",
    salary: Math.max(0, Math.min(100000, Number(p.salary) || 0)),
    salaryMax: Math.max(0, Math.min(100000, Number(p.salaryMax) || 0)),
    salaryKind:
      p.salaryKind === "gross" || p.salaryKind === "net" ? p.salaryKind : "",
    references: Array.isArray(p.references)
      ? p.references
          .slice(0, 3)
          .map((r) => ({
            name: str(r?.name, 120),
            position: str(r?.position, 120),
            company: str(r?.company, 120),
            contact: str(r?.contact, 160),
          }))
          .filter((r) => r.name)
      : [],
    autoApply: p.autoApply === true,
    autoApplyScope: p.autoApplyScope === "followed" ? "followed" : "all",
    autoApplyMinScore: Math.max(
      AUTO_APPLY_FLOOR,
      Math.min(100, Math.round(Number(p.autoApplyMinScore)) || 85),
    ),
    experiences: Array.isArray(p.experiences)
      ? p.experiences.slice(0, 20).map((e) => ({
          id: str(e.id, 100) || crypto.randomUUID(),
          title: str(e.title, 150),
          company: str(e.company, 150),
          employmentType: normalizeEmploymentType(e.employmentType),
          start: str(e.start, 10),
          end: str(e.end, 10),
          current: e.current === true,
          description: str(e.description, 4000),
        }))
      : [],
    education: Array.isArray(p.education)
      ? p.education.slice(0, 10).map((e) => ({
          id: str(e.id, 100) || crypto.randomUUID(),
          school: str(e.school, 200),
          degree: str(e.degree, 200),
          year: str(e.year, 10),
        }))
      : [],
    structuredCv: profileJson(p.structuredCv),
    certifications: normalizeCandidateCertifications(p.certifications),
    certificationsDismissed: Array.isArray(p.certificationsDismissed)
      ? [
          ...new Set(
            p.certificationsDismissed
              .filter((id): id is string => typeof id === "string")
              .map((id) => id.slice(0, 100)),
          ),
        ].slice(0, 60)
      : [],
    inferredSkills: Array.isArray(p.inferredSkills)
      ? [
          ...new Set(
            p.inferredSkills
              .filter((id): id is string => typeof id === "string")
              .map((id) => id.slice(0, 100)),
          ),
        ].slice(0, 20)
      : [],
    cvFieldConfidence: Array.isArray(p.cvFieldConfidence)
      ? p.cvFieldConfidence
          .slice(0, 250)
          .map((item) => ({
            path: str(item?.path, 240),
            confidence: Math.max(0, Math.min(1, Number(item?.confidence) || 0)),
            needsReview: item?.needsReview === true,
            evidence: str(item?.evidence, 500),
          }))
          .filter((item) => item.path)
      : [],
    cvParserMetadata:
      p.cvParserMetadata && typeof p.cvParserMetadata === "object"
        ? {
            detectedCvLanguage: Array.isArray(
              p.cvParserMetadata.detectedCvLanguage,
            )
              ? p.cvParserMetadata.detectedCvLanguage
                  .slice(0, 10)
                  .map((x) => str(x, 50))
                  .filter(Boolean)
              : [],
            detectedFormat: str(p.cvParserMetadata.detectedFormat, 100),
            needsManualReview: p.cvParserMetadata.needsManualReview === true,
            reviewReasons: Array.isArray(p.cvParserMetadata.reviewReasons)
              ? p.cvParserMetadata.reviewReasons
                  .slice(0, 30)
                  .map((x) => str(x, 500))
                  .filter(Boolean)
              : [],
            ocrUsed: p.cvParserMetadata.ocrUsed === true,
          }
        : null,
  };
  for (const e of clean.experiences) {
    const datePattern =
      /^\d{4}(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/;
    const start = Date.parse(
        e.start.length === 4
          ? e.start + "-01-01"
          : e.start.length === 7
            ? e.start + "-01"
            : e.start,
      ),
      end = e.current
        ? Date.now()
        : Date.parse(
            e.end.length === 4
              ? e.end + "-12-31"
              : e.end.length === 7
                ? e.end + "-01"
                : e.end,
          );
    if (
      !e.title ||
      !e.company ||
      !datePattern.test(e.start) ||
      (!e.current && !datePattern.test(e.end)) ||
      !Number.isFinite(start) ||
      start > Date.now() ||
      !Number.isFinite(end) ||
      end < start
    )
      throw new HttpError(
        400,
        "İş təcrübəsində vəzifə, şirkət və düzgün tarix aralığı tələb olunur.",
      );
  }
  for (const e of clean.education)
    if (!e.school || !e.degree)
      throw new HttpError(400, "Təhsil müəssisəsi və ixtisası doldurun.");
  return clean;
}
export function jobInput(
  value: unknown,
  allowedCustomSkills: string[] = [],
): Job {
  const j = value as Job;
  const skills = allowedCustomSkills.length
    ? normalizeSkillsWithAllowedCustom(j?.skills, allowedCustomSkills, {
        max: 30,
      })
    : normalizeSkills(j?.skills, { max: 30 });
  if (
    !j ||
    !str(j.title) ||
    !str(j.company) ||
    !str(j.description) ||
    !skills.length
  )
    throw new HttpError(400, "Vəzifə, şirkət, təsvir və bacarıqları doldurun.");
  if (!VACANCY_REASONS.some((reason) => reason.id === j.reason))
    throw new HttpError(
      400,
      "Vakansiyanın yaradılma səbəbini seçin (bu məlumat yalnız şirkət üçündür).",
    );
  const min = Number(j.minSalary),
    max = Number(j.maxSalary),
    yrs = Number(j.minYears);
  if (
    !Number.isFinite(min) ||
    min < 0 ||
    !Number.isFinite(max) ||
    max < min ||
    !Number.isFinite(yrs) ||
    yrs < 0 ||
    yrs > 50
  )
    throw new HttpError(400, "Maaş aralığını və təcrübə tələbini yoxlayın.");
  return {
    id: str(j.id, 100) || crypto.randomUUID(),
    owner: "",
    title: str(j.title, 150),
    company: str(j.company, 150),
    city: str(j.city, 80) || "Bakı",
    mode: ["Hibrid", "Ofisdə", "Uzaqdan"].includes(j.mode) ? j.mode : "Ofisdə",
    type: ["Tam ştat", "Yarımştat", "Müqavilə"].includes(j.type)
      ? j.type
      : "Tam ştat",
    category: str(j.category, 50),
    minSalary: min,
    maxSalary: max,
    salaryKind:
      j.salaryKind === "gross" || j.salaryKind === "net" ? j.salaryKind : "",
    minYears: yrs,
    maxYears: Math.max(yrs, Number(j.maxYears) || yrs + 3),
    skills,
    description: str(j.description),
    requirements: str(j.requirements),
    deadline: str(j.deadline, 20),
    workSchedule: str(j.workSchedule, 500),
    address: str(j.address, 300),
    benefits: str(j.benefits, 1000),
    certifications: normalizeJobCertifications(j.certifications),
    stages: sanitizeStages(j.stages),
    reason: j.reason,
    reasonNote: str(j.reasonNote, 300),
    created: new Date().toISOString(),
    demo: false,
    status: "draft",
  };
}
export async function jsonBody(request: Request) {
  if (Number(request.headers.get("content-length")) > 300000)
    throw new HttpError(413, "Məlumat həcmi çox böyükdür.");
  const raw = await request.text();
  if (raw.length > 150000)
    throw new HttpError(413, "Məlumat həcmi çox böyükdür.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Sorğu məlumatları oxunmadı.");
  }
}
type AiLimits = {
  maxInputChars?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  // For the admin usage panel: what the call is for, and whose request it is.
  feature?: string;
  user?: string;
};
// One row per day, feature, provider and user; counts calls, text sizes and failures (never the text itself).
export async function recordAiUsage(entry: {
  feature: string;
  provider: string;
  user: string;
  charsIn: number;
  charsOut: number;
  error: boolean;
}) {
  try {
    const db = await store();
    await db
      .prepare(
        `INSERT INTO ai_usage(day,feature,provider,user_id,calls,chars_in,chars_out,errors) VALUES(?,?,?,?,1,?,?,?)
        ON CONFLICT(day,feature,provider,user_id) DO UPDATE SET calls=calls+1,chars_in=chars_in+excluded.chars_in,chars_out=chars_out+excluded.chars_out,errors=errors+excluded.errors`,
      )
      .bind(
        new Date().toISOString().slice(0, 10),
        entry.feature.slice(0, 40),
        entry.provider,
        entry.user.slice(0, 100),
        entry.charsIn,
        entry.charsOut,
        entry.error ? 1 : 0,
      )
      .run();
  } catch {
    // Usage statistics are best-effort (before the migration they are simply not kept).
  }
}
// The monthly AI limit is checked at most once a minute.
let budgetCheck: { at: number; over: boolean } | null = null;
async function assertAiBudget() {
  if (!budgetCheck || Date.now() - budgetCheck.at > 60_000) {
    const db = await store();
    const limit = await readAiBudget(db).catch(() => 0);
    const over = limit > 0 && (await monthSpendUsd(db).catch(() => 0)) >= limit;
    budgetCheck = { at: Date.now(), over };
  }
  if (budgetCheck.over) throw new HttpError(402, BUDGET_EXCEEDED_MESSAGE);
}
// Whether the provider answers, kept for the admin; written only when it changes
// (and at most once an hour while it stays broken).
let healthState: "unknown" | "ok" | AiFailure = "unknown";
let healthWrittenAt = 0;
export async function noteAiHealth(state: "ok" | AiFailure, code = "") {
  try {
    const db = await store();
    if (state === "ok") {
      if (healthState === "ok") return;
      // The first success in this instance clears an old failure flag.
      if (healthState === "unknown" && (await readAiHealth(db)).state === "ok") {
        healthState = "ok";
        return;
      }
      healthState = "ok";
      await writeAiHealth(db, { state: "ok", code: "", at: new Date().toISOString() });
      return;
    }
    if (healthState === state && Date.now() - healthWrittenAt < 3_600_000) return;
    healthState = state;
    healthWrittenAt = Date.now();
    await writeAiHealth(db, { state, code: code.slice(0, 60), at: new Date().toISOString() });
  } catch {
    // Health is informational only.
  }
}
// What a refused provider request becomes: a plain message for people, the details for the admin.
export async function providerRefusal(status: number, code: string) {
  const kind = classifyAiFailure(status, code);
  await noteAiHealth(kind, `${status}${code ? `, ${code}` : ""}`);
  return new HttpError(502, friendlyAiMessage(kind));
}
export async function aiText(
  instructions: string,
  input: string,
  json = false,
  limits: AiLimits = {},
) {
  const settings = runtime();
  const provider =
    settings.AI_PROVIDER !== "openai" && settings.DEEPSEEK_API_KEY
      ? "deepseek"
      : "openai";
  if (provider === "openai" && !settings.OPENAI_API_KEY)
    return aiTextRaw(instructions, input, json, limits);
  await assertAiBudget();
  const base = {
    feature: limits.feature || "other",
    provider,
    user: limits.user || "",
    charsIn:
      instructions.length +
      Math.min(input.length, limits.maxInputChars || 30000),
  };
  try {
    const text = await aiTextRaw(instructions, input, json, limits);
    await recordAiUsage({ ...base, charsOut: text?.length || 0, error: false });
    await noteAiHealth("ok");
    return text;
  } catch (error) {
    await recordAiUsage({ ...base, charsOut: 0, error: true });
    throw error;
  }
}
async function aiTextRaw(
  instructions: string,
  input: string,
  json: boolean,
  limits: AiLimits,
) {
  const settings = runtime();
  const maxInputChars = Math.min(120000, limits.maxInputChars || 30000);
  const maxOutputTokens = Math.min(16000, limits.maxOutputTokens || 3500);
  const timeoutMs = Math.min(120000, Math.max(0, limits.timeoutMs || 0));
  const useOpenAI = settings.AI_PROVIDER === "openai";
  if (!useOpenAI && settings.DEEPSEEK_API_KEY) {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: settings.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: input.slice(0, maxInputChars) },
        ],
        max_tokens: maxOutputTokens,
        // Low temperature keeps scores stable for the same CV.
        temperature: json ? 0.2 : 0.7,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        stream: false,
      }),
      signal: AbortSignal.timeout(timeoutMs || 60000),
    });
    if (!response.ok) {
      const failure = (await response.json().catch(() => null)) as {
        error?: { code?: string; type?: string };
      } | null;
      throw await providerRefusal(response.status, failure?.error?.code || failure?.error?.type || "");
    }
    const data = (await response.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
    };
    if (data.choices?.[0]?.finish_reason === "length")
      throw new HttpError(
        502,
        "AI cavabı yarımçıq qaldı. CV ixtisar edilmədən yenidən analiz üçün bir daha sınayın.",
      );
    return data.choices?.[0]?.message?.content || null;
  }
  if (!settings.OPENAI_API_KEY) return null;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: settings.OPENAI_MODEL || "gpt-5.2",
      instructions,
      // JSON mode requires the word "json" in the input itself.
      input:
        (json ? "Return the answer as a JSON object. Input data:\n" : "") +
        input.slice(0, maxInputChars),
      store: false,
      max_output_tokens: maxOutputTokens,
      ...(json ? { text: { format: { type: "json_object" } } } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs || 45000),
  });
  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as {
      error?: { code?: string; type?: string };
    } | null;
    throw await providerRefusal(response.status, failure?.error?.code || failure?.error?.type || "");
  }
  const body = (await response.json()) as {
    status?: string;
    incomplete_details?: { reason?: string };
    output?: { content?: { type: string; text?: string }[] }[];
  };
  if (body.status === "incomplete")
    throw new HttpError(
      502,
      "AI cavabı yarımçıq qaldı. Bir az sonra yenidən sınayın.",
    );
  return (
    body.output
      ?.flatMap((x) => x.content || [])
      .filter((x) => x.type === "output_text")
      .map((x) => x.text)
      .join("\n") || null
  );
}

// AI results are cached per user and exact input so the same CV gets the same
// answer and repeated clicks do not cost another model call. Callers invoke
// `save()` only after the response passed validation, so a broken answer is
// never replayed. The cache is an optimization: without the table every call
// simply goes to the model.
const AI_CACHE_DAYS = 30;
export async function cachedAiText(
  kind: string,
  userId: string,
  instructions: string,
  input: string,
  json = false,
  limits: AiLimits = {},
): Promise<{
  text: string | null;
  cached: boolean;
  save: () => Promise<void>;
}> {
  const settings = runtime();
  const model =
    settings.AI_PROVIDER !== "openai" && settings.DEEPSEEK_API_KEY
      ? `deepseek:${settings.DEEPSEEK_MODEL || "deepseek-chat"}`
      : `openai:${settings.OPENAI_MODEL || "gpt-5.2"}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      [kind, model, userId, instructions, input].join("\u0000"),
    ),
  );
  const key = `${kind}:${Buffer.from(digest).toString("hex")}`;
  const db = await store();
  const noop = async () => {};
  try {
    const hit = await db
      .prepare(
        "SELECT value FROM ai_cache WHERE key=? AND created>=datetime('now',?)",
      )
      .bind(key, `-${AI_CACHE_DAYS} days`)
      .first<{ value: string }>();
    if (hit) return { text: hit.value, cached: true, save: noop };
  } catch {
    // Cache table not migrated yet.
  }
  const text = await aiText(instructions, input, json, {
    feature: kind,
    user: userId,
    ...limits,
  });
  const save = async () => {
    if (!text) return;
    try {
      await db.batch([
        db
          .prepare(
            "INSERT OR REPLACE INTO ai_cache(key,user_id,kind,value,created) VALUES(?,?,?,?,datetime('now'))",
          )
          .bind(key, userId, kind, text),
        db
          .prepare("DELETE FROM ai_cache WHERE created<datetime('now',?)")
          .bind(`-${AI_CACHE_DAYS} days`),
      ]);
    } catch {
      // Cache table not migrated yet.
    }
  };
  return { text, cached: false, save };
}
