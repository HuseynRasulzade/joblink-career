"use client";
import { FitReviewPanel } from "./FitReview";
import { EXTERNAL_SOURCES, trackingLink } from "@/lib/sources";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Users,
  Sparkles,
  Send,
  Check,
  Search,
  SlidersHorizontal,
  FileText,
  BadgeCheck,
} from "lucide-react";
import {
  type Job,
  type Profile,
  type Application,
  sampleJobs,
  sampleProfile,
  match,
  years,
} from "@/lib/model";
import { Empty, Field, JobForm, Modal } from "./components";
import { CertificationBadges } from "./CertificationPickers";
import ConversationList, { type ConversationSummary } from "./ConversationList";
import PipelineBoard from "./PipelineBoard";
import { AssignTestModal } from "./AssessmentsPage";
import { ScheduleInterviewModal } from "./Interviews";
import { BulkModal, SaveTalentModal } from "./BulkTalent";
import { SavedSearches } from "./SavedSearches";
import { SaveTemplateModal, TemplatesModal, duplicateJob } from "./JobTemplates";
import { CloseJobModal, EditJobModal } from "./JobsManage";
import { closeReasonLabel, daysLeft, extendedDeadline } from "@/lib/job-edit";
import { OfferComposer, type Offer } from "./Offers";
import { CandidateComparison, CompareBar } from "./Comparison";
import { VACANCY_REASONS } from "@/lib/recruitment";
import { formatDate } from "@/lib/dates";
import { certificationById } from "@/lib/certification-catalog";
import { candidateCertifications } from "@/lib/model";
import { localizeTree } from "./i18n";
import { normalizeSkills } from "@/lib/skill-catalog";
import { skillMatches } from "@/lib/skill-synonyms";
type Candidate = { id: string; profile: Profile };
const APPLICATION_STATUSES = [
  "Göndərildi",
  "Baxışda",
  "Müsahibə",
  "Təklif edildi",
  "İşə qəbul edildi",
  "Uyğun deyil",
];
const WITHDRAWN_STATUS = "Geri götürülüb";
const jobStatus = (job: Job) =>
  job.status === "published" &&
  job.deadline &&
  job.deadline < new Date().toISOString().slice(0, 10)
    ? "expired"
    : job.status || "published";
const jobStatusLabel = (job: Job) =>
  ({
    published: "Yayımlanıb",
    paused: "Dayandırılıb",
    archived: "Bağlanıb",
    expired: "Müddəti bitib",
    pending_approval: "Təsdiq gözləyir",
    rejected: "Təsdiqlənmədi",
  })[jobStatus(job)] || "Yayımlanıb";
type HrData = {
  jobs: Job[];
  applications: Application[];
  candidates: Candidate[];
};
const demoCandidates: Candidate[] = [
  { id: "demo-aysel", profile: sampleProfile },
  {
    id: "demo-orxan",
    profile: {
      ...sampleProfile,
      name: "Orxan Əliyev",
      title: "Maliyyə analitiki",
      skills: ["Excel", "Maliyyə", "Hesabatlılıq", "Power BI"],
      experiences: [
        {
          ...sampleProfile.experiences[0],
          title: "Maliyyə analitiki",
          start: "2022-09",
        },
      ],
    },
  },
  {
    id: "demo-nigar",
    profile: {
      ...sampleProfile,
      name: "Nigar Həsənova",
      title: "HR mütəxəssisi",
      skills: ["HR", "Əməkhaqqı", "Excel", "Əmək qanunvericiliyi"],
      experiences: [
        {
          ...sampleProfile.experiences[0],
          title: "HR mütəxəssisi",
          start: "2024-09",
          description: "İşçi sənədləri, əməkhaqqı və HR əməliyyatları.",
        },
      ],
    },
  },
];
export default function HrPanel({
  page,
  go,
  api,
  notify,
  aiEnabled,
  aiProvider,
  language,
  signedIn,
  onPublished,
  onMessage,
  canPublish = true,
}: {
  page: string;
  go: (s: string) => void;
  api: (path: string, body?: unknown) => Promise<any>;
  notify: (s: string) => void;
  aiEnabled: boolean;
  aiProvider: string;
  language: "az" | "en";
  signedIn: boolean;
  onPublished: () => void;
  onMessage: (target: { candidateId: string; jobId?: string; name: string; jobTitle?: string }) => void;
  canPublish?: boolean;
}) {
  const [linkSource, setLinkSource] = useState<Record<string, string>>({});
  const [attention, setAttention] = useState<{ key: string; count: number; label: string; link: string }[]>([]);
  const [data, setData] = useState<HrData>({
    jobs: [],
    applications: [],
    candidates: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(true);
  const [jobId, setJobId] = useState(sampleJobs[0].id);
  const [minScore, setMinScore] = useState(60);
  const [minYears, setMinYears] = useState(0);
  const [requiredSkills, setRequiredSkills] = useState("");
  const [certFilter, setCertFilter] = useState("");
  const [aiRatings, setAiRatings] = useState<{
    jobId: string;
    items: Record<string, { score: number; ruleScore: number; strengths: string; gaps: string; recommendation: string }>;
  } | null>(null);
  const [aiRanking, setAiRanking] = useState(false);
  const [applicantsView, setApplicantsView] = useState<"board" | "list">("board");
  const [offers, setOffers] = useState<Record<string, Offer>>({});
  const [testResults, setTestResults] = useState<Record<string, { state: string; percent: number | null }>>({});
  const [offerFor, setOfferFor] = useState<Application | null>(null);
  const [testFor, setTestFor] = useState<Application | null>(null);
  const [interviewFor, setInterviewFor] = useState<Application | null>(null);
  const [views, setViews] = useState<Record<string, { views: number; unique: number; last7: number }>>({});
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [closeJob, setCloseJob] = useState<Job | null>(null);
  const [jobQuery, setJobQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [jobSort, setJobSort] = useState("new");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState<{ jobId?: string; job?: Job; name: string } | null>(null);
  const [saveTalent, setSaveTalent] = useState<{ candidateId: string; name: string } | null>(null);
  const [bulk, setBulk] = useState<{ ids: string[]; action: "status" | "message" | "pool" | "test" } | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [relations, setRelations] = useState<{ following: string[]; blocked: string[] }>({ following: [], blocked: [] });
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [comparing, setComparing] = useState(false);
  const toggleCompare = (key: string, on: boolean) =>
    setCompareIds((list) => (on ? (list.length >= 4 ? list : [...list, key]) : list.filter((x) => x !== key)));
  const [history, setHistory] = useState<{ name: string; events: { type: string; actor_role: string; from_value: string; to_value: string; created: string }[] } | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("Uyğun namizədlər");
  const [candidate, setCandidate] = useState<Profile | null>(null);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>(
    [],
  );
  const [draft, setDraft] = useState<Job | null>(null);
  // Each AI conversation is bound to one vacancy draft.
  const [conversationId, setConversationId] = useState("");
  const [conversationsVersion, setConversationsVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [useAI, setUseAI] = useState(false);
  useEffect(() => { if (aiEnabled) setUseAI(true); }, [aiEnabled]);
  // How many candidates looked at each vacancy.
  useEffect(() => {
    if (page !== "hr-jobs" || !signedIn || demo) return;
    api("hr/job-views").then((b: { views: typeof views }) => setViews(b.views || {})).catch(() => setViews({}));
  }, [page, signedIn, demo, api]);
  // Things that need the company's attention, shown on the overview.
  useEffect(() => {
    if (page !== "hr-overview" || !signedIn || demo) return;
    api("company/attention").then((b: { items: typeof attention }) => setAttention(b.items || [])).catch(() => setAttention([]));
  }, [page, signedIn, demo, api]);
  async function refresh() {
    if (!signedIn) return;
    try {
      const next = await api("hr");
      setData(next);
      api("relations").then((rel) => setRelations({ following: rel.following, blocked: rel.blocked })).catch(() => {});
      try {
        const offerData = await api("offers");
        // Latest offer per application.
        const map: Record<string, Offer> = {};
        for (const offer of offerData.offers as Offer[]) if (!map[offer.application_id]) map[offer.application_id] = offer;
        setOffers(map);
      } catch {
        setOffers({});
      }
      api("hr/test-results").then((d) => setTestResults(d.results || {})).catch(() => setTestResults({}));
      if (!loaded && next.jobs.length) setDemo(false);

      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    if (signedIn) setDemo(false);
    refresh();
  }, [signedIn]);
  const ownJobs = demo ? sampleJobs : data.jobs;
  const selectedJob = ownJobs.find((j) => j.id === jobId) || ownJobs[0];
  const candidates = demo ? demoCandidates : data.candidates;
  const applications = demo
    ? [
        {
          id: "demo-app",
          jobId: sampleJobs[0].id,
          status: "Göndərildi",
          created: "2026-09-11",
          profile: sampleProfile,
        },
      ]
    : data.applications;
  const results = candidates
    .map((c) => ({
      ...c,
      ranking: selectedJob ? match(c.profile, selectedJob) : null,
    }))
    .filter(
      (c) =>
        c.profile.active &&
        c.ranking &&
        c.ranking.score >= minScore &&
        years(c.profile) >= minYears &&
        (!onlyFollowed || relations.following.includes(c.id)) &&
        (!certFilter ||
          candidateCertifications(c.profile).some(
            (cert) => cert.id === certFilter && cert.status === "active",
          )) &&
        normalizeSkills(requiredSkills.split(","), { max: 20 }).every((skill) =>
          skillMatches(
            skill,
            [c.profile.title, c.profile.summary, ...c.profile.skills, ...c.profile.experiences.map((e) => e.description)].join(" "),
          )) &&
        [c.profile.name, c.profile.title, ...c.profile.skills]
          .join(" ")
          .toLocaleLowerCase("az")
          .includes(query.toLocaleLowerCase("az")),
    )
    .sort((a, b) => {
      // AI scores (when requested for this vacancy) refine the rule-based order.
      const ai = aiRatings?.jobId === selectedJob?.id ? aiRatings.items : null;
      return (ai?.[b.id]?.score ?? b.ranking?.score ?? 0) - (ai?.[a.id]?.score ?? a.ranking?.score ?? 0);
    });
  async function moveApplication(application: Application, status: string, stage: string) {
    try {
      await api("application-status", { id: application.id, status, stage });
      await refresh();
      notify(stage ? `${application.profile.name}: ${stage}` : `${application.profile.name}: ${status}`);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function showHistory(application: Application) {
    try {
      const data = await api(`hr/application-events?id=${encodeURIComponent(application.id)}`);
      setHistory({ name: application.profile.name, events: data.events });
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function rankWithAi() {
    if (!selectedJob || demo) return;
    setAiRanking(true);
    try {
      const data = await api("hr/rank-candidates", { jobId: selectedJob.id, language });
      setAiRatings({
        jobId: selectedJob.id,
        items: Object.fromEntries(
          (data.ratings as { candidateId: string; score: number; ruleScore: number; strengths: string; gaps: string; recommendation: string }[])
            .map((r) => [r.candidateId, r]),
        ),
      });
      notify(data.source === "rules" ? "AI qiymətləndirmə administrator tərəfindən söndürülüb, qaydalarla hesablanmış bal göstərilir." : "AI namizədləri qiymətləndirdi.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setAiRanking(false);
    }
  }
  async function generate(text = prompt) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setPrompt("");
    setMessages((v) => [...v, { role: "user", text }]);
    try {
      const b = await api("draft", {
        prompt: text,
        useAI,
        language,
        conversationId,
        currentDraft: draft,
      });
      if (b.conversationId) setConversationId(b.conversationId);
      setConversationsVersion((v) => v + 1);
      setMessages((v) => [
        ...v,
        {
          role: "assistant",
          text:
            b.question +
            (b.source === "template"
              ? " Hazırkı mətn peşə üzrə şablondan hazırlanıb."
              : ""),
        },
      ]);
      if (b.draft) setDraft(b.draft);
    } catch (e) {
      setMessages((v) => [
        ...v,
        { role: "assistant", text: (e as Error).message },
      ]);
    } finally {
      setBusy(false);
    }
  }
  async function changeJobStatus(job: Job, action: "pause" | "publish" | "archive") {
    if (
      action === "archive" &&
      !window.confirm(`“${job.title}” vakansiyasını bağlamaq istəyirsiniz? Bağlanmış elan yenidən açılmır.`)
    )
      return;
    setBusy(true);
    try {
      await api("job-status", { jobId: job.id, action });
      await refresh();
      onPublished();
      notify(
        action === "pause"
          ? "Vakansiya dayandırıldı."
          : action === "publish"
            ? "Vakansiya yenidən yayımlandı."
            : "Vakansiya bağlandı.",
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openConversation(item: ConversationSummary) {
    try {
      const data = await api(`ai/conversation?id=${encodeURIComponent(item.id)}`);
      setConversationId(item.id);
      setMessages(
        (data.messages as { author: string; content: string }[]).map((m) => ({ role: m.author, text: m.content })),
      );
      setDraft(data.draft && data.draft.status !== "published" ? data.draft : null);
      if (data.draft?.status === "published") notify("Bu söhbətin vakansiyası artıq yayımlanıb.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  // A copied vacancy or a template becomes the draft on the HR assistant page.
  function loadDraft(next: Job, message: string) {
    setConversationId("");
    setMessages([]);
    setPrompt("");
    setDraft(next);
    go("hr-ai");
    notify(message);
  }
  function newConversation() {
    setConversationId("");
    setMessages([]);
    setDraft(null);
    setPrompt("");
  }
  async function publish() {
    if (!draft) return;
    setBusy(true);
    try {
      const published = await api("publish", { draftId: draft.id, job: draft, confirmed: true });
      setConfirm(false);
      setDraft(null);
      setDemo(false);
      await refresh();
      onPublished();
      if (published?.pendingApproval) {
        notify("Vakansiya HR və direktor təsdiqinə göndərildi. Təsdiqdən sonra yayımlanacaq.");
        go("hr-approvals");
      } else {
        notify("Vakansiya yayımlandı. Namizədlər artıq müraciət edə bilər.");
        go("hr-jobs");
      }
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  // Per-vacancy numbers shown on the card and the list filter / sort.
  const jobNumbers = (jobId: string) => {
    const list = applications.filter((a) => a.jobId === jobId && a.status !== WITHDRAWN_STATUS);
    return {
      total: list.length,
      fresh: list.filter((a) => a.status === "Göndərildi").length,
      interview: list.filter((a) => a.status === "Müsahibə").length,
      hired: list.filter((a) => a.status === "İşə qəbul edildi").length,
    };
  };
  const visibleJobs = ownJobs
    .filter((j) => (jobFilter === "all" ? true : jobStatus(j) === jobFilter))
    .filter((j) => !jobQuery.trim() || `${j.title} ${j.city} ${j.category}`.toLocaleLowerCase("az").includes(jobQuery.trim().toLocaleLowerCase("az")))
    .sort((a, b) =>
      jobSort === "applications" ? jobNumbers(b.id).total - jobNumbers(a.id).total
        : jobSort === "deadline" ? (a.deadline || "9999").localeCompare(b.deadline || "9999")
          : (b.created || "").localeCompare(a.created || ""),
    );
  return localizeTree(
    <>
      <div className="page-heading">
        <div className="eyebrow">İŞƏ QƏBUL MƏKANI</div>
        <div className="heading-row">
          <div>
            <h1>
              {page === "hr-ai"
                ? "HR köməkçiniz"
                : page === "hr-jobs"
                  ? "Vakansiyalarım"
                  : "Doğru insan, doğru komanda."}
            </h1>
            <p>
              {page === "hr-ai"
                ? "Vəzifəni təsvir edin, elanı birlikdə hazırlayaq."
                : "Peşə bacarıqlarına əsaslanan, aydın işə qəbul prosesi."}
            </p>
          </div>
          {page !== "hr-ai" && (
            <button className="primary" onClick={() => go("hr-ai")}>
              <Sparkles size={17} /> Vakansiya yarat
            </button>
          )}
        </div>
      </div>
      {page !== "hr-ai" && (
        <>
          <div className="info-bar">
            <span>
              {demo
                ? "Nümunə HR məlumatları ilə tanış olursunuz."
                : "Şirkətinizin vakansiyaları və real müraciətlər."}
            </span>
            <label className="checkline">
              <input
                type="checkbox"
                checked={demo}
                onChange={(e) => setDemo(e.target.checked)}
              />{" "}
              Nümunə məlumatlar
            </label>
          </div>
          {error && !demo && <div className="notice error">{error}</div>}
          {page === "hr-overview" && !demo && attention.length > 0 && (
            <section className="panel" aria-label="Diqqət tələb edənlər">
              <h3>Diqqət tələb edənlər</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                {attention.map((item) => (
                  <li key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span><b>{item.count}</b> {item.label}</span>
                    <button className="secondary" onClick={() => go(item.link)}>Aç</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="stats">
            {[
              [
                BriefcaseBusiness,
                "Aktiv vakansiyalar",
                ownJobs.filter((j) => j.demo || jobStatus(j) === "published").length,
              ],
              [Users, "Müraciətlər", applications.length],
              [Check, "Uyğun namizədlər", results.length],
            ].map(([Icon, label, value]) => {
              const I = Icon as typeof Users;
              return (
                <div className="stat" key={String(label)}>
                  <span className="stat-icon">
                    <I size={20} />
                  </span>
                  <div>
                    {String(label)}
                    <strong>{String(value)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {page === "hr-jobs" ? (
        <div className="jobs">
          {!ownJobs.length ? (
            <Empty
              title="İlk vakansiyanızı yaradın"
              description="HR köməkçisi ilə elanı hazırlayın və təsdiqdən sonra yayımlayın."
              action={
                <button className="primary" onClick={() => go("hr-ai")}>
                  Vakansiya yarat
                </button>
              }
            />
          ) : (
            <>
            <div className="form-grid">
              <Field label="Axtarış">
                <input value={jobQuery} placeholder="Vəzifə, şəhər, kateqoriya" onChange={(e) => setJobQuery(e.target.value)} />
              </Field>
              <Field label="Status">
                <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
                  <option value="all">Hamısı ({ownJobs.length})</option>
                  {[["published", "Yayımlanıb"], ["paused", "Dayandırılıb"], ["expired", "Müddəti bitib"], ["pending_approval", "Təsdiq gözləyir"], ["rejected", "Təsdiqlənmədi"], ["archived", "Bağlanıb"]].map(([value, label]) => {
                    const n = ownJobs.filter((j) => jobStatus(j) === value).length;
                    return n ? <option key={value} value={value}>{label} ({n})</option> : null;
                  })}
                </select>
              </Field>
              <Field label="Sıralama">
                <select value={jobSort} onChange={(e) => setJobSort(e.target.value)}>
                  <option value="new">Ən yenilər</option>
                  <option value="applications">Ən çox müraciət</option>
                  <option value="deadline">Son tarixə görə</option>
                </select>
              </Field>
            </div>
            {!visibleJobs.length && <p className="admin-empty">Axtarışa uyğun vakansiya yoxdur.</p>}
            {visibleJobs.map((j) => (
              <article className="job-card" key={j.id}>
                <div className="section-heading">
                  <div>
                    <h3>{j.title}</h3>
                    <p>
                      {j.company} · {j.city} · {j.mode}
                    </p>
                  </div>
                  {j.demo ? (
                    <span className="match-score">Nümunə</span>
                  ) : (
                    <span className={`admin-status ${jobStatus(j)}`}>
                      {jobStatusLabel(j)}
                    </span>
                  )}
                </div>
                <p className="job-description">{j.description}</p>
                {!j.demo && (() => {
                  const n = jobNumbers(j.id);
                  const left = daysLeft(j.deadline);
                  return (
                    <p className="job-internal">
                      {views[j.id] ? (
                        <span title="Namizəd baxışları: gündə bir nəfər bir dəfə sayılır">
                          <b>{views[j.id].unique}</b> baxan namizəd · son 7 gün <b>{views[j.id].last7}</b>
                        </span>
                      ) : (
                        <span>hələ baxış yoxdur</span>
                      )}
                      <span><b>{n.total}</b> müraciət{views[j.id]?.unique ? ` (${Math.min(100, Math.round((n.total / views[j.id].unique) * 100))}% konversiya)` : ""}</span>
                      {n.fresh > 0 && <span><b>{n.fresh}</b> yeni</span>}
                      {n.interview > 0 && <span><b>{n.interview}</b> müsahibə</span>}
                      {n.hired > 0 && <span><b>{n.hired}</b> işə qəbul</span>}
                      {j.status === "published" && left !== null && (
                        <span>{left < 0 ? `son tarix ${-left} gün əvvəl bitib` : left === 0 ? "son tarix bu gündür" : `son tarixə ${left} gün qalıb`}</span>
                      )}
                      {j.status === "archived" && (j as Job & { closeReason?: string }).closeReason && (
                        <span>Bağlanma səbəbi: {closeReasonLabel((j as Job & { closeReason?: string }).closeReason)}</span>
                      )}
                    </p>
                  );
                })()}
                {!j.demo && (j.reason || (j.stages || []).length > 0) && (
                  <p className="job-internal">
                    {j.reason && <span title="Yalnız şirkət daxili">Səbəb: {VACANCY_REASONS.find((r) => r.id === j.reason)?.label || j.reason}</span>}
                    {(j.stages || []).length > 0 && <span>{(j.stages || []).length} mərhələ</span>}
                  </p>
                )}
                <div className="job-footer">
                  <span>
                    {j.minSalary || j.maxSalary ? `${j.minSalary}–${j.maxSalary} AZN` : "Razılaşma yolu ilə"}
                  </span>
                  {!j.demo && (
                    <div className="admin-actions">
                      <button
                        disabled={busy}
                        onClick={async () => {
                          try {
                            loadDraft(await duplicateJob(j.id), "Vakansiya kopyalandı. Yeni layihəni yoxlayın, son tarixi və yaranma səbəbini daxil edin.");
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        Kopyala
                      </button>
                      {(jobStatus(j) === "expired" || j.status === "archived") && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={async () => {
                            const until = extendedDeadline("", 30);
                            if (!window.confirm(`“${j.title}” eyni məzmunla yeni elan kimi yayımlansın? Son tarix ${until} olacaq${j.status === "archived" ? "" : ", köhnə elan bağlanacaq"}. Müraciətlər köhnə elanda qalır.`)) return;
                            setBusy(true);
                            try {
                              const result = (await api("hr/job-repost", { jobId: j.id, days: 30 })) as { pendingApproval?: boolean };
                              await refresh();
                              onPublished();
                              notify(result.pendingApproval ? "Yeni elan təsdiqə göndərildi." : `Vakansiya təkrar yayımlandı. Son tarix: ${until}.`);
                            } catch (e) {
                              notify((e as Error).message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Təkrar yayımla
                        </button>
                      )}
                      <button onClick={() => setSaveTemplate({ jobId: j.id, name: j.title })}>Şablon kimi saxla</button>
                      {canPublish && ["published", "paused"].includes(j.status || "published") && (
                        <>
                          <button disabled={busy} onClick={() => setEditJob(j)}>Redaktə et</button>
                          <select
                            aria-label="Son tarixi uzat"
                            value=""
                            onChange={async (e) => {
                              const days = Number(e.target.value);
                              if (!days) return;
                              try {
                                const deadline = extendedDeadline(j.deadline, days);
                                await api("hr/job-update", { jobId: j.id, changes: { deadline } });
                                await refresh();
                                notify(`Son tarix ${deadline} tarixinə uzadıldı.`);
                              } catch (err) {
                                notify((err as Error).message);
                              }
                            }}
                          >
                            <option value="">Son tarixi uzat…</option>
                            <option value={7}>+7 gün</option>
                            <option value={14}>+14 gün</option>
                            <option value={30}>+30 gün</option>
                          </select>
                        </>
                      )}
                    </div>
                  )}
                  {!j.demo && jobStatus(j) === "published" && (
                    <div className="admin-actions">
                      <select
                        aria-label="Paylaşım kanalı"
                        value={linkSource[j.id] || ""}
                        onChange={(e) => setLinkSource({ ...linkSource, [j.id]: e.target.value })}
                      >
                        <option value="">Kanal seçin (izləmə üçün)</option>
                        {EXTERNAL_SOURCES.map((src) => <option key={src.id} value={src.id}>{src.label}</option>)}
                      </select>
                      <button
                        onClick={async () => {
                          const link = trackingLink(window.location.origin, j.id, linkSource[j.id] || "");
                          try {
                            await navigator.clipboard.writeText(link);
                            notify("Link kopyalandı: " + link);
                          } catch {
                            window.prompt("Linki kopyalayın:", link);
                          }
                        }}
                      >
                        Link kopyala
                      </button>
                    </div>
                  )}
                  {!j.demo && jobStatus(j) !== "archived" && (
                    <div className="admin-actions">
                      {jobStatus(j) === "published" ? (
                        <button disabled={busy} onClick={() => changeJobStatus(j, "pause")}>
                          Dayandır
                        </button>
                      ) : (
                        <button disabled={busy} onClick={() => changeJobStatus(j, "publish")}>
                          Yenidən aç
                        </button>
                      )}
                      <button disabled={busy} onClick={() => setCloseJob(j)}>
                        Bağla
                      </button>
                    </div>
                  )}
                  <button
                    className="text-button"
                    onClick={() => {
                      setJobId(j.id);
                      setTab("Müraciət edənlər");
                      go("hr-candidates");
                    }}
                  >
                    Müraciətlərə bax <ArrowUpRight size={14} />
                  </button>
                </div>
              </article>
            ))}
            </>
          )}
        </div>
      ) : page === "hr-ai" ? (
        <div className="hr-ai-layout with-conversations">
          {signedIn && (
            <ConversationList
              type="vacancy"
              activeId={conversationId}
              refreshKey={conversationsVersion}
              onSelect={openConversation}
              onNew={newConversation}
              newLabel="Yeni vakansiya söhbəti"
            />
          )}
          <section className="panel chat-panel">
            <div className="assistant-intro">
              <div className="assistant-icon">
                <Sparkles size={25} />
              </div>
              <h2>Bir cümlədən yeni fürsətə.</h2>
              <p>Hansı vəzifə üçün namizəd axtarırsınız?</p>
            </div>
            <div className="chat-messages" aria-live="polite">
              {messages.length === 0 && (
                <>
                  <button
                    className="prompt-chip"
                    onClick={() =>
                      generate("Mühasibatlıq üzrə vakansiya məlumatlarını ver")
                    }
                  >
                    Mühasibatlıq üzrə vakansiya hazırla{" "}
                    <ArrowUpRight size={15} />
                  </button>
                  <button
                    className="prompt-chip"
                    onClick={() =>
                      generate("HR mütəxəssisi üzrə vakansiya hazırla")
                    }
                  >
                    HR mütəxəssisi axtarıram <ArrowUpRight size={15} />
                  </button>
                </>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`chat-message ${m.role}`}>
                  {m.role === "assistant" && <Sparkles size={16} />}
                  <p>{m.text}</p>
                </div>
              ))}
              {busy && <p className="muted">Hazırlanır…</p>}
            </div>
            <form
              className="chat-input"
              onSubmit={(e) => {
                e.preventDefault();
                generate();
              }}
            >
              <textarea
                aria-label="HR köməkçisinə mesaj"
                rows={3}
                placeholder="Məsələn: 2–3 il təcrübəli mühasib axtarıram..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button
                className="primary"
                aria-label="Mesajı göndər"
                disabled={busy || !prompt.trim()}
              >
                <Send size={18} />
              </button>
            </form>
            {aiEnabled ? (
              <label className="checkline ai-consent">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                />{" "}
                Mesajı {aiProvider} ilə təkmilləşdir
              </label>
            ) : (
              <p className="muted fine-print">
                Hazırda peşə şablonları aktivdir. Generativ AI bağlantısı
                qurulduqda sərbəst sorğular dəstəklənəcək.
              </p>
            )}
          </section>
          <section className="panel draft-panel">
            <div className="section-heading">
              <h3>
                <FileText size={18} /> Vakansiya layihəsi
              </h3>
              <div className="admin-actions">
                <button onClick={() => setTemplatesOpen(true)}>Şablonlar</button>
                <span className="pill">TƏSDİQ GÖZLƏYİR</span>
              </div>
            </div>
            {draft ? (
              <>
                <p className="muted">
                  Bütün şərtləri yoxlayın və şirkət məlumatlarını tamamlayın.
                </p>
                <JobForm job={draft} onChange={setDraft} />
                <button className="secondary wide" onClick={() => setSaveTemplate({ job: draft, name: draft.title })}>Şablon kimi saxla</button>
                <button
                  className="primary wide"
                  onClick={() => setConfirm(true)}
                  disabled={busy || !draft.company.trim() || !draft.reason}
                >
                  Yoxla və yayımla <ArrowUpRight size={17} />
                </button>
              </>
            ) : (
              <Empty
                title="Layihəniz burada görünəcək"
                description="Köməkçiyə vəzifəni yazın. Heç bir elan sizin təsdiqiniz olmadan yayımlanmır."
              />
            )}
          </section>
        </div>
      ) : (
        <section className="panel candidate-panel">
          <div className="section-heading">
            <div>
              <h2>Namizədlər</h2>
              <p>
                Uyğunluq tələb olunan bacarıq və təcrübə əsasında hesablanır.
              </p>
            </div>
            <SlidersHorizontal size={18} />
          </div>
          <div className="hr-filters">
            <Field label="Vakansiya">
              <select
                value={selectedJob?.id || ""}
                onChange={(e) => setJobId(e.target.value)}
              >
                {ownJobs.map((j) => (
                  <option value={j.id} key={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Minimum uyğunluq">
              <select
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
              >
                {[0, 40, 60, 80, 90].map((n) => (
                  <option key={n} value={n}>
                    {n}% və yuxarı
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Minimum təcrübə">
              <select
                value={minYears}
                onChange={(e) => setMinYears(Number(e.target.value))}
              >
                {[0, 1, 2, 3, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} il və yuxarı
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Məcburi bacarıqlar (vergüllə ayırın)">
              <input value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)} placeholder="Məsələn: Excel, 1C" />
            </Field>
            <label className="checkline followed-filter">
              <input type="checkbox" checked={onlyFollowed} onChange={(e) => setOnlyFollowed(e.target.checked)} /> Yalnız izlədiyim namizədlər
            </label>
            <Field label="Sertifikat">
              <select value={certFilter} onChange={(e) => setCertFilter(e.target.value)}>
                <option value="">Bütün namizədlər</option>
                {[
                  ...new Set([
                    ...(selectedJob?.certifications || []).map((c) => c.id),
                    ...candidates.flatMap((c) =>
                      candidateCertifications(c.profile)
                        .filter((cert) => cert.status === "active")
                        .map((cert) => cert.id),
                    ),
                  ]),
                ]
                  .filter((id) => certificationById(id))
                  .map((id) => (
                    <option key={id} value={id}>
                      {certificationById(id)!.name}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          {!demo && (
            <SavedSearches
              current={{ minScore, minYears, requiredSkills, certFilter, onlyFollowed, query }}
              onApply={(f) => { setMinScore(f.minScore); setMinYears(f.minYears); setRequiredSkills(f.requiredSkills); setCertFilter(f.certFilter); setOnlyFollowed(f.onlyFollowed); setQuery(f.query); }}
              notify={notify}
            />
          )}
          <div className="tabs" role="tablist" aria-label="Namizəd siyahısı">
            {["Uyğun namizədlər", "Müraciət edənlər"].map((t) => (
              <button
                role="tab"
                aria-selected={tab === t}
                key={t}
                onClick={() => setTab(t)}
                className={tab === t ? "selected" : ""}
              >
                {t}
              </button>
            ))}
          </div>
          {aiEnabled && !demo && selectedJob && (
            <div className="hr-ai-rank">
              <button className="secondary" disabled={aiRanking} onClick={rankWithAi}>
                <Sparkles size={15} /> {aiRanking ? "AI qiymətləndirir…" : "AI ilə sırala"}
              </button>
              <small>
                Ən uyğun 20 namizədi AI anonim şəkildə (ad, əlaqə məlumatı olmadan) vəzifə, uyğun təcrübə, bacarıq və sertifikatlara görə yoxlayır. Yekun qərar sizindir.
              </small>
            </div>
          )}
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Namizəd axtar"
              placeholder="Ad, ixtisas və ya bacarıq axtar"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {tab === "Uyğun namizədlər" ? (
            results.length ? (
              results.map((c) => (
                <article className="candidate-card" key={c.id}>
                  <div className="avatar">{c.profile.name[0]}</div>
                  <div className="candidate-info">
                    <h3>{c.profile.name}</h3>
                    <p>
                      {c.profile.title} · {years(c.profile)} il təcrübə
                    </p>
                    <div className="skill-tags">
                      {c.ranking?.matched.map((s) => (
                        <span className="matched" key={s}>
                          {s}
                        </span>
                      ))}
                    </div>
                    <CertificationBadges items={candidateCertifications(c.profile)} limit={4} />
                    <label className="compare-check">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(`c:${c.id}`)}
                        onChange={(e) => toggleCompare(`c:${c.id}`, e.target.checked)}
                      />{" "}
                      Müqayisə et
                    </label>
                    {aiRatings?.jobId === selectedJob?.id && aiRatings.items[c.id] && (
                      <div className={`hr-ai-note ${aiRatings.items[c.id].recommendation}`}>
                        <b>
                          AI: {aiRatings.items[c.id].recommendation === "interview" ? "Müsahibəyə dəvət et" : aiRatings.items[c.id].recommendation === "reject" ? "Uyğun deyil" : "Nəzərə al"}
                        </b>
                        {aiRatings.items[c.id].strengths && <p>✓ {aiRatings.items[c.id].strengths}</p>}
                        {aiRatings.items[c.id].gaps && <p>△ {aiRatings.items[c.id].gaps}</p>}
                      </div>
                    )}
                    {!demo && selectedJob && (
                      <FitReviewPanel api={api} jobId={selectedJob.id} candidateId={c.id} language={language} audience="employer" />
                    )}
                  </div>
                  <div className="candidate-actions">
                    <span className="match-score">
                      {aiRatings?.jobId === selectedJob?.id && aiRatings.items[c.id]
                        ? `${aiRatings.items[c.id].score}% AI`
                        : `${c.ranking?.score}% uyğun`}
                    </span>
                    <button
                      className="text-button"
                      onClick={() => setCandidate(c.profile)}
                    >
                      Profilə bax ↗
                    </button>
                    {!demo && (
                      <button
                        className="text-button"
                        onClick={() => onMessage({ candidateId: c.id, name: c.profile.name, jobId: undefined })}
                      >
                        Mesaj yaz
                      </button>
                    )}
                    {!demo && (
                      <button className="text-button" onClick={() => setSaveTalent({ candidateId: c.id, name: c.profile.name })}>
                        Bazaya əlavə et
                      </button>
                    )}
                    {!demo && (
                      <button
                        className="text-button"
                        onClick={async () => {
                          const on = !relations.following.includes(c.id);
                          try {
                            await api("relations/follow", { targetId: c.id, on });
                            setRelations((r) => ({ ...r, following: on ? [...r.following, c.id] : r.following.filter((x) => x !== c.id) }));
                            notify(on ? `${c.profile.name} izlənilənlərə əlavə edildi; namizədə bildiriş göndərildi.` : "İzləmə dayandırıldı.");
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        {relations.following.includes(c.id) ? "İzlənilir ✓" : "İzlə"}
                      </button>
                    )}
                    {!demo && (
                      <button
                        className="text-button danger-text"
                        onClick={async () => {
                          if (!window.confirm(`${c.profile.name} bloklansın? Namizədə bildiriş gedəcək.`)) return;
                          try {
                            await api("relations/block", { targetId: c.id, on: true });
                            await refresh();
                            notify(`${c.profile.name} bloklandı.`);
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        Blokla
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <Empty
                title="Bu filtrlərə uyğun namizəd yoxdur"
                description="Uyğunluq həddini azaldın və ya başqa vakansiya seçin."
              />
            )
          ) : (
            <>
              <div className="view-toggle" role="radiogroup" aria-label="Görünüş">
                {(["board", "list"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    role="radio"
                    aria-checked={applicantsView === view}
                    className={applicantsView === view ? "selected" : ""}
                    onClick={() => setApplicantsView(view)}
                  >
                    {view === "board" ? "Pipeline" : "Siyahı"}
                  </button>
                ))}
              </div>
              {applicantsView === "board" && (
                <PipelineBoard
                  applications={applications.filter((a) => a.jobId === selectedJob?.id)}
                  stages={selectedJob?.stages}
                  disabled={demo}
                  onMove={moveApplication}
                  onOpenProfile={(a) => setCandidate(a.profile)}
                  onMessage={(a) =>
                    a.candidateId &&
                    onMessage({ candidateId: a.candidateId, jobId: a.jobId, name: a.profile.name, jobTitle: selectedJob?.title })
                  }
                  onHistory={showHistory}
                  offers={offers}
                  testResults={testResults}
                  onOffer={setOfferFor}
                  onAssignTest={setTestFor}
                  onSchedule={setInterviewFor}
                  onBulk={(ids, action) => setBulk({ ids, action })}
                  onWithdrawOffer={async (offer) => {
                    if (!window.confirm("Təklif geri götürülsün?")) return;
                    try {
                      await api("offers/withdraw", { id: offer.id });
                      await refresh();
                      notify("Təklif geri götürüldü.");
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                />
              )}
              {applicantsView === "list" && applications
                .filter(
                  (a) =>
                    a.jobId === selectedJob?.id &&
                    a.profile.name
                      .toLocaleLowerCase("az")
                      .includes(query.toLocaleLowerCase("az")),
                )
                .map((a) => (
                  <article className="candidate-card" key={a.id}>
                    <div className="avatar">{a.profile.name[0]}</div>
                    <div className="candidate-info">
                      <h3>{a.profile.name}</h3>
                      <p>{a.profile.title}</p>
                      <CertificationBadges items={candidateCertifications(a.profile)} limit={4} />
                      <label className="compare-check">
                        <input
                          type="checkbox"
                          checked={compareIds.includes(`a:${a.id}`)}
                          onChange={(e) => toggleCompare(`a:${a.id}`, e.target.checked)}
                        />{" "}
                        Müqayisə et
                      </label>
                      <button
                        className="text-button"
                        onClick={() => setCandidate(a.profile)}
                      >
                        Müraciət CV-si ↗
                      </button>
                      {!demo && a.candidateId && selectedJob && (
                        <FitReviewPanel api={api} jobId={selectedJob.id} candidateId={a.candidateId} language={language} audience="employer" />
                      )}
                      {!demo && a.candidateId && (
                        <button
                          className="text-button"
                          onClick={() =>
                            onMessage({
                              candidateId: a.candidateId!,
                              jobId: a.jobId,
                              name: a.profile.name,
                              jobTitle: selectedJob?.title,
                            })
                          }
                        >
                          Mesaj yaz
                        </button>
                      )}
                    </div>
                    <Field label="Müraciət statusu">
                      <select
                        aria-label={`${a.profile.name} status`}
                        value={a.status}
                        disabled={demo || a.status === WITHDRAWN_STATUS}
                        onChange={async (e) => {
                          try {
                            await api("application-status", {
                              id: a.id,
                              status: e.target.value,
                            });
                            await refresh();
                            notify("Status yeniləndi.");
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        {(a.status === WITHDRAWN_STATUS
                          ? [WITHDRAWN_STATUS]
                          : APPLICATION_STATUSES
                        ).map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                  </article>
                ))}
              {!applications.some((a) => a.jobId === selectedJob?.id) && (
                <Empty
                  title="Hələ müraciət yoxdur"
                  description="Namizədlər vakansiyanıza müraciət etdikdə burada görünəcəklər."
                />
              )}
            </>
          )}
          <p className="fine-print muted">
            Yalnız iş təkliflərinə açıq profillər göstərilir. Uyğunluq qərar
            verməyə kömək edir; yekun seçim işəgötürənə aiddir.
          </p>
        </section>
      )}
      {page === "hr-candidates" && (
        <CompareBar count={compareIds.length} max={4} onOpen={() => setComparing(true)} onClear={() => setCompareIds([])} />
      )}
      {comparing && (
        <CandidateComparison
          job={selectedJob}
          onClose={() => setComparing(false)}
          candidates={compareIds
            .map((key) => {
              const [kind, ref] = [key.slice(0, 1), key.slice(2)];
              if (kind === "c") {
                const c = candidates.find((x) => x.id === ref);
                const applied = applications.find((a) => a.candidateId === ref && a.jobId === selectedJob?.id);
                return c ? { id: key, profile: c.profile, status: applied?.status, stage: applied?.stage } : null;
              }
              const a = applications.find((x) => x.id === ref);
              return a ? { id: key, profile: a.profile, status: a.status, stage: a.stage } : null;
            })
            .filter((x): x is NonNullable<typeof x> => !!x)}
        />
      )}
      {testFor && <AssignTestModal application={testFor} onClose={() => setTestFor(null)} notify={notify} />}
      {editJob && <EditJobModal job={editJob} api={api} onClose={() => setEditJob(null)} onSaved={() => void refresh()} notify={notify} />}
      {closeJob && <CloseJobModal job={closeJob} api={api} onClose={() => setCloseJob(null)} onClosed={() => { void refresh(); onPublished(); }} notify={notify} />}
      {templatesOpen && <TemplatesModal onClose={() => setTemplatesOpen(false)} onUse={(d) => loadDraft(d, "Şablondan layihə yaradıldı. Son tarixi və yaranma səbəbini daxil edin.")} notify={notify} />}
      {saveTemplate && <SaveTemplateModal jobId={saveTemplate.jobId} job={saveTemplate.job} defaultName={saveTemplate.name} onClose={() => setSaveTemplate(null)} notify={notify} />}
      {saveTalent && <SaveTalentModal candidateId={saveTalent.candidateId} name={saveTalent.name} onClose={() => setSaveTalent(null)} notify={notify} />}
      {bulk && <BulkModal ids={bulk.ids} action={bulk.action} onClose={() => setBulk(null)} onDone={() => void refresh()} notify={notify} />}
      {interviewFor && <ScheduleInterviewModal application={interviewFor} onClose={() => setInterviewFor(null)} onDone={() => void refresh()} notify={notify} />}
      {offerFor && selectedJob && (
        <OfferComposer
          application={offerFor}
          job={selectedJob}
          companyName={selectedJob.company}
          onClose={() => setOfferFor(null)}
          onSent={refresh}
          notify={notify}
        />
      )}
      {history && (
        <Modal title={`${history.name} — tarixçə`} onClose={() => setHistory(null)}>
          <ol className="event-timeline">
            {history.events.map((event, index) => (
              <li key={index}>
                <time>{formatDate(event.created, language, { time: true })}</time>
                <span>
                  {event.type === "applied"
                    ? "Müraciət göndərildi"
                    : event.type === "withdrawn"
                      ? "Namizəd müraciəti geri götürdü"
                      : event.type === "stage"
                        ? `Mərhələ: ${event.to_value}`
                        : event.type === "offer"
                          ? `İş təklifi: ${event.to_value}`
                          : `Status: ${event.from_value || "—"} → ${event.to_value}`}
                </span>
                <small>{event.actor_role === "company" ? "Şirkət" : event.actor_role === "candidate" ? "Namizəd" : event.actor_role}</small>
              </li>
            ))}
            {!history.events.length && <li>Hələ qeyd yoxdur.</li>}
          </ol>
        </Modal>
      )}
      {candidate && (
        <Modal title={candidate.name} onClose={() => setCandidate(null)}>
          <div className="candidate-detail">
            <h3>{candidate.title}</h3>
            <p>{candidate.summary}</p>
            <div className="skill-tags">
              {candidate.skills.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            {candidateCertifications(candidate).length > 0 && (
              <>
                <h3>Sertifikatlar</h3>
                <CertificationBadges items={candidateCertifications(candidate)} limit={20} />
                {!!candidate.verified?.certification.length && (
                  <p className="verified-badge">
                    <BadgeCheck size={13} /> Sənədlə təsdiqlənib: {candidate.verified.certification.map((id) => certificationById(id)?.name || id).join(", ")}
                  </p>
                )}
                {candidateCertifications(candidate)
                  .filter((cert) => cert.credentialUrl)
                  .map((cert) => (
                    <p key={cert.id} className="fine-print">
                      {certificationById(cert.id)?.name}:{" "}
                      <a href={cert.credentialUrl} target="_blank" rel="noreferrer noopener">
                        yoxlama linki ↗
                      </a>
                    </p>
                  ))}
              </>
            )}
            <h3>İş təcrübəsi · {years(candidate)} il</h3>
            {candidate.experiences.map((e) => (
              <div className="repeat-card" key={e.id}>
                <h4>
                  {e.title} · {e.company}
                  {candidate.verified?.experience.includes(e.id) && <span className="verified-badge"> <BadgeCheck size={13} /> Sənədlə təsdiqlənib</span>}
                </h4>
                <small>
                  {e.start} — {e.current ? "Hazırda" : e.end}
                  {e.employmentType ? ` · ${e.employmentType}` : ""}
                </small>
                <p>{e.description}</p>
              </div>
            ))}
            {!!candidate.references?.length && (
              <>
                <h3>İstinad şəxsləri</h3>
                {candidate.references.map((r, i) => (
                  <p key={i}>{r.name}{r.position ? ` · ${r.position}` : ""}{r.company ? ` · ${r.company}` : ""}{r.contact ? ` · ${r.contact}` : ""}</p>
                ))}
              </>
            )}
            <h3>Təhsil</h3>
            {candidate.education.map((e) => (
              <p key={e.id}>
                {e.school} · {e.degree}
              </p>
            ))}
            {candidate.email && (
              <p>
                {candidate.email} {candidate.phone}
              </p>
            )}
          </div>
        </Modal>
      )}
      {confirm && draft && (
        <Modal
          title="Vakansiyanı yayımlayaq?"
          onClose={() => setConfirm(false)}
        >
          <p className="modal-copy">
            {draft.company} şirkəti üçün “{draft.title}” vakansiyası,{" "}
            {draft.minSalary}–{draft.maxSalary} AZN maaş, {draft.city} ·{" "}
            {draft.mode}. Təsdiqdən sonra saytdakı namizədlər elanı görə və
            müraciət edə biləcəklər.
          </p>
          <div className="form-actions">
            <button className="secondary" onClick={() => setConfirm(false)}>
              Redaktəyə qayıt
            </button>
            <button className="primary" disabled={busy} onClick={publish}>
              {busy ? "Yayımlanır..." : "Təsdiq et və yayımla"}
            </button>
          </div>
        </Modal>
      )}
    </>,
  );
}
