import test from "node:test";
import assert from "node:assert/strict";
import { greeting, nextOccurrence, upcomingCelebrations } from "../lib/celebrations.ts";

test("a day that has passed this year comes next year, and 29 February falls on the 28th without a leap year", () => {
  assert.equal(nextOccurrence("03-10", "2026-11-03"), "2027-03-10");
  assert.equal(nextOccurrence("11-05", "2026-11-03"), "2026-11-05");
  assert.equal(nextOccurrence("11-03", "2026-11-03"), "2026-11-03");
  assert.equal(nextOccurrence("02-29", "2026-11-03"), "2027-02-28");
  assert.equal(nextOccurrence("02-29", "2027-11-03"), "2028-02-29");
});

test("birthdays and anniversaries within the window are listed in order, with the years", () => {
  const people = [
    { id: "a", name: "Aysel", birthDate: "1990-11-10", startDate: "2020-11-05" },
    { id: "b", name: "Bəxtiyar", birthDate: "1985-12-31", startDate: "2026-11-04" },
    { id: "c", name: "Cavid", birthDate: "", startDate: "2025-11-03" },
    { id: "d", name: "Dilarə", birthDate: "1992-12-25", startDate: "" },
  ];
  const list = upcomingCelebrations(people, "2026-11-03", 14);
  assert.deepEqual(list.map((c) => [c.name, c.kind, c.days, c.years]), [["Cavid", "anniversary", 0, 1], ["Aysel", "anniversary", 2, 6], ["Aysel", "birthday", 7, 0]]);
});

test("the greeting names the years of an anniversary", () => {
  assert.match(greeting({ kind: "anniversary", years: 5 }).title, /5 ildir/);
  assert.match(greeting({ kind: "birthday", years: 0 }).title, /Ad gününüz/);
});
