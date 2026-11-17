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
