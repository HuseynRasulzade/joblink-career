import { skillMatches } from "./skill-synonyms.ts";
import { normalizeSkillKey, normalizeSkills, skillId } from "./skill-catalog.ts";
import {
  certificationById,
  certificationLevelRank,
  detectCertifications,
  normalizeCandidateCertifications,
  normalizeJobCertifications,
  type CandidateCertification,
  type JobCertification,
} from "./certification-catalog.ts";
import { canonicalJobTitle, jobTitleFamily, JOB_TITLE_FAMILIES } from "./job-title-catalog.ts";
export type Experience = {
  id: string;
  title: string;
  company: string;
  employmentType?: string;
  start: string;
  end: string;
  current: boolean;
  description: string;
};
export const EMPLOYMENT_TYPES = [
  "Tam ştat",
  "Yarımştat",
  "Özünüməşğul",
  "Sərbəst",
  "Müqavilə",
  "Təcrübəçi",
  "Şagirdlik",
  "Mövsümi",
  "Müvəqqəti",
  "Könüllü",
] as const;

export function normalizeEmploymentType(value: unknown) {
  const input = typeof value === "string"
    ? value.toLocaleLowerCase("az").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim()
    : "";
  if (!input) return "";
  const aliases: Array<[string, string[]]> = [
    ["Tam ştat", ["tam stat", "full time", "full-time", "fulltime", "полная занятость"]],
    ["Yarımştat", ["yarimstat", "part time", "part-time", "parttime", "частичная занятость"]],
    ["Özünüməşğul", ["ozunumesgul", "self employed", "self-employed", "самозанятый"]],
    ["Sərbəst", ["serbest", "freelance", "freelancer", "фриланс"]],
    ["Müqavilə", ["muqavile", "contract", "contractor", "müqavilə əsasında", "контракт"]],
    ["Təcrübəçi", ["tecrubeci", "intern", "internship", "стажировка", "стажер"]],
    ["Şagirdlik", ["sagirdlik", "apprentice", "apprenticeship"]],
    ["Mövsümi", ["movsumi", "seasonal", "сезонная"]],
    ["Müvəqqəti", ["muveqqeti", "temporary", "temp", "временная"]],
    ["Könüllü", ["konullu", "volunteer", "voluntary", "волонтер"]],
  ];
  return aliases.find(([canonical, values]) =>
    canonical.toLocaleLowerCase("az") === input || values.includes(input),
  )?.[0] || "";
}
export type Education = {
  id: string;
  school: string;
  degree: string;
  year: string;
};
export type CvFieldConfidence = {
  path: string;
  confidence: number;
  needsReview: boolean;
  evidence: string;
};
export type CvParserRecord = {
  detectedCvLanguage: string[];
  detectedFormat: string;
  needsManualReview: boolean;
  reviewReasons: string[];
  ocrUsed: boolean;
};
export type Reference = { name: string; position: string; company: string; contact: string };
export type Profile = {
  name: string;
  title: string;
  email: string;
  phone: string;
  city: string;
  summary: string;
  skills: string[];
  languages: string;
  certificates: string;
  links: string;
  active: boolean;
  salary: number;
  // Upper end of the acceptable range; 0 means no ceiling.
  salaryMax?: number;
  mode: string;
  experiences: Experience[];
  education: Education[];
  cvText: string;
  cvName: string;
  autoApply: boolean;
  autoApplyMinScore: number;
  // "followed": only companies the candidate follows. Default: all companies.
  autoApplyScope?: "all" | "followed";
  structuredCv: Record<string, unknown> | null;
  cvFieldConfidence: CvFieldConfidence[];
  cvParserMetadata: CvParserRecord | null;
  certifications?: CandidateCertification[];
  // People who can vouch for the candidate; shown only to employers the candidate applied to.
  references?: Reference[];
  // Set by the server for employers: experience ids and certification ids
  // whose documents were checked and confirmed.
  verified?: { experience: string[]; certification: string[] };
  // Certifications the candidate removed; never re-added from the CV.
  certificationsDismissed?: string[];
};
export type Job = {
  id: string;
  owner: string;
  title: string;
  company: string;
  city: string;
  mode: string;
  type: string;
  category: string;
  minSalary: number;
  maxSalary: number;
  minYears: number;
  maxYears: number;
  skills: string[];
  description: string;
  requirements: string;
  deadline?: string;
  workSchedule?: string;
  address?: string;
  benefits?: string;
  created: string;
  demo: boolean;
  status: string;
  certifications?: JobCertification[];
  // Selection stages, shown to candidates once their application is accepted.
  stages?: string[];
  // Internal: why the vacancy was opened (for the employer's reports only).
  reason?: string;
  reasonNote?: string;
  // Set by the server when the owning company passed document verification.
  companyVerified?: boolean;
};
export const JOB_CATEGORIES = [
  "Satış və müştəri xidməti",
  "Maliyyə, bankçılıq və sığorta",
  "Mühəndislik və texniki sahələr",
  "Satınalma və təchizat zənciri",
  "Biznes, idarəetmə və HR",
  "Otel, iaşə və turizm",
  "İT və məlumat analitikası",
  "Təhsil və təlim",
  "Marketinq və kommunikasiya",
  "Hüquq və uyğunluq",
  "Əmlak və təsərrüfat",
  "Dizayn və yaradıcı sahələr",
  "İstehsalat",
  "Səhiyyə və əczaçılıq",
  "Təhlükəsizlik",
] as const;
export type Application = {
  id: string;
  jobId: string;
  status: string;
  created: string;
  profile: Profile;
  candidateId?: string;
  job?: Job;
  auto?: boolean;
  stage?: string;
  duplicate?: { otherVacancies: number; sameContactAs: string[] } | null;
  events?: { type: string; from_value: string; to_value: string; note?: string; created: string }[];
};
export const blankProfile: Profile = {
  name: "",
  title: "",
  email: "",
  phone: "",
  city: "Bakı",
  summary: "",
  skills: [],
  languages: "",
  certificates: "",
  links: "",
  references: [],
  active: false,
  salary: 1200,
  salaryMax: 0,
  mode: "Hibrid",
  experiences: [],
  education: [],
  cvText: "",
  cvName: "",
  autoApply: false,
  autoApplyMinScore: 85,
  autoApplyScope: "all",
  structuredCv: null,
  cvFieldConfidence: [],
  cvParserMetadata: null,
  certifications: [],
};
export const sampleProfile: Profile = {
  ...blankProfile,
  name: "Aysel Məmmədova",
  title: "Mühasibatlıq üzrə mütəxəssis",
  email: "aysel@example.com",
  phone: "",
  summary:
    "Mühasibatlıq və maliyyə hesabatlılığı sahəsində təcrübəli mütəxəssis. Excel və 1C ilə gündəlik əməliyyatların uçotu, əməkhaqqının hesablanması və hesabatların hazırlanması.",
  skills: ["Excel", "1C", "Mühasibatlıq", "Hesabatlılıq", "Əməkhaqqı"],
  languages: "Azərbaycan dili — ana dili; İngilis dili — B1",
  active: true,
  experiences: [
    {
      id: "exp1",
      title: "Mühasib",
      company: "Caspian Trade",
      employmentType: "Tam ştat",
      start: "2023-09",
      end: "2026-09",
      current: false,
      description:
        "Maliyyə hesabatlarının hazırlanması, gündəlik uçot və əməkhaqqının hesablanması.",
    },
  ],
  education: [
    {
      id: "ed1",
      school: "Azərbaycan Dövlət İqtisad Universiteti",
      degree: "Maliyyə üzrə bakalavr",
      year: "2023",
    },
  ],
  cvName: "",
};
function job(
  id: string,
  title: string,
  company: string,
  category: string,
  skills: string[],
  minSalary: number,
  maxSalary: number,
  minYears: number,
  mode = "Hibrid",
  city = "Bakı",
): Job {
  return {
    id,
    owner: "demo",
    title,
    company,
    category,
    skills,
    minSalary,
    maxSalary,
    minYears,
    maxYears: minYears + 3,
    mode,
    city,
    type: "Tam ştat",
    description: `${title} vəzifəsində komanda ilə əməkdaşlıq, gündəlik əməliyyatların idarə edilməsi və nəticələrin hesabatlaşdırılması.`,
    requirements:
      skills.join(", ") +
      " bacarıqları. Analitik düşüncə və komanda ilə işləmək bacarığı.",
    created: "2026-09-10T10:00:00Z",
    demo: true,
    status: "published",
  };
}
export const sampleJobs: Job[] = [
  job(
    "demo-accountant",
    "Mühasib",
    "Caspian Finance",
    "Maliyyə",
    ["Mühasibatlıq", "Excel", "1C"],
    1200,
    1800,
    2,
  ),
  job(
    "demo-finance",
    "Maliyyə üzrə mütəxəssis",
    "Kapital Bank",
    "Maliyyə",
    ["Maliyyə", "Hesabatlılıq", "Excel"],
    1500,
    2200,
    3,
    "Ofisdə",
  ),
  job(
    "demo-hr",
    "HR əməliyyatları üzrə mütəxəssis",
    "PASHA Holding",
    "HR",
    ["Əməkhaqqı", "HR", "Excel"],
    1400,
    2000,
    2,
  ),
  job(
    "demo-react",
    "Frontend Developer (React)",
    "TechSoft Group",
    "IT",
    ["JavaScript", "React", "CSS", "HTML"],
    1200,
    1800,
    1,
  ),
  job(
    "demo-python",
    "Backend Developer (Python)",
    "TechSoft Group",
    "IT",
    ["Python", "Django", "SQL"],
    1800,
    2400,
    2,
    "Uzaqdan",
  ),
  job(
    "demo-mobile",
    "Mobile App Developer (React Native)",
    "TechSoft Group",
    "IT",
    ["React Native", "JavaScript", "Mobile"],
    1500,
    2200,
    2,
  ),
  job(
    "demo-assistant",
    "Mühasib köməkçisi",
    "Azər Trade",
    "Maliyyə",
    ["Excel", "Mühasibatlıq"],
    700,
    1100,
    0,
    "Ofisdə",
    "Sumqayıt",
  ),
];
export function years(p: Profile) {
  const timestamp = (value: string, end = false) =>
    Date.parse(
      value.length === 4
        ? `${value}-${end ? "12-31" : "01-01"}`
        : value.length === 7
          ? `${value}-01`
          : value,
    );
  const structuredExperiences = Array.isArray(p.structuredCv?.work_experience)
    ? (p.structuredCv.work_experience as Record<string, unknown>[]).map((item) => ({
        start: typeof item.start_date === "string" ? item.start_date : "",
        end: typeof item.end_date === "string" ? item.end_date : "",
        current: item.is_current === true,
      }))
    : [];
  const experienceYears = (records: { start: string; end: string; current: boolean }[]) => {
    const ranges = records
    .map((e) => [
      timestamp(e.start),
      e.current
        ? Date.now()
        : Math.min(Date.now(), timestamp(e.end || e.start, true)),
    ])
    .filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && e >= s)
      .sort((a, b) => a[0] - b[0]);
    let total = 0,
      start = 0,
      end = 0;
    for (const [s, e] of ranges) {
      if (s > end) {
        total += end - start;
        start = s;
        end = e;
      } else end = Math.max(end, e);
    }
    return Math.round((total + end - start) / 3155760000) / 10;
  };
  return Math.max(experienceYears(p.experiences), experienceYears(structuredExperiences));
}
export const normalize = (s: string) =>
  s
    .toLocaleLowerCase("az")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .trim();
// Bump whenever the scoring rules change so cached AI results are not reused.
export const MATCH_VERSION = "2026-10-18.1";
// Profession families used to decide whether a candidate's past roles are
// related to a vacancy. Words are normalized prefixes (see `normalize`).
export const ROLE_FAMILIES: { family: string; words: string[] }[] = [
  { family: "finance", words: ["muhasib", "maliyy", "audit", "xezinedar", "kassir", "bank", "kredit", "byudce", "budce", "accountant", "accounting", "finance", "financial", "auditor", "treasur", "economist", "iqtisadci", "vergi", "tax"] },
  { family: "hr", words: ["hr", "insan resurs", "rekruter", "recruit", "ise qebul", "kadr", "talent", "human resource"] },
  { family: "sales", words: ["satis", "musteri", "sales", "retail", "merchandis", "call center", "zeng merkez", "operator", "account manager", "customer"] },
  { family: "supply", words: ["satinalma", "tehcizat", "logistik", "anbar", "procurement", "supply", "warehouse", "kuryer", "courier", "surucu", "driver", "ekspeditor", "gomruk", "customs"] },
  { family: "engineering", words: ["muhendis", "mexanik", "elektrik", "texnik", "insaat", "engineer", "technician", "santexnik", "qaynaq"] },
  { family: "it", words: ["python", "backend", "frontend", "react", "developer", "proqramci", "programmer", "software", "data", "analyst", "analitik", "devops", "sistem admin", "qa ", "tester", "it "] },
  { family: "marketing", words: ["marketinq", "marketing", "kontent", "content", "smm", "kommunikasiya", "brand", "pr ", "copywrit", "dizayn", "design", "qrafik"] },
  { family: "legal", words: ["huquq", "legal", "compliance", "uygunluq", "lawyer", "vekil", "notarius"] },
  { family: "education", words: ["muellim", "telim", "teacher", "trainer", "tedris", "pedaqoq", "tutor"] },
  { family: "hospitality", words: ["otel", "turizm", "reseps", "asbaz", "ofisiant", "barista", "hotel", "chef", "cook", "waiter", "restoran"] },
  { family: "health", words: ["hekim", "eczaci", "tibb", "pharma", "doctor", "nurse", "feldser", "stomatoloq"] },
  { family: "security", words: ["tehlukesizlik", "muhafize", "hse", "security", "safety"] },
  { family: "admin", words: ["ofis", "office", "katib", "sekretar", "assistant", "inzibati", "administrator", "resepsion"] },
  { family: "oilgas", words: ["neft", "petroleum", "drilling", "qazma", "buruq", "refiner", "offshore", "boru kemeri", "pipeline", "energetik", "madenci", "mining"] },
  { family: "agriculture", words: ["agronom", "fermer", "farm", "kend teserrufat", "agricultur", "heyvandarliq", "baytar", "bagban", "arici"] },
  { family: "trades", words: ["derzi", "tikis", "tailor", "seamstress", "zergher", "jewel", "dulger", "carpenter", "mebel", "furniture", "xalca", "dulus"] },
  { family: "transport", words: ["pilot", "aviadispet", "aviation", "qatar", "railway", "gemi", "kapitan", "denizci", "seafarer", "liman", "port operator", "dispetcer"] },
  { family: "science", words: ["tedqiqatci", "researcher", "scientist", "elmi", "laborator", "kimyaci", "chemist", "fizik", "bioloq", "biolog", "riyaziyyat", "mathematic"] },
  { family: "social", words: ["sosial isci", "social worker", "qht", "ngo", "humanitar", "humanitarian", "konullu", "volunteer", "fundrais"] },
  { family: "personal", words: ["berber", "barber", "hairdress", "kosmetolog", "cosmetolog", "makiyaj", "makeup", "manikur", "fitnes", "fitness", "yoqa", "yoga", "stilist", "stylist"] },
  { family: "public", words: ["dovlet qulluqcu", "civil servant", "belediyye", "municipal", "vergi inspektor", "gomruk emekdas", "polis", "diplomat", "konsul"] },
];
// Folds Azerbaijani letters to plain Latin so "öyrənmək" matches "oyren".
const fold = (s: string) => normalize(s).replace(/ə/g, "e");
const ASPIRATION =
  /(oyren|kurs|istey|maraql|planlas|hedef|arzu|oxumusam|oxuyuram|niyyet|want|wish|learn|course|interested|plan to|aspir|goal|hope)/;
const GENERIC_TITLE_WORDS = new Set([
  "bas", "boyuk", "kicik", "uzre", "mutexessis", "mutexessisi", "menecer", "meneceri",
  "rehber", "rehberi", "direktor", "direktoru", "komekci", "komekcisi", "senior", "junior",
  "middle", "lead", "head", "chief", "manager", "specialist", "assistant", "officer",
  "isci", "emekdas", "shobe", "sobe", "department", "and", "for",
]);
const roleTokens = (title: string) =>
  fold(title)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !GENERIC_TITLE_WORDS.has(w));
const sameStem = (a: string, b: string) =>
  a.slice(0, 5) === b.slice(0, 5) && Math.min(a.length, b.length) >= 4;
export function roleFamilies(text: string) {
  const t = ` ${fold(text)} `;
  const families = new Set(
    ROLE_FAMILIES.filter((f) => f.words.some((w) => t.includes(w))).map((f) => f.family),
  );
  // A title from the shared catalog carries its own profession family.
  const catalogFamily = jobTitleFamily(text.trim());
  if (catalogFamily) families.add(catalogFamily);
  return families;
}
// 1 = same profession, 0.7 = same family, 0.4 = unknown, 0.1 = unrelated.
export function roleRelevance(candidateTitle: string, j: Job) {
  if (!candidateTitle.trim()) return 0.4;
  // The same catalog title in any language or spelling is the same profession.
  const own = canonicalJobTitle(candidateTitle.trim());
  const wanted = canonicalJobTitle(j.title.trim());
  if (own && wanted && (own.base || own.id) === (wanted.base || wanted.id)) return 1;
  const jobTokens = roleTokens(j.title);
  if (roleTokens(candidateTitle).some((a) => jobTokens.some((b) => sameStem(a, b))))
    return 1;
  const jobFamilies = roleFamilies(`${j.title} ${j.category}`);
  const families = roleFamilies(candidateTitle);
  if (!families.size || !jobFamilies.size) return 0.4;
  return [...families].some((f) => jobFamilies.has(f)) ? 0.7 : 0.1;
}
type RoleRecord = { title: string; text: string; start: string; end: string; current: boolean };
function roleRecords(p: Profile): RoleRecord[] {
  const list = (value: unknown) =>
    Array.isArray(value) ? value.filter((x) => typeof x === "string").join(". ") : "";
  const structured = Array.isArray(p.structuredCv?.work_experience)
    ? (p.structuredCv.work_experience as Record<string, unknown>[]).map((item) => ({
        title: typeof item.position === "string" ? item.position : "",
        text: [list(item.responsibilities), list(item.achievements), list(item.technologies), list(item.skills_used)].join(". "),
        start: typeof item.start_date === "string" ? item.start_date : "",
        end: typeof item.end_date === "string" ? item.end_date : "",
        current: item.is_current === true,
      }))
    : [];
  return [
    ...p.experiences.map((e) => ({ title: e.title, text: e.description, start: e.start, end: e.end, current: e.current })),
    ...structured,
  ];
}
// Sentences that only express intent ("I want to learn 1C") are not evidence.
const factualText = (text: string) =>
  text
    .split(/[\n.;!?•]+/)
    .filter((sentence) => !ASPIRATION.test(fold(sentence)))
    .join(". ");
export type SkillEvidence = "experience" | "certified" | "declared" | "mentioned" | "none";
const EVIDENCE_WEIGHT: Record<SkillEvidence, number> = {
  experience: 1,
  certified: 0.85,
  declared: 0.7,
  mentioned: 0.5,
  none: 0,
};
// Certifications the candidate selected, plus those recognized in the
// certificates field and CV text. A selected entry overrides a detected one.
export function certificationSourceText(p: Profile) {
  const structured = Array.isArray(p.structuredCv?.certifications)
    ? (p.structuredCv.certifications as Record<string, unknown>[])
        .map((item) =>
          [item.certificate_name, item.issuing_organization, item.status, item.issue_date]
            .filter((x) => typeof x === "string")
            .join(" "),
        )
        .join("\n")
    : "";
  return [p.certificates, structured, p.cvText].filter(Boolean).join("\n");
}
export function candidateCertifications(p: Profile): CandidateCertification[] {
  const explicit = normalizeCandidateCertifications(p.certifications);
  const dismissed = new Set(p.certificationsDismissed || []);
  const detected = detectCertifications(certificationSourceText(p));
  const ids = new Set(explicit.map((c) => c.id));
  return [...explicit, ...detected.filter((c) => !ids.has(c.id) && !dismissed.has(c.id))];
}
export type CertificationEvidence =
  | "held"
  | "below_level"
  | "equivalent"
  | "in_progress"
  | "expired"
  | "none";
const CERT_WEIGHT: Record<CertificationEvidence, number> = {
  held: 1,
  below_level: 0.6,
  equivalent: 0.7,
  in_progress: 0.5,
  expired: 0.6,
  none: 0,
};
function certificationEvidence(
  held: CandidateCertification[],
  wanted: JobCertification,
): CertificationEvidence {
  const definition = certificationById(wanted.id);
  const own = held.find((c) => c.id === wanted.id);
  if (own) {
    // Specific exams requested by the employer: passing them meets the
    // requirement even while the full qualification is still in progress.
    if (wanted.modules?.length && own.status !== "expired") {
      const passed = new Set(own.passed || []);
      const complete = own.status === "active" && !(own.passed || []).length;
      if (complete || wanted.modules.every((code) => passed.has(code))) return "held";
      return "in_progress";
    }
    if (own.status === "in_progress") return "in_progress";
    if (own.status === "expired") return "expired";
    if (definition && wanted.minLevel && own.level) {
      const have = certificationLevelRank(definition, own.level);
      const need = certificationLevelRank(definition, wanted.minLevel);
      if (have >= 0 && need >= 0 && have < need) return "below_level";
    }
    return "held";
  }
  if (
    definition?.group &&
    held.some((c) => c.status === "active" && certificationById(c.id)?.group === definition.group)
  )
    return "equivalent";
  return "none";
}
export function match(p: Profile, j: Job) {
  const profileSkillIds = new Set(normalizeSkills(p.skills, { max: 50 }).map(skillId));
  const roles = roleRecords(p);
  const relevance = roles.map((r) => roleRelevance(r.title, j));
  // Titles whose profession could not be recognized (0.4) neither help nor hurt.
  const known = [roleRelevance(p.title, j), ...relevance].filter((r) => r !== 0.4);
  const summaryFamilies = roleFamilies(p.summary);
  const summaryRelated = [...roleFamilies(`${j.title} ${j.category}`)].some((f) => summaryFamilies.has(f));
  // Without recognizable titles, a professional summary may still name the field.
  const role = known.length ? Math.max(...known) : summaryRelated ? 0.7 : 0.4;
  const relatedHistory = relevance.some((r) => r >= 0.7);
  const experienceText = factualText(roles.map((r) => `${r.title}. ${r.text}`).join(". "));
  const declaredText = factualText(p.summary);
  const mentionedText = factualText(p.cvText);
  const requiredSkills = normalizeSkills(j.skills, { max: 30 });
  const certifications = candidateCertifications(p);
  // An active certification evidences the skills it examines.
  const certifiedSkillIds = new Set(
    certifications
      .filter((c) => c.status === "active")
      .flatMap((c) => certificationById(c.id)?.skills || []),
  );
  const skillEvidence = requiredSkills.map((skill) => {
    let level: SkillEvidence = "none";
    if (skillMatches(skill, experienceText)) level = "experience";
    else if (certifiedSkillIds.has(skillId(skill))) level = "certified";
    else if (profileSkillIds.has(skillId(skill)) || skillMatches(skill, declaredText)) level = "declared";
    else if (skillMatches(skill, mentionedText)) level = "mentioned";
    return { skill, level };
  });
  const jobCertifications = normalizeJobCertifications(j.certifications);
  const certEvidence = jobCertifications.map((wanted) => ({
    id: wanted.id,
    required: wanted.required,
    minLevel: wanted.minLevel,
    level: certificationEvidence(certifications, wanted),
  }));
  const requiredCerts = certEvidence.filter((c) => c.required);
  const preferredBonus = Math.min(
    5,
    Math.round(
      certEvidence
        .filter((c) => !c.required)
        .reduce((sum, c) => sum + CERT_WEIGHT[c.level] * 2.5, 0),
    ),
  );
  const weight = (level: SkillEvidence) =>
    level === "declared" && relatedHistory ? 0.9 : EVIDENCE_WEIGHT[level];
  const matched = skillEvidence.filter((x) => x.level !== "none").map((x) => x.skill);
  const missing = skillEvidence.filter((x) => x.level === "none").map((x) => x.skill);
  // Required certifications sit in the same evidence pool as required skills.
  const evidenceItems = requiredSkills.length + requiredCerts.length;
  const skills = evidenceItems
    ? (skillEvidence.reduce((sum, x) => sum + weight(x.level), 0) +
        requiredCerts.reduce((sum, c) => sum + CERT_WEIGHT[c.level], 0)) /
      evidenceItems
    : role;
  const totalYears = years(p);
  // Only years spent in related roles count toward the vacancy requirement.
  const relevantYears = !roles.length || relevance.every((r) => r === 0.4)
    ? totalYears
    : years({
        ...p,
        experiences: p.experiences.filter((e) => roleRelevance(e.title, j) >= 0.7),
        structuredCv: p.structuredCv && Array.isArray(p.structuredCv.work_experience)
          ? {
              ...p.structuredCv,
              work_experience: (p.structuredCv.work_experience as Record<string, unknown>[]).filter(
                (item) => roleRelevance(typeof item.position === "string" ? item.position : "", j) >= 0.7,
              ),
            }
          : p.structuredCv,
      });
  const ratio = j.minYears ? relevantYears / j.minYears : 1;
  const overqualified = j.maxYears > j.minYears && relevantYears > j.maxYears + 5;
  // A vacancy without a minimum still favours someone with related work
  // behind them over a newcomer, and a newcomer in the same field over one
  // from another profession.
  const exp = overqualified
    ? 0.7
    : !j.minYears
      ? relevantYears > 0 ? 1 : role >= 0.7 ? 0.8 : 0.3
      : ratio >= 1 ? 1 : Math.pow(ratio, 1.5);
  // City and work mode are practical preferences, not qualifications, so
  // they are reported but never add to the fit score.
  const city =
    normalizeSkillKey(p.city) === normalizeSkillKey(j.city) || j.mode === "Uzaqdan";
  const mode = !j.mode || p.mode === j.mode;
  let score = Math.min(100, Math.round(skills * 50 + role * 25 + exp * 25 + preferredBonus));
  const caps: string[] = [];
  // A profile with nothing to evaluate must not score at all.
  const hasEvidence =
    profileSkillIds.size > 0 ||
    certifications.length > 0 ||
    [p.title, p.summary, p.cvText, ...roles.flatMap((r) => [r.title, r.text])].some((x) => x?.trim());
  if (!hasEvidence) {
    score = 0;
    caps.push("empty-profile");
  }
  if (requiredCerts.some((c) => c.level === "none")) {
    score = Math.min(score, 70);
    caps.push("missing-certification");
  }
  if (requiredSkills.length && !matched.length) {
    score = Math.min(score, 20);
    caps.push("no-skills");
  }
  if (role <= 0.1) {
    score = Math.min(score, 45);
    caps.push("unrelated-role");
  }
  if (j.minYears && relevantYears < j.minYears * 0.5) {
    // No related experience at all for a role that requires it is a weaker
    // fit than some experience that falls short.
    score = Math.min(score, relevantYears === 0 ? 40 : 60);
    caps.push("experience-gap");
  }
  return {
    score,
    matched,
    missing,
    skillEvidence,
    experience: totalYears,
    relevantYears,
    experienceMet: relevantYears >= j.minYears,
    breakdown: {
      skills: Math.round(skills * 50),
      role: Math.round(role * 25),
      experience: Math.round(exp * 25),
      certifications: preferredBonus,
    },
    certEvidence,
    certifications,
    locationFit: { city, mode },
    roleRelevance: role,
    caps,
  };
}
// Auto-apply acts on the candidate's behalf, so it needs stronger evidence
// than a ranking: a related role, most skills evidenced and enough experience.
export const AUTO_APPLY_FLOOR = 80;
export function autoApplyEligible(result: ReturnType<typeof match>, minScore: number) {
  const evidenced = result.skillEvidence.filter((x) => x.level === "experience" || x.level === "declared").length;
  return (
    result.score >= Math.max(AUTO_APPLY_FLOOR, minScore) &&
    result.roleRelevance >= 0.7 &&
    (!result.skillEvidence.length || evidenced / result.skillEvidence.length >= 0.6) &&
    !result.caps.length
  );
}
export function analyze(p: Profile) {
  const text = [
    p.summary,
    ...p.experiences.map((e) => e.description),
    p.cvText,
  ].join(" ");
  const fields = [
    p.name,
    p.title,
    p.email,
    p.phone,
    p.city,
    p.summary,
    p.skills.filter(Boolean).length,
    p.experiences.length,
    p.education.length,
    p.languages,
  ];
  const completeness = Math.round(
    (fields.filter(Boolean).length / fields.length) * 100,
  );
  const achievement = Math.min(
    100,
    (p.experiences.length ? 35 : 0) +
      (/\d+\s*(%|faiz|hesabat|əməkdaş|layihə|müştəri)/i.test(text) ? 40 : 0) +
      (text.length > 250 ? 25 : 0),
  );
  const skills = Math.min(
    100,
    p.skills.filter(Boolean).length * 15 +
      // Only recognized, completed certifications add to the score.
      Math.min(20, candidateCertifications(p).filter((c) => c.status === "active").length * 10),
  );
  const readability = Math.min(
    100,
    (p.summary.length >= 80 ? 40 : 0) +
      (p.experiences.every((e) => e.description.length > 30) &&
      p.experiences.length
        ? 40
        : 0) +
      (text.trim().length > 0 && text.length < 18000 ? 20 : 0),
  );
  const score = Math.round(
    completeness * 0.35 + achievement * 0.3 + skills * 0.2 + readability * 0.15,
  );
  const issues: string[] = [];
  if (!p.phone)
    issues.push(
      "Əlaqə nömrənizi əlavə edin ki, işəgötürən sizinlə əlaqə saxlaya bilsin.",
    );
  if (!/\d+\s*(%|faiz|hesabat|əməkdaş|layihə|müştəri)/i.test(text))
    issues.push(
      "Nailiyyətlərinizi rəqəmlərlə göstərin: iş həcmini, vaxta qənaəti və ya nəticəni qeyd edin. Yalnız faktiki nəticələrdən istifadə edin.",
    );
  if (p.skills.length < 5)
    issues.push(
      "Ən azı 5 real peşə bacarığı əlavə edin və onları iş təcrübəsində nümunələrlə əsaslandırın.",
    );
  if (!p.experiences.length)
    issues.push("İş təcrübəsi və ya layihələrinizi tarixlərlə əlavə edin.");
  if (p.summary.length < 80)
    issues.push(
      "Peşəkar xülasəyə ixtisasınızı, təcrübənizi və hədəflədiyiniz rolu əlavə edin.",
    );
  if (!p.education.length) issues.push("Təhsil məlumatlarını tamamlayın.");
  return {
    score,
    completeness,
    achievement,
    skills,
    readability,
    issues,
    years: years(p),
    source: "rules" as const,
  };
}
export function recommendations(
  p: Profile,
  language: "az" | "en" = "az",
  jobs: Job[] = sampleJobs,
) {
  const experience = years(p);
  return jobs
    .map((j) => ({ job: j, ...match(p, j) }))
    .filter((x) => x.matched.length > 0 && x.roleRelevance > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => ({
      ...x,
      reason:
        language === "en"
          ? `Your ${experience} years of experience and skills in ${x.matched.join(", ")} relate to this direction.`
          : `${experience} illik təcrübəniz və ${x.matched.join(", ")} bacarıqlarınız bu istiqamətlə əlaqəlidir.`,
      next: x.missing.length
        ? language === "en"
          ? `Develop your skills in ${x.missing.join(", ")} through a practical project or training.`
          : `${x.missing.join(", ")} üzrə biliklərinizi praktik layihə və ya təlimlə inkişaf etdirin.`
        : experience < x.job.minYears
          ? language === "en"
            ? `This role requires ${x.job.minYears} years of experience; consider assistant or junior roles first.`
            : `Bu rol ${x.job.minYears} il təcrübə tələb edir; əvvəlcə köməkçi və ya kiçik mütəxəssis rollarını araşdırın.`
          : language === "en"
            ? "Show specific achievements in your CV and prepare for interviews."
            : "Nailiyyətlərinizi konkret nümunələrlə CV-də göstərin və müsahibəyə hazırlaşın.",
    }));
}
// The employer's own wording of the position ("Baş mühasib", "Satış meneceri",
// "Senior Python Developer") when it is a known job title, so a draft built
// from a template keeps the seniority and the kind of role that was asked for.
function titleFromPrompt(prompt: string) {
  const words = prompt.match(/[\p{L}\p{N}+#.]+/gu) || [];
  for (let size = Math.min(4, words.length); size >= 1; size--) {
    for (let i = 0; i + size <= words.length; i++) {
      const phrase = words.slice(i, i + size).join(" ");
      // "3-5 il təcrübəli satış mütəxəssisi" asks for experience, not a senior title.
      if (/^təcrübəli\b/i.test(phrase)) continue;
      if (phrase.length >= 4 && canonicalJobTitle(phrase)) return phrase.charAt(0).toLocaleUpperCase("az") + phrase.slice(1);
    }
  }
  return "";
}
export function draftJob(prompt: string): Job | null {
  const t = normalize(prompt);
  const roles = [
    {
      words: ["muhasib", "maliyy", "audit", "xezinedar", "bank"],
      title: t.includes("muhasib") ? "Mühasib" : "Maliyyə üzrə mütəxəssis",
      category: "Maliyyə, bankçılıq və sığorta",
      skills: ["Excel", "Hesabatlılıq", "Maliyyə təhlili"],
      duties: ["Gündəlik maliyyə əməliyyatlarını düzgün və vaxtında icra etmək", "Aylıq hesabatları hazırlamaq və məlumatların dəqiqliyini yoxlamaq", "Sənədləri sistemləşdirmək və aidiyyəti tərəflərlə uzlaşdırmaq"],
      requirements: ["Maliyyə, mühasibatlıq və ya uyğun sahə üzrə təhsil", "Excel və maliyyə hesabatları ilə işləmək bacarığı", "Dəqiqlik, analitik düşüncə və məsuliyyət"],
    },
    {
      words: ["hr", "insan resurs", "rekruter", "ise qebul"],
      title: "HR mütəxəssisi",
      category: "Biznes, idarəetmə və HR",
      skills: ["İşə qəbul", "HR əməliyyatları", "Excel"],
      duties: ["İşə qəbul prosesini vakansiya tələbindən təklif mərhələsinədək idarə etmək", "Namizəd bazasını və müsahibə qeydlərini aktual saxlamaq", "HR sənədləşməsi və hesabatların hazırlanmasında iştirak etmək"],
      requirements: ["İnsan resursları, biznes və ya uyğun sahə üzrə təhsil", "Namizəd seçimi və müsahibə üsulları üzrə bilik", "Güclü ünsiyyət, məxfilik və təşkilatçılıq bacarığı"],
    },
    {
      words: ["satis", "satış", "musteri", "müştəri", "kassir", "retail"],
      title: t.includes("musteri") || t.includes("müştəri") ? "Müştəri xidməti üzrə mütəxəssis" : "Satış mütəxəssisi",
      category: "Satış və müştəri xidməti",
      skills: ["Satış", "Müştəri xidməti", "Danışıqlar"],
      duties: ["Müştəri ehtiyaclarını müəyyənləşdirərək uyğun həlləri təqdim etmək", "Satış müraciətlərini və nəticələri sistemdə qeyd etmək", "Müştəri məmnuniyyətini qorumaq və satış hədəflərinin icrasında iştirak etmək"],
      requirements: ["Satış və ya müştəri xidməti sahəsinə maraq", "Aydın ünsiyyət və etirazlarla işləmək bacarığı", "Nəticəyönümlülük və komanda işi"],
    },
    {
      words: ["satinalma", "satınalma", "tehcizat", "təchizat", "logistika", "anbar"],
      title: t.includes("logistika") ? "Logistika üzrə mütəxəssis" : "Satınalma üzrə mütəxəssis",
      category: "Satınalma və təchizat zənciri",
      skills: ["Satınalma", "Təchizat zənciri", "Təchizatçı danışıqları"],
      duties: ["Satınalma tələblərini toplamaq və təklifləri müqayisə etmək", "Təchizatçılarla kommersiya şərtlərini dəqiqləşdirmək", "Sifariş, çatdırılma və sənədləşmə prosesini izləmək"],
      requirements: ["Satınalma, logistika və ya uyğun sahə üzrə bilik", "Qiymət təhlili və danışıqlar aparmaq bacarığı", "Excel və sənəd dövriyyəsi ilə işləmək bacarığı"],
    },
    {
      words: ["muhendis", "mühəndis", "mexanik", "elektrik", "texnik", "inşaat", "insaat"],
      title: "Mühəndis",
      category: "Mühəndislik və texniki sahələr",
      skills: ["Texniki sənədləşmə", "Problemlərin həlli", "Təhlükəsizlik standartları"],
      duties: ["Texniki işləri plan və standartlara uyğun icra etmək", "Avadanlıq və proses göstəricilərini izləyərək nasazlıqları araşdırmaq", "Texniki hesabat və sənədləri hazırlamaq"],
      requirements: ["Uyğun mühəndislik ixtisası üzrə təhsil", "Texniki çertyoj və sənədləri oxumaq bacarığı", "Təhlükəsizlik qaydaları və keyfiyyət standartları üzrə bilik"],
    },
    {
      words: ["python", "backend", "frontend", "react", "developer", "proqramci", "proqramçı", "data", "it "],
      title: t.includes("frontend") || t.includes("react") ? "Frontend Developer" : t.includes("data") ? "Data Analyst" : "Backend Developer",
      category: "İT və məlumat analitikası",
      skills: t.includes("frontend") || t.includes("react") ? ["JavaScript", "React", "HTML/CSS"] : t.includes("data") ? ["SQL", "Excel", "Məlumat təhlili"] : ["Python", "API", "SQL"],
      duties: ["Tələblərə uyğun dayanıqlı həllər hazırlamaq və test etmək", "Kod keyfiyyətini qorumaq və texniki sənədləşmə aparmaq", "Komanda ilə planlaşdırma, yoxlama və buraxılış proseslərində iştirak etmək"],
      requirements: ["Uyğun texnologiyalar üzrə praktik bilik", "Versiya nəzarəti və test prinsipləri ilə işləmək bacarığı", "Analitik düşüncə və komanda daxilində ünsiyyət bacarığı"],
    },
    {
      words: ["marketinq", "marketing", "kontent", "content", "smm", "kommunikasiya", "pr "],
      title: t.includes("kontent") || t.includes("content") ? "Kontent mütəxəssisi" : "Marketinq mütəxəssisi",
      category: "Marketinq və kommunikasiya",
      skills: ["Kontent planlama", "Rəqəmsal marketinq", "Analitika"],
      duties: ["Hədəf auditoriyaya uyğun kontent və kampaniya planı hazırlamaq", "Materialların hazırlanmasını və vaxtında yayımlanmasını koordinasiya etmək", "Kampaniya göstəricilərini təhlil edib təkmilləşdirmə təklifləri vermək"],
      requirements: ["Marketinq, kommunikasiya və ya uyğun sahə üzrə bilik", "Yazılı ünsiyyət və kontent hazırlamaq bacarığı", "Rəqəmsal kanallar və analitika alətləri ilə işləmək bacarığı"],
    },
    {
      words: ["huquq", "hüquq", "legal", "compliance", "uygunluq", "uyğunluq"],
      title: t.includes("uygunluq") || t.includes("uyğunluq") || t.includes("compliance") ? "Uyğunluq üzrə mütəxəssis" : "Hüquqşünas",
      category: "Hüquq və uyğunluq",
      skills: ["Hüquqi araşdırma", "Müqavilələr", "Uyğunluq"],
      duties: ["Müqavilə və daxili sənədləri hüquqi baxımdan yoxlamaq", "Qanunvericilik dəyişikliklərini izləyib riskləri qiymətləndirmək", "Aidiyyəti bölmələrə hüquqi və uyğunluq dəstəyi göstərmək"],
      requirements: ["Hüquq üzrə ali təhsil", "Müqavilə və normativ sənədlərlə işləmək bacarığı", "Diqqətlilik, məxfilik və əsaslandırılmış yazı bacarığı"],
    },
    {
      words: ["muellim", "müəllim", "telim", "təlim", "teacher", "trainer"],
      title: t.includes("telim") || t.includes("təlim") ? "Təlimçi" : "Müəllim",
      category: "Təhsil və təlim",
      skills: ["Tədris planlaması", "Təqdimat", "Qiymətləndirmə"],
      duties: ["Tədris məqsədlərinə uyğun dərs və materiallar hazırlamaq", "İştirakçıların inkişafını qiymətləndirmək və geribildirim vermək", "Tədris nəticələrini izləyib proqramı təkmilləşdirmək"],
      requirements: ["Müvafiq sahə üzrə təhsil və mövzu biliyi", "Təqdimat və auditoriya ilə işləmək bacarığı", "Aydın ünsiyyət və planlaşdırma bacarığı"],
    },
    {
      words: ["otel", "turizm", "reseps", "asbaz", "aşbaz", "ofisiant"],
      title: t.includes("reseps") ? "Resepşn" : "Otel və qonaqpərvərlik üzrə əməkdaş",
      category: "Otel, iaşə və turizm",
      skills: ["Qonaq xidməti", "Ünsiyyət", "Əməliyyatların koordinasiyası"],
      duties: ["Qonaqları peşəkar şəkildə qarşılamaq və sorğularını cavablandırmaq", "Gündəlik əməliyyatları daxili standartlara uyğun icra etmək", "Xidmət keyfiyyəti və qonaq məmnuniyyətini izləmək"],
      requirements: ["Xidmət və qonaqpərvərlik sahəsinə maraq", "Nəzakətli ünsiyyət və problem həll etmə bacarığı", "Növbəli iş rejiminə uyğunluq yalnız tələb olunduqda"],
    },
    {
      words: ["dizayn", "designer", "qrafik", "videoqraf", "fotoqraf"],
      title: "Qrafik dizayner",
      category: "Dizayn və yaradıcı sahələr",
      skills: ["Qrafik dizayn", "Vizual kommunikasiya", "Portfolio"],
      duties: ["Brend tələblərinə uyğun vizual materiallar hazırlamaq", "Tapşırıqları son tarixlərə uyğun planlaşdırmaq və təqdim etmək", "Geribildirim əsasında dizaynları təkmilləşdirmək"],
      requirements: ["Müvafiq dizayn alətləri ilə işləmək bacarığı", "İş nümunələrindən ibarət portfolio", "Kompozisiya, tipoqrafiya və rəng prinsipləri üzrə bilik"],
    },
    {
      words: ["hekim", "həkim", "eczaci", "əczaçı", "tibb", "pharma"],
      title: t.includes("ecz") || t.includes("əcz") ? "Əczaçı" : "Tibb mütəxəssisi",
      category: "Səhiyyə və əczaçılıq",
      skills: ["Peşə standartları", "Sənədləşmə", "Pasiyent xidməti"],
      duties: ["Peşə fəaliyyətini qüvvədə olan standartlara uyğun icra etmək", "Məlumat və sənədləri dəqiq şəkildə qeyd etmək", "Pasiyent və aidiyyəti əməkdaşlarla etik ünsiyyət qurmaq"],
      requirements: ["Vəzifəyə uyğun ixtisas təhsili və tələb olunan icazələr", "Peşə standartları və məxfilik qaydaları üzrə bilik", "Diqqətlilik və məsuliyyət"],
    },
    {
      words: ["tehlukesizlik", "təhlükəsizlik", "muhafize", "mühafizə", "hse"],
      title: t.includes("hse") ? "HSE mütəxəssisi" : "Təhlükəsizlik üzrə mütəxəssis",
      category: "Təhlükəsizlik",
      skills: ["Risk qiymətləndirməsi", "Təhlükəsizlik prosedurları", "Hesabatlılıq"],
      duties: ["Təhlükəsizlik tələblərinə əməl olunmasını izləmək", "Riskləri müəyyənləşdirib qabaqlayıcı tədbirlər təklif etmək", "Hadisə və yoxlama nəticələrini sənədləşdirmək"],
      requirements: ["Müvafiq təhlükəsizlik qaydaları üzrə bilik", "Risk qiymətləndirməsi və hesabat hazırlamaq bacarığı", "Diqqətlilik və operativ qərarvermə"],
    },
  ];
  const role = roles.find((r) => r.words.some((word) => t.includes(normalize(word))));
  if (!role) return null;
  const yearRange = t.match(/(\d{1,2})\s*(?:-|–|—|ile|və)\s*(\d{1,2})\s*il/) || t.match(/(\d{1,2})\s*il/);
  const minYears = yearRange ? Number(yearRange[1]) : 0;
  const maxYears = yearRange?.[2] ? Number(yearRange[2]) : minYears;
  return {
    id: crypto.randomUUID(),
    owner: "",
    title: titleFromPrompt(prompt) || role.title,
    company: "",
    city: "",
    mode: "",
    type: "",
    category: role.category,
    minSalary: 0,
    maxSalary: 0,
    minYears,
    maxYears,
    skills: normalizeSkills(role.skills, { max: 20 }),
    demo: false,
    status: "draft",
    created: new Date().toISOString(),
    description: role.duties.map((x) => `• ${x}`).join("\n"),
    requirements: role.requirements.map((x) => `• ${x}`).join("\n"),
  };
}

export function jobDraftMissingFields(job: Job) {
  const missing: string[] = [];
  if (!job.company.trim()) missing.push("şirkətin adı");
  if (!job.city.trim()) missing.push("şəhər");
  if (!job.mode.trim()) missing.push("iş formatı");
  if (!job.type.trim()) missing.push("məşğulluq növü");
  if (!job.minSalary && !job.maxSalary) missing.push("maaş aralığı");
  if (!job.minYears && !job.maxYears) missing.push("tələb olunan təcrübə");
  return missing;
}

// A vacancy with a published range fits when it overlaps the candidate's
// acceptable range. Vacancies without a range ("by agreement") always fit.
export function salaryFits(profile: Pick<Profile, "salary" | "salaryMax">, job: Pick<Job, "minSalary" | "maxSalary">) {
  if (!job.minSalary && !job.maxSalary) return true;
  const top = job.maxSalary || job.minSalary;
  const bottom = job.minSalary || job.maxSalary;
  if (profile.salary > 0 && top < profile.salary) return false;
  if ((profile.salaryMax || 0) > 0 && bottom > (profile.salaryMax as number)) return false;
  return true;
}

// Which professional fields a person has actually worked in, how long, and
// which credentials back them up. Feeds the AI analysis and the role fit
// reasoning so that the field, certificates, courses and test scores are
// weighed together rather than only the latest job title.
export type CareerContext = {
  fields: { field: string; fieldAz: string; months: number; titles: string[] }[];
  currentField: string;
  credentials: { name: string; status: string; detail: string }[];
  coursesAndAchievements: string[];
};
const monthNumber = (value: string) => {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(value || "");
  return m ? Number(m[1]) * 12 + (Number(m[2] || 1) - 1) : null;
};
export function careerContext(p: Profile, now = new Date()): CareerContext {
  const nowMonth = now.getFullYear() * 12 + now.getMonth();
  const byField = new Map<string, { months: number; titles: Set<string>; az: string }>();
  let currentField = "";
  for (const e of p.experiences) {
    const family = jobTitleFamily(e.title);
    const label = family ? JOB_TITLE_FAMILIES[family]?.en || family : "";
    if (!label) continue;
    const start = monthNumber(e.start);
    const end = e.current ? nowMonth : monthNumber(e.end);
    const months = start !== null && end !== null && end >= start ? end - start + 1 : 0;
    const entry = byField.get(label) || { months: 0, titles: new Set<string>(), az: JOB_TITLE_FAMILIES[family]?.az || label };
    entry.months += months;
    if (e.title) entry.titles.add(e.title);
    byField.set(label, entry);
    if (e.current && !currentField) currentField = label;
  }
  const structured = (p.structuredCv || {}) as Record<string, unknown>;
  const list = (value: unknown) => (Array.isArray(value) ? value : []);
  const lines: string[] = [];
  for (const course of list(structured.courses_and_training) as Record<string, unknown>[])
    if (course?.course_name) lines.push(`Course: ${course.course_name}${course.provider ? ` — ${course.provider}` : ""}`);
  for (const project of list(structured.projects) as Record<string, unknown>[])
    if (project?.project_name) lines.push(`Project: ${project.project_name}${project.role ? ` (${project.role})` : ""}`);
  for (const item of list(structured.additional_information))
    if (typeof item === "string" && item.trim()) lines.push(item.trim());
  for (const job of list(structured.work_experience) as Record<string, unknown>[])
    for (const a of list(job?.achievements)) if (typeof a === "string" && a.trim()) lines.push(`Achievement: ${a.trim()}`);
  return {
    fields: [...byField.entries()]
      .map(([field, v]) => ({ field, fieldAz: v.az, months: v.months, titles: [...v.titles].slice(0, 6) }))
      .sort((a, b) => b.months - a.months),
    currentField,
    credentials: candidateCertifications(p).map((c) => ({
      name: certificationById(c.id)?.name || c.id,
      status: c.status,
      detail: [c.level, c.detail].filter(Boolean).join(" · "),
    })),
    coursesAndAchievements: [...new Set(lines)].slice(0, 30),
  };
}
