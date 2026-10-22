// Platform service agreement generated for a package.
import test from "node:test";
import assert from "node:assert/strict";
import { buildServiceContract, contractNumber } from "../lib/contracts.ts";
import { planById } from "../lib/plans.ts";

const operator = { name: "Joblink MMC", voen: "1234567891", address: "Bakı, Nizami küç. 1", email: "info@joblink.az" };
const base = {
  id: "6f1d2c3b-aaaa-bbbb-cccc-111122223333",
  date: "2026-11-10",
  plan: planById("plus-7"),
  operator,
  autoRenew: true,
  periodStart: "2026-11-10",
  periodEnd: "2026-12-10",
};
const person = { kind: "candidate", name: "Aysel Məmmədova", email: "aysel@example.com" };
const firm = { kind: "company", name: "ABC MMC", email: "hr@abc.az", voen: "9876543211", representative: "Əli Əliyev", address: "Bakı" };

test("number and header", () => {
  assert.equal(contractNumber(base.id, base.date), "JL-20261110-6F1D2C");
  const c = buildServiceContract({ ...base, party: person });
  assert.equal(c.number, "JL-20261110-6F1D2C");
  assert.match(c.title, /Plus 7/);
  assert.match(c.text, /№ JL-20261110-6F1D2C/);
  assert.match(c.text, /10\.11\.2026/);
});

test("the package, price, limits and period are written into the agreement", () => {
  const text = buildServiceContract({ ...base, party: person }).text;
  assert.match(text, /“Plus 7”/);
  assert.match(text, /7 AZN \/ 30 gün/);
  assert.match(text, /10\.11\.2026 – 10\.12\.2026/);
  assert.match(text, /AI vasitəsilə müraciət — 5 şirkət, AI CV analizi — 5, ATS təklifləri ilə CV düzəlişi — 5/);
  assert.match(text, /paketsiz\) profil rejiminə/);
});

test("auto-renewal and manual renewal read differently", () => {
  const on = buildServiceContract({ ...base, party: person, autoRenew: true }).text;
  const off = buildServiceContract({ ...base, party: person, autoRenew: false }).text;
  assert.match(on, /avtomatik ödənişi seçib/);
  assert.match(off, /avtomatik ödənişi seçməyib/);
  assert.doesNotMatch(off, /avtomatik ödənişi seçib/);
});

test("a company agreement names the company, its VÖEN and the employer duties", () => {
  const text = buildServiceContract({ ...base, party: firm }).text;
  assert.match(text, /ABC MMC \(VÖEN: 9876543211\)/);
  assert.match(text, /Əli Əliyev simasında/);
  assert.match(text, /işçilərin ad, soyad/);
  assert.match(text, /ayrı-seçkilik/);
  assert.doesNotMatch(text, /İstehlakçıların/);
});

test("a person's agreement refers to consumer protection, not employer duties", () => {
  const text = buildServiceContract({ ...base, party: person }).text;
  assert.match(text, /fiziki şəxs/);
  assert.match(text, /İstehlakçıların hüquqlarının müdafiəsi/);
  assert.doesNotMatch(text, /ayrı-seçkilik/);
});

test("missing operator details are marked, not invented", () => {
  const text = buildServiceContract({ ...base, party: person, operator: { name: "", voen: "", address: "", email: "" } }).text;
  assert.match(text, /\[daxil edilməlidir\]/);
  assert.doesNotMatch(text, /Joblink MMC/);
});

test("sections are numbered one to ten and no clause is left empty", () => {
  const c = buildServiceContract({ ...base, party: person });
  assert.deepEqual(c.sections.map((s) => s.heading.split(".")[0]), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  assert.ok(c.sections.every((s) => s.paragraphs.length > 0 && s.paragraphs.every((p) => p.trim().length > 10)));
});
