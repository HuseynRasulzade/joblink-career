// What KIND of work a person does inside a field: bookkeeping is not reporting, and reporting comes after the books.
import test from "node:test";
import assert from "node:assert/strict";
import { blankProfile, match } from "../lib/model.ts";
import { functionFit, functionRelation, functionStrength } from "../lib/role-function.ts";

const role = (title, text = "", extra = {}) => ({ title, text, end: "", current: true, ...extra });
const vac = (title, text) => ({ title, category: "Maliyyə, bankçılıq və sığorta", text });

test("the functions are recognised in Azerbaijani, English and Russian", () => {
  assert.ok(functionStrength("Mühasibat uçotunun aparılması, ilkin sənədlərin işlənməsi").get("bookkeeping") >= 2);
  assert.ok(functionStrength("Maliyyə hesabatlarının hazırlanması, IFRS konsolidasiya").get("reporting") >= 2);
  assert.ok(functionStrength("Prepared financial statements under IFRS").get("reporting") >= 2);
  assert.ok(functionStrength("Ведение бухгалтерского учета, первичные документы").get("bookkeeping") >= 2);
  assert.ok(functionStrength("ƏDV və gəlir vergisi bəyannamələrinin hazırlanması").get("tax") >= 2);
  assert.ok(functionStrength("Daxili audit və daxili nəzarət").get("audit") >= 2);
});

test("keeping the books and preparing the reports are neighbours, not the same work", () => {
  assert.equal(functionRelation("reporting", "reporting"), 1);
  const a = functionRelation("bookkeeping", "reporting");
  const b = functionRelation("reporting", "bookkeeping");
  assert.ok(a > 0 && a < 0.7 && b > 0 && b < 0.7);
  assert.equal(functionRelation("bookkeeping", "backend"), 0, "another field brings nothing");
});

test("a bookkeeper for a reporting vacancy covers only part of it", () => {
  const reporting = vac("Maliyyə hesabatı üzrə mütəxəssis", "Maliyyə hesabatlarının hazırlanması, IFRS üzrə konsolidasiya, balans və mənfəət və zərər hesabatı.");
  const bookkeeper = [role("Mühasib", "Mühasibat uçotunun aparılması, ilkin sənədlərin işlənməsi, debitor və kreditor uçotu, jurnal yazılışları.")];
  const reporter = [role("Maliyyə hesabatı üzrə mütəxəssis", "Maliyyə hesabatlarının hazırlanması, IFRS, konsolidasiya, balans.")];
  const fitBook = functionFit(reporting, bookkeeper);
  const fitRep = functionFit(reporting, reporter);
  assert.ok(fitRep.score >= 0.85, `reporter covers it: ${fitRep.score}`);
  assert.ok(fitBook.score > 0.2 && fitBook.score < 0.65, `bookkeeper covers part: ${fitBook.score}`);
  assert.equal(fitBook.gap.id, "reporting");
  assert.equal(fitBook.gap.best.id, "bookkeeping");
  assert.equal(fitRep.gap, null);
});

test("a reporting specialist for a bookkeeping vacancy is not the same either", () => {
  const books = vac("Mühasib", "Mühasibat uçotunun aparılması, ilkin sənədlər, debitor və kreditor uçotu.");
  const reporter = [role("Maliyyə hesabatı üzrə mütəxəssis", "Maliyyə hesabatlarının hazırlanması, IFRS, konsolidasiya.")];
  const bookkeeper = [role("Mühasib", "Mühasibat uçotunun aparılması, ilkin sənədlər, debitor və kreditor uçotu.")];
  assert.ok(functionFit(books, bookkeeper).score > functionFit(books, reporter).score + 0.3);
});

test("a person who has done both covers both", () => {
  const both = vac("Baş mühasib", "Mühasibat uçotunun aparılması və maliyyə hesabatlarının hazırlanması.");
  const person = [role("Baş mühasib", "Mühasibat uçotu, ilkin sənədlər və maliyyə hesabatlarının hazırlanması, IFRS.")];
  assert.ok(functionFit(both, person).score >= 0.85);
});

test("a vacancy that names no known function has nothing to compare", () => {
  assert.equal(functionFit({ title: "Müdir", text: "Ofis işlərinin təşkili." }, [role("Müdir", "")]), null);
});

test("older work counts a little less than recent work", () => {
  const reporting = vac("Maliyyə hesabatı üzrə mütəxəssis", "Maliyyə hesabatlarının hazırlanması, IFRS, konsolidasiya.");
  const text = "Maliyyə hesabatlarının hazırlanması, IFRS, konsolidasiya, balans.";
  const now = new Date("2026-11-14");
  const recent = functionFit(reporting, [role("Hesabat üzrə mütəxəssis", text, { current: false, end: "2025-06" })], now).score;
  const old = functionFit(reporting, [role("Hesabat üzrə mütəxəssis", text, { current: false, end: "2012-06" })], now).score;
  assert.ok(recent >= old);
});

// ---- through match(): the recruiter's score and the reasons shown ----
const experience = (title, description, start = "2019-01", end = "", current = true) => ({ id: title + start, title, company: "Test MMC", employmentType: "", start, end, current, description });
const profile = (experiences) => ({ ...blankProfile, city: "Bakı", mode: "Ofisdə", title: experiences[0].title, experiences });
const reportingJob = {
  id: "job", owner: "c", title: "Maliyyə hesabatı üzrə mütəxəssis", company: "Test", city: "Bakı", mode: "Ofisdə", type: "Tam ştat",
  category: "Maliyyə, bankçılıq və sığorta", minSalary: 0, maxSalary: 0, minYears: 3, maxYears: 6, skills: [],
  description: "Maliyyə hesabatlarının hazırlanması, IFRS üzrə konsolidasiya, balans və mənfəət və zərər hesabatı.",
  requirements: "IFRS biliyi, maliyyə hesabatlarının hazırlanması təcrübəsi.", created: "2026-10-01", demo: false, status: "published",
};
test("in the score, the bookkeeper stays clearly below the person who prepared reports, with a reason", () => {
  const bookkeeper = match(profile([experience("Mühasib", "Mühasibat uçotunun aparılması, ilkin sənədlərin işlənməsi, debitor və kreditor uçotu, jurnal yazılışları, kassa əməliyyatları.", "2019-01")]), reportingJob);
  const reporter = match(profile([experience("Maliyyə hesabatı üzrə mütəxəssis", "Maliyyə hesabatlarının hazırlanması, IFRS üzrə konsolidasiya, balans və mənfəət və zərər hesabatı.", "2019-01")]), reportingJob);
  assert.ok(reporter.score >= bookkeeper.score + 15, `${reporter.score} vs ${bookkeeper.score}`);
  assert.ok(bookkeeper.caps.includes("function-mismatch"));
  assert.ok(bookkeeper.score <= 74);
  assert.ok(bookkeeper.fit.risks.some((r) => r.includes("hesabatlarının hazırlanması") && r.includes("mühasibat uçotu")));
  assert.ok(!reporter.caps.includes("function-mismatch"));
  assert.ok(bookkeeper.fit.parts.some((p) => p.key === "function"));
});

test("a passing mention of an API or SQL does not turn a business analyst vacancy into a developer vacancy", () => {
  const analyst = { title: "Biznes Analitik / Business Analyst (Internet Banking)", category: "İT", text: "Biznes tələblərin toplanması. API sənədləşməsi, SQL sorğuları, database strukturunun anlanması. İstifadəçi hekayələri və prosesin modelləşdirilməsi." };
  const fit = functionFit(analyst, [role("Maliyyə analitiki", "Mühasibat uçotu, maliyyə hesabatlarının hazırlanması.")]);
  assert.ok(fit === null || fit.wanted.every((w) => w.id !== "backend"), JSON.stringify(fit?.wanted));
});
test("a developer vacancy is still recognised by its title", () => {
  const dev = { title: "Backend Developer", category: "İT", text: "Node.js, REST API, SQL." };
  const fit = functionFit(dev, [role("Mühasib", "Mühasibat uçotu.")]);
  assert.equal(fit.wanted[0].id, "backend");
  assert.equal(fit.gap.id, "backend");
});

test("a bookkeeper is not a business analyst: requirements work is another kind of work", () => {
  const analyst = { id: "j", owner: "c", company: "T", city: "Bakı", mode: "Ofisdə", type: "Tam ştat", title: "Biznes Analitik / Business Analyst", category: "Maliyyə, bankçılıq və sığorta", minYears: 2, maxYears: 0, minSalary: 0, maxSalary: 0, skills: ["Microsoft Excel", "Maliyyə analizi"], status: "published",
    requirements: "İnternet banking üzrə biznes tələblərinin toplanması və analizi, servis və API analizi, request/response, tələblərin yazılması, test case-lərin hazırlanması.", description: "Tələblərin koordinasiyası, texniki tapşırıq, UAT." };
  const bookkeeper = { ...blankProfile, city: "Bakı", title: "Mühasib operator", skills: ["Microsoft Excel", "Maliyyə hesabatlılığı"],
    experiences: [{ id: "1", title: "Mühasib operator", company: "X", start: "2024-06", end: "", current: true, description: "Sənədlərin yoxlanması, kontragent üzləşmələri, 1C-ə daxil etmələr, ƏDV/e-qaimə nəzarəti, debitor-kreditor uçotu." }] };
  const r = match(bookkeeper, analyst);
  assert.ok(r.score <= 40, `unrelated function stays low: ${r.score}`);
  assert.equal(r.functionFit.gap.id, "business_analysis");
  const real = { ...bookkeeper, title: "Biznes analitik",
    experiences: [{ id: "1", title: "Biznes analitik", company: "Bank", start: "2021-01", end: "", current: true, description: "İnternet banking üçün biznes tələblərinin toplanması, texniki tapşırıq yazılması, API analizi, test case hazırlanması, UAT." }] };
  assert.ok(match(real, analyst).score > r.score + 20, "a real business analyst scores clearly higher");
});
