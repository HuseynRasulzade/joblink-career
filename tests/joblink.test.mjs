import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleProfile,
  sampleJobs,
  blankProfile,
  years,
  match,
  analyze,
  recommendations,
  draftJob,
  jobDraftMissingFields,
  normalizeEmploymentType,
} from "../lib/model.ts";
import { cvFields } from "../lib/cv-fields.ts";
import {
  needsEmploymentAudit,
  numberedCvLines,
  textBetweenCvLineBoundaries,
  textFromCvLineSpan,
  verifiedCvQuote,
} from "../lib/cv-experience.ts";
import { layoutPdfText } from "../lib/cv-text.ts";
import {
  MAX_CV_FILE_BYTES,
  MAX_CV_PAGES,
  MAX_CV_TEXT_CHARS,
} from "../lib/cv-limits.ts";
import {
  profileFieldsFromUniversalCv,
  UNIVERSAL_CV_PARSER_PROMPT,
} from "../lib/cv-parser.ts";
import {
  localizedSkillCategory,
  localizedSkillLabel,
  normalizeSkillKey,
  normalizeSkills,
  normalizeSkillsWithAllowedCustom,
  searchSkills,
  skillId,
  SKILL_CATALOG,
} from "../lib/skill-catalog.ts";
import { createXlsx } from "../lib/xlsx.ts";
import { unzipSync } from "fflate";
import {
  googleMapsEmbedUrl,
  googleMapsSearchUrl,
  normalizeJobAddress,
} from "../lib/maps.ts";
test("concurrent positions do not double-count experience", () => {
  assert.equal(years(sampleProfile), 3);
  assert.equal(
    years({
      ...sampleProfile,
      experiences: [
        ...sampleProfile.experiences,
        { ...sampleProfile.experiences[0], id: "overlap", start: "2024-09" },
      ],
    }),
    3,
  );
});
test("an empty profile matches no vacancy", () => {
  for (const job of sampleJobs) {
    const result = match(blankProfile, job);
    assert.equal(result.score, 0);
    assert.ok(result.caps.includes("empty-profile"));
  }
});
test("experience alone never establishes a new profession", () => {
  const unrelated = {
    ...sampleProfile,
    title: "",
    summary: "",
    skills: [],
    experiences: sampleProfile.experiences.map((e) => ({
      ...e,
      title: "",
      description: "",
    })),
  };
  assert.ok(match(unrelated, sampleJobs[0]).score <= 30);
  assert.ok(
    match(sampleProfile, sampleJobs[0]).score >
      match(sampleProfile, sampleJobs[3]).score,
  );
  assert.ok(recommendations(sampleProfile).every((r) => r.matched.length > 0));
});
test("measured achievements improve CV score without invented results", () => {
  const upgraded = {
    ...sampleProfile,
    phone: "+994 00 000 00 00",
    experiences: sampleProfile.experiences.map((e) => ({
      ...e,
      description: e.description + " 25 hesabat hazırladım.",
    })),
  };
  assert.ok(analyze(upgraded).score > analyze(sampleProfile).score);
  assert.ok(analyze(blankProfile).score < 20);
  assert.ok(analyze(sampleProfile).issues.some((s) => s.includes("Nailiyyət")));
});
test("accounting request stays a draft and unknown roles ask a question", () => {
  assert.equal(draftJob("Mühasibatlıq üzrə vakansiya")?.status, "draft");
  assert.equal(
    draftJob("Mühasibatlıq üzrə vakansiya")?.category,
    "Maliyyə, bankçılıq və sığorta",
  );
  assert.equal(draftJob("Nə tövsiyə edirsən?"), null);
});
test("vacancy drafts recognize major local job categories and never invent commercial terms", () => {
  const sales = draftJob("3-5 il təcrübəli satış mütəxəssisi");
  const procurement = draftJob("satınalma üzrə vakansiya hazırla");
  const content = draftJob("kontent mütəxəssisi axtarıram");
  assert.equal(sales?.category, "Satış və müştəri xidməti");
  assert.equal(sales?.minYears, 3);
  assert.equal(sales?.maxYears, 5);
  assert.equal(sales?.minSalary, 0);
  assert.equal(sales?.company, "");
  assert.equal(procurement?.category, "Satınalma və təchizat zənciri");
  assert.equal(content?.category, "Marketinq və kommunikasiya");
  assert.match(procurement?.description || "", /^• /);
  assert.ok((procurement?.description || "").split("\n").length >= 3);
});
test("a vacancy draft keeps the position the employer asked for", () => {
  const title = (prompt) => draftJob(prompt)?.title;
  assert.equal(title("Baş mühasib axtarırıq, Bakı, ofisdə, 3 il təcrübə"), "Baş mühasib");
  assert.equal(title("Satış meneceri axtarırıq 2 il təcrübə"), "Satış meneceri");
  assert.equal(title("aparıcı mühasib lazımdır"), "Aparıcı mühasib");
  assert.equal(title("Senior Python Developer axtarırıq"), "Senior Python Developer");
  assert.equal(title("3-5 il təcrübəli satış mütəxəssisi"), "Satış mütəxəssisi");
  // Without a recognizable position the template title is used, as before.
  assert.equal(title("Mühasibatlıq üzrə vakansiya"), "Mühasib");
  assert.equal(title("mühəndis vakansiyası"), "Mühəndis");
});
test("vacancy assistant reports every missing publish detail", () => {
  const draft = draftJob("mühəndis vakansiyası");
  assert.ok(draft);
  assert.deepEqual(jobDraftMissingFields(draft), [
    "şirkətin adı",
    "şəhər",
    "iş formatı",
    "məşğulluq növü",
    "maaş aralığı",
    "tələb olunan təcrübə",
  ]);
});
test("a relevant CV in different wording/language still ranks above unrelated jobs", () => {
  const finance = sampleJobs.find((j) => j.title === "Maliyyə üzrə mütəxəssis");
  const dev = sampleJobs.find((j) => j.title.includes("React"));
  const p = {
    ...blankProfile,
    name: "Test",
    email: "t@example.com",
    summary:
      "I am a reporting and budget specialist with experience in financial planning, monthly reporting, budget preparation and variance analysis.",
  };
  assert.ok(match(p, finance).score >= match(p, dev).score + 20);
  assert.ok(match(p, finance).matched.length >= 2);
});
test("an unstructured, un-headed CV still yields a summary instead of staying blank", () => {
  const narrative =
    "I am a reporting and budget specialist with over 5 years of experience in financial planning and monthly reporting.";
  assert.ok(cvFields(narrative).summary.length > 30);
  const structured =
    "Ad: Aysel\nİş təcrübəsi:\nMühasib - Caspian (2020-2023)\nBacarıqlar:\nExcel";
  assert.equal(cvFields(structured).summary, "");
});
test("a promotion sharing a boundary month does not double-count experience", () => {
  const promoted = {
    ...blankProfile,
    experiences: [
      {
        id: "operator",
        title: "Mühasib operator",
        company: "Nümunə Şirkət",
        start: "2022-02",
        end: "2023-06",
        current: false,
        description: "Sənəd nəzarəti",
      },
      {
        id: "accountant",
        title: "Əsas vəsaitlər üzrə mühasib",
        company: "Nümunə Şirkət",
        start: "2023-06",
        end: "2023-10",
        current: false,
        description: "İnventarizasiya və hesabatlar",
      },
    ],
  };
  assert.equal(promoted.experiences.length, 2);
  assert.equal(years(promoted), 1.7);
});
test("repeated employers trigger a role audit and duty evidence must exist in the CV", () => {
  const text =
    "NÜMUNƏ ŞİRKƏT MMC 2022-2023\nMÜHASİB\n• Aylıq hesabatların hazırlanması\nNÜMUNƏ ŞİRKƏT MMC 2021-2022\nOPERATOR\n• Sənədlərin yoxlanması";
  assert.equal(
    needsEmploymentAudit(text, [{ company: "Nümunə Şirkət MMC" }]),
    true,
  );
  assert.equal(
    verifiedCvQuote(text, "Aylıq hesabatların hazırlanması"),
    "Aylıq hesabatların hazırlanması",
  );
  assert.equal(verifiedCvQuote(text, "İnventarizasiya aparılması"), "");
});
test("PDF layout reconstruction keeps duties under their visual role even when stream order is scrambled", () => {
  const item = (str, x, y, width = 100, fontSize = 12) => ({
    str,
    x,
    y,
    width,
    fontSize,
  });
  const text = layoutPdfText([
    [
      item("• Malların 1C-yə daxil edilməsi", 40, 300),
      item("ƏSAS VƏSAİTLƏR ÜZRƏ MÜHASİB", 20, 700, 260, 15),
      item("• İnventarizasiya sənədlərinin hazırlanması", 40, 650),
      item("MÜHASİB OPERATOR", 20, 350, 180, 15),
      item("NÜMUNƏ ŞİRKƏT MMC", 20, 730, 220, 16),
    ],
  ]);
  assert.ok(text.indexOf("ƏSAS VƏSAİTLƏR") < text.indexOf("İnventarizasiya"));
  assert.ok(text.indexOf("İnventarizasiya") < text.indexOf("MÜHASİB OPERATOR"));
  assert.ok(text.indexOf("MÜHASİB OPERATOR") < text.indexOf("1C-yə"));
});
test("PDF layout reconstruction separates a sidebar from the employment column", () => {
  const item = (str, x, y, width = 120, fontSize = 12) => ({
    str,
    x,
    y,
    width,
    fontSize,
  });
  const text = layoutPdfText([
    [
      item("SERTİFİKATLAR", 30, 720, 150, 14),
      item("Financial Reporting", 30, 680),
      item("Management Accounting", 30, 650),
      item("Financial Management", 30, 620),
      item("Business Law", 30, 590),
      item("PMS", 30, 560),
      item("MKT MMC | FEVRAL 2022-OKTYABR 2023", 320, 720, 310, 15),
      item("ƏSAS VƏSAİTLƏR ÜZRƏ MÜHASİB", 320, 680, 300, 15),
      item("• İnventarizasiya sənədlərinin hazırlanması", 335, 640, 320),
      item("• Amortizasiya hesabatının hazırlanması", 335, 610, 310),
      item("MÜHASİB OPERATOR | FEVRAL 2022-İYUN 2023", 320, 540, 330, 15),
      item("• Document controlun aparılması", 335, 500, 250),
      item("• Malların 1C-yə daxil edilməsi", 335, 470, 250),
    ],
  ]);
  assert.ok(text.indexOf("PMS") < text.indexOf("MKT MMC"));
  assert.ok(text.indexOf("ƏSAS VƏSAİTLƏR") < text.indexOf("İnventarizasiya"));
  assert.ok(text.indexOf("Amortizasiya") < text.indexOf("MÜHASİB OPERATOR"));
  assert.ok(
    text.indexOf("MÜHASİB OPERATOR") < text.indexOf("Document control"),
  );
});
test("visual CV parser explicitly protects Canva columns and role bullet boundaries", () => {
  assert.match(UNIVERSAL_CV_PARSER_PROMPT, /Canva CVs/);
  assert.match(
    UNIVERSAL_CV_PARSER_PROMPT,
    /visual containment is authoritative/,
  );
  assert.match(
    UNIVERSAL_CV_PARSER_PROMPT,
    /Never interleave sidebar lines with job duties/,
  );
  assert.match(UNIVERSAL_CV_PARSER_PROMPT, /Do not reassign a duty/);
});
test("verified role spans retain every duty and wrapped continuation line", () => {
  const text = [
    "NÜMUNƏ ŞİRKƏT MMC | 2022-2023",
    "ƏSAS VƏSAİTLƏR ÜZRƏ MÜHASİB | 2023-06—2023-10",
    "• Silinmə və uçota alma əməliyyatları",
    "• İnventarizasiya sənədlərinin hazırlanması",
    "və inventarizasiyaya nəzarət",
    "• Amortizasiya məbləğinin məhsullar üzrə bölüşdürülməsi",
    "• Aylıq və cari hesabatların rəhbərliyə təqdim edilməsi",
    "• Təmir xərclərinin tanınması",
    "MÜHASİB OPERATOR | 2022-02—2023-06",
    "• Document controlun aparılması",
  ].join("\n");
  const lines = numberedCvLines(text);
  const duties = textFromCvLineSpan(lines, 3, 8);
  assert.equal(duties.split("\n").length, 6);
  assert.match(duties, /Silinmə/);
  assert.match(duties, /inventarizasiyaya nəzarət/);
  assert.match(duties, /Təmir xərclərinin tanınması/);
  assert.doesNotMatch(duties, /MÜHASİB OPERATOR/);
});
test("role heading boundaries force inclusion of the complete visual block", () => {
  const text = [
    "ŞİRKƏT",
    "ƏSAS VƏSAİTLƏR ÜZRƏ MÜHASİB",
    "• Birinci iş",
    "• İkinci iş",
    "• Üçüncü iş",
    "MÜHASİB OPERATOR",
    "• Operator işi",
  ].join("\n");
  const duties = textBetweenCvLineBoundaries(numberedCvLines(text), 2, 6);
  assert.equal(duties, "• Birinci iş\n• İkinci iş\n• Üçüncü iş");
});
test("CV limits accept normal image-heavy and long resumes", () => {
  assert.equal(MAX_CV_FILE_BYTES, 20 * 1024 * 1024);
  assert.equal(MAX_CV_PAGES, 40);
  assert.equal(MAX_CV_TEXT_CHARS, 60000);
});
test("universal parser mapping keeps promotions separate and generates an evidence-based summary", () => {
  const parsed = profileFieldsFromUniversalCv({
    personal_information: {
      full_name: "Aysel Məmmədova",
      phone_numbers: ["+994501112233"],
      email: "a@example.com",
    },
    professional_summary: null,
    current_employment: { position: "Əsas vəsaitlər üzrə mühasib" },
    work_experience: [
      {
        company_name: "MKT MMC",
        position: "Mühasib operator",
        start_date: "2022-02",
        end_date: "2023-06",
        is_current: false,
        responsibilities: ["Sənədlərin yoxlanması"],
        achievements: [],
      },
      {
        company_name: "MKT MMC",
        position: "Əsas vəsaitlər üzrə mühasib",
        start_date: "2023-06-15",
        end_date: "2023-10-20",
        is_current: false,
        responsibilities: ["İnventarizasiyanın təşkili"],
        achievements: ["100 aktiv inventarlaşdırıldı"],
      },
    ],
    skills: { software: ["1C", "Excel", "1C"], accounting: ["Əsas vəsaitlər"] },
    languages: [{ language: "English", level: null, raw_level: null }],
    education: [],
    certifications: [],
    parser_metadata: {
      detected_cv_language: ["az"],
      detected_format: "two-column",
      needs_manual_review: false,
      review_reasons: [],
    },
  });
  assert.match(parsed.fields.summary || "", /Əsas vəsaitlər üzrə mühasib/);
  assert.match(parsed.fields.summary || "", /1C/);
  assert.equal(
    parsed.fields.structuredCv?.professional_summary,
    parsed.fields.summary,
  );
  assert.equal(parsed.fields.experiences?.length, 2);
  assert.equal(parsed.fields.experiences?.[1].start, "2023-06-15");
  assert.match(
    parsed.fields.experiences?.[1].description || "",
    /Nailiyyətlər:/,
  );
  assert.deepEqual(parsed.fields.skills, [
    "1C",
    "Microsoft Excel",
    "Əsas vəsaitlərin uçotu",
    // Found in the achievement "100 aktiv inventarlaşdırıldı", not in the skills list.
    "İnventarizasiya",
  ]);
  assert.equal(parsed.metadata.detectedFormat, "two-column");
});
test("universal parser preserves extended CV sections and field confidence", () => {
  const parsed = profileFieldsFromUniversalCv({
    personal_information: { full_name: "Leyla Əliyeva" },
    work_experience: [
      {
        company_name: "ABC",
        position: "Analitik",
        department: "Maliyyə",
        employment_type: "Tam ştat",
        location: "Bakı",
        start_date: "2024",
        end_date: null,
        is_current: true,
        responsibilities: ["Hesabat hazırlamaq"],
        achievements: [],
        technologies: ["Power BI"],
        skills_used: ["Analiz"],
      },
    ],
    education: [],
    skills: { design: ["Figma"], data_analysis: ["Power BI"] },
    languages: [],
    certifications: [],
    courses_and_training: [
      { course_name: "Data Analysis", provider: "Academy" },
    ],
    projects: [{ project_name: "Dashboard", technologies: ["Power BI"] }],
    references: ["CV-də göstərilib"],
    additional_information: ["Sürücülük vəsiqəsi"],
    unclassified_information: [],
    parser_metadata: {
      detected_cv_language: ["az"],
      detected_format: "table",
      needs_manual_review: true,
      review_reasons: ["Cədvəl qarışıqdır"],
      field_confidence: [
        {
          path: "work_experience[0].department",
          confidence: 0.65,
          needs_review: true,
          evidence: "Maliyyə",
        },
      ],
    },
  });
  assert.equal(
    parsed.fields.structuredCv?.courses_and_training?.[0]?.course_name,
    "Data Analysis",
  );
  assert.equal(
    parsed.fields.structuredCv?.projects?.[0]?.project_name,
    "Dashboard",
  );
  assert.deepEqual(parsed.fields.skills, ["Figma", "Power BI"]);
  assert.equal(parsed.fields.cvFieldConfidence?.[0]?.needsReview, true);
  assert.equal(parsed.metadata.fieldConfidence[0].confidence, 0.65);
});
test("employment types are normalized without being inferred", () => {
  assert.equal(normalizeEmploymentType("Full-time"), "Tam ştat");
  assert.equal(normalizeEmploymentType("part time"), "Yarımştat");
  assert.equal(normalizeEmploymentType("internship"), "Təcrübəçi");
  assert.equal(normalizeEmploymentType("ordinary accountant"), "");
  const parsed = profileFieldsFromUniversalCv({
    personal_information: {},
    work_experience: [
      {
        company_name: "ABC",
        position: "Analitik",
        employment_type: "Contract",
        start_date: "2024",
        end_date: null,
        is_current: true,
        responsibilities: [],
        achievements: [],
      },
    ],
    education: [],
    skills: {},
    languages: [],
    certifications: [],
    parser_metadata: {},
  });
  assert.equal(parsed.fields.experiences?.[0].employmentType, "Müqavilə");
});
test("CV and vacancy skills share canonical unique identifiers", () => {
  const skills = normalizeSkills([
    "MS Office",
    "Microsoft Office",
    "1C 8.3 proqramı",
    "1C",
    "Cost Accounting",
    "Maliyyə hesabatlarının hazırlanması (SOFP, PL, CF, SOCE)",
    "Bu uzun vəzifə cümləsi bacarıq kimi saxlanılmamalı və profilə əlavə edilməməlidir",
  ]);
  assert.deepEqual(skills, [
    "Microsoft Office",
    "1C",
    "Maya dəyəri uçotu",
    "Maliyyə hesabatlılığı",
  ]);
  assert.equal(skillId("1C 8.3 proqramı"), skillId("1C"));
  assert.equal(skillId("Cost Accounting"), skillId("Maya dəyəri uçotu"));
});
test("unknown skill text cannot be created or persisted", () => {
  assert.deepEqual(
    normalizeSkills(["usnfnzd", "Microsoft Excel", "Random made up skill"]),
    ["Microsoft Excel"],
  );
  assert.deepEqual(normalizeSkills(["usnfnzd"], { allowCustom: true }), [
    "usnfnzd",
  ]);
});
test("admin catalog skills are accepted but other free text remains blocked", () => {
  assert.deepEqual(
    normalizeSkillsWithAllowedCustom(
      ["Maliyyə modelləşdirilməsi", "usnfnzd", "Excel"],
      ["Maliyyə modelləşdirilməsi"],
    ),
    ["Maliyyə modelləşdirilməsi", "Microsoft Excel"],
  );
  assert.deepEqual(
    normalizeSkillsWithAllowedCustom(
      ["usnfnzd"],
      ["Maliyyə modelləşdirilməsi"],
    ),
    [],
  );
});
test("local vacancy skills normalize to the shared CV and vacancy catalog", () => {
  assert.deepEqual(
    normalizeSkills([
      "Data Engineering",
      "ETL",
      "PySpark",
      "Windows Server 2022",
      "AD DS",
      "Tech Recruiter",
      "headhunting",
      "B2B sales",
      "cold calling",
      "CRM system",
      "RFQ",
      "vendor management",
      "SAP FICO",
      "month-end closing",
      "CapCut",
    ]),
    [
      "Məlumat mühəndisliyi",
      "ETL / ELT",
      "Apache Spark",
      "Windows Server",
      "Active Directory",
      "Texnoloji işə qəbul",
      "Namizəd axtarışı",
      "B2B satış",
      "Potensial müştəri axtarışı",
      "CRM",
      "Qiymət sorğusu / RFQ",
      "Təchizatçıların idarə edilməsi",
      "SAP FI/CO",
      "Aylıq bağlanış",
      "Video montajı",
    ],
  );
});
test("skill catalog is unique and searchable by aliases and category", () => {
  assert.equal(
    new Set(SKILL_CATALOG.map((item) => item.id)).size,
    SKILL_CATALOG.length,
  );
  assert.equal(
    new Set(SKILL_CATALOG.map((item) => item.label)).size,
    SKILL_CATALOG.length,
  );
  const aliases = new Map();
  for (const item of SKILL_CATALOG)
    for (const alias of item.aliases) {
      const key = normalizeSkillKey(alias);
      assert.ok(
        !aliases.has(key) || aliases.get(key) === item.id,
        `alias collision: ${alias}`,
      );
      aliases.set(key, item.id);
    }
  assert.ok(SKILL_CATALOG.length >= 200);
  assert.equal(searchSkills("k8s")[0]?.label, "Kubernetes");
  assert.ok(
    searchSkills("Mühəndislik", [], 50).some(
      (item) => item.label === "AutoCAD",
    ),
  );
});
test("every canonical skill has an English display label without changing its stored ID", () => {
  assert.ok(
    SKILL_CATALOG.every(
      (item) => item.labelEn.trim() && item.categoryEn.trim(),
    ),
  );
  assert.equal(
    localizedSkillLabel("Maliyyə hesabatlılığı", "en"),
    "Financial reporting",
  );
  assert.equal(
    localizedSkillLabel("financial reporting", "az"),
    "Maliyyə hesabatlılığı",
  );
  assert.equal(
    localizedSkillLabel("E-qaimə və ƏDV uçotu", "en"),
    "Electronic Invoicing and VAT Accounting",
  );
  assert.equal(
    skillId("Electronic Invoicing and VAT Accounting"),
    skillId("E-qaimə və ƏDV uçotu"),
  );
  assert.equal(
    searchSkills("electronic invoicing")[0]?.label,
    "E-qaimə və ƏDV uçotu",
  );
  assert.equal(
    localizedSkillCategory(
      SKILL_CATALOG.find((item) => item.id === "data-engineering"),
      "en",
    ),
    "Data",
  );
});
test("LinkedIn-style competency aliases map to one controlled skill", () => {
  assert.deepEqual(
    normalizeSkills([
      "teamwork",
      "cross-functional collaboration",
      "conflict management",
      "product knowledge",
      "debugging",
    ]),
    [
      "Komanda işi",
      "Əməkdaşlıq",
      "Münaqişələrin həlli",
      "Məhsul biliyi",
      "Proqram xətalarının aradan qaldırılması",
    ],
  );
});
test("Sadiq CV receives a fair finance match across vacancy phrasing variants", () => {
  const profile = {
    ...blankProfile,
    city: "Bakı",
    mode: "Hibrid",
    title: "Büdcə, xərclərə nəzarət və hesabatlıq üzrə mütəxəssis",
    skills: [
      "Maliyyə hesabatlılığı",
      "Büdcələşdirmə",
      "Debitor və kreditor uçotu",
      "Maliyyə təhlili",
      "Microsoft Office",
    ],
    cvText:
      "Maliyyə hesabatlarının hazırlanması (SOFP, PL, CF, SOCE). Maliyyə hesabatlarının analizi. İllik planlanmış büdcənin hazırlanması. Debitor və kreditor hesabatı.",
    experiences: [
      {
        id: "current",
        title: "Maliyyə mütəxəssisi",
        company: "Sinteks",
        start: "2021-09",
        end: "",
        current: true,
        description: "Büdcə, hesabatlıq və maliyyə təhlili",
      },
    ],
  };
  const vacancy = {
    ...sampleJobs[1],
    city: "Baki",
    mode: "Ofisdə",
    minYears: 3,
    maxYears: 3,
    skills: [
      "Maliyyə hesabatlılığı",
      "Büdcələşdirmə və planlama",
      "Pul axınlarının idarə edilməsi",
      "Debitor/kreditor nəzarəti",
      "Maliyyə təhlili",
      "MS Excel",
      "Uyğunluq və daxili nəzarət",
    ],
  };
  const result = match(profile, vacancy);
  assert.deepEqual(result.matched, [
    "Maliyyə hesabatlılığı",
    "Büdcələşdirmə",
    "Pul vəsaitlərinin hərəkəti",
    "Debitor və kreditor uçotu",
    "Maliyyə təhlili",
    // "Microsoft Office" in the profile counts partly for Excel.
    "Microsoft Excel",
  ]);
  assert.equal(result.experienceMet, true);
  // A genuine finance specialist with related titles should rank strongly;
  // the exact value depends on weights, so assert the band and the role signal.
  assert.ok(result.score >= 70, `score ${result.score}`);
  assert.equal(result.breakdown.role, 25);
});
test("structured CV dates still count when editable experience rows are stale", () => {
  const profile = {
    ...blankProfile,
    experiences: [],
    structuredCv: {
      work_experience: [
        { start_date: "2021-09", end_date: null, is_current: true },
      ],
    },
  };
  assert.ok(years(profile) >= 5);
});
test("skills export is a valid XLSX package with headers and rows", () => {
  const bytes = createXlsx(["Skill", "Section"], [["Accounting", "Finance"]]);
  assert.deepEqual(Array.from(bytes.slice(0, 4)), [80, 75, 3, 4]);
  const files = unzipSync(bytes);
  assert.ok(files["xl/workbook.xml"]);
  assert.ok(files["xl/styles.xml"]);
  assert.match(
    new TextDecoder().decode(files["xl/worksheets/sheet1.xml"]),
    /Accounting/,
  );
});
test("Google Maps job addresses are normalized and safely encoded", () => {
  const address = "  Bakı,  Xətai rayonu, Babək prospekti 10  ";
  assert.equal(
    normalizeJobAddress(address),
    "Bakı, Xətai rayonu, Babək prospekti 10",
  );
  assert.equal(
    googleMapsSearchUrl(address),
    "https://www.google.com/maps/search/?api=1&query=Bak%C4%B1%2C%20X%C9%99tai%20rayonu%2C%20Bab%C9%99k%20prospekti%2010",
  );
  assert.equal(
    googleMapsEmbedUrl("Nizami küç. 1 & 2"),
    "https://www.google.com/maps?q=Nizami%20k%C3%BC%C3%A7.%201%20%26%202&output=embed",
  );
  assert.equal(googleMapsEmbedUrl(""), "");
});
