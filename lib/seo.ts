// What search engines see: crawlable vacancy pages, the sitemap and robots.txt.
// The application itself renders in the browser, so these plain pages carry the
// vacancy text and structured data (schema.org JobPosting) for crawlers.
export const DEFAULT_SITE_URL = "https://joblink-career.huseynresulzade04.workers.dev";
export const siteUrl = (configured?: string) =>
  (configured || DEFAULT_SITE_URL).trim().replace(/\/+$/, "");

export type PublicVacancy = {
  id: string;
  title: string;
  company: string;
  city: string;
  mode: string;
  type: string;
  category: string;
  minSalary: number;
  maxSalary: number;
  description: string;
  requirements: string;
  deadline: string;
  created: string;
};

// The fields that are meant to be public; everything else in the stored record stays out.
export function publicVacancy(id: string, data: Record<string, unknown>, created: string): PublicVacancy {
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");
  const number = (value: unknown) => (typeof value === "number" && value > 0 ? Math.round(value) : 0);
  return {
    id,
    title: text(data.title, 150),
    company: text(data.company, 150),
    city: text(data.city, 80),
    mode: text(data.mode, 40),
    type: text(data.type, 40),
    category: text(data.category, 100),
    minSalary: number(data.minSalary),
    maxSalary: number(data.maxSalary),
    description: text(data.description, 8000),
    requirements: text(data.requirements, 4000),
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(text(data.deadline, 10)) ? text(data.deadline, 10) : "",
    created,
  };
}

export function employmentTypeFor(type: string) {
  const t = type.toLocaleLowerCase("az");
  if (/yarım|part/.test(t)) return "PART_TIME";
  if (/sərbəst|freelance|özünü/.test(t)) return "CONTRACTOR";
  if (/təcrübə|intern/.test(t)) return "INTERN";
  if (/müvəqqəti|temporary/.test(t)) return "TEMPORARY";
  if (/tam/.test(t)) return "FULL_TIME";
  return "OTHER";
}

export const plainText = (value: string, max = 300) =>
  value.replace(/\s+/g, " ").trim().slice(0, max);

export function jobPostingJsonLd(job: PublicVacancy, origin: string) {
  const description = [job.description, job.requirements].filter(Boolean).join("\n\n");
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: description.replace(/\n/g, "<br>"),
    identifier: { "@type": "PropertyValue", name: "Joblink", value: job.id },
    datePosted: job.created.slice(0, 10),
    ...(job.deadline ? { validThrough: job.deadline } : {}),
    employmentType: employmentTypeFor(job.type),
    hiringOrganization: { "@type": "Organization", name: job.company },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.city || "Bakı", addressCountry: "AZ" },
    },
    ...(job.mode === "Uzaqdan" ? { jobLocationType: "TELECOMMUTE" } : {}),
    ...(job.minSalary || job.maxSalary
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "AZN",
            value: {
              "@type": "QuantitativeValue",
              ...(job.minSalary ? { minValue: job.minSalary } : {}),
              ...(job.maxSalary ? { maxValue: job.maxSalary } : {}),
              unitText: "MONTH",
            },
          },
        }
      : {}),
    directApply: true,
    url: `${origin}/jobs/${job.id}`,
  };
}
// Inside a <script> tag a "<" must not appear, or the text could close the tag.
export const jsonLdScript = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] as string);
export function sitemapXml(origin: string, jobs: { id: string; created: string }[]) {
  const urls = [
    { loc: `${origin}/`, lastmod: "" },
    { loc: `${origin}/jobs`, lastmod: "" },
    { loc: `${origin}/kalkulyatorlar`, lastmod: "" },
    ...jobs.map((job) => ({ loc: `${origin}/jobs/${job.id}`, lastmod: job.created.slice(0, 10) })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`)
    .join("\n")}\n</urlset>\n`;
}
export const robotsTxt = (origin: string) =>
  `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`;

// Open vacancies as the public may see them: published, owner active, deadline not passed.
export const OPEN_VACANCIES_SQL = `SELECT j.id,j.data,j.created FROM jobs j LEFT JOIN accounts a ON a.id=j.owner
  WHERE j.status='published' AND COALESCE(a.status,'active')='active'
  AND (COALESCE(json_extract(j.data,'$.deadline'),'')='' OR json_extract(j.data,'$.deadline')>=date('now'))`;
