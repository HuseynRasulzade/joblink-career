"use client";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Building2, Globe } from "lucide-react";
import type { Job } from "@/lib/model";

export type CompanyInfo = {
  id: string;
  name: string;
  openJobs: number;
  followers: number;
  verified: boolean;
  industry: string;
  size: string;
  website: string;
  about: string;
};

export function VerifiedBadge({ small }: { small?: boolean }) {
  return (
    <span className={small ? "verified-badge small" : "verified-badge"} title="Sənədlə təsdiqlənmiş şirkət">
      <BadgeCheck size={small ? 13 : 16} /> Təsdiqlənmiş şirkət
    </span>
  );
}

export function CompaniesPage({ onOpen, notify }: { onOpen: (company: CompanyInfo) => void; notify: (m: string) => void }) {
  const [list, setList] = useState<CompanyInfo[] | null>(null);
  const [query, setQuery] = useState("");
  const [withJobs, setWithJobs] = useState(false);
  useEffect(() => {
    fetch("/api/joblink/companies", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ companies?: CompanyInfo[] }>)
      .then((d) => setList(d.companies || []))
      .catch(() => notify("Şirkət siyahısı yüklənmədi."));
  }, [notify]);
  const shown = useMemo(
    () =>
      (list || []).filter(
        (c) =>
          (!withJobs || c.openJobs > 0) &&
          `${c.name} ${c.industry}`.toLocaleLowerCase("az").includes(query.toLocaleLowerCase("az")),
      ),
    [list, query, withJobs],
  );
  if (!list) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="companies-page">
      <div className="jobs-toolbar">
        <input className="search-input" placeholder="Şirkət və ya sahə axtar" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="check-inline">
          <input type="checkbox" checked={withJobs} onChange={(e) => setWithJobs(e.target.checked)} /> Yalnız açıq vakansiyası olanlar
        </label>
      </div>
      <p className="muted">{shown.length} şirkət</p>
      <div className="company-grid">
        {shown.map((c) => (
          <button key={c.id} className="company-card" onClick={() => onOpen(c)}>
            <span className="vacancy-company-mark" aria-hidden="true">{c.name.slice(0, 1).toLocaleUpperCase("az")}</span>
            <strong>{c.name}</strong>
            {c.verified && <VerifiedBadge small />}
            <small>{[c.industry, c.size && `${c.size} işçi`].filter(Boolean).join(" · ") || "—"}</small>
            <em className={c.openJobs ? "company-jobs has" : "company-jobs"}>{c.openJobs} açıq vakansiya</em>
          </button>
        ))}
        {!shown.length && <p className="admin-empty">Şirkət tapılmadı.</p>}
      </div>
    </div>
  );
}

export function CompanyView({
  company,
  jobs,
  following,
  signedIn,
  onOpenJob,
  onFollow,
  onBlock,
}: {
  company: CompanyInfo;
  jobs: Job[];
  following: boolean;
  signedIn: boolean;
  onOpenJob: (job: Job) => void;
  onFollow: (on: boolean) => void;
  onBlock: () => void;
}) {
  return (
    <div className="company-view">
      <header className="vacancy-company">
        <div className="vacancy-company-mark" aria-hidden="true">{company.name.slice(0, 1).toLocaleUpperCase("az")}</div>
        <div>
          <h3>{company.name}</h3>
          <span>{[company.industry, company.size && `${company.size} işçi`].filter(Boolean).join(" · ")}</span>
        </div>
        {company.verified && <VerifiedBadge />}
      </header>
      {company.about && <p>{company.about}</p>}
      <p className="muted">
        <Building2 size={14} /> {company.followers} izləyici
        {company.website && (
          <>
            {" · "}
            <Globe size={14} /> {company.website}
          </>
        )}
      </p>
      {signedIn && (
        <div className="form-actions">
          <button className="secondary" onClick={() => onFollow(!following)}>
            {following ? "İzlənilir ✓" : "Şirkəti izlə"}
          </button>
          <button className="text-button" onClick={onBlock}>Blokla</button>
        </div>
      )}
      <h3>Açıq vakansiyalar ({jobs.length})</h3>
      <div className="company-jobs-list">
        {jobs.map((j) => (
          <button key={j.id} className="company-job-row" onClick={() => onOpenJob(j)}>
            <strong>{j.title}</strong>
            <span>
              {j.city} · {j.minSalary || j.maxSalary ? `${j.minSalary}–${j.maxSalary} AZN` : "Razılaşma yolu ilə"}
            </span>
          </button>
        ))}
        {!jobs.length && <p className="admin-empty">Hazırda açıq vakansiya yoxdur.</p>}
      </div>
    </div>
  );
}
