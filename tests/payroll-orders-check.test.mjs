import test from "node:test";
import assert from "node:assert/strict";
import { checkPayroll } from "../lib/payroll-check.ts";
import { waitingDays, duplicateNumbers, duplicateKey, matchesQuick, effectWaiting } from "../lib/orders-registry.ts";

const res = (o = {}) => ({ gross: 1000, net: 800, toPay: 800, advanceExcess: 0, workedDays: 21, paidLeaveDays: 0, downtimeDays: 0, benefitDays: 0, unpaidDays: 0, normDays: 21, ...o });
const row = (id, o = {}, r = {}) => ({ employeeId: id, name: "İşçi " + id, monthlySalary: 1000, payMethod: "bank", iban: "AZ00", card: "", status: "active", result: res(r), ...o });

test("checkPayroll: errors, warnings and the change since last month", () => {
  const prev = [row("a"), row("b"), row("gone")];
  const cur = [
    row("a", {}, { gross: 1300 }),            // +30% with the same salary
    row("b", { iban: "" }),                    // no bank account
    row("c", { monthlySalary: 0 }),            // no salary
    row("d", {}, { advanceExcess: 50 }),       // advance too high
    row("e", {}, { workedDays: 0, normDays: 21 }),
  ];
  const { findings, totals } = checkPayroll(cur, prev);
  const text = (id) => findings.filter((f) => f.employeeId === id).map((f) => f.level + ":" + f.text);
  assert.ok(text("a").some((t) => t.startsWith("warn:") && t.includes("+30%")));
  assert.ok(text("b").some((t) => t.startsWith("error:") && t.includes("IBAN")));
  assert.ok(text("c").some((t) => t.startsWith("error:") && t.includes("Maaş daxil")));
  assert.ok(text("d").some((t) => t.startsWith("error:") && t.includes("Avans")));
  assert.ok(text("e").some((t) => t.startsWith("warn:")));
  assert.ok(text("gone").some((t) => t.startsWith("info:")));
  assert.equal(findings[0].level, "error", "errors first");
  assert.equal(totals.previousGross, 3000);
});
test("checkPayroll: a cash worker needs no IBAN, no previous month means no comparison", () => {
  const { findings, totals } = checkPayroll([row("x", { payMethod: "cash", iban: "" })], null);
  assert.equal(findings.length, 0);
  assert.equal(totals.change, null);
});
test("waitingDays counts from the last movement and a signed order does not wait", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  const o = { status: "pending", created: "2026-11-10T08:00:00Z", history: [{ at: "2026-11-15T08:00:00Z" }] };
  assert.equal(waitingDays(o, now), 5);
  assert.equal(waitingDays({ ...o, status: "signed" }, now), 0);
});
test("duplicate numbers are per year and the quick filters pick the right orders", () => {
  const list = [{ number: "12", date: "2026-01-02" }, { number: " 12 ", date: "2026-05-02" }, { number: "12", date: "2025-05-02" }, { number: "", date: "2026-01-01" }];
  const dup = duplicateNumbers(list);
  assert.equal(dup.size, 1);
  assert.ok(dup.has(duplicateKey(list[0])));
  assert.ok(!dup.has(duplicateKey(list[2])));
  const o = { id: "1", number: "12", date: "2026-01-02", kind: "transfer", status: "signed", created: "2026-01-02", history: [], effect: { supported: true, status: "scheduled" } };
  assert.ok(effectWaiting(o)); assert.ok(matchesQuick(o, "unapplied", dup)); assert.ok(matchesQuick(o, "duplicate", dup));
  assert.ok(!matchesQuick({ ...o, effect: { supported: true, status: "applied" } }, "unapplied", dup));
});

import { orderDigestText } from "../lib/order-digest-text.ts";
test("orderDigestText: nothing to say means no note", () => {
  assert.equal(orderDigestText({ stale: 0, oldestDays: 0, returned: 0 }), null);
  const t = orderDigestText({ stale: 2, oldestDays: 9, returned: 1 });
  assert.ok(t.body.includes("2 əmr") && t.body.includes("9 gün") && t.body.includes("1 əmr geri"));
});

import { monthsInRange, lockedProblem } from "../lib/attendance-lock.ts";
test("attendance lock: the months a range touches and the refusal text", () => {
  assert.deepEqual(monthsInRange("2026-11-28", "2027-01-02"), ["2026-11", "2026-12", "2027-01"]);
  assert.deepEqual(monthsInRange("2026-05-10", "2026-05-12"), ["2026-05"]);
  assert.deepEqual(monthsInRange("bad", "2026-05-12"), []);
  assert.equal(lockedProblem(["2026-10"], "2026-11-01", "2026-11-05"), "");
  assert.ok(lockedProblem(["2026-11"], "2026-10-30", "2026-11-02").includes("noyabr 2026"));
});

import { weightedScore, ratingOf, sanitizeScores, sanitizeCriteria, DEFAULT_CRITERIA } from "../lib/interview-scorecard.ts";
import { sourceFunnel } from "../lib/hiring-sources.ts";
test("scorecard: weighted mean over scored criteria, rating is a whole 1-5", () => {
  const c = [{ id: "a", label: "A", weight: 3 }, { id: "b", label: "B", weight: 1 }, { id: "c", label: "C", weight: 2 }];
  assert.equal(weightedScore(c, { a: 5, b: 1 }), 4); // (15+1)/4
  assert.equal(weightedScore(c, { a: 4, b: 4, c: 1 }), 3.0); // (12+4+2)/6
  assert.equal(weightedScore(c, {}), null);
  assert.equal(ratingOf(3.5), 4); assert.equal(ratingOf(null), null);
  assert.deepEqual(sanitizeScores(c, { a: 5, b: 9, c: "2", z: 3, x: 1.5 }), { a: 5, c: 2 });
});
test("scorecard: criteria are cleaned and bounded", () => {
  const ok = sanitizeCriteria([{ label: "  Ünsiyyət ", weight: 9 }, { label: "Bilik", weight: 0 }, { label: "" }]);
  assert.deepEqual(ok.map((x) => [x.label, x.weight]), [["Ünsiyyət", 5], ["Bilik", 1]]);
  assert.ok("error" in sanitizeCriteria([{ label: "Eyni" }, { label: "eyni" }]));
  assert.ok("error" in sanitizeCriteria(Array.from({ length: 13 }, (_, i) => ({ label: "K" + i }))));
  assert.ok(DEFAULT_CRITERIA.length >= 3);
});
test("sourceFunnel counts how far each source gets", () => {
  const rows = sourceFunnel([
    { id: "1", source: "platform", reached: ["Göndərildi", "Müsahibə", "İşə qəbul edildi"] },
    { id: "2", source: "platform", reached: ["Göndərildi"] },
    { id: "3", source: "invite", reached: ["Göndərildi", "Müsahibə", "Təklif edildi"] },
    { id: "4", source: "", reached: [] },
  ]);
  const platform = rows.find((r) => r.source === "platform");
  assert.equal(platform.applied, 3); assert.equal(platform.hired, 1); assert.equal(platform.hireRate, 33.3);
  assert.equal(rows.find((r) => r.source === "invite").offer, 1);
});

import { buildAtsReport, reachedSteps } from "../lib/ats-analytics.ts";
test("ATS analytics: funnel, time to hire, rejections and stale candidates", () => {
  const ev = (to, at, type = "status") => ({ type, from: "", to, created: at });
  const apps = [
    { id: "a", jobId: "j1", candidate: "A", source: "platform", status: "İşə qəbul edildi", stage: "", created: "2026-10-01T00:00:00Z", updated: "2026-10-21T00:00:00Z", events: [ev("Baxışda", "2026-10-03T00:00:00Z"), ev("Müsahibə", "2026-10-10T00:00:00Z"), ev("Təklif edildi", "2026-10-15T00:00:00Z"), ev("İşə qəbul edildi", "2026-10-21T00:00:00Z")] },
    { id: "b", jobId: "j1", candidate: "B", source: "invite", status: "Uyğun deyil", stage: "", created: "2026-10-02T00:00:00Z", updated: "2026-10-05T00:00:00Z", events: [ev("Baxışda", "2026-10-03T00:00:00Z"), ev("Uyğun deyil", "2026-10-05T00:00:00Z"), ev("Bacarıqlar vakansiyanın tələbinə uyğun deyil", "2026-10-05T00:00:00Z", "rejection")] },
    { id: "c", jobId: "j1", candidate: "C", source: "", status: "Baxışda", stage: "Test", created: "2026-10-05T00:00:00Z", updated: "2026-10-06T00:00:00Z", events: [] },
    { id: "d", jobId: "j2", candidate: "D", source: "platform", status: "Göndərildi", stage: "", created: "2026-11-10T00:00:00Z", updated: "", events: [] },
  ];
  const r = buildAtsReport(apps, [{ id: "j1", title: "Mühasib", status: "published", created: "2026-09-25T00:00:00Z" }, { id: "j2", title: "Satış", status: "published", created: "2026-11-01T00:00:00Z" }], Date.parse("2026-11-12T00:00:00Z"), 7);
  assert.deepEqual(r.funnel.map((f) => f.count), [4, 3, 1, 1, 1]); // c is "Baxışda" by status alone: counted as reviewed
  assert.equal(r.funnel[1].fromPrevious, 75);
  assert.equal(r.timeToHire.hired, 1); assert.equal(r.timeToHire.medianDays, 20);
  assert.equal(r.rejected, 1); assert.equal(r.rejections[0].count, 1);
  assert.deepEqual(r.stale.map((s) => s.applicationId), ["c"]); // d is only 2 days old
  assert.equal(r.jobs[0].hired, 1);
  assert.deepEqual(reachedSteps({ status: "Təklif edildi", events: [] }), ["Göndərildi", "Baxışda", "Müsahibə", "Təklif edildi"]);
  assert.equal(r.timeInStep[0].medianDays, 1.5); // "Göndərildi" lasted 2 days for a and 1 day for b
});

import { atsDigestText } from "../lib/ats-digest-text.ts";
test("atsDigestText: silent when nobody waits", () => {
  assert.equal(atsDigestText({ stale: 0, oldestDays: 0, unanswered: 0 }), null);
  const t = atsDigestText({ stale: 4, oldestDays: 12, unanswered: 2 });
  assert.ok(t.body.includes("4 namizəd") && t.body.includes("12 gün") && t.body.includes("2 nəfərin"));
});

import { compareInterviews } from "../lib/interview-compare.ts";
test("interview comparison carries the average of each scored criterion", () => {
  const row = (scores, rating) => ({ application_id: "a", job_id: "j", job_title: "J", candidate: "C", application_status: "Müsahibə", scheduled_at: "2026-11-01T10:00:00Z", status: "completed", rating, feedback: "", decision: "advance", scores: JSON.stringify(scores) });
  const out = compareInterviews([row({ x: 5, y: 3 }, 4), row({ x: 3 }, 3)], [{ id: "x", label: "Bilik" }, { id: "y", label: "Ünsiyyət" }, { id: "z", label: "Boş" }]);
  const c = out[0].candidates[0];
  assert.deepEqual(c.criteria.map((k) => [k.label, k.average, k.count]), [["Bilik", 4, 2], ["Ünsiyyət", 3, 1]]);
});

import { findDuplicates } from "../lib/duplicates.ts";
test("duplicates: a candidate turned down for another vacancy is flagged", () => {
  const d = findDuplicates([
    { id: "1", candidateId: "c", jobId: "j1", name: "A", email: "a@x.az", phone: "", status: "Uyğun deyil" },
    { id: "2", candidateId: "c", jobId: "j2", name: "A", email: "a@x.az", phone: "", status: "Göndərildi" },
    { id: "3", candidateId: "d", jobId: "j2", name: "B", email: "b@x.az", phone: "", status: "Göndərildi" },
  ]);
  assert.equal(d["2"].previouslyRejected, 1);
  assert.equal(d["1"].previouslyRejected, 0);
  assert.equal(d["3"], undefined);
});
