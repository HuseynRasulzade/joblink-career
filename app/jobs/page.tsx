import type { Metadata } from "next";
import { runtime } from "@/lib/server";
import { OPEN_VACANCIES_SQL, plainText, publicVacancy, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Açıq vakansiyalar | Joblink",
  description: "Azərbaycanda açıq iş elanları: vəzifə, şirkət, şəhər və maaş. Müraciət üçün Joblink-ə keçin.",
};

export default async function JobsIndex() {
  const rows = await runtime()
    .DB.prepare(`${OPEN_VACANCIES_SQL} ORDER BY j.created DESC LIMIT 100`)
    .all<{ id: string; data: string; created: string }>()
    .catch(() => ({ results: [] as { id: string; data: string; created: string }[] }));
  const jobs = rows.results.map((row) => publicVacancy(row.id, JSON.parse(row.data), row.created));
  const origin = siteUrl(runtime().SITE_URL);
  return (
    <main className="seo-page">
      <h1>Açıq vakansiyalar</h1>
      <p>
        <a href="/">Joblink-ə keç</a> · {jobs.length} açıq vakansiya
      </p>
      <ul className="seo-list">
        {jobs.map((job) => (
          <li key={job.id}>
            <h2>
              <a href={`${origin}/jobs/${job.id}`}>{job.title}</a>
            </h2>
            <p>
              {job.company} · {job.city}
              {job.minSalary || job.maxSalary ? ` · ${[job.minSalary, job.maxSalary].filter(Boolean).join(" – ")} AZN` : ""}
            </p>
            <p>{plainText(job.description, 220)}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
