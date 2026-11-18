import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { runtime } from "@/lib/server";
import {
  OPEN_VACANCIES_SQL,
  jobPostingJsonLd,
  jsonLdScript,
  plainText,
  publicVacancy,
  siteUrl,
} from "@/lib/seo";
import PublicShell from "../PublicShell";

export const dynamic = "force-dynamic";

// Leads into the app: /?job=ID opens the vacancy after sign-in; the channel travels along.
function applyLink(id: string, src: string | undefined, register: boolean) {
  const query = new URLSearchParams({ job: id });
  if (src && /^[a-z]{2,20}$/.test(src)) query.set("src", src);
  if (register) query.set("register", "1");
  return `/?${query.toString()}`;
}

async function load(id: string) {
  const row = await runtime()
    .DB.prepare(`${OPEN_VACANCIES_SQL} AND j.id=?`)
    .bind(id.slice(0, 100))
    .first<{ id: string; data: string; created: string }>()
    .catch(() => null);
  return row ? publicVacancy(row.id, JSON.parse(row.data), row.created) : null;
}

type Params = {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ src?: string }> | { src?: string };
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await Promise.resolve(params);
  const job = await load(id);
  if (!job) return { title: "Vakansiya tapılmadı | JobMatch", robots: { index: false } };
  const origin = siteUrl(runtime().SITE_URL);
  const title = `${job.title} · ${job.company} | JobMatch`;
  const description = plainText(job.description, 160);
  return {
    title,
    description,
    alternates: { canonical: `${origin}/jobs/${job.id}` },
    openGraph: { title, description, url: `${origin}/jobs/${job.id}`, type: "website", siteName: "JobMatch" },
  };
}

export default async function JobPage({ params, searchParams }: Params) {
  const { id } = await Promise.resolve(params);
  const { src } = await Promise.resolve(searchParams || {});
  const job = await load(id);
  if (!job) notFound();
  const origin = siteUrl(runtime().SITE_URL);
  const salary = job.minSalary || job.maxSalary ? [job.minSalary, job.maxSalary].filter(Boolean).map((n) => Number(n).toLocaleString("az-AZ")).join("–") + " AZN" : "";
  return (
    <PublicShell>
      <main className="pj-main pj-detail">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jobPostingJsonLd(job, origin)) }} />
        <p><a className="gate-link" href="/jobs">← Bütün vakansiyalar</a></p>
        <article className="job-tile pj-article">
          <div className="job-tile-top">
            <span className="job-tile-mark">{job.company.trim().slice(0, 1).toLocaleUpperCase("az")}</span>
            <div>
              <h1>{job.title}</h1>
              <small>{job.company}</small>
            </div>
          </div>
          <ul className="job-tile-meta">
            {job.city && <li>{job.city}</li>}
            {job.mode && <li>{job.mode}</li>}
            {job.type && <li>{job.type}</li>}
            {job.deadline && <li>Son tarix: {job.deadline}</li>}
          </ul>
          {salary && <p className="job-tile-salary">{salary}</p>}
          <h2>İşin təsviri</h2>
          <p className="seo-text">{job.description}</p>
          {job.requirements && (
            <>
              <h2>Tələblər</h2>
              <p className="seo-text">{job.requirements}</p>
            </>
          )}
          <p className="pj-note">Vakansiyaya müraciət etmək üçün hesab lazımdır: qeydiyyatdan keçin və ya daxil olun, vakansiya özü açılacaq.</p>
          <p className="pj-actions">
            <a className="pj-cta" href={applyLink(job.id, src, true)}>Qeydiyyatdan keç və müraciət et</a>
            <a className="gate-link" href={applyLink(job.id, src, false)}>Hesabım var — daxil ol</a>
          </p>
        </article>
      </main>
    </PublicShell>
  );
}
