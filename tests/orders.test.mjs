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

test("every order names the company, the employee, the dates and a signature line", () => {
  for (const { id } of ORDER_KINDS) {
    const order = buildOrder({ ...base, kind: id, from: "2026-06-01", to: "2026-06-14", salary: 2800, salaryBefore: 2500, salaryType: "gross", newPosition: "Maliyyə meneceri", basis: "tərəflərin razılığı" });
    assert.match(order.text, /Sirket Test MMC/);
    assert.match(order.text, /Aysel Məmmədova/);
    assert.match(order.text, /01\.06\.2026/);
    assert.ok(order.signature.includes("Əli Əliyev"));
    assert.ok(!/undefined|NaN/.test(order.text), id);
  }
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
