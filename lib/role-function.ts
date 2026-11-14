// What a person actually DOES inside a profession. "Accountant" and "financial reporting specialist" are the same field but not the
// same work: reporting is prepared from the books after the bookkeeping is done, so keeping the books is only a partial fit for
// a reporting vacancy (and the other way round). The word overlap used for duties cannot see that; this does.
const fold = (value: string) =>
  value
    .toLocaleLowerCase("az")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[əƏ]/g, "e")
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}+#&/.-]+/gu, " ")
    .trim();

export type FunctionDef = { id: string; group: string; label: string; strong: RegExp; weak?: RegExp };
const re = (source: string) => new RegExp(source, "gu");

// Patterns read folded text (Azerbaijani letters in plain Latin; Russian and English as written).
export const FUNCTIONS: FunctionDef[] = [
  // ---- Finance ----
  { id: "bookkeeping", group: "finance", label: "mühasibat uçotu", strong: re("\\bucot|bookkeep|accounts? (?:payable|receivable)|general ledger|ilkin sened|jurnal|kassa (?:emeliyyat|ucot)|esas vesait|debitor|kreditor|invoice|hesab[- ]faktura|qaime|бухгалтерск\\w* учет|проводк|первичн"), weak: re("muhasibat|muhasib|accounting|accountant|\\b1c\\b|бухгалт") },
  { id: "payroll", group: "finance", label: "əmək haqqı hesablanması", strong: re("emek haqq|maas hesab|payroll|заработн\\w* плат|зарплат"), weak: re("ezamiyyet|vacation pay|mezuniyyet pulu") },
  { id: "reporting", group: "finance", label: "maliyyə hesabatlarının hazırlanması", strong: re("maliyye hesabat|hesabat\\w* hazirl|menfeet ve zerer|pul vesaitlerinin|konsolid|consolidat|\\bifrs\\b|\\bbmhs\\b|financial statements?|financial report|финансов\\w* отчетност|управленческ\\w* отчет"), weak: re("balans|reporting|отчетност|hesabatliliq") },
  { id: "tax", group: "finance", label: "vergi", strong: re("vergi beyanname|vergi hesabat|vergi planlas|vergi uzre|\\bedv\\b|\\bvat\\b|gelir vergisi|menfeet vergisi|tax return|tax compliance|налогов|декларац"), weak: re("vergi|\\btax\\b|налог") },
  { id: "audit", group: "finance", label: "audit və daxili nəzarət", strong: re("daxili audit|daxili nezaret|internal (?:audit|control)|auditor|audit yoxlam|ревизи|внутренн\\w* аудит"), weak: re("\\baudit|аудит") },
  { id: "budgeting", group: "finance", label: "büdcə və planlaşdırma", strong: re("budce|byudce|budget|fp&a|\\bfpa\\b|forecast|бюджет"), weak: re("proqnoz|planlasdirma|прогноз") },
  { id: "treasury", group: "finance", label: "xəzinə və ödənişlər", strong: re("xezine|treasur|pul axin|cash flow|likvid|bank emeliyyat|odenis(?:lerin)? (?:aparil|hazirl|idare)|казначей"), weak: re("odenis|платеж") },
  { id: "fin_analysis", group: "finance", label: "maliyyə analizi", strong: re("maliyye (?:analiz|tehlil)|financial analys|financial model|modelles|\\bdcf\\b|valuation|rentabellik|финансов\\w* анализ"), weak: re("\\bkpi\\b|analiz|tehlil") },
  { id: "credit", group: "finance", label: "kredit və bank işi", strong: re("kredit (?:analiz|portfel|ekspert|mutexessis)|underwrit|scoring|lending|ssuda|кредитн"), weak: re("kredit|loan|кредит") },
  // ---- HR ----
  { id: "recruiting", group: "hr", label: "işə qəbul", strong: re("recruit|talent acquisition|sourcing|ise qebul|isci axtar|musahib apar|подбор персонал|рекрут"), weak: re("musahibe|interview") },
  { id: "hr_admin", group: "hr", label: "kadr işi", strong: re("kadr ucot|kadr sened|emek muqavile|kadr emr|personnel records|кадров\\w* делопроизводств"), weak: re("\\bkadr|\\bhr\\b|кадр") },
  { id: "training", group: "hr", label: "təlim və inkişaf", strong: re("telim (?:kecir|plan|proqram)|learning (?:and|&) development|\\bl&d\\b|обучен\\w* персонал"), weak: re("telim|training|learning") },
  { id: "comp_ben", group: "hr", label: "kompensasiya və müavinətlər", strong: re("compensation|benefits? (?:admin|program)|\\bc&b\\b|maas siyaset|grading"), weak: re("benefit|muavinet") },
  // ---- IT ----
  { id: "backend", group: "it", label: "backend proqramlaşdırma", strong: re("backend|back-end|\\bapi\\b|microservice|mikroservis|\\.net|asp\\.net|spring|django|laravel|node\\.?js|server terefi"), weak: re("\\bjava\\b|python|\\bphp\\b|c#|\\bsql\\b|database|verilenler bazasi") },
  { id: "frontend", group: "it", label: "frontend proqramlaşdırma", strong: re("frontend|front-end|\\breact\\b|\\bvue\\b|angular|typescript|\\bui developer"), weak: re("javascript|\\bcss\\b|\\bhtml\\b") },
  { id: "mobile", group: "it", label: "mobil proqram", strong: re("android|\\bios\\b|flutter|react native|swift|kotlin|mobil (?:proqram|tetbiq|app)"), weak: re("mobile") },
  { id: "devops", group: "it", label: "DevOps və infrastruktur", strong: re("devops|ci/cd|docker|kubernetes|\\bk8s\\b|terraform|sysadmin|sistem administrator|infrastruktur"), weak: re("\\baws\\b|azure|\\bgcp\\b|linux") },
  { id: "data", group: "it", label: "data və analitika", strong: re("data scien|machine learning|\\betl\\b|power bi|tableau|data analyst|data engineer|verilenler analiz|\\bbi developer"), weak: re("\\bdata\\b|analytics|analitika") },
  { id: "qa", group: "it", label: "test və keyfiyyət", strong: re("\\bqa\\b|quality assurance|test muhendis|selenium|avtomat test|manual test"), weak: re("testing|test ssenari") },
  { id: "it_support", group: "it", label: "IT dəstək", strong: re("help ?desk|it destek|texniki destek|technical support|sistem desteyi"), weak: re("destek") },
  // ---- Sales and marketing ----
  { id: "sales_b2b", group: "sales", label: "korporativ satış", strong: re("\\bb2b\\b|biznes inkisaf|business development|korporativ satis|musteri axtar|key account|b2b продаж"), weak: re("satis|\\bsales\\b|продаж") },
  { id: "retail", group: "sales", label: "pərakəndə satış", strong: re("perakende|retail|merchandis|magaza|satici|кассир|розничн"), weak: re("kassir|\\bcashier") },
  { id: "marketing", group: "sales", label: "marketinq", strong: re("marketinq|marketing|\\bsmm\\b|\\bseo\\b|kontent|content (?:plan|marketing)|brend|digital marketing|таргет|маркетинг"), weak: re("reklam|advertis") },
  { id: "account_mgmt", group: "sales", label: "müştəri ilə iş", strong: re("musteri menecer|account manager|customer success|musteri munasibet|клиентск\\w* менеджер"), weak: re("musteri xidmet|customer service") },
  // ---- Legal ----
  { id: "contracts", group: "legal", label: "müqavilə hüququ", strong: re("muqavile (?:hazirl|ekspert|redakt)|contract (?:draft|review|negotiat)|договор\\w* (?:подготов|экспертиз)"), weak: re("muqavile|contract") },
  { id: "litigation", group: "legal", label: "məhkəmə işləri", strong: re("mehkeme|litigation|iddia|dava|vekil|судебн|представительств\\w* в суд"), weak: re("hakim|court") },
  { id: "compliance", group: "legal", label: "uyğunluq (compliance)", strong: re("compliance|\\baml\\b|\\bkyc\\b|uygunluq|korporativ huquq|комплаенс"), weak: re("nizamnam|regulat") },
  // ---- Procurement and logistics ----
  { id: "procurement", group: "supply", label: "satınalma", strong: re("satinalma|procurement|\\btender|techizat|tedarik|закуп"), weak: re("purchas|supplier|serencam") },
  { id: "warehouse", group: "supply", label: "anbar", strong: re("anbar|warehouse|stok ucot|inventory|склад"), weak: re("stok|\\bstock") },
  { id: "logistics", group: "supply", label: "logistika", strong: re("logistika|logistics|ekspedi|gomruk|customs|dasima|dashima|логистик|перевозк"), weak: re("neqliyyat|transport") },
  // ---- Customer service ----
  { id: "call_center", group: "service", label: "zəng mərkəzi", strong: re("zeng merkez|call ?cent|contact cent|hot ?line|колл-центр"), weak: re("operator|support") },
];

// How much of one function's work a person doing another function of the same field brings along: 1 = the same work.
// Reporting comes AFTER the bookkeeping, so the two are neighbours, not the same job.
const NEIGHBOURS: Record<string, number> = {
  "bookkeeping>reporting": 0.5, "reporting>bookkeeping": 0.55,
  "bookkeeping>payroll": 0.5, "payroll>bookkeeping": 0.45,
  "bookkeeping>tax": 0.5, "tax>bookkeeping": 0.45,
  "reporting>tax": 0.35, "tax>reporting": 0.35,
  "reporting>fin_analysis": 0.65, "fin_analysis>reporting": 0.6,
  "budgeting>fin_analysis": 0.65, "fin_analysis>budgeting": 0.65,
  "budgeting>reporting": 0.4, "reporting>budgeting": 0.4,
  "audit>reporting": 0.5, "reporting>audit": 0.35,
  "audit>bookkeeping": 0.45, "bookkeeping>audit": 0.3,
  "treasury>bookkeeping": 0.35, "bookkeeping>treasury": 0.35,
  "credit>fin_analysis": 0.5, "fin_analysis>credit": 0.5,
  "recruiting>hr_admin": 0.35, "hr_admin>recruiting": 0.35, "hr_admin>comp_ben": 0.5, "comp_ben>hr_admin": 0.5, "training>recruiting": 0.2, "recruiting>training": 0.2,
  "backend>devops": 0.35, "devops>backend": 0.35, "frontend>backend": 0.3, "backend>frontend": 0.3, "mobile>frontend": 0.45, "frontend>mobile": 0.45, "data>backend": 0.35, "backend>data": 0.35, "it_support>devops": 0.35, "devops>it_support": 0.4, "qa>backend": 0.2,
  "sales_b2b>account_mgmt": 0.6, "account_mgmt>sales_b2b": 0.55, "retail>sales_b2b": 0.5, "sales_b2b>retail": 0.5, "marketing>sales_b2b": 0.3, "sales_b2b>marketing": 0.3, "account_mgmt>call_center": 0.5, "call_center>account_mgmt": 0.5,
  "contracts>compliance": 0.5, "compliance>contracts": 0.5, "litigation>contracts": 0.4, "contracts>litigation": 0.4,
  "procurement>logistics": 0.4, "logistics>procurement": 0.4, "warehouse>logistics": 0.55, "logistics>warehouse": 0.55, "procurement>warehouse": 0.3, "warehouse>procurement": 0.3,
};
const byId = new Map(FUNCTIONS.map((f) => [f.id, f]));
export const functionLabel = (id: string) => byId.get(id)?.label || id;
// Someone of the same field but another function still brings a little (shared vocabulary of the field), never the same work.
export function functionRelation(have: string, wanted: string): number {
  if (have === wanted) return 1;
  const a = byId.get(have);
  const b = byId.get(wanted);
  if (!a || !b || a.group !== b.group) return 0;
  return NEIGHBOURS[`${have}>${wanted}`] ?? 0.15;
}

const countHits = (pattern: RegExp, text: string, cap = 3) => {
  let n = 0;
  for (const _ of text.matchAll(pattern)) if (++n >= cap) break;
  return n;
};
// Strength of every function in a text: a strong phrase counts 2, a weak word 1, a few repeats count, more do not.
export function functionStrength(text: string): Map<string, number> {
  const t = fold(text);
  const out = new Map<string, number>();
  if (!t) return out;
  for (const f of FUNCTIONS) {
    const s = 2 * countHits(f.strong, t) + (f.weak ? countHits(f.weak, t, 2) : 0);
    if (s > 0) out.set(f.id, Math.min(6, s));
  }
  return out;
}

export type FunctionRole = { title: string; text: string; end: string; current: boolean; weight?: number };
export type FunctionFit = {
  score: number; // 0..1: how much of the vacancy's real work the person has done
  wanted: { id: string; label: string; weight: number; covered: number }[];
  done: { id: string; label: string }[];
  gap: { id: string; label: string; best: { id: string; label: string } | null } | null; // the main work of the vacancy that is not covered
};

const recency = (role: FunctionRole, now: Date) => {
  if (role.current || !role.end) return 1;
  const years = (now.getTime() - Date.parse(`${role.end.slice(0, 7)}-28`)) / (365.25 * 86_400_000);
  return Number.isFinite(years) ? (years <= 3 ? 1 : years <= 8 ? 0.8 : 0.6) : 0.8;
};

// null when the vacancy does not name a function we know (nothing to compare).
export function functionFit(vacancy: { title: string; category?: string; text: string }, roles: FunctionRole[], now = new Date()): FunctionFit | null {
  // The title counts twice: it names the job.
  const wantedStrength = functionStrength(`${vacancy.title}. ${vacancy.title}. ${vacancy.text}`);
  const wanted = [...wantedStrength.entries()].filter(([, s]) => s >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!wanted.length) return null;
  // What the person has done, role by role (the role's title counts twice), recent work first.
  const have = new Map<string, number>();
  for (const role of roles) {
    const weight = recency(role, now) * (role.weight ?? 1);
    for (const [id, s] of functionStrength(`${role.title}. ${role.title}. ${role.text}`)) have.set(id, Math.min(6, (have.get(id) || 0) + s * weight));
  }
  const total = wanted.reduce((sum, [, s]) => sum + s, 0);
  const covered = wanted.map(([id, s]) => {
    let best = 0;
    for (const [haveId, strength] of have) best = Math.max(best, Math.min(1, strength / 3) * functionRelation(haveId, id));
    return { id, label: functionLabel(id), weight: s / total, covered: Math.round(best * 100) / 100 };
  });
  const score = covered.reduce((sum, c) => sum + c.weight * c.covered, 0);
  const done = [...have.entries()].filter(([, s]) => s >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => ({ id, label: functionLabel(id) }));
  // The main function of the vacancy that the person has not really done, and what they did instead in its place.
  const main = covered[0];
  const gap = main && main.covered < 0.55
    ? { id: main.id, label: main.label, best: done.find((d) => d.id !== main.id && functionRelation(d.id, main.id) > 0) || done[0] || null }
    : null;
  return { score: Math.round(score * 100) / 100, wanted: covered, done, gap };
}
