import test from "node:test";
import assert from "node:assert/strict";
import { similarJobs } from "../lib/similar-jobs.ts";

const j = (id, title, category, city, skills, extra = {}) => ({ id, title, category, city, skills, ...extra });
const current = j("c", "Baş mühasib", "Maliyyə", "Bakı", ["Excel", "1C"]);

test("similar vacancies rank by field, title words, skills and city", () => {
  const out = similarJobs(
    current,
    [
      current,
      j("a", "Mühasib köməkçisi", "Maliyyə", "Bakı", ["Excel"]),
      j("b", "Baş mühasib", "Maliyyə", "Gəncə", ["1C", "Excel"]),
      j("c2", "Proqramçı", "İT", "Bakı", ["Python"]),
      j("d", "Satış meneceri", "Satış", "Bakı", ["Excel"]),
      j("e", "Mühasib", "Maliyyə", "Bakı", [], { status: "archived" }),
      j("f", "Maliyyə analitiki", "Maliyyə", "Bakı", [], { deadline: "2020-01-01" }),
    ],
    4,
    "2026-10-23",
  );
  assert.deepEqual(out.map((x) => x.id), ["b", "a"]);
  assert.equal(out.some((x) => x.id === "c"), false);
});

test("nothing similar gives an empty list", () => {
  assert.deepEqual(similarJobs(current, [j("x", "Aşpaz", "Xidmət", "Gəncə", [])], 4, "2026-10-23"), []);
});
