"use client";
import { Columns3, X } from "lucide-react";
import { type Job, type Profile, candidateCertifications, match, years } from "@/lib/model";
import { certificationById } from "@/lib/certification-catalog";
import { Modal } from "./components";
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

// Employer: candidates or applicants side by side for one vacancy.
export function CandidateComparison({
  candidates,
  job,
  onClose,
}: {
  candidates: { id: string; profile: Profile; status?: string; stage?: string }[];
  job: Job | undefined;
  onClose: () => void;
}) {
  const results = candidates.map((c) => ({ ...c, fit: job ? match(c.profile, job) : null }));
  const best = Math.max(...results.map((r) => r.fit?.score || 0));
  const rows: [string, (r: (typeof results)[number]) => React.ReactNode][] = [
    ["Peşə", (r) => r.profile.title || "—"],
    ["Ümumi təcrübə", (r) => `${years(r.profile)} ${t("il")}`],
    ["Vakansiyaya uyğun təcrübə", (r) => (r.fit ? `${r.fit.relevantYears} ${t("il")}` : "—")],
    ["Son vəzifə", (r) => (r.profile.experiences[0] ? `${r.profile.experiences[0].title} · ${r.profile.experiences[0].company}` : "—")],
    ["Uyğun bacarıqlar", (r) => r.fit?.matched.join(", ") || "—"],
    ["Çatışmayan bacarıqlar", (r) => r.fit?.missing.join(", ") || "—"],
    ["Sertifikatlar", (r) => certList(r.profile)],
    ["Təhsil", (r) => r.profile.education.map((e) => `${e.degree}, ${e.school}`).join("; ") || "—"],
    ["Dillər", (r) => r.profile.languages || "—"],
    ["Gözlənilən maaş", (r) => (r.profile.salary ? `${r.profile.salary} AZN` : "—")],
    ["Şəhər / format", (r) => `${r.profile.city} · ${r.profile.mode}`],
    ["Status", (r) => (r.status ? `${r.status}${r.stage ? `: ${r.stage}` : ""}` : t("Müraciət etməyib"))],
    ["Uyğunluq balı", (r) => (r.fit ? <b className={r.fit.score === best ? "compare-best" : ""}>{r.fit.score}%</b> : "—")],
  ];
  return (
    <Modal title={`${t("Namizədlərin müqayisəsi")}${job ? ` — ${job.title}` : ""}`} onClose={onClose} className="compare-modal">
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
