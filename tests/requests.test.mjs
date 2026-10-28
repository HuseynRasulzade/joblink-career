import test from "node:test";
import assert from "node:assert/strict";
import { REQUEST_KINDS, requestProblems, requestWarnings, orderPrefill, isRequestKind, requestKindLabel } from "../lib/requests.ts";
import { ORDER_KINDS, UNPAID_REASONS, buildOrder, unpaidReason } from "../lib/orders.ts";
import { ATTENDANCE_CODES } from "../lib/calendar-az.ts";

const employee = { name: "Aysel Məmmədova", position: "Mühasib", department: "Maliyyə" };
const base = { number: "1", date: "2026-03-01", city: "Bakı", company: { name: "Test MMC", director: "Elnur Əliyev" }, employee };

test("every request kind is an order kind and has its own hint", () => {
  for (const k of REQUEST_KINDS) {
    assert.ok(ORDER_KINDS.some((o) => o.id === k.id), k.id);
    assert.ok(k.hint.length > 10 && k.label.endsWith("ərizəsi"));
  }
  assert.equal(isRequestKind("hire"), false);
  assert.equal(requestKindLabel("donor"), "Donor günü ərizəsi");
});

test("new order kinds build a complete text with their legal basis", () => {
  const cases = {
    addleave: { from: "2026-03-02", to: "2026-03-07", basis: "staj 4 gün (116)" },
    creative: { from: "2026-03-02", to: "2026-04-30", basis: "elmi şuranın arayışı" },
    postpone: { from: "2026-09-01", to: "2026-09-14", basis: "ezamiyyət" },
    extendleave: { from: "2026-03-02", to: "2026-03-09", basis: "xəstəlik vərəqəsi" },
    compensation: { quantity: 12, basis: "xitam əmri" },
    donor: { from: "2026-03-02", to: "2026-03-02" },
    medical: { from: "2026-03-02", to: "2026-03-02" },
    summons: { from: "2026-03-02", to: "2026-03-02", place: "Bakı İnzibati Məhkəməsi" },
    military: { from: "2026-03-02", to: "2026-03-09" },
    downtime: { from: "2026-03-02", to: "2026-03-04", basis: "elektrik kəsilməsi" },
    remote: { from: "2026-03-02", to: "" },
    restday: { from: "2026-03-07", quantity: 6, basis: "qəza" },
    overtime: { from: "2026-03-02", to: "2026-03-03", quantity: 3, basis: "hesabat" },
  };
  for (const [kind, extra] of Object.entries(cases)) {
    const text = buildOrder({ ...base, kind, ...extra }).text;
    assert.ok(text.includes("Aysel Məmmədova"), kind);
    assert.ok(/Əmək Məcəlləsi|maddə/.test(text), `${kind} cites the code`);
    assert.ok(!/undefined|NaN/.test(text), `${kind} has no broken value`);
  }
  assert.match(buildOrder({ ...base, kind: "overtime", from: "2026-03-02", quantity: 3, basis: "x" }).text, /3 saat/);
  assert.match(buildOrder({ ...base, kind: "compensation", quantity: 12, basis: "x" }).text, /12 təqvim günü/);
});

test("leave orders carry an attendance code that exists", () => {
  const codes = new Set(ATTENDANCE_CODES.map((c) => c.id));
  for (const kind of ORDER_KINDS) if (kind.leaveCode) assert.ok(codes.has(kind.leaveCode), `${kind.id} -> ${kind.leaveCode}`);
  assert.ok(ORDER_KINDS.length >= 35);
  assert.equal(new Set(ORDER_KINDS.map((k) => k.id)).size, ORDER_KINDS.length);
  for (const kind of ORDER_KINDS) assert.ok(kind.id.length <= 20, `${kind.id} is short enough for the table`);
});

test("unpaid leave reasons follow article 130", () => {
  assert.equal(unpaidReason("family").maxDays, 7);
  assert.equal(unpaidReason(UNPAID_REASONS[0].label).id, "family");
  assert.equal(unpaidReason("child-under-16").maxDays, 14);
  assert.equal(unpaidReason("nothing"), undefined);
  const order = buildOrder({ ...base, kind: "unpaid", from: "2026-03-02", to: "2026-03-08", vacationKind: UNPAID_REASONS[0].label });
  assert.match(order.text, /130-i/);
});

test("an application must hold what its order needs", () => {
  assert.deepEqual(requestProblems("vacation", { from: "2026-07-01", to: "2026-07-14" }), []);
  assert.ok(requestProblems("vacation", { from: "2026-07-01" }).length >= 1);
  assert.ok(requestProblems("vacation", { from: "2026-07-14", to: "2026-07-01" }).length >= 1);
  assert.ok(requestProblems("compensation", { quantity: 0 }).length >= 1);
  assert.deepEqual(requestProblems("compensation", { quantity: 5 }), []);
  assert.ok(requestProblems("bogus", {}).length === 1);
  assert.ok(requestProblems("unpaid", { from: "2026-03-02", to: "2026-03-03" }).length >= 1);
});

test("warnings: 5 days before leave, one month for resignation, unpaid limits", () => {
  assert.ok(requestWarnings("vacation", { from: "2026-03-03" }, "2026-03-01").some((w) => /5 gün/.test(w)));
  assert.equal(requestWarnings("vacation", { from: "2026-03-10" }, "2026-03-01").length, 0);
  assert.ok(requestWarnings("termination", { from: "2026-03-10" }, "2026-03-01").some((w) => /10\.04|01\.04/.test(w) || /bir təqvim ay/.test(w)));
  assert.equal(requestWarnings("termination", { from: "2026-04-01" }, "2026-03-01").length, 0);
  const family = UNPAID_REASONS[0].label;
  assert.ok(requestWarnings("unpaid", { from: "2026-03-02", to: "2026-03-20", basis: family }, "2026-03-01").some((w) => /ən çox 7/.test(w)));
  assert.equal(requestWarnings("unpaid", { from: "2026-03-02", to: "2026-03-05", basis: family }, "2026-03-01").length, 0);
  assert.ok(requestWarnings("compensation", { quantity: 3 }, "2026-03-01").some((w) => /144/.test(w)));
});

test("the order form is filled from the application, with the application as its basis", () => {
  const p = orderPrefill("vacation", { from: "2026-07-01", to: "2026-07-14", reason: "ailə səbəbi" }, "2026-06-10");
  assert.equal(p.kind, "vacation");
  assert.equal(p.from, "2026-07-01");
  assert.match(p.basis, /10\.06\.2026 tarixli ərizəsi: ailə səbəbi/);
  const u = orderPrefill("unpaid", { from: "2026-03-02", to: "2026-03-05", basis: UNPAID_REASONS[0].label }, "2026-03-01");
  assert.equal(u.vacationKind, UNPAID_REASONS[0].label);
  assert.equal(orderPrefill("compensation", { quantity: 12 }, "2026-03-01").quantity, "12");
});

import { OTHER_REQUEST, isApplicationKind } from "../lib/requests.ts";
test("a free-text application needs only its text and is not an order kind", () => {
  assert.equal(isApplicationKind("other"), true);
  assert.equal(isApplicationKind("vacation"), true);
  assert.equal(isApplicationKind("hire"), false);
  assert.equal(isRequestKind("other"), false);
  assert.equal(requestKindLabel("other"), OTHER_REQUEST.label);
  assert.ok(requestProblems("other", { reason: "" }).length === 1);
  assert.deepEqual(requestProblems("other", { reason: "Maaş arayışı lazımdır" }), []);
});
