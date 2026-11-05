"use client";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { Job } from "@/lib/model";
import { Modal } from "./components";

// Vacancy texts come as one block with "•" or line breaks between the points.
const points = (text?: string) =>
  (text || "")
    .split(/\s*•\s*|\n+|;\s+/)
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
const day = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");

export type JobStats = { unique?: number; last7?: number; total: number; fresh: number; interview: number; hired: number };

// The details of one of the company's own vacancies, in a panel on the right: the list itself stays short.
export default function JobDrawer({
  job,
  statusLabel,
  stats,
  reasonLabel,
  onClose,
  onApplications,
  onEdit,
}: {
  job: Job;
  statusLabel: string;
  stats: JobStats;
  reasonLabel?: string;
  onClose: () => void;
  onApplications: () => void;
  onEdit?: () => void;
}) {
  const description = points(job.description);
  const requirements = points(job.requirements);
  const benefits = points(job.benefits);
  return (
    <Modal title={job.title} onClose={onClose} className="side-drawer">
      <div className="jd">
        <p className="jd-sub">
          <b>{job.company}</b> · <MapPin size={13} /> {job.city || "—"} · {job.mode || "—"} <span className="jd-status">{statusLabel}</span>
        </p>
        <div className="jd-facts">
          <div><span>Maaş</span><b>{job.minSalary || job.maxSalary ? `${job.minSalary}–${job.maxSalary} AZN${job.salaryKind ? ` (${job.salaryKind})` : ""}` : "Razılaşma yolu ilə"}</b></div>
          <div><span>Məşğulluq</span><b>{job.type || "—"}</b></div>
          <div><span>Təcrübə</span><b>{job.minYears || job.maxYears ? `${job.minYears}–${job.maxYears} il` : "Göstərilməyib"}</b></div>
          <div><span>Sahə</span><b>{job.category || "—"}</b></div>
          <div><span>Yerləşdirilib</span><b>{day(job.created) || "—"}</b></div>
          <div><span>Son tarix</span><b>{day(job.deadline) || "—"}</b></div>
        </div>
        <div className="jd-stats">
          <span><b>{stats.unique ?? 0}</b> baxan</span>
          <span><b>{stats.total}</b> müraciət</span>
          {stats.fresh > 0 && <span><b>{stats.fresh}</b> yeni</span>}
          {stats.interview > 0 && <span><b>{stats.interview}</b> müsahibə</span>}
          {stats.hired > 0 && <span><b>{stats.hired}</b> işə qəbul</span>}
        </div>
        {!!description.length && (
          <section>
            <h3>İşin təsviri</h3>
            <ul>{description.map((l, i) => <li key={`${i}-${l}`}>{l}</li>)}</ul>
          </section>
        )}
        {!!requirements.length && (
          <section>
            <h3>Tələblər</h3>
            <ul>{requirements.map((l, i) => <li key={`${i}-${l}`}>{l}</li>)}</ul>
          </section>
        )}
        {!!job.skills?.length && (
          <section>
            <h3>Bacarıqlar</h3>
            <div className="skill-tags">{job.skills.map((s) => <span key={s}>{s}</span>)}</div>
          </section>
        )}
        {(job.workSchedule || benefits.length > 0 || job.address) && (
          <section>
            <h3>İş şəraiti</h3>
            <ul>
              {job.workSchedule && <li>İş qrafiki: {job.workSchedule}</li>}
              {job.address && <li>Ünvan: {job.address}</li>}
              {benefits.map((l, i) => <li key={`${i}-${l}`}>{l}</li>)}
            </ul>
          </section>
        )}
        {(!!job.stages?.length || reasonLabel || job.department) && (
          <section>
            <h3>Daxili məlumat</h3>
            <ul>
              {!!job.stages?.length && <li>Seçim mərhələləri: {job.stages.join(" → ")}</li>}
              {reasonLabel && <li>Yaranma səbəbi: {reasonLabel}</li>}
              {job.department && <li>Departament: {job.department}{job.section ? ` / ${job.section}` : ""}</li>}
            </ul>
          </section>
        )}
        <div className="jd-actions">
          <button type="button" className="primary" onClick={onApplications}>Müraciətlərə bax <ArrowUpRight size={14} /></button>
          {onEdit && <button type="button" className="secondary" onClick={onEdit}>Redaktə et</button>}
        </div>
      </div>
    </Modal>
  );
}
