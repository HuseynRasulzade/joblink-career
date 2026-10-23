"use client";
import { formatDate } from "@/lib/dates";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkCheck,
  CalendarClock,
  ClipboardCheck,
  LayoutDashboard,
  BriefcaseBusiness,
  FileText,
  Sparkles,
  UserRound,
  ArrowUpRight,
  ChevronDown,
  Bookmark,
  MapPin,
  Clock3,
  Building2,
  Calculator,
  Search,
  SlidersHorizontal,
  Check,
  Send,
  Users,
  LogIn,
  ArrowRight,
  X,
  CheckCircle2,
  Info,
  Target,
  TrendingUp,
  CalendarDays,
  ShieldCheck,
  Settings,
  FileCheck2,
  CreditCard,
  Tags,
  Award,
  ListChecks,
  MessagesSquare,
  MessageCircle,
  LifeBuoy,
  Inbox,
  UserCheck,
  BarChart3,
  Contact,
  UserCog,
  Receipt,
  BadgeCheck,
} from "lucide-react";
import {
  analyze,
  match,
  careerContext,
  salaryFits,
  recommendations,
  sampleJobs,
  sampleProfile,
  blankProfile,
  type Profile,
  type Job,
  type Application,
} from "@/lib/model";
import { Empty, Field, Modal, ProfileEditor } from "./components";
import HrPanel from "./HrPanel";
import AccountLogin from "./AccountLogin";
import AdminPanel from "./AdminPanel";
import AccountSettings from "./AccountSettings";
import { JobAlerts } from "./JobAlerts";
import { AdminAiUsage, AdminReviews } from "./CompanyReviews";
import { similarJobs } from "@/lib/similar-jobs";
import CvRewrite from "./CvRewrite";
import CareerAssistant from "./CareerAssistant";
import MessagesPage, { type MessageTarget } from "./MessagesPage";
import SupportPage from "./SupportPage";
import AssessmentsPage from "./AssessmentsPage";
import { CandidateInterviews, InterviewsPage } from "./Interviews";
import { TalentPage } from "./BulkTalent";
import { AdminVerifications, VerificationPanel } from "./Verifications";
import { AdminCompanies, ApprovalsPage, BillingPage, CompanyDashboard, CompanyProfilePage, EmployeesPage, TeamPage, WorkforcePage, type CompanyMe } from "./CompanyPages";
import { ExamList } from "./ExamRoom";
import { OFFER_STATUS, OfferResponse, type Offer } from "./Offers";
import { CompareBar, JobComparison } from "./Comparison";
import NotificationBell from "./NotificationBell";
import { JobCertificationList } from "./CertificationPickers";
import { setCustomCertifications } from "@/lib/certification-catalog";
import { setCustomJobTitles } from "@/lib/job-title-catalog";
import { setCustomUniversities } from "@/lib/university-catalog";
import { setCustomMajors } from "@/lib/major-catalog";
import { CompaniesPage, CompanyView, VerifiedBadge, type CompanyInfo } from "./CompaniesPage";
import { SalaryCalculator } from "./SalaryCalculator";
import { FitReviewPanel } from "./FitReview";
import PackagesPage from "./PackagesPage";
import { localizeTree, setSiteLanguage } from "./i18n";
import { googleMapsSearchUrl } from "@/lib/maps";
const candidateNav = [
  { id: "overview", label: "Ümumi baxış", icon: LayoutDashboard },
  { id: "jobs", label: "Vakansiyalar", icon: BriefcaseBusiness },
  { id: "companies", label: "Şirkətlər", icon: Building2 },
  { id: "analysis", label: "CV analizi", icon: FileText },
  { id: "advice", label: "AI tövsiyələri", icon: Sparkles },
  { id: "assistant", label: "AI köməkçi", icon: MessagesSquare },
  { id: "profile", label: "Mənim profilim", icon: UserRound },
  { id: "applications", label: "Müraciətlərim", icon: Send },
  { id: "messages", label: "Mesajlar", icon: MessageCircle },
  { id: "calculator", label: "Maaş kalkulyatoru", icon: Calculator },
  { id: "packages", label: "Paketlər", icon: CreditCard },
  { id: "support", label: "Dəstək", icon: LifeBuoy },
];
const hrNav = [
  { id: "hr-overview", label: "Ümumi baxış", icon: LayoutDashboard },
  { id: "hr-jobs", label: "Vakansiyalarım", icon: BriefcaseBusiness },
  { id: "hr-candidates", label: "Namizədlər", icon: Users },
  { id: "hr-ai", label: "HR AI köməkçi", icon: Sparkles },
  { id: "hr-talent", label: "İstedad bazası", icon: BookmarkCheck },
  { id: "hr-interviews", label: "Müsahibələr", icon: CalendarClock },
  { id: "hr-tests", label: "Testlər", icon: ClipboardCheck },
  { id: "hr-approvals", label: "Təsdiqlər", icon: ListChecks },
  { id: "hr-reports", label: "Hesabatlar", icon: BarChart3 },
  { id: "hr-employees", label: "İşçilər", icon: Contact },
  { id: "hr-workforce", label: "İşçi axını", icon: TrendingUp },
  { id: "hr-team", label: "Komanda və rollar", icon: UserCog },
  { id: "hr-company", label: "Şirkət məlumatları", icon: Building2 },
  { id: "hr-billing", label: "Hesablar və ödənişlər", icon: Receipt },
  { id: "hr-calculator", label: "Maaş kalkulyatoru", icon: Calculator },
  { id: "hr-messages", label: "Mesajlar", icon: MessageCircle },
  { id: "hr-support", label: "Dəstək", icon: LifeBuoy },
];
const adminNav = [
  { id: "admin-overview", label: "Platforma icmalı", icon: LayoutDashboard },
  { id: "admin-users", label: "İstifadəçilər", icon: Users },
  {
    id: "admin-jobs",
    label: "Vakansiya moderasiyası",
    icon: BriefcaseBusiness,
  },
  { id: "admin-applications", label: "Müraciət axını", icon: FileCheck2 },
  { id: "admin-billing", label: "Ödənişlər və borclar", icon: CreditCard },
  { id: "admin-skills", label: "Bacarıqlar kataloqu", icon: Tags },
  { id: "admin-certifications", label: "Sertifikatlar kataloqu", icon: Award },
  { id: "admin-job-titles", label: "Vəzifələr kataloqu", icon: ListChecks },
  { id: "admin-education", label: "Təhsil kataloqu", icon: Award },
  { id: "admin-matching", label: "Uyğunluq balı", icon: Sparkles },
  { id: "admin-support", label: "Sorğular və mesajlar", icon: Inbox },
  { id: "admin-reviews", label: "Şirkət rəyləri", icon: UserCheck },
  { id: "admin-ai-usage", label: "AI istifadə və xərc", icon: Sparkles },
  { id: "admin-relations", label: "İzləmə və bloklar", icon: UserCheck },
  { id: "admin-companies", label: "Şirkət yoxlaması", icon: BadgeCheck },
  { id: "admin-verifications", label: "Sənəd yoxlaması", icon: ShieldCheck },
  { id: "admin-system", label: "Sistem və audit", icon: Settings },
];
const titles: Record<string, string> = {
  jobs: "Yeni imkanları kəşf edin",
  companies: "Şirkətlər və açıq vakansiyalar",
  calculator: "Maaş kalkulyatoru",
  analysis: "CV-niz daha güclü ola bilər.",
  advice: "Növbəti addımınız, sizə uyğun.",
  assistant: "Suallarınız, yadda qalan söhbətlər.",
  profile: "Peşəkar profilim",
  applications: "Müraciətləriniz bir yerdə",
};
const descriptions: Record<string, string> = {
  jobs: "Bacarıqlarınıza, təcrübənizə və gözləntilərinizə uyğun işlər.",
  companies: "Şirkətə toxunub bütün açıq vakansiyalarına baxın, izləyin və ya bloklayın.",
  calculator: "Gross maaşdan net maaşı (və ya əksinə) 2026-cı il dərəcələri ilə hesablayın.",
  analysis:
    "CV-nizdə nəyin yaxşı işlədiyini və nəyin dəyişməli olduğunu görün.",
  advice: "Təcrübənizdən yeni karyera imkanlarına gedən yol.",
  assistant: "Profiliniz və vakansiyalar barədə AI ilə danışın; hər söhbət yadda qalır.",
  profile: "Təcrübənizi, bacarıqlarınızı və karyera hekayənizi birləşdirin.",
  applications: "Hər müraciətin statusunu və növbəti addımını izləyin.",
};
function vacancyItems(text: string) {
  return text
    .split(/\n+|;\s*/)
    .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean);
}
function vacancyDate(value: string, language: "az" | "en") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  const months =
    language === "en"
      ? [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ]
      : [
          "yan",
          "fev",
          "mar",
          "apr",
          "may",
          "iyn",
          "iyl",
          "avq",
          "sen",
          "okt",
          "noy",
          "dek",
        ];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
type CvDeepReport = {
  executiveSummary: string;
  scoreReasons: Record<string, string>;
  strengths: { title: string; evidence: string; value: string }[];
  improvements: {
    title: string;
    evidence: string;
    impact: string;
    action: string;
    priority: "high" | "medium" | "low";
    field?: string;
    experienceIndex?: number;
  }[];
  atsRisks: { issue: string; evidence: string; fix: string; field?: string; experienceIndex?: number }[];
  roleFit: {
    role: string;
    fit: "strong" | "developing";
    evidence: string;
    reason: string;
    gap: string;
  }[];
  rewrites: { original: string; improved: string; note: string; field?: string; experienceIndex?: number }[];
  nextSteps: string[];
  issues?: {
    type: string;
    severity: "high" | "medium" | "low";
    field: string;
    experienceIndex: number;
    quote: string;
    problem: string;
    cause: string;
    fix: string;
  }[];
};
type ProfileTarget = { field?: string; experienceIndex?: number };
const PRIORITY_LABELS: Record<string, string> = { high: "Yüksək", medium: "Orta", low: "Aşağı" };
const ISSUE_TYPE_LABELS: Record<string, string> = {
  spelling: "Orfoqrafiya",
  grammar: "Qrammatika",
  date: "Tarix",
  consistency: "Uyğunsuzluq",
  format: "Format",
  missing: "Çatışmayan məlumat",
  content: "Məzmun",
  ats: "ATS",
};
export default function Joblink() {
  const [page, setPage] = useState("overview");
  const [profile, setProfile] = useState<Profile>(sampleProfile);
  const [sample, setSample] = useState(true);
  const [jobs, setJobs] = useState<Job[]>(sampleJobs);
  const [applications, setApplications] = useState<Application[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [accountRole, setAccountRole] = useState<
    "candidate" | "company" | "admin" | null
  >(null);
  const [accountName, setAccountName] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState("DeepSeek");
  const [language, setLanguage] = useState<"az" | "en">("az");
  setSiteLanguage(language);
  const [cvReport, setCvReport] = useState<{
    fingerprint: string;
    analysis: ReturnType<typeof analyze>;
    evidence: { area: string; quote: string; advice: string }[];
  } | null>(null);
  const [authMode, setAuthMode] = useState("chatgpt");
  const [cvStorage, setCvStorage] = useState("r2");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [login, setLogin] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [tabs, setTabs] = useState<{ key: string; kind: "page" | "job" | "company"; ref: string; title: string; job?: Job; company?: CompanyInfo }[]>([]);
  const [matchOnly, setMatchOnly] = useState(false);
  const [applyConfirm, setApplyConfirm] = useState(false);
  const [accountSettings, setAccountSettings] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [rewriteSuggestions, setRewriteSuggestions] = useState<string[] | null>(null);
  const [assistantJob, setAssistantJob] = useState<Job | null>(null);
  const [messageTarget, setMessageTarget] = useState<MessageTarget | null>(null);
  const [unread, setUnread] = useState({ messages: 0, support: 0 });
  const [companyMe, setCompanyMe] = useState<CompanyMe | null>(null);
  const [offers, setOffers] = useState<Record<string, Offer>>({});
  const [openOffer, setOpenOffer] = useState<Offer | null>(null);
  const [compareJobs, setCompareJobs] = useState<string[]>([]);
  const [relations, setRelations] = useState<{ following: string[]; blocked: string[] }>({ following: [], blocked: [] });
  const [comparing, setComparing] = useState(false);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [mode, setMode] = useState("");
  const [category, setCategory] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [salary, setSalary] = useState(0);
  const [experience, setExperience] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("match");
  const [savedOnly, setSavedOnly] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [deepReport, setDeepReport] = useState<CvDeepReport | null>(null);
  const [aiConsent, setAiConsent] = useState(false);
  const [careerConsent, setCareerConsent] = useState(false);
  const [careerPaths, setCareerPaths] = useState<
    {
      role: string;
      fit: string;
      evidence: string;
      reason: string;
      next: string;
    }[]
  >([]);
  const [careerFingerprint, setCareerFingerprint] = useState("");
  const [rankingConsent, setRankingConsent] = useState(false);
  const [aiRatings, setAiRatings] = useState<
    Record<string, { score: number; reason: string }>
  >({});
  const [rankingFingerprint, setRankingFingerprint] = useState("");
  // Admin choice: with "ai" the AI rating runs by itself for the CV's best vacancies.
  const [matchingMode, setMatchingMode] = useState<"rules" | "ai">("rules");
  const [analysisTime, setAnalysisTime] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [profileFocus, setProfileFocus] = useState<{
    tab: string;
    elementId: string;
    token: number;
  } | null>(null);
  const admin = accountRole === "admin";
  const hr = accountRole === "company";
  const accountLabel = signedIn
    ? admin
      ? accountName || "Administrator"
      : accountRole === "company"
        ? accountName || "Şirkət hesabı"
        : profile.name || "İstifadəçi"
    : sample
      ? "Nümunə hesab"
      : profile.name || "Joblink";
  // Company sections follow the team member's role.
  const hrNeeds: Record<string, string> = { "hr-billing": "billing", "hr-tests": "tests", "hr-reports": "reports" };
  const hrVisible = hrNav.filter((item) => !hrNeeds[item.id] || !companyMe || companyMe.permissions.includes(hrNeeds[item.id] as never));
  const navigation = admin ? adminNav : hr ? hrVisible : candidateNav;
  const label = navigation.find((n) => n.id === page)?.label || "Ümumi baxış";
  const fingerprint = JSON.stringify(profile);
  const rankingKey = JSON.stringify([profile, jobs.map((j) => j.id)]);
  const report = cvReport?.fingerprint === fingerprint ? cvReport : null;
  const preliminary = useMemo(() => analyze(profile), [profile]);
  const result = report?.analysis || preliminary;
  const activeJobMatch = job ? match(profile, job) : null;
  const pendingCv = !report;
  const ranked = useMemo(
    () =>
      jobs
        .map((j) => ({
          ...j,
          ranking: {
            ...match(profile, j),
            ruleScore: match(profile, j).score,
            ...(rankingFingerprint === rankingKey && aiRatings[j.id]
              ? {
                  score: aiRatings[j.id].score,
                  aiReason: aiRatings[j.id].reason,
                }
              : {}),
          },
        }))
        .sort((a, b) => b.ranking.score - a.ranking.score),
    [profile, jobs, rankingFingerprint, rankingKey, aiRatings],
  );
  const best = ranked[0]?.ranking.score || 0;
  const advice = useMemo(
    () => recommendations(profile, language),
    [profile, language],
  );
  function openJob(j: Job) {
    // A candidate looking at a real vacancy counts as one view per day (the server keeps no names).
    if (signedIn && !hr && !admin && !j.demo) {
      try {
        const key = `joblink-viewed:${new Date().toISOString().slice(0, 10)}:${j.id}`;
        if (!window.sessionStorage.getItem(key)) {
          window.sessionStorage.setItem(key, "1");
          void api("jobs/view", { jobId: j.id }).catch(() => {});
        }
      } catch {
        // Storage is optional.
      }
    }
    setCompany(null);
    setJob(j);
    setTabs((t) => (t.some((x) => x.key === `job:${j.id}`) ? t : [...t, { key: `job:${j.id}`, kind: "job", ref: j.id, title: j.title, job: j }]));
  }
  function openCompany(c: CompanyInfo) {
    setJob(null);
    setCompany(c);
    setTabs((t) => (t.some((x) => x.key === `company:${c.id}`) ? t : [...t, { key: `company:${c.id}`, kind: "company", ref: c.id, title: c.name, company: c }]));
  }
  async function openCompanyByOwner(owner: string, name: string) {
    try {
      const data = (await fetch("/api/joblink/companies", { cache: "no-store" }).then((r) => r.json())) as { companies?: CompanyInfo[] };
      const found = data.companies?.find((c) => c.id === owner);
      openCompany(found || { id: owner, name, openJobs: 0, followers: 0, verified: false, industry: "", size: "", website: "", about: "" });
    } catch {
      notify("Şirkət məlumatı yüklənmədi.");
    }
  }
  function activateTab(t: (typeof tabs)[number]) {
    if (t.kind === "job" && t.job) {
      setCompany(null);
      setJob(jobs.find((x) => x.id === t.ref) || t.job);
    } else if (t.kind === "company" && t.company) {
      setJob(null);
      setCompany(t.company);
    } else go(t.ref);
  }
  function closeTab(key: string) {
    const index = tabs.findIndex((t) => t.key === key);
    const remaining = tabs.filter((t) => t.key !== key);
    setTabs(remaining);
    const closing = tabs[index];
    if (!closing) return;
    const active = closing.kind === "job" ? job?.id === closing.ref : closing.kind === "company" ? company?.id === closing.ref : !job && !company && page === closing.ref;
    if (!active) return;
    setJob(null);
    setCompany(null);
    setApplyConfirm(false);
    const neighbour = remaining[Math.max(0, index - 1)];
    if (neighbour) activateTab(neighbour);
    else go(accountRole === "admin" ? "admin-overview" : accountRole === "company" ? "hr-overview" : "overview");
  }
  function go(id: string) {
    setJob(null);
    setCompany(null);
    const target = signedIn
      ? accountRole === "admin"
        ? id.startsWith("admin-")
          ? id
          : "admin-overview"
        : accountRole === "company"
          ? id.startsWith("hr-")
            ? id
            : "hr-overview"
          : id.startsWith("hr-") || id.startsWith("admin-")
            ? "overview"
            : id
      : id;
    setPage(target);
    window.location.hash = target;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  // Opens the exact profile field an analysis finding refers to; falls back
  // to keyword matching when the finding has no field.
  function openProfileTarget(target: ProfileTarget, ...details: (string | undefined)[]) {
    const direct: Record<string, [string, string]> = {
      name: ["Şəxsi məlumatlar", "profile-name"],
      title: ["Şəxsi məlumatlar", "profile-title"],
      email: ["Şəxsi məlumatlar", "profile-email"],
      phone: ["Şəxsi məlumatlar", "profile-phone"],
      city: ["Şəxsi məlumatlar", "profile-city"],
      summary: ["Şəxsi məlumatlar", "profile-summary"],
      links: ["Şəxsi məlumatlar", "profile-links"],
      skills: ["Bacarıqlar", "profile-skills"],
      certifications: ["Bacarıqlar", "profile-certifications"],
      languages: ["Bacarıqlar", "profile-languages"],
      cvText: ["CV faylı", "profile-cv-text"],
    };
    if (target.field && direct[target.field]) {
      const [tab, elementId] = direct[target.field];
      setProfileFocus({ tab, elementId, token: Date.now() });
      go("profile");
      return;
    }
    if (target.field === "experience") {
      const experience =
        (target.experienceIndex !== undefined && target.experienceIndex >= 0
          ? profile.experiences[target.experienceIndex]
          : undefined) || profile.experiences[0];
      setProfileFocus({
        tab: "Təcrübə və təhsil",
        elementId: experience ? `profile-experience-${experience.id}-description` : "profile-add-experience",
        token: Date.now(),
      });
      go("profile");
      return;
    }
    if (target.field === "education") {
      setProfileFocus({
        tab: "Təcrübə və təhsil",
        elementId: profile.education[0] ? `profile-education-${profile.education[0].id}` : "profile-add-education",
        token: Date.now(),
      });
      go("profile");
      return;
    }
    openProfileCorrection(...details);
  }
  function openProfileCorrection(...details: (string | undefined)[]) {
    const combined = details.filter(Boolean).join(" ").toLocaleLowerCase("az");
    let tab = "Şəxsi məlumatlar";
    let elementId = "profile-summary";

    if (/bacarıq|skill|1c|excel|proqram|alət/.test(combined)) {
      tab = "Bacarıqlar";
      elementId = "profile-skills";
    } else if (/sertifikat|kurs|təlim/.test(combined)) {
      tab = "Bacarıqlar";
      elementId = "profile-certificates";
    } else if (/dil|language/.test(combined)) {
      tab = "Bacarıqlar";
      elementId = "profile-languages";
    } else if (/təhsil|universitet|məktəb|dərəcə|education/.test(combined)) {
      tab = "Təcrübə və təhsil";
      elementId = profile.education[0]
        ? `profile-education-${profile.education[0].id}`
        : "profile-add-education";
    } else if (/e-poçt|email/.test(combined)) {
      elementId = "profile-email";
    } else if (/telefon/.test(combined)) {
      elementId = "profile-phone";
    } else if (/şəhər|city/.test(combined)) {
      elementId = "profile-city";
    } else if (/əlaqə/.test(combined)) {
      elementId = "profile-email";
    } else if (/hədəf vəzifə|peşə|ixtisas|hədəf rol/.test(combined)) {
      elementId = "profile-title";
    } else if (
      /vəzifə|təcrübə|nailiyyət|nəticə|məsuliyyət|öhdəlik|rəqəm|ölçül/.test(
        combined,
      )
    ) {
      tab = "Təcrübə və təhsil";
      const evidence = details.find((value) =>
        profile.experiences.some((experience) =>
          value ? experience.description.includes(value) : false,
        ),
      );
      const experience =
        profile.experiences.find((item) =>
          evidence ? item.description.includes(evidence) : false,
        ) || profile.experiences[0];
      elementId = experience
        ? `profile-experience-${experience.id}-description`
        : "profile-add-experience";
    }

    setProfileFocus({ tab, elementId, token: Date.now() });
    go("profile");
  }
  // Links from account e-mails: #reset=… opens the new-password form, #verify=… confirms the e-mail address.
  useEffect(() => {
    const link = /^#(reset|verify)=([\w-]{43})$/.exec(window.location.hash);
    if (!link) return;
    window.history.replaceState(null, "", "#");
    if (link[1] === "reset") {
      setResetToken(link[2]);
      setLogin(true);
    } else {
      api("auth/verify", { token: link[2] })
        .then(() => notify("E-poçt ünvanınız təsdiqləndi."))
        .catch((error) => notify((error as Error).message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const sync = () => {
      const requested = window.location.hash.slice(1);
      const valid = [...candidateNav, ...hrNav, ...adminNav].some(
        (navigationItem) => navigationItem.id === requested,
      );
      const fallback =
        accountRole === "admin"
          ? "admin-overview"
          : accountRole === "company"
            ? "hr-overview"
            : "overview";
      const target = !valid
        ? fallback
        : signedIn && accountRole === "admin" && !requested.startsWith("admin-")
          ? "admin-overview"
          : signedIn &&
              accountRole === "company" &&
              !requested.startsWith("hr-")
            ? "hr-overview"
            : signedIn &&
                accountRole === "candidate" &&
                (requested.startsWith("hr-") || requested.startsWith("admin-"))
              ? "overview"
              : requested;
      setPage(target);
      if (window.location.hash !== `#${target}`) {
        window.history.replaceState(null, "", `#${target}`);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [signedIn, accountRole]);
  function notify(text: string) {
    setNotice(text);
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  async function api(path: string, body?: unknown) {
    const r = await fetch(
      `/api/joblink/${path}`,
      body === undefined
        ? { cache: "no-store" }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
    );
    let b: any;
    try {
      b = await r.json();
    } catch {
      throw new Error("Server cavabı oxunmadı. Yenidən cəhd edin.");
    }
    if (!r.ok) {
      if (r.status === 401) {
        setSignedIn(false);
        setAccountRole(null);
        setAccountName("");
        setLogin(true);
      }
      throw new Error(b.error || "Sorğu tamamlanmadı.");
    }
    return b;
  }
  async function refresh(auto = true) {
    try {
      const b = await api("state");
      if (b.signedIn && b.account?.role === "candidate")
        api("relations").then((data) => setRelations({ following: data.following, blocked: data.blocked })).catch(() => {});
      if (b.signedIn && b.account?.role === "candidate")
        api("offers")
          .then((data) => {
            const map: Record<string, Offer> = {};
            for (const offer of data.offers as Offer[]) if (!map[offer.application_id]) map[offer.application_id] = offer;
            setOffers(map);
          })
          .catch(() => setOffers({}));
      setCustomCertifications(b.customCertifications || []);
      setCustomJobTitles(b.customJobTitles || []);
      setCustomUniversities(b.customUniversities || []);
      setCustomMajors(b.customMajors || []);
      setJobs(b.jobs);
      setApplications(b.applications);
      setSaved(b.saved);
      setSignedIn(b.signedIn);
      setAccountRole(b.account?.role || null);
      setAccountName(b.account?.name || "");
      setAiEnabled(b.aiEnabled);
      setAiProvider(b.aiProvider || "DeepSeek");
      setAuthMode(b.authMode || "chatgpt");
      setCvStorage(b.cvStorage || "r2");
      if (b.profile && b.account?.role === "candidate") {
        setProfile(b.profile);
        setSample(false);
        if (auto && b.profile.autoApply) autoApplyPass();
      } else if (b.signedIn) {
        setProfile(blankProfile);
        setSample(false);
      }
      if (auto && b.signedIn && typeof window !== "undefined") {
        const current = window.location.hash.slice(1);
        const role = b.account?.role;
        const destination =
          role === "admin"
            ? "admin-overview"
            : role === "company"
              ? "hr-overview"
              : "overview";
        const validForRole =
          role === "admin"
            ? current.startsWith("admin-")
            : role === "company"
              ? current.startsWith("hr-")
              : !current.startsWith("hr-") && !current.startsWith("admin-");
        if (!validForRole) {
          setPage(destination);
          window.history.replaceState(null, "", `#${destination}`);
        }
      }
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setAuthChecked(true);
    }
  }
  // Runs the AI's automatic-application pass in the background for
  // candidates who opted in from their profile. Silent on expected
  // "not eligible" outcomes; only surfaces when it actually applies.
  async function autoApplyPass() {
    try {
      const b = await api("auto-apply", {});
      if (b.applied?.length) {
        notify(
          `AI ${b.applied.length} uyğun vakansiyaya sizin əvəzinizə avtomatik müraciət etdi.`,
        );
        await refresh(false);
      }
    } catch {
      // Background pass: silently skip when auto-apply is off or not eligible.
    }
  }
  async function checkAutoApplyNow() {
    setBusy(true);
    try {
      const b = await api("auto-apply", {});
      notify(
        b.applied?.length
          ? `AI ${b.applied.length} uyğun vakansiyaya avtomatik müraciət etdi.`
          : "Hazırda balı keçən yeni vakansiya tapılmadı.",
      );
      if (b.applied?.length) await refresh(false);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setTabs([]);
    setJob(null);
    setCompany(null);
  }, [signedIn, accountRole]);
  useEffect(() => {
    setTabs((t) => (t.some((x) => x.key === `page:${page}`) ? t : [...t, { key: `page:${page}`, kind: "page", ref: page, title: page }]));
  }, [page, signedIn, accountRole]);
  useEffect(() => {
    refresh();
    const saved = localStorage.getItem("joblink-language");
    if (saved === "en") setLanguage("en");
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === "en"
        ? "Joblink — Your career workspace"
        : "Joblink — Karyeranızın növbəti addımı";
  }, [language]);
  const filtered = ranked
    .filter(
      (j) =>
        [j.title, j.company, ...j.skills]
          .join(" ")
          .toLocaleLowerCase("az")
          .includes(query.toLocaleLowerCase("az")) &&
        (!city || j.city === city) &&
        (!mode || j.mode === mode) &&
        (!category || j.category === category) &&
        j.ranking.score >= minScore &&
        j.maxSalary >= salary &&
        (!type || j.type === type) &&
        (!experience || j.minYears <= Number(experience)) &&
        (!savedOnly || saved.includes(j.id)) &&
        (!matchOnly || (j.ranking.score >= 50 && salaryFits(profile, j))),
    )
    .sort((a, b) =>
      sort === "salary"
        ? b.maxSalary - a.maxSalary
        : sort === "new"
          ? b.created.localeCompare(a.created)
          : b.ranking.score - a.ranking.score,
    );
  function resetFilters() {
    setQuery("");
    setCity("");
    setMode("");
    setCategory("");
    setMinScore(0);
    setSalary(0);
    setExperience("");
    setType("");
    setSavedOnly(false);
    setMatchOnly(false);
  }
  async function saveJob(j: Job) {
    if (!signedIn) {
      setLogin(true);
      return;
    }
    try {
      const value = !saved.includes(j.id);
      await api("save", { jobId: j.id, saved: value });
      setSaved((v) => (value ? [...v, j.id] : v.filter((id) => id !== j.id)));
      notify(
        value
          ? "Vakansiya yadda saxlanıldı."
          : "Vakansiya yadda saxlanmışlardan çıxarıldı.",
      );
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function saveProfile(p: Profile) {
    setBusy(true);
    try {
      const b = await api("profile", p);
      setProfile(b.profile);
      setCvReport(null);
      setSample(false);
      notify("Profiliniz yadda saxlanıldı. Uyğunluq nəticələri yeniləndi.");
      if (b.profile?.autoApply) autoApplyPass();
    } catch (e) {
      notify((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function runAnalysis(consentJustGranted = false) {
    if (profile.cvText.trim().length < 80) {
      go("profile");
      notify(
        "Dərin CV analizi üçün profilinizə CV yükləyin və yadda saxlayın.",
      );
      return;
    }
    if ((!aiConsent && !consentJustGranted) || !aiEnabled) {
      setAnalysisTime(
        new Date().toLocaleTimeString("az-AZ", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      setNarrative(null);
      notify("AI analizi üçün razılıq xanasını işarələyin.");
      return;
    }
    setAnalysisError("");
    setBusy(true);
    try {
      const b = await api("analyze", { profile, useAI: true, language });
      setNarrative(b.narrative);
      setDeepReport(b.deepReport || null);
      setCvReport({
        fingerprint,
        analysis: b.analysis,
        evidence: b.evidence || [],
      });
      setAnalysisTime(
        new Date().toLocaleTimeString("az-AZ", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      notify("CV analizi tamamlandı.");
    } catch (e) {
      const message = (e as Error).message;
      setAnalysisError(message);
      notify(message);
    } finally {
      setBusy(false);
    }
  }
  async function runCareerAdvice() {
    if (profile.cvText.trim().length < 80) {
      go("profile");
      notify("Tövsiyə üçün əvvəlcə CV yükləyin və profili yadda saxlayın.");
      return;
    }
    if (!careerConsent) {
      notify("AI tövsiyəsi üçün razılıq xanasını işarələyin.");
      return;
    }
    setBusy(true);
    try {
      const b = await api("career-advice", { profile, language });
      setCareerPaths(b.paths || []);
      setCareerFingerprint(fingerprint);
      notify("CV-yə əsaslanan tövsiyələr hazırdır.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function runAiRanking() {
    if (profile.cvText.trim().length < 80) {
      go("profile");
      notify("AI reytinq üçün əvvəlcə CV yükləyin və profili yadda saxlayın.");
      return;
    }
    if (!rankingConsent) {
      notify("AI reytinq üçün razılıq xanasını işarələyin.");
      return;
    }
    setBusy(true);
    try {
      const b = await api("rank-jobs", {
        profile,
        language,
        jobIds: jobs.slice(0, 30).map((j) => j.id),
      });
      setAiRatings(
        Object.fromEntries(
          (b.ratings || []).map(
            (r: { id: string; score: number; reason: string }) => [
              r.id,
              { score: r.score, reason: r.reason },
            ],
          ),
        ),
      );
      setRankingFingerprint(rankingKey);
      notify("AI uyğunluq reytinqi yeniləndi.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  // A shared link /?job=ID&src=linkedin opens that vacancy and remembers the channel until the candidate applies.
  const deepLinked = useRef("");
  useEffect(() => {
    if (hr || admin || !jobs.length) return;
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("job") || "";
    if (!wanted || deepLinked.current === wanted) return;
    const target = jobs.find((x) => x.id === wanted);
    if (!target) return;
    deepLinked.current = wanted;
    const src = (params.get("src") || "").toLowerCase();
    try {
      if (src) window.localStorage.setItem("joblink-src", JSON.stringify({ job: wanted, src }));
    } catch {
      // Storage is optional.
    }
    openJob(target);
    go("jobs");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, hr, admin]);
  // Remember the one-time consent and load the admin's choice.
  useEffect(() => {
    if (!signedIn || hr || admin) return;
    try {
      if (window.localStorage.getItem("joblink-ai-ranking-consent") === "1") setRankingConsent(true);
    } catch {
      // Storage is optional.
    }
    api("matching-settings")
      .then((b: { settings: { candidate: "rules" | "ai" } }) => setMatchingMode(b.settings.candidate))
      .catch(() => setMatchingMode("rules"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, hr, admin]);
  // Automatic AI rating: once per vacancy, repeated only when the CV or vacancy changes.
  const autoRanked = useRef("");
  useEffect(() => {
    if (matchingMode !== "ai" || !signedIn || hr || admin || !aiEnabled || !rankingConsent) return;
    if (profile.cvText.trim().length < 80 || !jobs.length || autoRanked.current === rankingKey) return;
    const timer = window.setTimeout(async () => {
      autoRanked.current = rankingKey;
      try {
        const ids = [...jobs].sort((a, b) => match(profile, b).score - match(profile, a).score).slice(0, 50).map((j) => j.id);
        const b = await api("rank-jobs", { profile, language, jobIds: ids, auto: true });
        if (!b.ratings?.length) return;
        setAiRatings(Object.fromEntries((b.ratings as { id: string; score: number; reason: string }[]).map((r) => [r.id, { score: r.score, reason: r.reason }])));
        setRankingFingerprint(rankingKey);
      } catch {
        autoRanked.current = "";
      }
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingMode, signedIn, hr, admin, aiEnabled, rankingConsent, rankingKey]);
  async function apply() {
    if (!job) return;
    setBusy(true);
    try {
      let source = "";
      try {
        const stored = JSON.parse(window.localStorage.getItem("joblink-src") || "null") as { job: string; src: string } | null;
        if (stored?.job === job.id) source = stored.src;
      } catch {
        // Storage is optional.
      }
      await api("apply", { jobId: job.id, source });
      setApplyConfirm(false);
      await refresh();
      notify(
        job.demo
          ? "Nümunə müraciət saxlanıldı. Real şirkətə göndərilmədi."
          : "Müraciətiniz göndərildi.",
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const clearAssistantJob = useCallback(() => setAssistantJob(null), []);
  const clearMessageTarget = useCallback(() => setMessageTarget(null), []);
  const refreshCompany = useCallback(async () => {
    try {
      const response = await fetch("/api/joblink/company/me", { credentials: "same-origin", cache: "no-store" });
      setCompanyMe(response.ok ? await response.json() : null);
    } catch {
      setCompanyMe(null);
    }
  }, []);
  useEffect(() => {
    if (!signedIn || !hr) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCompany();
  }, [signedIn, hr, refreshCompany]);
  const refreshUnread = useCallback(async () => {
    try {
      const response = await fetch("/api/joblink/messages/unread", { credentials: "same-origin", cache: "no-store" });
      if (response.ok) setUnread(await response.json());
    } catch {
      /* counters are best-effort */
    }
  }, []);
  useEffect(() => {
    if (!signedIn) return;
    // Unread counters for messages and support replies in the navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUnread();
    const timer = window.setInterval(() => void refreshUnread(), 60000);
    return () => window.clearInterval(timer);
  }, [signedIn, refreshUnread]);
  async function resetSignedOut() {
    setProfile(sampleProfile);
    setSample(true);
    setSignedIn(false);
    setAccountRole(null);
    setAccountName("");
    setApplications([]);
    setSaved([]);
    go("overview");
    await refresh();
  }
  async function withdraw(applicationId: string) {
    // The reason is optional; the employer sees it in the application history.
    const reason = window.prompt("Bu müraciəti geri götürmək istəyirsiniz? İşəgötürən statusu görəcək.\nSəbəbi qısa yaza bilərsiniz (istəyə bağlı):", "");
    if (reason === null) return;
    setBusy(true);
    try {
      await api("withdraw", { id: applicationId, reason });
      await refresh();
      notify("Müraciət geri götürüldü.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function cards(list: typeof ranked) {
    return (
      <div className="jobs">
        {list.length ? (
          list.map((j, i) => (
            <article className="job-card" key={j.id}>
              <div className="job-top">
                <button
                  aria-label={`${j.company} vakansiyası`}
                  onClick={() => openJob(j)}
                  className={`company-mark ${j.company.includes("Kapital") ? "red" : j.company.includes("PASHA") ? "blue" : "mint"}`}
                >
                  {j.company.includes("Caspian") ? "cf" : j.company.slice(0, 1)}
                </button>
                <div className="job-title">
                  <button
                    className="job-title-button"
                    onClick={() => openJob(j)}
                  >
                    <h3>{j.title}</h3>
                  </button>
                  <p>
                    {j.company}{" "}
                    {j.demo ? (
                      <span className="demo-tag">Nümunə</span>
                    ) : j.companyVerified ? (
                      <VerifiedBadge small />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                  </p>
                </div>
                <button
                  className={`bookmark ${saved.includes(j.id) ? "is-saved" : ""}`}
                  aria-label={
                    saved.includes(j.id)
                      ? `${j.title} yaddaşdan çıxar`
                      : `${j.title} yadda saxla`
                  }
                  aria-pressed={saved.includes(j.id)}
                  onClick={() => saveJob(j)}
                >
                  <Bookmark
                    size={19}
                    fill={saved.includes(j.id) ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <label className="compare-check">
                <input
                  type="checkbox"
                  checked={compareJobs.includes(j.id)}
                  disabled={!compareJobs.includes(j.id) && compareJobs.length >= 4}
                  onChange={(e) =>
                    setCompareJobs((list) => (e.target.checked ? [...list, j.id] : list.filter((x) => x !== j.id)))
                  }
                />{" "}
                Müqayisə et
              </label>
              <div className="job-meta">
                <span>
                  <MapPin size={13} /> {j.city}
                </span>
                <span>
                  <Clock3 size={13} /> {j.type}
                </span>
                <span>
                  <Building2 size={13} /> {j.mode}
                </span>
                <span>
                  {j.minYears}–{j.maxYears} {language === "en" ? "years" : "il"}
                </span>
              </div>
              <div className="skill-tags">
                {j.skills.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              {"aiReason" in j.ranking && (
                <p className="muted fine-print">
                  AI rəyi: {String(j.ranking.aiReason)} · qaydalarla: {j.ranking.ruleScore}%
                </p>
              )}
              <div className="job-footer">
                <strong>
                  {j.minSalary || j.maxSalary ? (
                    <>
                      {j.minSalary.toLocaleString("fr-FR")} –{" "}
                      {j.maxSalary.toLocaleString("fr-FR")} <small>AZN / ay</small>
                    </>
                  ) : (
                    "Razılaşma yolu ilə"
                  )}
                </strong>
                <button
                  className="match-score"
                  onClick={() => openJob(j)}
                  title="Uyğunluğun səbəblərinə bax"
                >
                  <Sparkles size={12} /> {"aiReason" in j.ranking ? "AI " : ""}
                  {j.ranking.score}% uyğun
                </button>
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="Bu filtrlərə uyğun vakansiya yoxdur"
            description="Axtarış sözünü və ya filtrləri dəyişərək yenidən sınayın."
            action={
              <button className="secondary" onClick={resetFilters}>
                Filtrləri sıfırla
              </button>
            }
          />
        )}
      </div>
    );
  }
  function filters(full = false) {
    return (
      <>
        {!full && aiEnabled && (
          <div className="filter-row">
            <label className="checkline">
              <input
                type="checkbox"
                checked={rankingConsent}
                onChange={(e) => {
                  setRankingConsent(e.target.checked);
                  try {
                    window.localStorage.setItem("joblink-ai-ranking-consent", e.target.checked ? "1" : "0");
                  } catch {
                    // Storage is optional.
                  }
                }}
              />{" "}
              CV mətnimi vakansiyalara uyğunluq üçün {aiProvider} ilə paylaşmağa
              razıyam.
            </label>
            <button
              className="secondary"
              disabled={busy}
              onClick={runAiRanking}
            >
              {busy ? "Qiymətləndirilir…" : "AI reytinqi hesabla"}
            </button>
            {rankingFingerprint === rankingKey && (
              <span className="muted">
                AI reytinqi aktivdir{matchingMode === "ai" ? " · avtomatik, hər vakansiya üçün bir dəfə" : " · ilk 30 vakansiya"}
              </span>
            )}
          </div>
        )}
        <div className="filter-row">
          <label className="filter active">
            <Sparkles size={13} />
            <span className="sr-only">Minimum AI uyğunluğu</span>
            <select
              aria-label="Minimum AI uyğunluğu"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
            >
              <option value={0}>AI uyğunluğu</option>
              {[40, 60, 80, 90].map((n) => (
                <option key={n} value={n}>
                  {n}% və yuxarı
                </option>
              ))}
            </select>
          </label>
          <label className="filter">
            <select
              aria-label="İş formatı"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="">İş formatı</option>
              {["Ofisdə", "Hibrid", "Uzaqdan"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="filter">
            <select
              aria-label="Maaş aralığı"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
            >
              <option value={0}>Maaş aralığı</option>
              {[1000, 1500, 2000, 2500].map((n) => (
                <option key={n} value={n}>
                  {n}+ AZN
                </option>
              ))}
            </select>
          </label>
          {full && (
            <button
              className={`filter ${advanced ? "active" : ""}`}
              onClick={() => setAdvanced(!advanced)}
            >
              <SlidersHorizontal size={13} /> Bütün filtrlər
            </button>
          )}
          <label className="sort-label">
            <select
              aria-label="Sıralama"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="match">Ən uyğun əvvəlcə</option>
              <option value="salary">Maaş: çoxdan aza</option>
              <option value="new">Ən yeni əvvəlcə</option>
            </select>
          </label>
        </div>
        {full && advanced && (
          <div className="advanced-filters panel">
            <Field label="Şəhər">
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Bütün şəhərlər</option>
                {Array.from(new Set(jobs.map((j) => j.city))).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Sahə">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Bütün sahələr</option>
                {Array.from(new Set(jobs.map((j) => j.category))).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Təcrübə tələbi">
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                <option value="">Hamısı</option>
                {[0, 1, 2, 3, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} il və daha az tələb edən
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Məşğulluq">
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Hamısı</option>
                {["Tam ştat", "Yarımştat", "Müqavilə"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <button className="text-button" onClick={resetFilters}>
              Filtrləri sıfırla
            </button>
          </div>
        )}
      </>
    );
  }
  function cvPanel() {
    return (
      <section className="panel cv-panel">
        <div className="section-heading">
          <h3>CV-niz nə qədər güclüdür?</h3>
          <span className="pill">CV ANALİZ</span>
        </div>
        <div
          className="score-ring"
          style={{
            background: `conic-gradient(from 220deg,#73ac92 ${(pendingCv ? 0 : result.score) * 3.6}deg,#edf2ef 0)`,
          }}
        >
          <div>
            <strong>
              {pendingCv ? "—" : result.score}
              <span>/100</span>
            </strong>
            <p>
              {pendingCv
                ? profile.cvText.trim().length >= 80
                  ? "Analiz gözləyir"
                  : "CV yükləyin"
                : result.score >= 80
                  ? "Güclü profil"
                  : result.score >= 50
                    ? "Yaxşı başlanğıc"
                    : "İnkişaf fürsəti"}
            </p>
          </div>
        </div>
        <p className="score-caption">
          {pendingCv
            ? profile.cvText.trim().length >= 80
              ? "CV-ni analiz edin və dəlillərə əsaslanan nəticəni görün."
              : "CV yükləyin və AI analizi ilə nəticəni görün."
            : report
              ? "AI analizi · CV mətninə əsaslanır"
              : "İlkin profil yoxlaması"}
        </p>
        {[
          ["Struktur və tamlıq", result.completeness],
          ["Təcrübə və nailiyyətlər", result.achievement],
          ["Bacarıqların dolğunluğu", result.skills],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="analysis-item">
              <span>{label}</span>
              <b>{pendingCv ? "—" : value + "%"}</b>
            </div>
            <div className="progress">
              <i style={{ width: pendingCv ? "0%" : value + "%" }} />
            </div>
          </div>
        ))}
        <button className="secondary wide" onClick={() => go("analysis")}>
          Tam analizə bax <ArrowUpRight size={16} />
        </button>
        <p className="fine-print muted">
          {pendingCv
            ? profile.cvText.trim().length >= 80
              ? "Tam nəticə üçün analiz səhifəsində AI razılığını verin."
              : "Bal yalnız CV yüklənib AI analizi aparıldıqdan sonra göstərilir."
            : report
              ? "Bal peşəkar CV məzmununun dörd bölməsi üzrə hesablanır; işə qəbul ehtimalı deyil."
              : "Yalnız profil forması əsasında ilkin qiymətləndirmədir."}
        </p>
      </section>
    );
  }
  if (!authChecked) {
    return (
      <div className="auth-gate auth-gate-loading" role="status">
        <div className="auth-gate-brand">
          joblink<span>✳</span>
        </div>
        <p>Hesabınız yoxlanılır…</p>
      </div>
    );
  }

  if (!signedIn) {
    return localizeTree(
      <main className="auth-gate">
        <section className="auth-gate-intro">
          <div className="auth-gate-brand">
            joblink<span>✳</span>
          </div>
          <p className="eyebrow">KARYERA VƏ İŞƏ QƏBUL PLATFORMASI</p>
          <h1>Doğru insanı doğru imkanla birləşdiririk.</h1>
          <p>
            İş axtaran kimi CV-nizi inkişaf etdirin və uyğun vakansiyaları
            tapın. Şirkət kimi vakansiyalar yaradın və uyğun namizədləri idarə
            edin.
          </p>
          <div className="auth-gate-role-note">
            <UserRound size={20} />
            <span>
              Hər hesab yalnız qeydiyyatda seçilən panelə giriş əldə edir.
            </span>
          </div>
        </section>
        <section className="auth-gate-panel">
          <div className="auth-gate-language">
            <label>
              <span className="sr-only">Language / Dil</span>
              <select
                aria-label="Language / Dil"
                value={language}
                onChange={(event) => {
                  const next = event.target.value as "az" | "en";
                  setLanguage(next);
                  localStorage.setItem("joblink-language", next);
                }}
              >
                <option value="az">AZ</option>
                <option value="en">EN</option>
              </select>
            </label>
          </div>
          {authMode === "password" ? (
            <AccountLogin
              resetToken={resetToken}
              onResetDone={() => setResetToken("")}
              onComplete={async (role) => {
                await refresh(false);
                setLogin(false);
                const destination =
                  role === "admin"
                    ? "admin-overview"
                    : role === "company"
                      ? "hr-overview"
                      : "overview";
                setPage(destination);
                window.location.hash = destination;
              }}
            />
          ) : (
            <div className="login-content">
              <div className="assistant-icon">
                <UserRound size={28} />
              </div>
              <h3>Hesabınıza daxil olun</h3>
              <p>Platformadan istifadə etmək üçün giriş tələb olunur.</p>
              <a className="primary" href="/signin-with-chatgpt?return_to=/">
                <LogIn size={17} /> ChatGPT ilə daxil ol
              </a>
            </div>
          )}
        </section>
      </main>,
    );
  }

  return localizeTree(
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href={admin ? "#admin-overview" : hr ? "#hr-overview" : "#overview"}
          onClick={() =>
            go(admin ? "admin-overview" : hr ? "hr-overview" : "overview")
          }
        >
          joblink<span>✳</span>
        </a>
        <div className="workspace">
          <span>
            {admin ? (
              <ShieldCheck size={24} />
            ) : hr ? (
              <Building2 size={24} />
            ) : (
              <UserRound size={24} />
            )}
          </span>
          <div>
            {admin
              ? "Admin panel"
              : hr
                ? "İşəgötürən paneli"
                : "Namizəd paneli"}
            <small>
              {admin
                ? "Platforma nəzarəti"
                : hr
                  ? "Komandanızı böyüdün"
                  : "Karyeranızın növbəti addımı"}
            </small>
          </div>
        </div>
        <p className="nav-label">
          {admin ? "İDARƏETMƏ" : hr ? "İŞƏ QƏBUL" : "İŞ MƏKANIM"}
        </p>
        <nav aria-label="Əsas naviqasiya">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              title={label}
              aria-current={page === id ? "page" : undefined}
              key={id}
              onClick={() => go(id)}
              className={page === id ? "nav-item active" : "nav-item"}
            >
              <span>
                <Icon size={19} />
              </span>
              <em>{label}</em>
              {id.includes("ai") || id === "advice" ? <b>AI</b> : null}
              {(id === "messages" || id === "hr-messages") && unread.messages > 0 ? (
                <i className="nav-count">{unread.messages}</i>
              ) : null}
              {id === "hr-approvals" && companyMe && companyMe.awaitingApproval > 0 ? (
                <i className="nav-count">{companyMe.awaitingApproval}</i>
              ) : null}
              {(id === "support" || id === "hr-support" || id === "admin-support") && unread.support > 0 ? (
                <i className="nav-count">{unread.support}</i>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="career-note">
            {admin ? <ShieldCheck size={23} /> : <Sparkles size={23} />}
            <h3>
              {admin
                ? "Təhlükəsiz idarəetmə"
                : hr
                  ? "Növbəti komanda üzvünüz"
                  : "Potensialınızı kəşf edin"}
            </h3>
            <p>
              {admin
                ? "Dəyişikliklər audit jurnalında qeydə alınır."
                : hr
                  ? "Tələblərinizi yazın, uyğun namizədləri kəşf edin."
                  : "Profilinizi tamamlayın, doğru fürsətlər sizi tapsın."}
            </p>
            <button
              onClick={() =>
                go(admin ? "admin-system" : hr ? "hr-ai" : "profile")
              }
            >
              {admin ? "Sistemə bax" : hr ? "Vakansiya yarat" : "Profilə keç"}
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="user"
            onClick={() =>
              signedIn
                ? go(admin ? "admin-overview" : hr ? "hr-overview" : "profile")
                : setLogin(true)
            }
          >
            <div className="avatar">{accountLabel[0] || "J"}</div>
            <div>
              {accountLabel}
              <small>{signedIn ? "Hesabınız" : "Daxil ol"}</small>
            </div>
            <ChevronDown size={14} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            {admin ? "Administrator" : hr ? "İşəgötürən" : "İş məkanım"}
            <span>/</span>
            <strong>{label}</strong>
          </div>
          <div className="topbar-right">
            {signedIn && !admin && <NotificationBell go={go} />}
            <span className="today">
              {formatDate(new Date(), language, { month: "long" })}
            </span>
            <label className="language">
              <span className="sr-only">Language / Dil</span>
              <select
                aria-label="Language / Dil"
                value={language}
                onChange={(e) => {
                  const next = e.target.value as "az" | "en";
                  setLanguage(next);
                  localStorage.setItem("joblink-language", next);
                  document.documentElement.lang = next;
                  setCvReport(null);
                  setNarrative(null);
                }}
              >
                <option value="az">AZ</option>
                <option value="en">EN</option>
              </select>
            </label>
            {signedIn && authMode === "password" && (
              <>
                <button
                  className="text-button"
                  onClick={() => setAccountSettings(true)}
                >
                  Hesab
                </button>
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      await api("auth/logout", {});
                      await resetSignedOut();
                      notify("Hesabınızdan çıxdınız.");
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  Çıxış
                </button>
              </>
            )}
            {!admin && !hr && (
              <CompareBar
                count={compareJobs.length}
                max={4}
                onOpen={() => setComparing(true)}
                onClear={() => setCompareJobs([])}
              />
            )}
            {comparing && (
              <JobComparison
                jobs={compareJobs.map((id) => jobs.find((x) => x.id === id)).filter((x): x is Job => !!x)}
                profile={profile}
                onClose={() => setComparing(false)}
              />
            )}
            {openOffer && (
              <OfferResponse
                offer={openOffer}
                candidateName={accountName || profile.name}
                onClose={() => setOpenOffer(null)}
                onDone={() => refresh()}
                notify={notify}
              />
            )}
            {rewriteSuggestions && (
              <CvRewrite
                profile={profile}
                suggestions={rewriteSuggestions}
                onSave={saveProfile}
                onClose={() => setRewriteSuggestions(null)}
                notify={notify}
              />
            )}
            {accountSettings && (
              <AccountSettings
                api={api}
                notify={notify}
                onClose={() => setAccountSettings(false)}
                onDeleted={resetSignedOut}
              />
            )}
            <button
              className="avatar small"
              aria-label="Hesab"
              onClick={() =>
                signedIn
                  ? go(
                      admin ? "admin-overview" : hr ? "hr-overview" : "profile",
                    )
                  : setLogin(true)
              }
            >
              {accountLabel[0] || "J"}
            </button>
          </div>
        </header>
        <main>
          {loadError && (
            <div className="notice error">
              {loadError}
              <button onClick={() => refresh()}>Yenidən cəhd et</button>
            </div>
          )}
          {tabs.length > 0 && (
            <div className="tab-strip" role="tablist">
              {tabs
                .filter((t) => t.kind !== "page" || navigation.some((n) => n.id === t.ref))
                .map((t) => {
                  const title = t.kind === "page" ? navigation.find((n) => n.id === t.ref)?.label || t.title : t.title;
                  const active =
                    t.kind === "job" ? job?.id === t.ref : t.kind === "company" ? company?.id === t.ref : !job && !company && page === t.ref;
                  return (
                    <div key={t.key} role="tab" aria-selected={active} className={active ? "tab active" : "tab"} onClick={() => activateTab(t)}>
                      <span>{title}</span>
                      <button className="tab-close" aria-label="Bağla" onClick={(e) => { e.stopPropagation(); closeTab(t.key); }}>
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
          {job ? (
            <section className="job-tab-view">
          <div className="job-detail">
            <header className="vacancy-company">
              <div className="vacancy-company-mark" aria-hidden="true">
                {job.company.trim().slice(0, 1).toLocaleUpperCase("az")}
              </div>
              <div>
                <h3>
                  {job.owner && !job.demo ? (
                    <button className="text-button" onClick={() => openCompanyByOwner(job.owner, job.company)}>{job.company}</button>
                  ) : (
                    job.company
                  )}{" "}
                  {job.companyVerified && <VerifiedBadge small />}
                </h3>
                <span>{job.category || "Digər"}</span>
              </div>
              <div className="vacancy-dates">
                <span>
                  <CalendarDays size={15} /> Yerləşdirilib:{" "}
                  {vacancyDate(job.created, language)}
                </span>
                {job.deadline && (
                  <strong>
                    Son tarix: {vacancyDate(job.deadline, language)}
                  </strong>
                )}
              </div>
              {job.demo && (
                <span className="sample-label">Nümunə vakansiya</span>
              )}
            </header>

            <div className="vacancy-facts">
              <div>
                <span>Maaş</span>
                <strong>
                  {job.minSalary || job.maxSalary
                    ? `${job.minSalary.toLocaleString("fr-FR")}–${job.maxSalary.toLocaleString("fr-FR")} AZN`
                    : "Razılaşma yolu ilə"}
                </strong>
              </div>
              <div>
                <span>Ərazi</span>
                <strong>
                  <MapPin size={15} /> {job.city || "Göstərilməyib"}
                </strong>
              </div>
              <div>
                <span>Məşğulluq</span>
                <strong>
                  <Clock3 size={15} /> {job.type || "Göstərilməyib"}
                </strong>
              </div>
              <div>
                <span>İş formatı</span>
                <strong>
                  <Building2 size={15} /> {job.mode || "Göstərilməyib"}
                </strong>
              </div>
              <div>
                <span>Təcrübə</span>
                <strong>
                  {job.minYears || job.maxYears
                    ? `${job.minYears}–${job.maxYears} ${language === "en" ? "years" : "il"}`
                    : "Göstərilməyib"}
                </strong>
              </div>
            </div>

            <div className="vacancy-detail-layout">
              <div className="vacancy-content">
                <section>
                  <h3>İşin təsviri</h3>
                  <ul>
                    {vacancyItems(job.description).map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3>Namizəddən tələb olunanlar</h3>
                  <ul>
                    {vacancyItems(job.requirements).map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </section>
                {(job.workSchedule || job.benefits) && (
                  <section>
                    <h3>İş şəraiti</h3>
                    <ul>
                      {job.workSchedule && (
                        <li>İş qrafiki: {job.workSchedule}</li>
                      )}
                      {job.benefits &&
                        vacancyItems(job.benefits).map((item, index) => (
                          <li key={`${index}-${item}`}>{item}</li>
                        ))}
                    </ul>
                  </section>
                )}
                {job.address && (
                  <section>
                    <h3>Ünvan</h3>
                    <a
                      className="vacancy-map-link"
                      href={googleMapsSearchUrl(job.address)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={16} /> {job.address}{" "}
                      <ArrowUpRight size={15} />
                    </a>
                  </section>
                )}
              </div>

              <aside className="vacancy-sidebar">
                <div className="vacancy-skills">
                  <h3>Tələb olunan bacarıqlar</h3>
                  <div className="skill-tags">
                    {job.skills.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                  {!!job.certifications?.length && (
                    <>
                      <h3>Sertifikat tələbləri</h3>
                      <JobCertificationList
                        items={job.certifications}
                        evidence={activeJobMatch?.certEvidence}
                      />
                    </>
                  )}
                </div>
                <div className="match-explanation">
                  <h3>
                    <Sparkles size={18} /> {activeJobMatch?.score}% profil
                    uyğunluğu
                  </h3>
                  {activeJobMatch && (
                    <ul className="match-breakdown">
                      {(
                        [
                          ["Bacarıq dəlili", activeJobMatch.breakdown.skills, 50],
                          ["Vəzifə uyğunluğu", activeJobMatch.breakdown.role, 25],
                          ["Uyğun təcrübə", activeJobMatch.breakdown.experience, 25],
                        ] as const
                      ).map(([label, value, max]) => (
                        <li key={label}>
                          <span>{label}</span>
                          <i>
                            <em style={{ width: `${(value / max) * 100}%` }} />
                          </i>
                          <b>
                            {value}/{max}
                          </b>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p>
                    <b>Təcrübədə təsdiqlənən:</b>{" "}
                    {activeJobMatch?.skillEvidence
                      .filter((x) => x.level === "experience")
                      .map((x) => x.skill)
                      .join(", ") || "—"}
                  </p>
                  <p>
                    <b>Yalnız siyahıda və ya CV mətnində:</b>{" "}
                    {activeJobMatch?.skillEvidence
                      .filter((x) => x.level === "declared" || x.level === "mentioned")
                      .map((x) => x.skill)
                      .join(", ") || "—"}
                  </p>
                  <p>
                    <b>İnkişaf sahələri:</b>{" "}
                    {activeJobMatch?.missing.join(", ") ||
                      "Əsas bacarıqlarınız tələblərlə üst-üstə düşür"}
                  </p>
                  {!!activeJobMatch?.skillEvidence.some((x) => x.level === "certified") && (
                    <p>
                      <b>Sertifikatla təsdiqlənən:</b>{" "}
                      {activeJobMatch.skillEvidence
                        .filter((x) => x.level === "certified")
                        .map((x) => x.skill)
                        .join(", ")}
                    </p>
                  )}
                  <p>
                    <b>Uyğun təcrübə:</b> {activeJobMatch?.relevantYears ?? 0} il
                    / tələb olunan {job.minYears} il
                  </p>
                  <small>
                    Bacarıq və sertifikat dəlili 50%, vəzifə uyğunluğu 25%, uyğun
                    təcrübə 25%. Şəhər və iş formatı bala təsir etmir. Bacarıq iş
                    təcrübəsində göstərilibsə tam, yalnız siyahıda və ya mətndə
                    keçirsə qismən sayılır. İşə qəbul ehtimalı deyil.
                  </small>
                  {signedIn && (
                    <FitReviewPanel api={api} jobId={job.id} language={language} audience="candidate" />
                  )}
                </div>
              </aside>
            </div>
            {(() => {
              const similar = similarJobs(job, jobs);
              return similar.length ? (
                <section className="panel similar-jobs">
                  <h3>Oxşar vakansiyalar</h3>
                  <div className="company-jobs-list">
                    {similar.map((x) => (
                      <button key={x.id} className="company-job-row" onClick={() => openJob(x)}>
                        <strong>{x.title}</strong>
                        <span>{x.company} · {x.city}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null;
            })()}
            {job.demo && (
              <p className="demo-notice">
                Bu elan nümayiş üçündür. Müraciət real şirkətə göndərilmir.
              </p>
            )}
            {applyConfirm ? (
              <div className="apply-confirm">
                <h3>Profilinizi göndərməyə hazırsınız?</h3>
                <p>
                  CV, əlaqə məlumatlarınız və təcrübəniz{" "}
                  {job.demo
                    ? "nümunə müraciətdə saxlanılacaq"
                    : job.company + " ilə paylaşılacaq"}
                  .
                </p>
                <div className="form-actions">
                  <button
                    className="secondary"
                    onClick={() => setApplyConfirm(false)}
                  >
                    Geri
                  </button>
                  <button className="primary" disabled={busy} onClick={apply}>
                    {busy ? "Göndərilir..." : "Təsdiq et və göndər"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="form-actions">
                <button className="secondary" onClick={() => saveJob(job)}>
                  <Bookmark size={16} />
                  {saved.includes(job.id) ? "Yadda saxlanıb" : "Yadda saxla"}
                </button>
                {signedIn && !job.demo && job.owner && (
                  <>
                    <button
                      className="secondary"
                      onClick={async () => {
                        const on = !relations.following.includes(job.owner);
                        try {
                          await api("relations/follow", { targetId: job.owner, on });
                          setRelations((r) => ({ ...r, following: on ? [...r.following, job.owner] : r.following.filter((x) => x !== job.owner) }));
                          notify(on ? `${job.company} izlənilir. Yeni vakansiyalardan xəbərdar olacaqsınız.` : "İzləmə dayandırıldı.");
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    >
                      {relations.following.includes(job.owner) ? "İzlənilir ✓" : "Şirkəti izlə"}
                    </button>
                    <button
                      className="text-button"
                      onClick={async () => {
                        if (!window.confirm(`${job.company} bloklansın? Bu şirkətin vakansiyaları və mesajları sizə göstərilməyəcək.`)) return;
                        try {
                          await api("relations/block", { targetId: job.owner, on: true });
                          closeTab(`job:${job.id}`);
                          await refresh();
                          notify(`${job.company} bloklandı.`);
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    >
                      Blokla
                    </button>
                  </>
                )}
                {aiEnabled && signedIn && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setAssistantJob(job);
                      setJob(null);
                      go("assistant");
                    }}
                  >
                    <MessagesSquare size={16} /> AI ilə soruş
                  </button>
                )}
                <button
                  className="primary"
                  disabled={applications.some((a) => a.jobId === job.id && a.status !== "Geri götürülüb")}
                  onClick={() => {
                    if (!signedIn) {
                      setJob(null);
                      setLogin(true);
                    } else if (sample) {
                      setJob(null);
                      go("profile");
                      notify(
                        "Əvvəlcə öz profilinizi yaradın və yadda saxlayın.",
                      );
                    } else setApplyConfirm(true);
                  }}
                >
                  {applications.some((a) => a.jobId === job.id && a.status !== "Geri götürülüb")
                    ? "Müraciət edilib"
                    : "Müraciət et"}
                </button>
              </div>
            )}
                      {(() => {
              const others = jobs.filter((x) => x.owner && x.owner === job.owner && x.id !== job.id);
              return others.length ? (
                <section className="other-jobs">
                  <h3>{job.company} şirkətinin digər vakansiyaları ({others.length})</h3>
                  <div className="company-jobs-list">
                    {others.map((x) => (
                      <button key={x.id} className="company-job-row" onClick={() => openJob(x)}>
                        <strong>{x.title}</strong>
                        <span>{x.city} · {x.minSalary || x.maxSalary ? `${x.minSalary}–${x.maxSalary} AZN` : "Razılaşma yolu ilə"}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null;
            })()}
</div>
</section>
          ) : company ? (
            <CompanyView
              company={company}
              jobs={jobs.filter((x) => x.owner === company.id)}
              following={relations.following.includes(company.id)}
              signedIn={signedIn}
              isCandidate={accountRole === "candidate"}
              onNotify={notify}
              onOpenJob={openJob}
              onFollow={async (on) => {
                try {
                  await api("relations/follow", { targetId: company.id, on });
                  setRelations((r) => ({ ...r, following: on ? [...r.following, company.id] : r.following.filter((x) => x !== company.id) }));
                  notify(on ? `${company.name} izlənilir.` : "İzləmə dayandırıldı.");
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
              onBlock={async () => {
                if (!window.confirm(`${company.name} bloklansın? Bu şirkətin vakansiyaları və mesajları sizə göstərilməyəcək.`)) return;
                try {
                  await api("relations/block", { targetId: company.id, on: true });
                  closeTab(`company:${company.id}`);
                  await refresh();
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            />
          ) : admin && page === "admin-ai-usage" ? (
            <>
              <section className="page-heading"><div className="heading-row"><div><h1>AI istifadə və xərc</h1><p>Sorğu sayı, token və təxmini xərc</p></div></div></section>
              <AdminAiUsage notify={notify} />
            </>
          ) : admin && page === "admin-reviews" ? (
            <>
              <section className="page-heading"><div className="heading-row"><div><h1>Şirkət rəyləri</h1><p>Namizədlərin yazdığı rəylər dərc olunmazdan əvvəl burada yoxlanılır</p></div></div></section>
              <AdminReviews notify={notify} />
            </>
          ) : admin && page === "admin-support" ? (
            <>
              <section className="page-heading"><div className="heading-row"><div><h1>Sorğular və mesajlar</h1><p>Şirkət və işçilərin şikayət, təklif və sorğuları</p></div></div></section>
              <SupportPage admin onRead={refreshUnread} notify={notify} />
            </>
          ) : !admin && signedIn && (page === "messages" || page === "hr-messages") ? (
            <>
              <section className="page-heading"><div className="heading-row"><div><h1>Mesajlar</h1><p>{hr ? "Namizədlərlə yazışmalarınız" : "İşəgötürənlərlə yazışmalarınız"}</p></div></div></section>
              <MessagesPage role={hr ? "company" : "candidate"} target={messageTarget} onTargetHandled={clearMessageTarget} onRead={refreshUnread} notify={notify} />
            </>
          ) : !admin && signedIn && hr && ["hr-approvals", "hr-reports", "hr-employees", "hr-workforce", "hr-team", "hr-company", "hr-billing", "hr-calculator"].includes(page) ? (
            <>
              <section className="page-heading"><div className="heading-row"><div>
                <h1>{navigation.find((n) => n.id === page)?.label}</h1>
                <p>{companyMe?.company?.name}{companyMe ? ` · ${companyMe.roleLabel}` : ""}</p>
              </div></div></section>
              {page === "hr-approvals" && <ApprovalsPage notify={notify} onChange={() => { void refreshCompany(); void refresh(); }} />}
              {page === "hr-reports" && <CompanyDashboard me={companyMe} notify={notify} />}
              {page === "hr-employees" && <EmployeesPage notify={notify} />}
              {page === "hr-workforce" && <WorkforcePage me={companyMe} notify={notify} />}
              {page === "hr-team" && <TeamPage me={companyMe} notify={notify} onJoined={() => { void refreshCompany(); void refresh(); }} />}
              {page === "hr-company" && <CompanyProfilePage notify={notify} onChange={refreshCompany} />}
              {page === "hr-billing" && <BillingPage notify={notify} />}
              {page === "hr-calculator" && <SalaryCalculator employer api={api} notify={notify} />}
            </>
          ) : admin && page === "admin-verifications" ? (
            <>
              <section className="page-heading"><div className="heading-row"><div><h1>Sənəd yoxlaması</h1><p>İş yeri və sertifikat sənədləri: AI rəyi və yekun qərar</p></div></div></section>
              <AdminVerifications notify={notify} />
            </>
          ) : admin && page === "admin-companies" ? (
            <>
              <section className="page-heading"><div className="heading-row"><div><h1>Şirkət yoxlaması</h1><p>e-taxes VÖEN sənədləri və şirkət rekvizitləri</p></div></div></section>
              <AdminCompanies notify={notify} />
            </>
          ) : !admin && signedIn && hr && page === "hr-talent" ? (
            <>
              <section className="page-heading"><div className="heading-row"><div><h1>İstedad bazası</h1><p>Saxladığınız namizədlər, etiket və qeydlər</p></div></div></section>
              <TalentPage
                notify={notify}
                onMessage={(target) => {
                  setMessageTarget(target);
                  go("hr-messages");
                }}
              />
            </>
          ) : !admin && signedIn && hr && page === "hr-interviews" ? (
            <>
              <section className="page-heading"><div className="heading-row"><div><h1>Müsahibələr</h1><p>Təyin olunmuş müsahibələr, namizədin cavabı və rəylər</p></div></div></section>
              <InterviewsPage notify={notify} />
            </>
          ) : !admin && signedIn && hr && page === "hr-tests" ? (
            <>
              <section className="page-heading"><div className="heading-row"><div><h1>Testlər</h1><p>Vakansiyalar üzrə testlər, nəticələr və dəyişiklik tarixçəsi</p></div></div></section>
              <AssessmentsPage notify={notify} />
            </>
          ) : !admin && signedIn && (page === "support" || page === "hr-support") ? (
            <>
              <section className="page-heading"><div className="heading-row"><div><h1>Dəstək</h1><p>Şikayət, təklif və sorğularınız</p></div></div></section>
              <SupportPage role={hr ? "company" : "candidate"} onRead={refreshUnread} notify={notify} />
            </>
          ) : admin ? (
            <AdminPanel
              page={page}
              api={api}
              notify={notify}
              language={language}
            />
          ) : hr ? (
            <HrPanel
              page={page}
              go={go}
              api={api}
              notify={notify}
              aiEnabled={aiEnabled}
              aiProvider={aiProvider}
              language={language}
              signedIn={signedIn}
              onPublished={refresh}
              canPublish={!companyMe || companyMe.permissions.includes("publish")}
              onMessage={(target) => {
                setMessageTarget(target);
                go("hr-messages");
              }}
            />
          ) : (
            <>
              {page !== "profile" && (
                <section className="page-heading">
                  <div className="eyebrow">
                    {page === "overview"
                      ? "SİZİN ÜÇÜN SEÇİLİB"
                      : "KARYERANIZIN NÖVBƏTİ ADDIMI"}
                  </div>
                  <div className="heading-row">
                    <div>
                      <h1>
                        {page === "overview" ? (
                          <>
                            Salam,{" "}
                            {profile.name.split(" ")[0] || "xoş gəlmisiniz"}{" "}
                            <span>✳</span>
                          </>
                        ) : (
                          titles[page]
                        )}
                      </h1>
                      <p>
                        {page === "overview"
                          ? "Karyeranızda yeni bir səhifə açmağa hazırsınız?"
                          : descriptions[page]}
                      </p>
                    </div>
                    {page === "overview" && (
                      <button className="primary" onClick={() => go("jobs")}>
                        Vakansiyaları kəşf et <ArrowUpRight size={17} />
                      </button>
                    )}
                    {page === "analysis" && (
                      <button className="primary" onClick={() => go("profile")}>
                        <FileText size={16} /> CV-ni yenilə
                      </button>
                    )}
                  </div>
                  {sample && (
                    <div className="sample-indicator">
                      <span>Nümunə profil</span>
                      <button onClick={() => go("profile")}>
                        Öz CV-nizlə başlayın <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </section>
              )}
              {page === "overview" && (
                <>
                  <div className="stats">
                    {[
                      [
                        BriefcaseBusiness,
                        "Uyğun vakansiyalar",
                        ranked.filter((j) => j.ranking.score >= 60).length,
                        "60%+ uyğunluq",
                      ],
                      [
                        Send,
                        "Müraciətlərim",
                        applications.length,
                        applications.filter((a) => a.status === "Baxışda")
                          .length + " baxışda",
                      ],
                      [
                        UserRound,
                        "Profil tamamlanması",
                        result.completeness + "%",
                        "Tamamla ↗",
                      ],
                    ].map(([Icon, title, value, note]) => {
                      const I = Icon as typeof UserRound;
                      return (
                        <button
                          className="stat"
                          key={String(title)}
                          onClick={() =>
                            go(
                              title === "Müraciətlərim"
                                ? "applications"
                                : title === "Profil tamamlanması"
                                  ? "profile"
                                  : "jobs",
                            )
                          }
                        >
                          <span className="stat-icon">
                            <I size={20} />
                          </span>
                          <div>
                            {String(title)}
                            <strong>
                              {String(value)}
                              <small>{String(note)}</small>
                            </strong>
                          </div>
                          <span className="spark">▁▃▂▄▃▆▅█</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="dashboard-grid">
                    <div>
                      <section className="discovery-banner">
                        <div>
                          <span className="pill dark">
                            <Sparkles size={12} /> KARYERANIZ ÜÇÜN AI
                          </span>
                          <h2>
                            Təcrübəniz dəyərlidir.
                            <br />
                            Doğru yerdə parlasın.
                          </h2>
                          <p>
                            Bacarıqlarınıza uyğun imkanları kəşf edin və
                            <br />
                            növbəti addımınızı əminliklə atın.
                          </p>
                          <button onClick={() => go("advice")}>
                            Tövsiyələrimə bax <ArrowUpRight size={14} />
                          </button>
                        </div>
                        <div className="match-orbit">
                          <div className="orbit" />
                          <div className="orbit two" />
                          <div className="orbit three" />
                          <span className="floating">
                            <Sparkles size={17} />
                          </span>
                          <div className="orbit-center">
                            <span>ƏN YÜKSƏK UYĞUNLUQ</span>
                            <strong>
                              {best}
                              <small>%</small>
                            </strong>
                            <span>Profiliniz əsasında</span>
                          </div>
                        </div>
                      </section>
                      <section className="job-section">
                        <div className="section-heading">
                          <div>
                            <h2>
                              Sizə uyğun vakansiyalar{" "}
                              <span className="count">{filtered.length}</span>
                            </h2>
                            <p>Profiliniz və bacarıqlarınız əsasında seçilib</p>
                          </div>
                          <button
                            className="text-button"
                            onClick={() => go("jobs")}
                          >
                            Hamısına bax <ArrowUpRight size={14} />
                          </button>
                        </div>
                        {filters()}
                        {cards(filtered.slice(0, 3))}
                      </section>
                    </div>
                    <aside className="right-column">
                      {cvPanel()}
                      <section className="panel next-step">
                        <div className="section-heading">
                          <h3>Növbəti addımınız</h3>
                          <Sparkles size={18} />
                        </div>
                        <div className="tip-icon">
                          <TrendingUp size={20} />
                        </div>
                        <h3>Nailiyyətlərinizi rəqəmlərlə göstərin</h3>
                        <p>
                          “Hesabatlar hazırladım” əvəzinə neçə hesabat və hansı
                          nəticəni əldə etdiyinizi yazın.
                        </p>
                        <button
                          className="text-button"
                          onClick={() => go("profile")}
                        >
                          CV-mi təkmilləşdir <ArrowUpRight size={14} />
                        </button>
                      </section>
                    </aside>
                  </div>
                </>
              )}
              {page === "jobs" && (
                <>
                  {signedIn && accountRole === "candidate" && (
                    <JobAlerts current={{ query, city, mode, category, type, minSalary: salary }} notify={notify} />
                  )}
                  <div className="jobs-toolbar">
                    <div className="search-input">
                      <Search size={18} />
                      <input
                        aria-label="Vakansiya axtar"
                        placeholder="Vəzifə, şirkət və ya bacarıq axtar..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      {query && (
                        <button
                          aria-label="Axtarışı təmizlə"
                          onClick={() => setQuery("")}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <button
                      className={`secondary ${savedOnly ? "selected" : ""}`}
                      aria-pressed={savedOnly}
                      onClick={() => setSavedOnly(!savedOnly)}
                    >
                      <Bookmark size={16} /> Yadda saxlananlar ({saved.length})
                    </button>
                    <button
                      className={`secondary ${matchOnly ? "selected" : ""}`}
                      aria-pressed={matchOnly}
                      title="Profilinizə (bacarıq, təcrübə) və maaş aralığınıza uyğun vakansiyalar"
                      onClick={() => setMatchOnly(!matchOnly)}
                    >
                      <Sparkles size={16} /> Yalnız mənə uyğun
                    </button>
                  </div>
                  {filters(true)}
                  <div className="results-heading">
                    <strong>{filtered.length} vakansiya</strong>
                    <button className="text-button" onClick={resetFilters}>
                      Filtrləri sıfırla
                    </button>
                  </div>
                  <div className="job-list-grid">{cards(filtered)}</div>
                </>
              )}
              {page === "companies" && <CompaniesPage onOpen={openCompany} notify={notify} />}
              {page === "calculator" && <SalaryCalculator notify={notify} />}
              {page === "packages" && <PackagesPage notify={notify} />}
              {page === "profile" && (
                <ProfileEditor
                  profile={profile}
                  isSample={sample}
                  onSave={saveProfile}
                  busy={busy}
                  onNotice={notify}
                  localCv={cvStorage === "profile_text"}
                  aiEnabled={aiEnabled}
                  aiProvider={aiProvider}
                  focusTarget={profileFocus}
                />
              )}
              {page === "profile" && signedIn && !sample && <VerificationPanel profile={profile} notify={notify} />}
              {page === "analysis" && (
                <>
                  <div className="analysis-layout">
                    <div>
                      {cvPanel()}
                      <div className="panel next-step">
                        <h3>Qiymət necə hesablanır?</h3>
                        <p>
                          Tamlıq 35%, nailiyyətlər 30%, bacarıqlar 20%, mətnin
                          strukturu 15%. AI nəticəsində hər sahə CV-dəki dəlilə
                          əsaslanır. Bu işə qəbul ehtimalı deyil.
                        </p>
                      </div>
                    </div>
                    <section className="panel analysis-main">
                      <div className="section-heading">
                        <h2>CV-nizin inkişaf xəritəsi</h2>
                        <span className="pill">
                          {result.issues.length} TÖVSİYƏ
                        </span>
                      </div>
                      <p className="muted">
                        {profile.cvName
                          ? profile.cvName
                          : "Profil forması əsasında analiz"}{" "}
                        · {result.years} il təcrübə
                      </p>
                      {(() => {
                        const context = careerContext(profile);
                        if (!context.fields.length && !context.credentials.length && !context.coursesAndAchievements.length)
                          return null;
                        const duration = (months: number) =>
                          months >= 12
                            ? `${Math.floor(months / 12)} il${months % 12 ? ` ${months % 12} ay` : ""}`
                            : `${months} ay`;
                        const status: Record<string, string> = { active: "Aktiv", in_progress: "Davam edir", expired: "Müddəti bitib" };
                        return (
                          <div className="career-map">
                            <h3>Karyera xəritəsi</h3>
                            {!!context.fields.length && (
                              <div>
                                <h4>İşlədiyiniz sahələr</h4>
                                <ul>
                                  {context.fields.map((f) => (
                                    <li key={f.field}>
                                      <strong>{f.fieldAz}</strong>
                                      {f.field === context.currentField ? <em className="pill"> hazırkı</em> : null}
                                      <span> · {f.months ? duration(f.months) : "tarix yoxdur"}</span>
                                      <small>{f.titles.join(", ")}</small>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {!!context.credentials.length && (
                              <div>
                                <h4>Sertifikatlar</h4>
                                <ul>
                                  {context.credentials.map((c) => (
                                    <li key={c.name}>
                                      <strong>{c.name}</strong>
                                      <span> · {status[c.status] || c.status}</span>
                                      {c.detail && <small>{c.detail}</small>}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {!!context.coursesAndAchievements.length && (
                              <div>
                                <h4>Kurslar və nailiyyətlər</h4>
                                <ul>
                                  {context.coursesAndAchievements.slice(0, 8).map((line) => (
                                    <li key={line}>{line}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {pendingCv && profile.cvText.trim().length >= 80 && (
                        <p className="notice">
                          CV yüklənib. Dəlillərə əsaslanan bal üçün razılıq
                          verib “Analizi yenilə” düyməsini seçin.
                        </p>
                      )}
                      {report?.evidence.length ? (
                        report.evidence.map((finding, i) => (
                          <div className="analysis-finding" key={i}>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            <div>
                              <h3>{finding.area || "CV qeydi"}</h3>
                              <blockquote>“{finding.quote}”</blockquote>
                              <p>{finding.advice}</p>
                              <button
                                className="text-button"
                                onClick={() =>
                                  openProfileCorrection(
                                    finding.area,
                                    finding.quote,
                                    finding.advice,
                                  )
                                }
                              >
                                Profilimdə düzəlt <ArrowUpRight size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : result.issues.length ? (
                        result.issues.map((issue, i) => (
                          <div className="analysis-finding" key={issue}>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            <div>
                              <h3>
                                {issue.startsWith("Əlaqə")
                                  ? "Əlaqə məlumatları"
                                  : issue.startsWith("Nailiyyət")
                                    ? "Nəticə və təsir"
                                    : issue.startsWith("Ən azı")
                                      ? "Peşə bacarıqları"
                                      : issue.startsWith("İş təcrübəsi")
                                        ? "İş təcrübəsi"
                                        : issue.startsWith("Təhsil")
                                          ? "Təhsil"
                                          : "Peşəkar xülasə"}
                              </h3>
                              <p>{issue}</p>
                              <button
                                className="text-button"
                                onClick={() => openProfileCorrection(issue)}
                              >
                                Profilimdə düzəlt <ArrowUpRight size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="success-block">
                          <CheckCircle2 />
                          <h3>Əsas CV bölmələri tamamdır</h3>
                          <p>
                            Növbəti addım: seçdiyiniz vakansiyanın tələblərinə
                            uyğun faktiki nümunələri vurğulayın.
                          </p>
                        </div>
                      )}
                      <div className="analysis-actions">
                        {aiEnabled ? (
                          <label className="checkline">
                            <input
                              type="checkbox"
                              checked={aiConsent}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setAiConsent(checked);
                                if (checked && pendingCv)
                                  void runAnalysis(true);
                              }}
                            />{" "}
                            CV-nin peşəkar məzmununu ətraflı analiz üçün{" "}
                            {aiProvider}
                            ilə paylaşmağa razıyam.
                          </label>
                        ) : (
                          <p className="muted">
                            Generativ AI bağlantısı aktiv deyil. Hazırda CV
                            məzmunundan hesablanan ilkin analiz göstərilir.
                          </p>
                        )}
                        {analysisError && (
                          <p className="notice" role="alert">
                            Analiz tamamlanmadı: {analysisError}
                          </p>
                        )}
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => void runAnalysis()}
                        >
                          <Sparkles size={16} />
                          {busy
                            ? "Analiz edilir…"
                            : report
                              ? "Analizi yenilə"
                              : "CV-ni analiz et"}
                        </button>
                        {analysisTime && (
                          <span className="muted">
                            Son analiz: {analysisTime}
                          </span>
                        )}
                      </div>
                    </section>
                  </div>
                  {report && deepReport && (
                    <section className="deep-report">
                      <div className="panel report-summary">
                        <span className="eyebrow">
                          DƏLİLLƏRƏ ƏSASLANAN HESABAT
                        </span>
                        <h2>
                          <Sparkles /> Dərin AI analizi
                        </h2>
                        <p>{deepReport.executiveSummary || narrative}</p>
                        <button
                          className="primary report-rewrite-button"
                          onClick={() =>
                            setRewriteSuggestions([
                              ...deepReport.improvements.map((item) => `${item.title}: ${item.action}`),
                              ...(deepReport.issues || []).map((issue) => `${issue.problem} → ${issue.fix}`),
                              ...deepReport.atsRisks.map((item) => `${item.issue}: ${item.fix}`),
                              ...deepReport.rewrites.map((item) => `“${item.original}” → “${item.improved}”`),
                            ])
                          }
                        >
                          <Sparkles size={16} /> CV-ni təkliflərə əsasən yenidən hazırla
                        </button>
                        <div className="score-reasons">
                          {[
                            ["completeness", "Tamlıq"],
                            ["achievement", "Nailiyyətlər"],
                            ["skills", "Bacarıqlar"],
                            ["readability", "Oxunaqlılıq"],
                          ].map(([key, label]) => (
                            <div key={key}>
                              <strong>{label}</strong>
                              <span>{deepReport.scoreReasons[key]}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {!!deepReport.strengths.length && (
                        <div className="panel report-section">
                          <div className="section-heading">
                            <h2>
                              <CheckCircle2 /> CV-nin güclü tərəfləri
                            </h2>
                            <span className="pill">
                              {deepReport.strengths.length} DƏLİL
                            </span>
                          </div>
                          <div className="report-grid">
                            {deepReport.strengths.map((item, index) => (
                              <article
                                className="report-card strength"
                                key={`${item.title}-${index}`}
                              >
                                <h3>{item.title}</h3>
                                <blockquote>“{item.evidence}”</blockquote>
                                <p>{item.value}</p>
                              </article>
                            ))}
                          </div>
                        </div>
                      )}

                      {!!deepReport.improvements.length && (
                        <div className="panel report-section">
                          <div className="section-heading">
                            <h2>
                              <Target /> Prioritet inkişaf sahələri
                            </h2>
                          </div>
                          <div className="report-list">
                            {deepReport.improvements.map((item, index) => (
                              <article
                                className="report-item"
                                key={`${item.title}-${index}`}
                              >
                                <span className={`priority ${item.priority}`}>
                                  {PRIORITY_LABELS[item.priority] || item.priority}
                                </span>
                                <div>
                                  <h3>{item.title}</h3>
                                  {item.evidence && (
                                    <blockquote>“{item.evidence}”</blockquote>
                                  )}
                                  <p>
                                    <strong>Təsir:</strong> {item.impact}
                                  </p>
                                  <p>
                                    <strong>Düzəliş:</strong> {item.action}
                                  </p>
                                  <button
                                    className="text-button"
                                    onClick={() =>
                                      openProfileTarget(
                                        item,
                                        item.title,
                                        item.evidence,
                                        item.impact,
                                        item.action,
                                      )
                                    }
                                  >
                                    Profilimdə düzəlt <ArrowUpRight size={13} />
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      )}

                      {!!deepReport.issues?.length && (
                        <div className="panel report-section">
                          <div className="section-heading">
                            <h2>
                              <FileText /> Bütün tapılan səhvlər və çatışmazlıqlar
                            </h2>
                            <span className="pill">{deepReport.issues.length}</span>
                          </div>
                          <div className="issue-list">
                            {deepReport.issues.map((issue, index) => (
                              <article className={`issue-item ${issue.severity}`} key={`${issue.problem}-${index}`}>
                                <div className="issue-tags">
                                  <span className={`priority ${issue.severity}`}>{PRIORITY_LABELS[issue.severity] || issue.severity}</span>
                                  <span className="pill">{ISSUE_TYPE_LABELS[issue.type] || issue.type}</span>
                                </div>
                                {issue.quote && <blockquote>“{issue.quote}”</blockquote>}
                                <p>
                                  <strong>Problem:</strong> {issue.problem}
                                </p>
                                {issue.cause && (
                                  <p>
                                    <strong>Səbəb:</strong> {issue.cause}
                                  </p>
                                )}
                                <p>
                                  <strong>Düzəliş:</strong> {issue.fix}
                                </p>
                                <button
                                  className="text-button"
                                  onClick={() => openProfileTarget(issue, issue.problem, issue.quote, issue.fix)}
                                >
                                  Həmin yerə get və düzəlt <ArrowUpRight size={13} />
                                </button>
                              </article>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="report-two-column">
                        {!!deepReport.atsRisks.length && (
                          <div className="panel report-section">
                            <h2>
                              <FileText /> ATS yoxlaması
                            </h2>
                            {deepReport.atsRisks.map((item, index) => (
                              <article
                                className="compact-report"
                                key={`${item.issue}-${index}`}
                              >
                                <h3>{item.issue}</h3>
                                {item.evidence && (
                                  <blockquote>“{item.evidence}”</blockquote>
                                )}
                                <p>{item.fix}</p>
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    openProfileTarget(
                                      item,
                                      item.issue,
                                      item.evidence,
                                      item.fix,
                                    )
                                  }
                                >
                                  Profilimdə düzəlt <ArrowUpRight size={13} />
                                </button>
                              </article>
                            ))}
                          </div>
                        )}
                        {!!deepReport.roleFit.length && (
                          <div className="panel report-section">
                            <h2>
                              <BriefcaseBusiness /> Real rol uyğunluğu
                            </h2>
                            {deepReport.roleFit.map((item, index) => (
                              <article
                                className="compact-report"
                                key={`${item.role}-${index}`}
                              >
                                <span className="pill">{item.fit}</span>
                                <h3>{item.role}</h3>
                                <blockquote>“{item.evidence}”</blockquote>
                                <p>{item.reason}</p>
                                {item.gap && (
                                  <p>
                                    <strong>Boşluq:</strong> {item.gap}
                                  </p>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </div>

                      {!!deepReport.rewrites.length && (
                        <div className="panel report-section">
                          <h2>
                            <TrendingUp /> Cümlə səviyyəsində düzəlişlər
                          </h2>
                          <div className="rewrite-grid">
                            {deepReport.rewrites.map((item, index) => (
                              <article
                                className="rewrite-card"
                                key={`${item.original}-${index}`}
                              >
                                <div>
                                  <span>İNDİ</span>
                                  <p>{item.original}</p>
                                </div>
                                <ArrowRight size={18} />
                                <div>
                                  <span>TƏKLİF</span>
                                  <p>{item.improved}</p>
                                </div>
                                <small>{item.note}</small>
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    openProfileTarget(
                                      item.field ? item : { field: "experience" },
                                      "nailiyyət cümləsi",
                                      item.original,
                                      item.improved,
                                    )
                                  }
                                >
                                  Profilimdə düzəlt <ArrowUpRight size={13} />
                                </button>
                              </article>
                            ))}
                          </div>
                        </div>
                      )}

                      {!!deepReport.nextSteps.length && (
                        <div className="panel report-section">
                          <h2>
                            <ArrowUpRight /> Fəaliyyət planı
                          </h2>
                          <ol className="action-plan">
                            {deepReport.nextSteps.map((step, index) => (
                              <li key={`${step}-${index}`}>
                                <span>{index + 1}</span>
                                <p>{step}</p>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}
              {page === "assistant" && (
                <CareerAssistant
                  jobs={jobs}
                  startJob={assistantJob}
                  onStartHandled={clearAssistantJob}
                  aiEnabled={aiEnabled && signedIn}
                  notify={notify}
                />
              )}
              {page === "advice" && (
                <>
                  <section className="advice-intro">
                    <div className="assistant-icon">
                      <Sparkles size={27} />
                    </div>
                    <div>
                      <h2>Təcrübənizdən başlayaq.</h2>
                      <p>
                        {result.years} il təcrübə ·{" "}
                        {profile.skills.filter(Boolean).length} bacarıq ·{" "}
                        {profile.title || "İxtisas əlavə edilməyib"}
                      </p>
                    </div>
                    <span className="pill">PROFİLİNİZƏ ƏSASƏN</span>
                  </section>
                  <section className="panel next-step">
                    <h3>CV-yə əsaslanan AI karyera yolları</h3>
                    <p>
                      AI təcrübə müddətinizi və CV-dəki faktiki bacarıqları
                      nəzərə alır. Yeni peşəyə keçid üçün çatışmayan bilikləri
                      ayrıca göstərir.
                    </p>
                    {aiEnabled && (
                      <label className="checkline">
                        <input
                          type="checkbox"
                          checked={careerConsent}
                          onChange={(e) => setCareerConsent(e.target.checked)}
                        />{" "}
                        CV mətnimin karyera tövsiyəsi üçün {aiProvider} ilə
                        paylaşılmasına razıyam.
                      </label>
                    )}
                    <button
                      className="primary"
                      disabled={busy || !aiEnabled}
                      onClick={runCareerAdvice}
                    >
                      {busy ? "Hazırlanır…" : "CV üzrə tövsiyə yarat"}
                    </button>
                    {careerFingerprint === fingerprint &&
                      careerPaths.map((path, index) => (
                        <article
                          className="analysis-finding"
                          key={`${path.role}-${index}`}
                        >
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <div>
                            <h3>{path.role}</h3>
                            <p>{path.reason}</p>
                            <blockquote>“{path.evidence}”</blockquote>
                            <p>
                              <strong>Növbəti addım:</strong> {path.next}
                            </p>
                          </div>
                        </article>
                      ))}
                  </section>
                  <div className="advice-grid">
                    {advice.length ? (
                      advice.map((a, i) => (
                        <article className="panel advice-card" key={a.job.id}>
                          <div className="section-heading">
                            <span className="path-number">0{i + 1}</span>
                            <span className="match-score">
                              {a.score}% uyğun
                            </span>
                          </div>
                          <span className="eyebrow">
                            {a.missing.length
                              ? "İNKİŞAF İSTİQAMƏTİ"
                              : "MÖVCUD GÜCLÜ TƏRƏF"}
                          </span>
                          <h2>{a.job.title}</h2>
                          <p>{a.reason}</p>
                          <h4>Sizə üstünlük verən bacarıqlar</h4>
                          <div className="skill-tags">
                            {a.matched.map((s) => (
                              <span className="matched" key={s}>
                                <Check size={11} />
                                {s}
                              </span>
                            ))}
                          </div>
                          <h4>Növbəti real addım</h4>
                          <p>{a.next}</p>
                          <div className="advice-bottom">
                            <span>{a.job.minYears} il minimum təcrübə</span>
                            <button
                              className="text-button"
                              onClick={() => {
                                resetFilters();
                                setCategory(a.job.category);
                                go("jobs");
                              }}
                            >
                              Uyğun işlər <ArrowUpRight size={14} />
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <Empty
                        title="Tövsiyə üçün daha çox məlumat lazımdır"
                        description="İxtisasınızı, iş təcrübənizi və bacarıqlarınızı profilə əlavə edin."
                        action={
                          <button
                            className="primary"
                            onClick={() => go("profile")}
                          >
                            Profili tamamla
                          </button>
                        }
                      />
                    )}
                  </div>
                  <section className="panel career-plan">
                    <div className="section-heading">
                      <div>
                        <h2>Bacarıqlarınızı növbəti səviyyəyə aparın</h2>
                        <p>
                          Təcrübə kömək edir; yeni istiqamətdə uyğun bilik və
                          praktika da lazımdır.
                        </p>
                      </div>
                      <Target size={23} />
                    </div>
                    <div className="timeline">
                      <div>
                        <span>01</span>
                        <h3>Bu həftə</h3>
                        <p>
                          CV-də 2–3 real nailiyyəti ölçülə bilən nəticələrlə
                          yazın.
                        </p>
                      </div>
                      <div>
                        <span>02</span>
                        <h3>Növbəti 30 gün</h3>
                        <p>
                          {advice[0]?.next ||
                            "Hədəf peşəniz üzrə əsas bacarıqları müəyyənləşdirin."}
                        </p>
                      </div>
                      <div>
                        <span>03</span>
                        <h3>Növbəti 90 gün</h3>
                        <p>
                          Seçdiyiniz istiqamətdə praktik layihə hazırlayın, CV
                          və portfolioya əlavə edin.
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => go("analysis")}
                    >
                      CV üzrə ətraflı analiz <ArrowUpRight size={14} />
                    </button>
                  </section>
                </>
              )}
              {page === "applications" && (
                <>
                  {signedIn && <CandidateInterviews notify={notify} />}
                  {signedIn && <ExamList notify={notify} />}
                  {profile.autoApply && (
                    <section className="panel auto-apply-status">
                      <div>
                        <h3>Avtomatik müraciət aktivdir</h3>
                        <p className="muted">
                          Minimum uyğunluq balı {profile.autoApplyMinScore}.
                          Yeni yayımlanan uyğun vakansiyalara AI sizin əvəzinizə
                          müraciət göndərir (gündə ən çoxu 10).
                        </p>
                      </div>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={checkAutoApplyNow}
                      >
                        İndi yoxla
                      </button>
                    </section>
                  )}
                  <div className="panel application-list">
                    {applications.length ? (
                      applications.map((a) => {
                        const j = jobs.find((j) => j.id === a.jobId) || a.job;
                        return (
                          <article className="application-row" key={a.id}>
                            <div className="company-mark mint">
                              {j?.company[0] || "J"}
                            </div>
                            <div>
                              <h3>{j?.title || "Vakansiya"}</h3>
                              <p>
                                {j?.company} ·{" "}
                                {formatDate(a.created, language)}
                                {j?.demo && " · Nümunə müraciət"}
                              </p>
                            </div>
                            <span className="status-badge">{a.stage ? `${a.status}: ${a.stage}` : a.status}</span>
                            {a.auto && (
                              <span
                                className="ai-badge"
                                title="AI tərəfindən avtomatik göndərilib"
                              >
                                AI
                              </span>
                            )}
                            {!["İşə qəbul edildi", "Uyğun deyil", "Geri götürülüb"].includes(a.status) && (
                              <button
                                className="text-button"
                                disabled={busy}
                                onClick={() => withdraw(a.id)}
                              >
                                Müraciəti geri götür
                              </button>
                            )}
                            {offers[a.id] && (
                              <button className={`offer-chip ${offers[a.id].status}`} onClick={() => setOpenOffer(offers[a.id])}>
                                İş təklifi: {OFFER_STATUS[offers[a.id].status]} ↗
                              </button>
                            )}
                            {!j?.demo && (
                              <button
                                className="text-button"
                                onClick={() => {
                                  setMessageTarget({ applicationId: a.id, jobId: a.jobId, name: j?.company || "Şirkət", jobTitle: j?.title });
                                  go("messages");
                                }}
                              >
                                Şirkətə yaz
                              </button>
                            )}
                            {jobs.some((open) => open.id === a.jobId) && (
                              <button
                                className="text-button"
                                onClick={() => j && openJob(j)}
                              >
                                Ətraflı ↗
                              </button>
                            )}
                            {((a.job?.stages || []).length > 0 || (a.events || []).length > 1) && (
                              <details className="application-progress">
                                <summary>Mərhələlər və tarixçə</summary>
                                {(a.job?.stages || []).length > 0 && (
                                  <ol className="stage-progress">
                                    {(a.job?.stages || []).map((stage, index) => {
                                      const current = (a.job?.stages || []).indexOf(a.stage || "");
                                      const done = ["Təklif edildi", "İşə qəbul edildi"].includes(a.status) || index < current;
                                      return (
                                        <li key={stage} className={done ? "done" : index === current ? "current" : ""}>
                                          <b>{index + 1}</b> {stage}
                                        </li>
                                      );
                                    })}
                                  </ol>
                                )}
                                <ol className="event-timeline">
                                  {(a.events || []).map((event, index) => (
                                    <li key={index}>
                                      <time>{formatDate(event.created, language, { time: true })}</time>
                                      <span>
                                        {event.type === "applied"
                                          ? "Müraciət göndərildi"
                                          : event.type === "withdrawn"
                                            ? "Müraciət geri götürüldü"
                                            : event.type === "stage"
                                              ? `Mərhələ: ${event.to_value}`
                                              : event.type === "offer"
                                                ? `İş təklifi: ${event.to_value}`
                                                : event.type === "rejection"
                                                  ? `Səbəb: ${event.to_value}${event.note ? ` — ${event.note}` : ""}`
                                                  : `Status: ${event.to_value}`}
                                      </span>
                                    </li>
                                  ))}
                                </ol>
                              </details>
                            )}
                          </article>
                        );
                      })
                    ) : (
                      <Empty
                        title="İlk müraciətinizə bir addım qalıb"
                        description="Uyğun vakansiyanı seçin, profilinizi yoxlayın və müraciətinizi göndərin."
                        action={
                          <button
                            className="primary"
                            onClick={() => go("jobs")}
                          >
                            Vakansiyalara bax <ArrowUpRight size={16} />
                          </button>
                        }
                      />
                    )}
                  </div>
                </>
              )}
            </>
          )}
          <footer>
            © 2026 Joblink <span>İnsan və imkan arasında doğru bağlantı.</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Info size={18} />
          <span>{notice}</span>
          <button aria-label="Bildirişi bağla" onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {login && (
        <Modal
          title="Joblink hesabınıza daxil olun"
          onClose={() => setLogin(false)}
        >
          {authMode === "password" ? (
            <AccountLogin
              resetToken={resetToken}
              onResetDone={() => setResetToken("")}
              onComplete={async (role) => {
                await refresh(false);
                setLogin(false);
                notify("Hesabınıza daxil oldunuz.");
                const destination =
                  role === "admin"
                    ? "admin-overview"
                    : role === "company"
                      ? "hr-overview"
                      : "profile";
                setPage(destination);
                window.location.hash = destination;
              }}
            />
          ) : (
            <div className="login-content">
              <div className="assistant-icon">
                <UserRound size={28} />
              </div>
              <p>
                Profilinizi saxlamaq, müraciət göndərmək və vakansiya yayımlamaq
                üçün daxil olun.
              </p>
              <a className="primary" href="/signin-with-chatgpt?return_to=/">
                <LogIn size={17} /> ChatGPT ilə daxil ol
              </a>
              <p className="fine-print muted">
                Bu şəxsi versiyada giriş ChatGPT hesabı ilə qorunur.
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>,
    language,
  );
}
