import type { Metadata } from "next";
import { runtime } from "@/lib/server";
import { OPEN_VACANCIES_SQL, plainText, publicVacancy, siteUrl } from "@/lib/seo";
import PublicShell from "./PublicShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Açıq vakansiyalar | JobMatch",
  description: "Azərbaycanda açıq iş elanları: vəzifə, şirkət, şəhər və maaş. Müraciət üçün JobMatch-ə keçin.",
};

export default async function JobsIndex({ searchParams }: { searchParams: Promise<{ q?: string; city?: string }> }) {
  const params = await searchParams;
  const q = String(params.q || "").trim().slice(0, 80).toLocaleLowerCase("az");
  const city = String(params.city || "").trim().slice(0, 40).toLocaleLowerCase("az");
  const rows = await runtime()
    .DB.prepare(`${OPEN_VACANCIES_SQL} ORDER BY j.created DESC LIMIT 100`)
    .all<{ id: string; data: string; created: string }>()
    .catch(() => ({ results: [] as { id: string; data: string; created: string }[] }));
  const all = rows.results.map((row) => publicVacancy(row.id, JSON.parse(row.data), row.created));
  const has = (job: (typeof all)[number], text: string) => [job.title, job.company, job.city, job.mode, job.type, job.category, job.requirements].some((v) => String(v || "").toLocaleLowerCase("az").includes(text));
  const jobs = all.filter((job) => (!q || has(job, q)) && (!city || has(job, city)));
  const origin = siteUrl(runtime().SITE_URL);
  const salary = (min: number, max: number) => (min || max ? [min, max].filter(Boolean).map((n) => Number(n).toLocaleString("az-AZ")).join("–") + " AZN" : "Razılaşma ilə");
  return (
    <PublicShell>
      <main className="pj-main">
        <section className="pj-hero">
          <p className="pj-eyebrow">AÇIQ VAKANSİYALAR</p>
          <h1>Sizə uyğun iş tapın</h1>
          <p className="pj-lead">{jobs.length} açıq vakansiya. Müraciət etmək üçün pulsuz hesab açın: CV-niz vakansiyaya uyğunluq balı ilə dəyərləndirilir.</p>
          <form className="gate-search pj-search" action="/jobs" method="get" role="search">
            <input name="q" type="search" defaultValue={params.q || ""} placeholder="Vəzifə, şirkət və ya bacarıq" aria-label="Vakansiya axtarışı" maxLength={80} />
            <select name="city" aria-label="Şəhər" defaultValue={params.city || ""}>
              <option value="">Bütün şəhərlər</option>
              <option value="Bakı">Bakı</option>
              <option value="Sumqayıt">Sumqayıt</option>
              <option value="Gəncə">Gəncə</option>
              <option value="Uzaqdan">Uzaqdan</option>
            </select>
            <button type="submit" className="gate-search-go">Axtar</button>
          </form>
          <p><a className="pj-cta" href="/">Qeydiyyatdan keç</a></p>
        </section>
        <div className="landing-jobs pj-grid">
          {jobs.map((job) => (
            <article className="job-tile" key={job.id}>
              <div className="job-tile-top">
                <span className="job-tile-mark">{job.company.trim().slice(0, 1).toLocaleUpperCase("az")}</span>
                <div>
                  <h3><a href={`${origin}/jobs/${job.id}`}>{job.title}</a></h3>
                  <small>{job.company}</small>
                </div>
              </div>
              <ul className="job-tile-meta">
                {job.city && <li>{job.city}</li>}
                {job.mode && <li>{job.mode}</li>}
                {job.type && <li>{job.type}</li>}
              </ul>
              <p className="job-tile-salary">{salary(job.minSalary, job.maxSalary)}</p>
              <p className="pj-desc">{plainText(job.description, 150)}</p>
              <a className="job-tile-apply" href={`${origin}/jobs/${job.id}`}>Ətraflı bax</a>
            </article>
          ))}
        </div>
        {!jobs.length && <p className="pj-empty">{q || city ? "Axtarışa uyğun vakansiya tapılmadı. Başqa söz yoxlayın." : "Hazırda açıq vakansiya yoxdur."}</p>}
      </main>
    </PublicShell>
  );
}
