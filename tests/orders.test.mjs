import test from "node:test";
import assert from "node:assert/strict";
import { buildOrder, leaveDays, orderNumber, ORDER_KINDS } from "../lib/orders.ts";

const base = {
  number: "2026-M-0001",
  date: "2026-05-04",
  city: "Bakı",
  company: { name: "Sirket Test MMC", voen: "1234567891", director: "Əli Əliyev", directorTitle: "Direktor" },
  employee: { name: "Aysel Məmmədova", position: "Baş mühasib", department: "Maliyyə", startDate: "2026-04-09" },
};

test("leave days count both ends", () => {
  assert.equal(leaveDays("2026-06-01", "2026-06-14"), 14);
  assert.equal(leaveDays("2026-06-14", "2026-06-01"), 0);
});

test("every kind of order names the company, the employee and a signature line; kinds with a start date show it", () => {
  assert.ok(ORDER_KINDS.length >= 20);
  assert.equal(new Set(ORDER_KINDS.map((k) => k.id)).size, ORDER_KINDS.length);
  for (const { id, fields } of ORDER_KINDS) {
    const order = buildOrder({ ...base, kind: id, from: "2026-06-01", to: "2026-06-14", salary: 2800, salaryBefore: 2500, salaryType: "gross", newPosition: "Maliyyə meneceri", basis: "tərəflərin razılığı", place: "Tbilisi", penalty: "Töhmət", newName: "Aysel Əliyeva", result: "Sınaqdan uğurla keçdi", schedule: "həftədə 3 gün" });
    assert.match(order.text, /Sirket Test MMC/, id);
    assert.match(order.text, /Aysel Məmmədova/, id);
    assert.ok(order.signature.includes("Əli Əliyev"), id);
    if (fields.includes("from")) assert.match(order.text, /01\.06\.2026/, id);
    if (fields.includes("to") && id !== "extend") assert.match(order.text, /14\.06\.2026/, id);
    assert.ok(!/undefined|NaN|\[daxil edilməlidir\]/.test(order.text), `${id}: ${order.text}`);
  }
});

test("trips, training, discipline, name changes and bonuses carry their own values", () => {
  const text = (kind, extra) => buildOrder({ ...base, kind, from: "2026-06-01", to: "2026-06-03", ...extra }).text;
  assert.match(text("trip", { place: "Tbilisi", basis: "müştəri ilə görüş" }), /Tbilisi ezam edilsin/);
  assert.match(text("discipline", { penalty: "Ciddi töhmət", basis: "gecikmə" }), /“Ciddi töhmət” intizam tənbehi/);
  assert.match(text("name", { newName: "Aysel Əliyeva" }), /“Aysel Əliyeva”/);
  assert.match(text("bonus", { salary: 500, basis: "layihənin vaxtında bitməsi" }), /500 AZN/);
  assert.match(text("maternity", { basis: "xəstəlik vərəqəsi № 5" }), /hamiləlik və doğuş məzuniyyəti/);
  assert.equal(ORDER_KINDS.find((k) => k.id === "maternity").leaveCode, "maternity");
  assert.equal(ORDER_KINDS.find((k) => k.id === "vacation").leaveCode, "annual");
  assert.equal(ORDER_KINDS.find((k) => k.id === "salary").leaveCode, undefined);
});

test("vacation order states the days and a missing value is shown as such", () => {
  const order = buildOrder({ ...base, kind: "vacation", from: "2026-06-01", to: "2026-06-14" });
  assert.match(order.text, /14 təqvim günü/);
  assert.match(buildOrder({ ...base, kind: "termination" }).text, /\[daxil edilməlidir\]/);
  assert.equal(orderNumber("vacation", "2026-05-04", "ab12cd-ef"), "2026-M-AB12");
});

test("an employee job offer states the post, pay, start date and the deadline", async () => {
  const { buildEmployeeOffer } = await import("../lib/orders.ts");
  const offer = buildEmployeeOffer({
    date: "2026-05-04",
    city: "Bakı",
    company: { name: "Sirket Test MMC", director: "Əli Əliyev" },
    employee: { name: "Aysel Məmmədova", position: "Baş mühasib" },
    position: "Maliyyə meneceri",
    department: "Maliyyə",
    salary: 3200,
    salaryType: "gross",
    startDate: "2026-06-01",
    probationMonths: 0,
    validUntil: "2026-05-20",
  });
  assert.match(offer.subject, /Maliyyə meneceri/);
  assert.match(offer.text, /Hörmətli Aysel Məmmədova/);
  assert.match(offer.text, /3[  ,.]?200/);
  assert.match(offer.text, /01\.06\.2026/);
  assert.match(offer.text, /20\.05\.2026/);
  assert.ok(!/undefined|NaN/.test(offer.text));
});

test("signers: each line shows the title, the name and whether it is approved", () => {
  const order = buildOrder({
    ...{ number: "1", date: "2026-05-04", city: "Bakı", company: { name: "X MMC" }, employee: { name: "Aysel", position: "Mühasib", department: "Maliyyə" } },
    kind: "hire",
    signers: [
      { role: "head", title: "Şöbə rəhbəri", name: "Rəşad Quliyev", approvedAt: "2026-05-05T10:00:00Z" },
      { role: "director", title: "Direktor", name: "Elçin Hüseynov" },
    ],
  });
  const lines = order.signature.split("\n");
  assert.match(lines[0], /Şöbə rəhbəri: Rəşad Quliyev — elektron təsdiq 05\.05\.2026/);
  assert.match(lines[1], /Direktor: Elçin Hüseynov — _+/);
  assert.match(lines[2], /İşçi ilə tanış oldum/);
});
