// Labelled CV-to-vacancy benchmark. Each case states the band a recruiter
// would expect; any change to `match()` weights must keep every case inside
// its band. Profiles are synthetic.
import test from "node:test";
import assert from "node:assert/strict";
import { autoApplyEligible, blankProfile, match } from "../lib/model.ts";

const exp = (title, start, end, description = "", current = false) => ({
  id: `${title}-${start}`,
  title,
  company: "Test MMC",
  employmentType: "",
  start,
  end,
  current,
  description,
});
const profile = (overrides) => ({ ...blankProfile, city: "Bakı", mode: "Ofisdə", ...overrides });
const vacancy = (overrides) => ({
  id: "job",
  owner: "company",
  title: "Mühasib",
  company: "Test",
  city: "Bakı",
  mode: "Ofisdə",
  type: "Tam ştat",
  category: "Maliyyə, bankçılıq və sığorta",
  minSalary: 0,
  maxSalary: 0,
  minYears: 0,
  maxYears: 0,
  skills: [],
  description: "",
  requirements: "",
  created: "2026-10-01",
  demo: false,
  status: "published",
  ...overrides,
});

const chiefAccountant = vacancy({
  title: "Baş mühasib",
  minYears: 5,
  maxYears: 8,
  skills: ["Maliyyə hesabatlılığı", "1C mühasibatlıq", "Vergi hesabatları", "Microsoft Excel"],
});
const reactDeveloper = vacancy({
  title: "Frontend Developer",
  category: "İT və məlumat analitikası",
  minYears: 2,
  maxYears: 5,
  skills: ["JavaScript", "React", "HTML / CSS"],
});
const salesManager = vacancy({
  title: "Satış meneceri",
  category: "Satış və müştəri xidməti",
  minYears: 3,
  maxYears: 6,
  skills: ["Satış", "Müştəri xidməti", "Danışıqların aparılması"],
});
const juniorAccountant = vacancy({
  title: "Mühasib köməkçisi",
  minYears: 0,
  maxYears: 2,
  skills: ["Microsoft Excel", "1C mühasibatlıq"],
});

const seasonedAccountant = profile({
  title: "Baş mühasib",
  skills: ["Maliyyə hesabatlılığı", "1C mühasibatlıq", "Vergi hesabatları", "Microsoft Excel"],
  experiences: [
    exp("Mühasib", "2016-01", "2019-12", "1C proqramında ilkin sənədlərin uçotu, e-qaimələr"),
    exp("Baş mühasib", "2020-01", "", "Aylıq vergi hesabatları və maliyyə hesabatlarının hazırlanması, Excel modelləri", true),
  ],
});

const cases = [
  {
    name: "experienced chief accountant fits a chief accountant vacancy",
    profile: seasonedAccountant,
    job: chiefAccountant,
    band: [85, 100],
    autoApply: true,
  },
  {
    name: "courier who only wants to learn accounting does not fit",
    profile: profile({
      title: "Kuryer",
      cvText:
        "Excel bilirəm. Vergi hesabatları haqqında oxumuşam. 1C mühasibatlıq kursuna yazılmaq istəyirəm. Maliyyə hesabatlılığı maraqlıdır.",
      experiences: [exp("Kuryer", "2018-01", "2025-01", "Sifarişlərin vaxtında çatdırılması")],
    }),
    job: chiefAccountant,
    band: [0, 25],
    autoApply: false,
  },
  {
    name: "ten years in sales do not qualify for accounting",
    profile: profile({
      title: "Satış meneceri",
      skills: ["Satış", "Danışıqların aparılması"],
      experiences: [exp("Satış meneceri", "2014-01", "2025-01", "Korporativ satış, danışıqlar")],
    }),
    job: chiefAccountant,
    band: [0, 20],
    autoApply: false,
  },
  {
    name: "one-year accountant is promising but short of a five-year requirement",
    profile: profile({
      title: "Mühasib",
      skills: ["Maliyyə hesabatlılığı", "1C mühasibatlıq", "Vergi hesabatları", "Microsoft Excel"],
      experiences: [exp("Mühasib", "2024-01", "2025-01", "1C, vergi hesabatları")],
    }),
    job: chiefAccountant,
    band: [45, 60],
    autoApply: false,
  },
  {
    name: "the same one-year accountant fits a junior accountant vacancy",
    profile: profile({
      title: "Mühasib",
      skills: ["Microsoft Excel", "1C mühasibatlıq"],
      experiences: [exp("Mühasib", "2024-01", "2025-01", "1C proqramında uçot, Excel cədvəlləri")],
    }),
    job: juniorAccountant,
    band: [85, 100],
    autoApply: true,
  },
  {
    name: "financial analyst is a related but not identical profession",
    profile: profile({
      title: "Maliyyə analitiki",
      skills: ["Maliyyə hesabatlılığı", "Microsoft Excel"],
      experiences: [exp("Maliyyə analitiki", "2018-01", "2025-01", "Maliyyə hesabatlarının analizi, Excel modelləri")],
    }),
    job: chiefAccountant,
    band: [45, 75],
  },
  {
    name: "accountant does not fit a frontend developer vacancy",
    profile: seasonedAccountant,
    job: reactDeveloper,
    band: [0, 20],
    autoApply: false,
  },
  {
    name: "frontend developer with React work fits the React vacancy",
    profile: profile({
      title: "Frontend Developer",
      skills: ["JavaScript", "React"],
      experiences: [exp("Frontend Developer", "2021-03", "", "React və JavaScript ilə veb tətbiqlər, HTML/CSS", true)],
    }),
    job: reactDeveloper,
    band: [85, 100],
    autoApply: true,
  },
  {
    name: "English-language CV evidence is recognised",
    profile: profile({
      title: "Sales Manager",
      cvText: "Sales Manager at Test LLC. Handled corporate sales, negotiations and customer service.",
      experiences: [exp("Sales Manager", "2019-01", "2025-01", "Corporate sales, negotiations with key clients, customer service")],
    }),
    job: salesManager,
    band: [75, 100],
  },
  {
    name: "a heavily over-qualified candidate is slightly discounted",
    profile: profile({
      title: "Mühasib",
      skills: ["Microsoft Excel", "1C mühasibatlıq"],
      experiences: [exp("Mühasib", "2005-01", "", "1C proqramında uçot, Excel", true)],
    }),
    job: juniorAccountant,
    band: [80, 97],
  },
  {
    name: "a profile without any professional data stays low",
    profile: profile({}),
    job: chiefAccountant,
    band: [0, 20],
    autoApply: false,
  },
];

for (const c of cases) {
  test(`benchmark: ${c.name}`, () => {
    const result = match(c.profile, c.job);
    const [low, high] = c.band;
    assert.ok(
      result.score >= low && result.score <= high,
      `expected ${low}-${high}, got ${result.score} ${JSON.stringify(result.breakdown)} caps=${result.caps}`,
    );
    if (c.autoApply !== undefined)
      assert.equal(autoApplyEligible(result, 85), c.autoApply, `auto-apply for score ${result.score}`);
  });
}

test("benchmark: candidates are ranked in recruiter order for one vacancy", () => {
  const ranked = cases
    .filter((c) => c.job === chiefAccountant)
    .map((c) => ({ name: c.name, score: match(c.profile, c.job).score }))
    .sort((a, b) => b.score - a.score)
    .map((c) => c.name);
  assert.equal(ranked[0], "experienced chief accountant fits a chief accountant vacancy");
  assert.ok(
    ranked.indexOf("one-year accountant is promising but short of a five-year requirement") <
      ranked.indexOf("courier who only wants to learn accounting does not fit"),
  );
});

test("benchmark: aspiration sentences never count as skill evidence", () => {
  const result = match(
    profile({ title: "Kuryer", cvText: "1C mühasibatlıq öyrənmək istəyirəm." }),
    chiefAccountant,
  );
  // "1C mühasibatlıq" is stored under its canonical catalog label.
  assert.ok(result.skillEvidence.every((x) => x.level === "none"));
  assert.equal(result.matched.length, 0);
});

test("benchmark: only related years count toward the requirement", () => {
  const result = match(
    profile({
      title: "Mühasib",
      skills: ["Microsoft Excel"],
      experiences: [
        exp("Kuryer", "2010-01", "2020-01"),
        exp("Mühasib", "2023-01", "2025-01", "Excel"),
      ],
    }),
    chiefAccountant,
  );
  assert.ok(result.experience >= 11);
  assert.ok(result.relevantYears <= 2.1);
  assert.equal(result.experienceMet, false);
});
