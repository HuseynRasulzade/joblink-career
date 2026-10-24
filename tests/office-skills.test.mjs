// "Microsoft Office" evidences Word, Excel, PowerPoint and Outlook only partly.
import test from "node:test";
import assert from "node:assert/strict";
import { blankProfile, match } from "../lib/model.ts";

const job = (skills) => ({
  id: "job",
  owner: "company",
  title: "Ofis meneceri",
  company: "Test MMC",
  city: "Bakı",
  mode: "Ofisdə",
  category: "İnzibati",
  skills,
  minYears: 0,
  maxYears: 10,
  minSalary: 0,
  maxSalary: 0,
  description: "",
  requirements: "",
  employmentType: "Tam ştat",
  status: "published",
});
const person = (overrides = {}) => ({
  ...blankProfile,
  city: "Bakı",
  mode: "Ofisdə",
  title: "Ofis meneceri",
  ...overrides,
});
const level = (profile, skill) =>
  match(profile, job([skill])).skillEvidence[0].level;

test("Microsoft Office in the skills implies its programs at partial weight", () => {
  const p = person({ skills: ["Microsoft Office"] });
  assert.equal(level(p, "Microsoft Excel"), "implied");
  assert.equal(level(p, "Microsoft Word"), "implied");
  assert.equal(level(p, "Microsoft PowerPoint"), "implied");
  assert.equal(level(p, "Microsoft Outlook"), "implied");
});

test("an implied program scores below a declared one and above none", () => {
  const office = match(
    person({ skills: ["Microsoft Office"] }),
    job(["Microsoft Excel"]),
  ).score;
  const named = match(
    person({ skills: ["Microsoft Excel"] }),
    job(["Microsoft Excel"]),
  ).score;
  const none = match(
    person({ skills: ["Vergi uçotu"] }),
    job(["Microsoft Excel"]),
  ).score;
  assert.ok(none < office && office < named, `${none} < ${office} < ${named}`);
});

test("Office only implies office programs and never overrides stronger evidence", () => {
  const p = person({ skills: ["Microsoft Office", "Microsoft Excel"] });
  assert.equal(level(p, "Microsoft Excel"), "declared");
  assert.equal(level(person({ skills: ["Microsoft Office"] }), "1C"), "none");
  assert.equal(level(person({ skills: ["Satış"] }), "Microsoft Excel"), "none");
});

test("a job title such as front office does not count as Microsoft Office", () => {
  const p = person({
    skills: [],
    summary: "Front office əməkdaşı, qəbulxana işi.",
  });
  assert.equal(level(p, "Microsoft Word"), "none");
});
