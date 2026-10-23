"use client";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Building2, Globe } from "lucide-react";
import type { Job } from "@/lib/model";
import { CompanyReviews } from "./CompanyReviews";

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
  officeAddress?: string;
  mapUrl?: string;
  videoUrl?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  foundedYear?: string;
  logo?: boolean;
};

export function CompanyMark({ company }: { company: Pick<CompanyInfo, "id" | "name" | "logo"> }) {
  return company.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="vacancy-company-mark" src={`/api/joblink/companies/logo?id=${encodeURIComponent(company.id)}`} alt={company.name} style={{ objectFit: "contain", background: "#fff" }} />
  ) : (
    <span className="vacancy-company-mark" aria-hidden="true">{company.name.slice(0, 1).toLocaleUpperCase("az")}</span>
  );
}

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
            <CompanyMark company={c} />
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
  onNotify,
  isCandidate = false,
}: {
  company: CompanyInfo;
  jobs: Job[];
  following: boolean;
  signedIn: boolean;
  onOpenJob: (job: Job) => void;
  onFollow: (on: boolean) => void;
  onBlock: () => void;
  onNotify?: (message: string) => void;
  isCandidate?: boolean;
}) {
  return (
    <div className="company-view">
      <header className="vacancy-company">
        <CompanyMark company={company} />
        <div>
          <h3>{company.name}</h3>
          <span>{[company.industry, company.size && `${company.size} işçi`, company.foundedYear && `${company.foundedYear}-ci ildən`].filter(Boolean).join(" · ")}</span>
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
      {(company.officeAddress || company.mapUrl || company.videoUrl || company.linkedin || company.instagram || company.facebook) && (
        <ul className="company-links">
          {company.officeAddress && <li>Ofis: {company.officeAddress}{company.mapUrl && <> · <a href={company.mapUrl} target="_blank" rel="noopener noreferrer nofollow">Xəritədə bax</a></>}</li>}
          {!company.officeAddress && company.mapUrl && <li><a href={company.mapUrl} target="_blank" rel="noopener noreferrer nofollow">Ofisin xəritədəki yeri</a></li>}
          {company.videoUrl && <li><a href={company.videoUrl} target="_blank" rel="noopener noreferrer nofollow">Şirkət haqqında video</a></li>}
          {company.linkedin && <li><a href={company.linkedin} target="_blank" rel="noopener noreferrer nofollow">LinkedIn</a></li>}
          {company.instagram && <li><a href={company.instagram} target="_blank" rel="noopener noreferrer nofollow">Instagram</a></li>}
          {company.facebook && <li><a href={company.facebook} target="_blank" rel="noopener noreferrer nofollow">Facebook</a></li>}
        </ul>
      )}
      {signedIn && (
        <div className="form-actions">
          <button className="secondary" onClick={() => onFollow(!following)}>
            {following ? "İzlənilir ✓" : "Şirkəti izlə"}
          </button>
          <button className="text-button" onClick={onBlock}>Blokla</button>
        </div>
      )}
      <CompanyReviews companyId={company.id} signedIn={signedIn} isCandidate={isCandidate} notify={onNotify || (() => {})} />
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
