// Pages for search engines: structured data, sitemap and robots.txt.
import assert from "node:assert/strict";
import test from "node:test";
import {
  employmentTypeFor,
  jobPostingJsonLd,
  jsonLdScript,
  publicVacancy,
  robotsTxt,
  siteUrl,
  sitemapXml,
} from "../lib/seo.ts";

const stored = {
  title: "Maliyyə analitiki",
  company: "Sirket Test",
  city: "Bakı",
  mode: "Ofisdə",
  type: "Tam ştat",
  category: "Maliyyə, bankçılıq və sığorta",
  minSalary: 1500,
  maxSalary: 2200,
  description: "Aylıq hesabatların hazırlanması.",
  requirements: "Excel",
  deadline: "2026-12-01",
  // internal fields that must never be public
  reason: "new-position",
  reasonNote: "daxili",
  stages: ["HR", "Müsahibə"],
  owner: "secret-owner-id",
  approval: { by: "x" },
};

test("only the public fields of a vacancy are kept", () => {
  const job = publicVacancy("j1", stored, "2026-10-27T10:00:00Z");
  assert.equal(job.title, "Maliyyə analitiki");
  for (const hidden of ["reason", "reasonNote", "stages", "owner", "approval"]) assert.ok(!(hidden in job));
  assert.equal(publicVacancy("j2", { title: "x", deadline: "tezliklə" }, "").deadline, "");
});

test("job posting data follows schema.org", () => {
  const ld = jobPostingJsonLd(publicVacancy("j1", stored, "2026-10-27T10:00:00Z"), "https://x.az");
  assert.equal(ld["@type"], "JobPosting");
  assert.equal(ld.datePosted, "2026-10-27");
  assert.equal(ld.validThrough, "2026-12-01");
  assert.equal(ld.employmentType, "FULL_TIME");
  assert.equal(ld.hiringOrganization.name, "Sirket Test");
  assert.equal(ld.baseSalary.value.minValue, 1500);
  assert.equal(ld.url, "https://x.az/jobs/j1");
  assert.equal(ld.jobLocationType, undefined);
  const remote = jobPostingJsonLd(publicVacancy("j3", { ...stored, mode: "Uzaqdan" }, "2026-10-27"), "https://x.az");
  assert.equal(remote.jobLocationType, "TELECOMMUTE");
});

test("employment types map to schema.org values", () => {
  assert.equal(employmentTypeFor("Yarımştat"), "PART_TIME");
  assert.equal(employmentTypeFor("Sərbəst"), "CONTRACTOR");
  assert.equal(employmentTypeFor("Təcrübə proqramı"), "INTERN");
  assert.equal(employmentTypeFor("Tam ştat"), "FULL_TIME");
  assert.equal(employmentTypeFor("başqa"), "OTHER");
});

test("structured data cannot close its script tag", () => {
  assert.ok(!jsonLdScript({ description: "</script><script>alert(1)</script>" }).includes("</script>"));
});

test("sitemap lists the home page, the index and every vacancy, escaped", () => {
  const xml = sitemapXml("https://x.az", [{ id: "a&b", created: "2026-10-27T10:00:00Z" }]);
  assert.ok(xml.includes("<loc>https://x.az/</loc>"));
  assert.ok(xml.includes("<loc>https://x.az/jobs</loc>"));
  assert.ok(xml.includes("<loc>https://x.az/jobs/a&amp;b</loc>"));
  assert.ok(xml.includes("<lastmod>2026-10-27</lastmod>"));
});

test("robots.txt hides the API and points to the sitemap", () => {
  const txt = robotsTxt("https://x.az");
  assert.ok(txt.includes("Disallow: /api/"));
  assert.ok(txt.includes("Sitemap: https://x.az/sitemap.xml"));
  assert.equal(siteUrl("https://x.az/"), "https://x.az");
});

test("only files without the site's own scripts are cached at the edge", async () => {
  const { edgeCacheSeconds, cacheable } = await import("../lib/edge-cache.ts");
  assert.equal(edgeCacheSeconds("GET", "/sitemap.xml", ""), 600);
  assert.equal(edgeCacheSeconds("GET", "/robots.txt", ""), 3600);
  // Pages load hashed scripts that a deploy removes: never cached.
  for (const path of ["/", "/jobs", "/jobs/ext-1"]) assert.equal(edgeCacheSeconds("GET", path, ""), 0, path);
  assert.equal(edgeCacheSeconds("GET", "/sitemap.xml", "?x=1"), 0);
  assert.equal(edgeCacheSeconds("POST", "/sitemap.xml", ""), 0);
  assert.equal(edgeCacheSeconds("GET", "/api/joblink/state", ""), 0);
  assert.equal(cacheable(new Response("x", { status: 200 })), true);
  assert.equal(cacheable(new Response("x", { status: 404 })), false);
  assert.equal(cacheable(new Response("x", { status: 200, headers: { "set-cookie": "a=b" } })), false);
});
