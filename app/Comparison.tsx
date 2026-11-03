"use client";
import { Columns3, X } from "lucide-react";
import { type Job, type Profile, candidateCertifications, match, years } from "@/lib/model";
import { certificationById } from "@/lib/certification-catalog";
import { Modal } from "./components";
import { isValidElement, useEffect, useState } from "react";
import { createXlsx } from "@/lib/xlsx";
import { formatDate } from "@/lib/dates";
import { siteLanguage, translate } from "./i18n";

const t = (text: string) => translate(text, siteLanguage());

// Floating bar showing what is selected for comparison.
export function CompareBar({ count, max, onOpen, onClear }: { count: number; max: number; onOpen: () => void; onClear: () => void }) {
  if (!count) return null;
  return (
    <div className="compare-bar" role="status">
      <span>
        <Columns3 size={16} /> {count}/{max} {t("seçilib")}
      </span>
      <button className="primary" disabled={count < 2} onClick={onOpen}>{t("Müqayisə et")}</button>
      <button className="text-button" onClick={onClear} aria-label={t("Təmizlə")}><X size={16} /></button>
    </div>
  );
}

function certList(profile: Profile) {
  const list = candidateCertifications(profile);
  return list.length
    ? list.map((c) => `${certificationById(c.id)?.name || c.id}${c.level ? ` (${c.level})` : ""}${c.status === "in_progress" ? ` – ${t("davam edir")}` : ""}`).join(", ")
    : "—";
}

// Candidate: vacancies side by side, with the candidate's fit for each.
export function JobComparison({ jobs, profile, onClose }: { jobs: Job[]; profile: Profile; onClose: () => void }) {
  const results = jobs.map((job) => ({ job, fit: match(profile, job) }));
  const best = Math.max(...results.map((r) => r.fit.score));
  const rows: [string, (r: (typeof results)[number]) => React.ReactNode][] = [
    ["Şirkət", (r) => r.job.company],
    ["Şəhər / format", (r) => `${r.job.city} · ${r.job.mode}`],
    ["Maaş", (r) => (r.job.minSalary || r.job.maxSalary ? `${r.job.minSalary}–${r.job.maxSalary} AZN` : t("Razılaşma yolu ilə"))],
    ["Məşğulluq", (r) => r.job.type],
    ["Təcrübə tələbi", (r) => `${r.job.minYears}${r.job.maxYears > r.job.minYears ? `–${r.job.maxYears}` : "+"} ${t("il")}`],
    ["Sizin uyğun təcrübəniz", (r) => `${r.fit.relevantYears} ${t("il")}`],
    ["Uyğun bacarıqlar", (r) => r.fit.matched.join(", ") || "—"],
    ["Çatışmayan bacarıqlar", (r) => r.fit.missing.join(", ") || "—"],
    ["Sertifikat tələbləri", (r) => (r.job.certifications || []).map((c) => `${certificationById(c.id)?.name}${c.required ? "*" : ""}`).join(", ") || "—"],
    ["Son tarix", (r) => (r.job.deadline ? formatDate(r.job.deadline, siteLanguage()) : "—")],
    ["Uyğunluq balı", (r) => <b className={r.fit.score === best ? "compare-best" : ""}>{r.fit.score}%</b>],
  ];
  return (
    <Modal title={t("Vakansiyaların müqayisəsi")} onClose={onClose} className="compare-modal">
      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr><th></th>{results.map((r) => <th key={r.job.id}>{r.job.title}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(([label, cell]) => (
              <tr key={label}><th>{t(label)}</th>{results.map((r) => <td key={r.job.id}>{cell(r)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted fine-print">{t("* məcburi sertifikat. Uyğunluq balı işə qəbul ehtimalı deyil.")}</p>
    </Modal>
  );
}

// Employer: candidates or applicants side by side for one vacancy, with interview results, pay against the range,
// what is missing for the job and a short summary; the table can be exported and printed.
type InterviewSummary = { interviews: number; rated: number; average: number; advance: number; hold: number; reject: number; lastDecision: string; lastFeedback: string };
type Cell = string | number;
export function CandidateComparison({
  candidates,
  job,
  onClose,
}: {
  candidates: { id: string; applicationId?: string; profile: Profile; status?: string; stage?: string }[];
  job: Job | undefined;
  onClose: () => void;
}) {
  const [interviews, setInterviews] = useState<Record<string, InterviewSummary>>({});
  const [tests, setTests] = useState<Record<string, { title: string; status: string; percent: number | null; passing: number; pending: boolean }[]>>({});
  useEffect(() => {
    fetch("/api/joblink/hr/interviews/compare", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ jobs: { candidates: (InterviewSummary & { applicationId: string })[] }[] }>) : null))
      .then((d) => {
        const map: Record<string, InterviewSummary> = {};
        for (const j of d?.jobs || []) for (const x of j.candidates) map[x.applicationId] = x;
        setInterviews(map);
      })
      .catch(() => undefined);
  }, []);
  const applicationKey = candidates.map((c) => c.applicationId || "").filter(Boolean).join(",");
  useEffect(() => {
    if (!applicationKey) return;
    fetch(`/api/joblink/hr/assessments/results?applications=${applicationKey}`, { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ results: { applicationId: string; title: string; status: string; percent: number | null; passing: number; pending: boolean }[] }>) : null))
      .then((d) => {
        const map: Record<string, { title: string; status: string; percent: number | null; passing: number; pending: boolean }[]> = {};
        for (const x of d?.results || []) (map[x.applicationId] ||= []).push(x);
        setTests(map);
      })
      .catch(() => undefined);
  }, [applicationKey]);
  const results = candidates.map((c) => ({ ...c, fit: job ? match(c.profile, job) : null, iv: c.applicationId ? interviews[c.applicationId] : undefined, tests: c.applicationId ? tests[c.applicationId] || [] : [] }));
  const best = Math.max(...results.map((r) => r.fit?.score || 0));
  const bestInterview = Math.max(...results.map((r) => r.iv?.average || 0));
  const lowestSalary = Math.min(...results.map((r) => r.profile.salary || Infinity));
  const requiredCerts = (job?.certifications || []).filter((c) => c.required);
  const missingRequired = (r: (typeof results)[number]) => requiredCerts.filter((c) => !candidateCertifications(r.profile).some((x) => x.id === c.id && x.status !== "in_progress")).map((c) => certificationById(c.id)?.name || c.id);
  const salaryNote = (r: (typeof results)[number]) => {
    const wanted = r.profile.salary;
    if (!wanted) return "—";
    if (!job || (!job.minSalary && !job.maxSalary)) return `${wanted} AZN`;
    const over = job.maxSalary && wanted > job.maxSalary ? wanted - job.maxSalary : 0;
    return over ? `${wanted} AZN (diapazondan ${over} AZN yuxarı)` : `${wanted} AZN (diapazon daxilində)`;
  };
  const experienceNote = (r: (typeof results)[number]) => {
    if (!job || !r.fit) return "—";
    return r.fit.relevantYears >= job.minYears ? `${r.fit.relevantYears} il: tələbi ödəyir (${job.minYears}+)` : `${r.fit.relevantYears} il: ${job.minYears - r.fit.relevantYears} il çatışmır`;
  };
  const summary = (r: (typeof results)[number]) => {
    const good: string[] = [];
    const weak: string[] = [];
    if (r.fit && r.fit.score === best && results.length > 1) good.push("ən yüksək uyğunluq");
    if (r.iv && r.iv.average && r.iv.average === bestInterview && results.length > 1) good.push("ən yaxşı müsahibə qiyməti");
    if (r.profile.salary && r.profile.salary === lowestSalary && results.length > 1) good.push("ən aşağı maaş gözləntisi");
    if (r.fit && r.fit.missing.length) weak.push(`${r.fit.missing.length} bacarıq çatışmır`);
    const certs = missingRequired(r);
    if (certs.length) weak.push(`məcburi sertifikat yoxdur: ${certs.join(", ")}`);
    if (job && job.maxSalary && r.profile.salary > job.maxSalary) weak.push("maaş gözləntisi diapazondan yuxarıdır");
    if (r.iv && r.iv.reject > 0 && r.iv.reject >= r.iv.advance) weak.push("müsahibədə rədd səsi çoxdur");
    if (r.tests.some((x) => x.percent !== null && x.passing > 0 && x.percent < x.passing)) weak.push("testdən keçməyib");
    return `${good.length ? `Güclü: ${good.join(", ")}. ` : ""}${weak.length ? `Diqqət: ${weak.join("; ")}.` : ""}` || "—";
  };
  const rows: [string, (r: (typeof results)[number]) => React.ReactNode, ((r: (typeof results)[number]) => Cell)?][] = [
    ["Peşə", (r) => r.profile.title || "—"],
    ["Ümumi təcrübə", (r) => `${years(r.profile)} ${t("il")}`],
    ["Vakansiyaya uyğun təcrübə", (r) => experienceNote(r)],
    ["Son vəzifə", (r) => (r.profile.experiences[0] ? `${r.profile.experiences[0].title} · ${r.profile.experiences[0].company}` : "—")],
    ["Uyğun bacarıqlar", (r) => r.fit?.matched.join(", ") || "—"],
    ["Çatışmayan bacarıqlar", (r) => r.fit?.missing.join(", ") || "—"],
    ["Sertifikatlar", (r) => certList(r.profile)],
    ["Məcburi sertifikat çatışmazlığı", (r) => missingRequired(r).join(", ") || (requiredCerts.length ? "yoxdur, hamısı var" : "tələb yoxdur")],
    ["Təhsil", (r) => r.profile.education.map((e) => `${e.degree}, ${e.school}`).join("; ") || "—"],
    ["Dillər", (r) => r.profile.languages || "—"],
    ["Maaş gözləntisi", (r) => salaryNote(r)],
    ["Şəhər / format", (r) => `${r.profile.city} · ${r.profile.mode}`],
    ["Status", (r) => (r.status ? `${r.status}${r.stage ? `: ${r.stage}` : ""}` : t("Müraciət etməyib"))],
    ["Müsahibə sayı", (r) => (r.iv ? `${r.iv.interviews} (qiymətləndirilib: ${r.iv.rated})` : r.applicationId ? "müsahibə yoxdur" : "—")],
    ["Müsahibə orta qiyməti", (r) => (r.iv?.rated ? <b className={r.iv.average === bestInterview ? "compare-best" : ""}>{r.iv.average} / 5</b> : "—")],
    ["Müsahibə qərarları", (r) => (r.iv ? `davam: ${r.iv.advance}, gözlə: ${r.iv.hold}, rədd: ${r.iv.reject}` : "—")],
    ["Son müsahibə rəyi", (r) => r.iv?.lastFeedback || "—"],
    ["Test nəticələri", (r) => (r.tests.length ? r.tests.map((x) => `${x.title}: ${x.status === "assigned" ? "göndərilib" : x.pending ? "yoxlanır" : x.percent !== null ? `${x.percent}%${x.passing > 0 ? (x.percent >= x.passing ? " (keçib)" : " (keçməyib)") : ""}` : x.status}`).join("; ") : r.applicationId ? "test göndərilməyib" : "—")],
    ["Uyğunluq balı", (r) => (r.fit ? <b className={r.fit.score === best ? "compare-best" : ""}>{r.fit.score}%</b> : "—")],
    ["Qısa nəticə", (r) => summary(r)],
  ];
  // The text of a cell, also for the few cells that wrap their text in <b>.
  const plain = (node: React.ReactNode): Cell => {
    if (typeof node === "string" || typeof node === "number") return node;
    if (Array.isArray(node)) return node.map((x) => String(plain(x))).join("");
    if (isValidElement(node)) return plain((node.props as { children?: React.ReactNode }).children);
    return "—";
  };
  function exportExcel() {
    const bytes = createXlsx(["Göstərici", ...results.map((r) => r.profile.name)], rows.map(([label, cell]) => [t(label), ...results.map((r) => plain(cell(r)))]), "Müqayisə");
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `namized-muqayise-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
  function print() {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (v: Cell) => String(v).replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch] as string);
    w.document.write(`<html><head><title>Namizədlərin müqayisəsi</title><style>body{font-family:sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}th:first-child{width:18%}</style></head><body><h3>Namizədlərin müqayisəsi${job ? ` — ${esc(job.title)}` : ""}</h3><table><tr><th></th>${results.map((r) => `<th>${esc(r.profile.name)}</th>`).join("")}</tr>${rows.map(([label, cell]) => `<tr><th>${esc(t(label))}</th>${results.map((r) => `<td>${esc(plain(cell(r)))}</td>`).join("")}</tr>`).join("")}</table></body></html>`);
    w.document.close();
    w.print();
  }
  return (
    <Modal title={`${t("Namizədlərin müqayisəsi")}${job ? ` — ${job.title}` : ""}`} onClose={onClose} className="compare-modal">
      <div className="admin-actions">
        <button type="button" className="secondary" onClick={exportExcel}>Excel</button>
        <button type="button" className="secondary" onClick={print}>Çap</button>
      </div>
      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr><th></th>{results.map((r) => <th key={r.id}>{r.profile.name}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(([label, cell]) => (
              <tr key={label}><th>{t(label)}</th>{results.map((r) => <td key={r.id}>{cell(r)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted fine-print">{t("Müqayisə qərar verməyə kömək edir; yekun seçim işəgötürənə aiddir.")}</p>
    </Modal>
  );
}
