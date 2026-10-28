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
  if (!job) return { title: "Vakansiya tapılmadı | Joblink", robots: { index: false } };
  const origin = siteUrl(runtime().SITE_URL);
  const title = `${job.title} · ${job.company} | Joblink`;
  const description = plainText(job.description, 160);
  return {
    title,
    description,
    alternates: { canonical: `${origin}/jobs/${job.id}` },
    openGraph: { title, description, url: `${origin}/jobs/${job.id}`, type: "website", siteName: "Joblink" },
  };
}

export default async function JobPage({ params, searchParams }: Params) {
  const { id } = await Promise.resolve(params);
  const { src } = await Promise.resolve(searchParams || {});
  const job = await load(id);
  if (!job) notFound();
  const origin = siteUrl(runtime().SITE_URL);
  return (
    <main className="seo-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jobPostingJsonLd(job, origin)) }} />
      <p>
        <a href="/jobs">← Bütün vakansiyalar</a>
      </p>
      <h1>{job.title}</h1>
      <p>
        <b>{job.company}</b> · {job.city}
        {job.mode ? ` · ${job.mode}` : ""}
        {job.type ? ` · ${job.type}` : ""}
      </p>
      {(job.minSalary || job.maxSalary) && (
        <p>Maaş: {[job.minSalary, job.maxSalary].filter(Boolean).join(" – ")} AZN</p>
      )}
      {job.deadline && <p>Son tarix: {job.deadline}</p>}
      <h2>İşin təsviri</h2>
      <p className="seo-text">{job.description}</p>
      {job.requirements && (
        <>
          <h2>Tələblər</h2>
          <p className="seo-text">{job.requirements}</p>
        </>
      )}
      <p>
        Vakansiyaya müraciət etmək üçün hesab lazımdır: qeydiyyatdan keçin və ya daxil olun, vakansiya özü açılacaq.
      </p>
      <p>
        <a className="seo-apply" href={applyLink(job.id, src, true)}>
          Qeydiyyatdan keç və müraciət et
        </a>{" "}
        <a href={applyLink(job.id, src, false)}>Hesabım var — daxil ol</a>
      </p>
    </main>
  );
}
