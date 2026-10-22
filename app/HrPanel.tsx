"use client";
import { FitReviewPanel } from "./FitReview";
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
}) {
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
  const [offerFor, setOfferFor] = useState<Application | null>(null);
  const [testFor, setTestFor] = useState<Application | null>(null);
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
      notify("AI namizədləri qiymətləndirdi.");
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
            ownJobs.map((j) => (
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
                {!j.demo && (j.reason || (j.stages || []).length > 0) && (
                  <p className="job-internal">
                    {j.reason && <span title="Yalnız şirkət daxili">Səbəb: {VACANCY_REASONS.find((r) => r.id === j.reason)?.label || j.reason}</span>}
                    {(j.stages || []).length > 0 && <span>{(j.stages || []).length} mərhələ</span>}
                  </p>
                )}
                <div className="job-footer">
                  <span>
                    {j.minSalary}–{j.maxSalary} AZN
                  </span>
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
                      <button disabled={busy} onClick={() => changeJobStatus(j, "archive")}>
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
            ))
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
              <span className="pill">TƏSDİQ GÖZLƏYİR</span>
            </div>
            {draft ? (
              <>
                <p className="muted">
                  Bütün şərtləri yoxlayın və şirkət məlumatlarını tamamlayın.
                </p>
                <JobForm job={draft} onChange={setDraft} />
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
                  onOffer={setOfferFor}
                  onAssignTest={setTestFor}
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
