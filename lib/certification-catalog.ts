import { normalizeSkillKey } from "./skill-catalog.ts";

// Professional certifications and licences. IDs are stable storage keys;
// `skills` lists skill-catalog IDs that a held certification evidences.
// `levels` are ordered from lowest to highest; `scale` is used for scored
// tests (IELTS band, TOEFL score). `group` marks broadly equivalent
// qualifications that partly satisfy each other's requirement.
export type CertificationDefinition = {
  id: string;
  name: string;
  issuer: string;
  category: string;
  categoryEn: string;
  aliases: string[];
  skills: string[];
  levels?: string[];
  scale?: { min: number; max: number; step: number };
  group?: string;
  // Exams or parts a candidate passes one by one. `level` is one of `levels`.
  modules?: CertificationModule[];
  modulesRequired?: number;
  completeLevel?: string;
  // Extra recognition rules for names written in varying order.
  patterns?: RegExp[];
};
export type CertificationModule = { code: string; name: string; level: string };

export const CERTIFICATION_CATEGORIES: Record<string, string> = {
  "Maliyyə və mühasibatlıq": "Finance and Accounting",
  "Bank, risk və AML": "Banking, Risk and AML",
  "Sığorta və daşınmaz əmlak": "Insurance and Real Estate",
  "Layihə idarəetməsi və Agile": "Project Management and Agile",
  "Biznes təhlili və idarəetmə": "Business Analysis and Management",
  "Keyfiyyət və ISO": "Quality and ISO",
  "Satınalma və logistika": "Procurement and Logistics",
  "İnsan resursları və kouçinq": "Human Resources and Coaching",
  "Marketinq və satış": "Marketing and Sales",
  "Bulud texnologiyaları": "Cloud",
  "İT, şəbəkə və proqramlaşdırma": "IT, Networking and Development",
  "Məlumat və süni intellekt": "Data and AI",
  "Kibertəhlükəsizlik, İT audit və məxfilik": "Cybersecurity, IT Audit and Privacy",
  "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi": "HSE and Oil & Gas Safety",
  "Mühəndislik, inspeksiya və enerji": "Engineering, Inspection and Energy",
  "Hüquq və uyğunluq": "Legal and Compliance",
  "Dil sertifikatları": "Language Certificates",
  "Səhiyyə": "Healthcare",
  "Qida, otel və turizm": "Food, Hospitality and Tourism",
  "Təhsil və tədris": "Education and Teaching",
  "Dizayn və media": "Design and Media",
  "Ofis və rəqəmsal savadlılıq": "Office and Digital Literacy",
  "Aviasiya, dənizçilik və nəqliyyat": "Aviation, Maritime and Transport",
};

const cert = (
  id: string,
  name: string,
  issuer: string,
  category: keyof typeof CERTIFICATION_CATEGORIES,
  aliases: string[],
  skills: string[],
  options: Pick<CertificationDefinition, "levels" | "scale" | "group" | "modules" | "modulesRequired" | "completeLevel" | "patterns"> = {},
): CertificationDefinition => ({
  id,
  name,
  issuer,
  category,
  categoryEn: CERTIFICATION_CATEGORIES[category],
  aliases: [name, ...aliases],
  skills,
  ...options,
});

const m = (level: string, list: [string, string][]): CertificationModule[] =>
  list.map(([code, name]) => ({ code, name, level }));
const ACCA_MODULES = [
  ...m("Applied Knowledge", [["BT", "Business and Technology"], ["MA", "Management Accounting"], ["FA", "Financial Accounting"]]),
  ...m("Applied Skills", [["LW", "Corporate and Business Law"], ["PM", "Performance Management"], ["TX", "Taxation"], ["FR", "Financial Reporting"], ["AA", "Audit and Assurance"], ["FM", "Financial Management"]]),
  ...m("Strategic Professional", [["SBL", "Strategic Business Leader"], ["SBR", "Strategic Business Reporting"], ["AFM", "Advanced Financial Management"], ["APM", "Advanced Performance Management"], ["ATX", "Advanced Taxation"], ["AAA", "Advanced Audit and Assurance"]]),
];
const CIMA_MODULES = [
  ...m("Certificate in Business Accounting", [["BA1", "Fundamentals of Business Economics"], ["BA2", "Fundamentals of Management Accounting"], ["BA3", "Fundamentals of Financial Accounting"], ["BA4", "Fundamentals of Ethics, Corporate Governance and Business Law"]]),
  ...m("Operational", [["E1", "Managing Finance in a Digital World"], ["P1", "Management Accounting"], ["F1", "Financial Reporting"], ["OCS", "Operational Case Study"]]),
  ...m("Management", [["E2", "Managing Performance"], ["P2", "Advanced Management Accounting"], ["F2", "Advanced Financial Reporting"], ["MCS", "Management Case Study"]]),
  ...m("Strategic", [["E3", "Strategic Management"], ["P3", "Risk Management"], ["F3", "Financial Strategy"], ["SCS", "Strategic Case Study"]]),
];
const CPA_MODULES = m("Exam sections passed", [["AUD", "Auditing and Attestation"], ["FAR", "Financial Accounting and Reporting"], ["REG", "Regulation"], ["BAR", "Business Analysis and Reporting"], ["ISC", "Information Systems and Controls"], ["TCP", "Tax Compliance and Planning"], ["BEC", "Business Environment and Concepts"]]);
const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
const BELTS = ["White Belt", "Yellow Belt", "Green Belt", "Black Belt", "Master Black Belt"];
const AWS_ASSOC = ["Associate", "Professional"];

export const CERTIFICATION_CATALOG: CertificationDefinition[] = [
  // Finance and accounting
  cert("acca", "ACCA", "Association of Chartered Certified Accountants", "Maliyyə və mühasibatlıq", ["ACCA Qualification", "Chartered Certified Accountant", "FCCA", "ACCA member", "ACCA Affiliate"], ["accounting", "financial-reporting", "ifrs", "audit", "tax-accounting", "management-accounting"], { levels: ["Applied Knowledge", "Applied Skills", "Strategic Professional", "Affiliate", "Member (ACCA)", "Fellow (FCCA)"], group: "professional-accountancy", modules: ACCA_MODULES, modulesRequired: 13, completeLevel: "Affiliate" }),
  cert("acca-dipifr", "ACCA DipIFR", "ACCA", "Maliyyə və mühasibatlıq", ["DipIFR", "Diploma in International Financial Reporting", "ДипИФР"], ["ifrs", "financial-reporting"], { group: "ifrs-diploma" }),
  cert("acca-certifr", "ACCA CertIFR", "ACCA", "Maliyyə və mühasibatlıq", ["CertIFR", "Certificate in International Financial Reporting"], ["ifrs", "financial-reporting"], { group: "ifrs-diploma" }),
  cert("acca-fia", "ACCA FIA / CAT", "ACCA", "Maliyyə və mühasibatlıq", ["FIA", "Foundations in Accountancy", "ACCA CAT", "Certified Accounting Technician"], ["accounting", "financial-accounting"], { levels: ["FA1/MA1", "FA2/MA2", "FFA/FMA", "CAT"] }),
  cert("cima", "CIMA", "Chartered Institute of Management Accountants", "Maliyyə və mühasibatlıq", ["CIMA CGMA", "Chartered Management Accountant", "ACMA", "FCMA"], ["management-accounting", "budgeting", "financial-analysis", "cost-accounting"], { levels: ["Certificate in Business Accounting", "Operational", "Management", "Strategic", "ACMA, CGMA"], group: "professional-accountancy", modules: CIMA_MODULES, modulesRequired: 16, completeLevel: "ACMA, CGMA" }),
  cert("cgma", "CGMA", "AICPA & CIMA", "Maliyyə və mühasibatlıq", ["Chartered Global Management Accountant"], ["management-accounting", "fp-and-a"], { group: "professional-accountancy" }),
  cert("cpa-us", "CPA (US)", "AICPA / NASBA", "Maliyyə və mühasibatlıq", ["Certified Public Accountant", "US CPA", "CPA USA"], ["accounting", "audit", "tax-accounting", "financial-reporting"], { levels: ["Exam sections passed", "Licensed CPA"], group: "professional-accountancy", modules: CPA_MODULES, modulesRequired: 4, completeLevel: "Licensed CPA" }),
  cert("cpa-australia", "CPA Australia", "CPA Australia", "Maliyyə və mühasibatlıq", ["CPA Aus", "FCPA Australia"], ["accounting", "financial-reporting", "ifrs"], { group: "professional-accountancy" }),
  cert("icaew-aca", "ICAEW ACA", "Institute of Chartered Accountants in England and Wales", "Maliyyə və mühasibatlıq", ["ACA", "ICAEW Chartered Accountant", "FCA ICAEW"], ["accounting", "audit", "financial-reporting", "ifrs"], { group: "professional-accountancy" }),
  cert("icaew-ifrs", "ICAEW Certificate in IFRS", "ICAEW", "Maliyyə və mühasibatlıq", ["ICAEW IFRS Certificate"], ["ifrs", "financial-reporting"], { group: "ifrs-diploma" }),
  cert("icas-ca", "ICAS CA", "Institute of Chartered Accountants of Scotland", "Maliyyə və mühasibatlıq", ["ICAS Chartered Accountant"], ["accounting", "audit", "financial-reporting"], { group: "professional-accountancy" }),
  cert("ca-anz", "CA ANZ", "Chartered Accountants Australia and New Zealand", "Maliyyə və mühasibatlıq", ["Chartered Accountant ANZ"], ["accounting", "audit", "financial-reporting"], { group: "professional-accountancy" }),
  cert("cipfa", "CIPFA", "Chartered Institute of Public Finance and Accountancy", "Maliyyə və mühasibatlıq", ["CPFA", "Chartered Public Finance Accountant", "CIPFA IPSAS Diploma"], ["accounting", "budgeting", "financial-reporting"], { group: "professional-accountancy" }),
  cert("cfa", "CFA", "CFA Institute", "Maliyyə və mühasibatlıq", ["Chartered Financial Analyst", "CFA charterholder", "CFA Level"], ["financial-analysis", "financial-modeling", "risk-management", "finance"], { levels: ["Level I", "Level II", "Level III", "Charterholder"] }),
  cert("caia", "CAIA", "CAIA Association", "Maliyyə və mühasibatlıq", ["Chartered Alternative Investment Analyst"], ["financial-analysis", "risk-management"], { levels: ["Level I", "Level II", "Charterholder"] }),
  cert("cma-ima", "CMA (IMA)", "Institute of Management Accountants", "Maliyyə və mühasibatlıq", ["Certified Management Accountant", "US CMA", "IMA CMA"], ["management-accounting", "budgeting", "cost-accounting", "financial-analysis"], { levels: ["Part 1", "Part 2", "Certified"], group: "professional-accountancy", modules: m("Part 1", [["Part 1", "Financial Planning, Performance and Analytics"]]).concat(m("Part 2", [["Part 2", "Strategic Financial Management"]])), modulesRequired: 2, completeLevel: "Certified" }),
  cert("cia", "CIA", "Institute of Internal Auditors", "Maliyyə və mühasibatlıq", ["Certified Internal Auditor", "IIA CIA"], ["audit", "internal-control", "risk-management"], { levels: ["Part 1", "Part 2", "Part 3", "Certified"], modules: [...m("Part 1", [["Part 1", "Essentials of Internal Auditing"]]), ...m("Part 2", [["Part 2", "Practice of Internal Auditing"]]), ...m("Part 3", [["Part 3", "Business Knowledge for Internal Auditing"]])], modulesRequired: 3, completeLevel: "Certified" }),
  cert("crma", "CRMA", "Institute of Internal Auditors", "Maliyyə və mühasibatlıq", ["Certification in Risk Management Assurance"], ["audit", "risk-management"] ),
  cert("cfe", "CFE", "Association of Certified Fraud Examiners", "Maliyyə və mühasibatlıq", ["Certified Fraud Examiner", "ACFE"], ["audit", "internal-control", "compliance"]),
  cert("fmva", "FMVA", "Corporate Finance Institute", "Maliyyə və mühasibatlıq", ["Financial Modeling & Valuation Analyst", "CFI FMVA"], ["financial-modeling", "financial-analysis", "excel"]),
  cert("cfp", "CFP", "Financial Planning Standards Board", "Maliyyə və mühasibatlıq", ["Certified Financial Planner"], ["finance", "financial-analysis"]),
  cert("ea-irs", "Enrolled Agent (EA)", "US Internal Revenue Service", "Maliyyə və mühasibatlıq", ["Enrolled Agent", "IRS EA"], ["tax-accounting"]),
  cert("cta-uk", "CTA (UK)", "Chartered Institute of Taxation", "Maliyyə və mühasibatlıq", ["Chartered Tax Adviser", "CIOT CTA"], ["tax-accounting"]),
  cert("adit", "ADIT", "Chartered Institute of Taxation", "Maliyyə və mühasibatlıq", ["Advanced Diploma in International Taxation"], ["tax-accounting"]),
  cert("az-auditor", "Auditor sertifikatı (AR Auditorlar Palatası)", "Azərbaycan Respublikasının Auditorlar Palatası", "Maliyyə və mühasibatlıq", ["Auditorlar Palatası", "AR auditor sertifikatı", "Chamber of Auditors of Azerbaijan"], ["audit", "accounting", "financial-reporting"]),
  cert("az-professional-accountant", "Peşəkar mühasib sertifikatı (ARPMP)", "Azərbaycan Respublikası Peşəkar Mühasiblər Palatası", "Maliyyə və mühasibatlıq", ["ARPMP", "Peşəkar Mühasiblər Palatası", "peşəkar mühasib"], ["accounting", "financial-reporting", "tax-accounting"]),
  cert("az-pms-ifrs", "PMS – MHBS üzrə peşəkar sertifikat", "Azərbaycan — peşəkar mühasibat proqramı (PMS)", "Maliyyə və mühasibatlıq", ["PMS - MHBS", "PMS MHBS", "MHBS sertifikatı", "MHBS üzrə peşəkar sertifikat", "PMS IFRS"], ["ifrs", "financial-reporting"], { levels: ["1-ci mərhələ", "2-ci mərhələ", "3-cü mərhələ"], group: "ifrs-diploma", patterns: [/\bPMS\b[^\n]*\bMHBS\b|\bMHBS\b[^\n]*\bPMS\b/] }),
  cert("az-tax-consultant", "Vergi məsləhətçisi sertifikatı", "Azərbaycan Respublikası İqtisadiyyat Nazirliyi yanında Dövlət Vergi Xidməti", "Maliyyə və mühasibatlıq", ["vergi məsləhətçisi", "tax consultant certificate Azerbaijan"], ["tax-accounting", "vat-einvoice"]),
  cert("bloomberg-bmc", "Bloomberg Market Concepts (BMC)", "Bloomberg", "Maliyyə və mühasibatlıq", ["Bloomberg Market Concepts", "BMC Bloomberg"], ["finance", "financial-analysis"]),
  cert("cisi", "CISI Investment Certificate", "Chartered Institute for Securities & Investment", "Maliyyə və mühasibatlıq", ["CISI", "Chartered Wealth Manager", "CISI Diploma"], ["finance", "risk-management"], { levels: ["Certificate", "Diploma", "Chartered"] }),

  // Banking, risk and AML
  cert("frm", "FRM", "GARP", "Bank, risk və AML", ["Financial Risk Manager", "GARP FRM"], ["risk-management", "credit-risk", "financial-analysis"], { levels: ["Part I", "Part II", "Certified"], modules: [...m("Part I", [["Part I", "Foundations of Risk Management"]]), ...m("Part II", [["Part II", "Market, Credit and Operational Risk"]])], modulesRequired: 2, completeLevel: "Certified" }),
  cert("prm", "PRM", "PRMIA", "Bank, risk və AML", ["Professional Risk Manager", "PRMIA PRM"], ["risk-management"]),
  cert("garp-scr", "GARP SCR", "GARP", "Bank, risk və AML", ["Sustainability and Climate Risk", "SCR certificate"], ["risk-management"]),
  cert("cams", "CAMS", "ACAMS", "Bank, risk və AML", ["Certified Anti-Money Laundering Specialist", "ACAMS CAMS"], ["aml-kyc", "compliance", "risk-management"], { group: "aml" }),
  cert("cgss", "CGSS", "ACAMS", "Bank, risk və AML", ["Certified Global Sanctions Specialist"], ["aml-kyc", "compliance"], { group: "aml" }),
  cert("ica-aml", "ICA Diploma in Anti Money Laundering", "International Compliance Association", "Bank, risk və AML", ["ICA AML Diploma", "ICA Certificate in AML", "International Diploma in Anti Money Laundering"], ["aml-kyc", "compliance"], { levels: ["Certificate", "Advanced Certificate", "Diploma"], group: "aml" }),
  cert("ctp", "CTP", "Association for Financial Professionals", "Bank, risk və AML", ["Certified Treasury Professional", "AFP CTP"], ["treasury", "cash-flow"]),
  cert("aci-dealing", "ACI Dealing Certificate", "ACI Financial Markets Association", "Bank, risk və AML", ["ACI Dealing", "ACI Diploma", "ACI Operations Certificate"], ["treasury", "banking-operations"]),
  cert("ccra", "CCRA", "Credit Risk Certification", "Bank, risk və AML", ["Certified Credit Research Analyst", "Credit Risk Analyst certification"], ["credit-analysis", "credit-risk"]),
  cert("cdcs", "CDCS", "London Institute of Banking & Finance", "Bank, risk və AML", ["Certified Documentary Credit Specialist"], ["banking-operations", "customs-import-export"]),
  cert("ciob", "Chartered Banker", "Chartered Banker Institute", "Bank, risk və AML", ["Chartered Banker Institute", "Associate Chartered Banker"], ["banking-operations", "credit-analysis"]),

  // Insurance and real estate
  cert("cii", "CII Qualifications", "Chartered Insurance Institute", "Sığorta və daşınmaz əmlak", ["Chartered Insurance Institute", "ACII", "Chartered Insurer", "Dip CII"], ["insurance"], { levels: ["Certificate", "Diploma", "Advanced Diploma (ACII)", "Chartered"] }),
  cert("cpcu", "CPCU", "The Institutes", "Sığorta və daşınmaz əmlak", ["Chartered Property Casualty Underwriter"], ["insurance", "risk-management"]),
  cert("flmi", "FLMI", "LOMA", "Sığorta və daşınmaz əmlak", ["Fellow, Life Management Institute", "LOMA FLMI"], ["insurance"]),
  cert("ains", "AINS", "The Institutes", "Sığorta və daşınmaz əmlak", ["Associate in General Insurance"], ["insurance"]),
  cert("rics", "RICS (MRICS)", "Royal Institution of Chartered Surveyors", "Sığorta və daşınmaz əmlak", ["MRICS", "FRICS", "Chartered Surveyor", "RICS Registered Valuer"], ["construction-management", "financial-analysis"]),
  cert("ccim", "CCIM", "CCIM Institute", "Sığorta və daşınmaz əmlak", ["Certified Commercial Investment Member"], ["financial-analysis"]),
  cert("cpm-irem", "CPM (IREM)", "Institute of Real Estate Management", "Sığorta və daşınmaz əmlak", ["Certified Property Manager"], ["operations-coordination"]),

  // Project management and Agile
  cert("pmp", "PMP", "Project Management Institute", "Layihə idarəetməsi və Agile", ["Project Management Professional", "PMI PMP"], ["project-management", "stakeholder-management", "risk-management"], { group: "project-management" }),
  cert("capm", "CAPM", "Project Management Institute", "Layihə idarəetməsi və Agile", ["Certified Associate in Project Management"], ["project-management"], { group: "project-management" }),
  cert("pgmp", "PgMP", "Project Management Institute", "Layihə idarəetməsi və Agile", ["Program Management Professional"], ["project-management", "stakeholder-management"], { group: "project-management" }),
  cert("pfmp", "PfMP", "Project Management Institute", "Layihə idarəetməsi və Agile", ["Portfolio Management Professional"], ["project-management"]),
  cert("pmi-acp", "PMI-ACP", "Project Management Institute", "Layihə idarəetməsi və Agile", ["PMI Agile Certified Practitioner"], ["project-management"], { group: "agile" }),
  cert("pmi-rmp", "PMI-RMP", "Project Management Institute", "Layihə idarəetməsi və Agile", ["PMI Risk Management Professional"], ["risk-management", "project-management"]),
  cert("pmi-sp", "PMI-SP", "Project Management Institute", "Layihə idarəetməsi və Agile", ["PMI Scheduling Professional"], ["project-management"]),
  cert("prince2", "PRINCE2", "PeopleCert / AXELOS", "Layihə idarəetməsi və Agile", ["PRINCE2 Foundation", "PRINCE2 Practitioner", "PRINCE 2"], ["project-management"], { levels: ["Foundation", "Practitioner"], group: "project-management" }),
  cert("prince2-agile", "PRINCE2 Agile", "PeopleCert / AXELOS", "Layihə idarəetməsi və Agile", ["PRINCE2 Agile Practitioner"], ["project-management"], { levels: ["Foundation", "Practitioner"], group: "agile" }),
  cert("msp", "MSP", "PeopleCert / AXELOS", "Layihə idarəetməsi və Agile", ["Managing Successful Programmes"], ["project-management"], { levels: ["Foundation", "Practitioner"] }),
  cert("apm-pmq", "APM PMQ", "Association for Project Management", "Layihə idarəetməsi və Agile", ["APM Project Management Qualification", "APM PFQ", "ChPP"], ["project-management"], { levels: ["PFQ", "PMQ", "PPQ", "Chartered (ChPP)"], group: "project-management" }),
  cert("ipma", "IPMA Certification", "International Project Management Association", "Layihə idarəetməsi və Agile", ["IPMA Level", "IPMA-D", "IPMA-C", "IPMA-B", "IPMA-A"], ["project-management"], { levels: ["Level D", "Level C", "Level B", "Level A"], group: "project-management" }),
  cert("csm", "Certified ScrumMaster (CSM)", "Scrum Alliance", "Layihə idarəetməsi və Agile", ["CSM", "Certified Scrum Master", "A-CSM", "CSP-SM"], ["project-management"], { levels: ["CSM", "A-CSM", "CSP-SM"], group: "scrum-master" }),
  cert("cspo", "Certified Scrum Product Owner (CSPO)", "Scrum Alliance", "Layihə idarəetməsi və Agile", ["CSPO", "A-CSPO"], ["product-management"], { group: "product-owner" }),
  cert("psm", "Professional Scrum Master (PSM)", "Scrum.org", "Layihə idarəetməsi və Agile", ["PSM", "PSM I", "PSM II", "PSM III", "Professional Scrum Master"], ["project-management"], { levels: ["PSM I", "PSM II", "PSM III"], group: "scrum-master" }),
  cert("pspo", "Professional Scrum Product Owner (PSPO)", "Scrum.org", "Layihə idarəetməsi və Agile", ["PSPO", "PSPO I", "PSPO II"], ["product-management"], { levels: ["PSPO I", "PSPO II", "PSPO III"], group: "product-owner" }),
  cert("safe", "SAFe Certification", "Scaled Agile", "Layihə idarəetməsi və Agile", ["SAFe Agilist", "SAFe SPC", "SAFe Scrum Master", "Leading SAFe"], ["project-management"], { levels: ["SAFe Agilist", "SAFe Practitioner", "SAFe Scrum Master", "SAFe Program Consultant"], group: "agile" }),
  cert("kmp", "Kanban Management Professional (KMP)", "Kanban University", "Layihə idarəetməsi və Agile", ["KMP", "Kanban University"], ["project-management", "process-improvement"]),
  cert("agilepm", "AgilePM", "APMG International", "Layihə idarəetməsi və Agile", ["Agile Project Management APMG", "DSDM AgilePM"], ["project-management"], { levels: ["Foundation", "Practitioner"], group: "agile" }),

  // Business analysis and management
  cert("cbap", "CBAP", "IIBA", "Biznes təhlili və idarəetmə", ["Certified Business Analysis Professional", "IIBA CBAP"], ["business-analysis", "stakeholder-management"], { group: "business-analysis" }),
  cert("ccba", "CCBA", "IIBA", "Biznes təhlili və idarəetmə", ["Certification of Capability in Business Analysis"], ["business-analysis"], { group: "business-analysis" }),
  cert("ecba", "ECBA", "IIBA", "Biznes təhlili və idarəetmə", ["Entry Certificate in Business Analysis"], ["business-analysis"], { group: "business-analysis" }),
  cert("pmi-pba", "PMI-PBA", "Project Management Institute", "Biznes təhlili və idarəetmə", ["PMI Professional in Business Analysis"], ["business-analysis"], { group: "business-analysis" }),
  cert("cpre", "IREB CPRE", "IREB", "Biznes təhlili və idarəetmə", ["Certified Professional for Requirements Engineering", "CPRE"], ["business-analysis"], { levels: ["Foundation", "Advanced", "Expert"] }),
  cert("bcs-ba", "BCS International Diploma in Business Analysis", "BCS", "Biznes təhlili və idarəetmə", ["BCS Business Analysis"], ["business-analysis"], { levels: ["Foundation", "Practitioner", "Diploma"] }),
  cert("cmi", "CMI Management Qualification", "Chartered Management Institute", "Biznes təhlili və idarəetmə", ["Chartered Manager", "CMI Level 5", "CMI Level 7"], ["team-management", "leadership"], { levels: ["Level 3", "Level 5", "Level 7", "Chartered Manager"] }),
  cert("pmc", "Certified Management Consultant (CMC)", "ICMCI", "Biznes təhlili və idarəetmə", ["CMC", "ICMCI"], ["business-analysis", "process-improvement"]),
  cert("cpim-product", "Pragmatic Institute Certification", "Pragmatic Institute", "Biznes təhlili və idarəetmə", ["PMC Pragmatic", "Pragmatic Marketing Certified"], ["product-management"]),

  // Quality and ISO
  cert("six-sigma", "Lean Six Sigma", "ASQ / IASSC / CSSC", "Keyfiyyət və ISO", ["Six Sigma", "Lean Six Sigma Green Belt", "Lean Six Sigma Black Belt", "LSSGB", "LSSBB", "CSSGB", "CSSBB", "IASSC"], ["process-improvement", "quality-assurance"], { levels: BELTS }),
  cert("lean", "Lean Practitioner", "Various", "Keyfiyyət və ISO", ["Lean Certification", "Lean Practitioner", "Lean Management"], ["process-improvement"]),
  cert("iso9001-la", "ISO 9001 Lead Auditor", "IRCA / Exemplar Global", "Keyfiyyət və ISO", ["ISO 9001 Lead Auditor", "QMS Lead Auditor", "IRCA QMS"], ["iso-standards", "quality-assurance", "audit"], { group: "iso-auditor" }),
  cert("iso9001-ia", "ISO 9001 Internal Auditor", "Various", "Keyfiyyət və ISO", ["ISO 9001 Internal Auditor", "QMS Internal Auditor"], ["iso-standards", "quality-assurance"], { group: "iso-auditor" }),
  cert("iso14001-la", "ISO 14001 Lead Auditor", "IRCA / Exemplar Global", "Keyfiyyət və ISO", ["EMS Lead Auditor", "ISO 14001 Lead Auditor"], ["iso-standards", "workplace-safety"], { group: "iso-auditor" }),
  cert("iso45001-la", "ISO 45001 Lead Auditor", "IRCA / Exemplar Global", "Keyfiyyət və ISO", ["OHSMS Lead Auditor", "ISO 45001 Lead Auditor"], ["iso-standards", "workplace-safety"], { group: "iso-auditor" }),
  cert("iso22000-la", "ISO 22000 / FSSC 22000 Lead Auditor", "IRCA / FSSC", "Keyfiyyət və ISO", ["ISO 22000 Lead Auditor", "FSSC 22000"], ["food-safety", "iso-standards"], { group: "iso-auditor" }),
  cert("iso50001-la", "ISO 50001 Lead Auditor", "Various", "Keyfiyyət və ISO", ["EnMS Lead Auditor", "ISO 50001"], ["iso-standards"], { group: "iso-auditor" }),
  cert("iso37001-la", "ISO 37001 Lead Auditor", "Various", "Keyfiyyət və ISO", ["Anti-bribery Management Lead Auditor", "ISO 37001"], ["compliance", "iso-standards"], { group: "iso-auditor" }),
  cert("asq-cqe", "ASQ CQE", "American Society for Quality", "Keyfiyyət və ISO", ["Certified Quality Engineer"], ["quality-assurance", "quality-control"]),
  cert("asq-cqa", "ASQ CQA", "American Society for Quality", "Keyfiyyət və ISO", ["Certified Quality Auditor"], ["quality-assurance", "audit"]),
  cert("asq-cmq", "ASQ CMQ/OE", "American Society for Quality", "Keyfiyyət və ISO", ["Certified Manager of Quality/Organizational Excellence"], ["quality-assurance", "team-management"]),
  cert("asq-cqi", "ASQ CQI / CQT", "American Society for Quality", "Keyfiyyət və ISO", ["Certified Quality Inspector", "Certified Quality Technician"], ["quality-control"]),
  cert("cqi-irca", "CQI Certified Quality Professional", "Chartered Quality Institute", "Keyfiyyət və ISO", ["CQP", "MCQI", "Chartered Quality Professional"], ["quality-assurance"]),

  // Procurement and logistics
  cert("cips", "CIPS", "Chartered Institute of Procurement & Supply", "Satınalma və logistika", ["MCIPS", "FCIPS", "CIPS Diploma", "CIPS Level"], ["procurement", "strategic-sourcing", "supplier-negotiation", "vendor-management"], { levels: ["Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "MCIPS", "FCIPS"], group: "procurement" }),
  cert("cpsm", "CPSM", "Institute for Supply Management", "Satınalma və logistika", ["Certified Professional in Supply Management", "ISM CPSM"], ["procurement", "supply-chain"], { group: "procurement" }),
  cert("cscp", "APICS CSCP", "ASCM", "Satınalma və logistika", ["Certified Supply Chain Professional", "CSCP"], ["supply-chain", "logistics"], { group: "supply-chain" }),
  cert("cpim", "APICS CPIM", "ASCM", "Satınalma və logistika", ["Certified in Planning and Inventory Management", "CPIM"], ["inventory", "production-planning", "supply-chain"], { group: "supply-chain" }),
  cert("cltd", "APICS CLTD", "ASCM", "Satınalma və logistika", ["Certified in Logistics, Transportation and Distribution", "CLTD"], ["logistics", "transport-coordination", "warehouse-management"], { group: "supply-chain" }),
  cert("scpro", "SCPro", "CSCMP", "Satınalma və logistika", ["SCPro Fundamentals", "CSCMP SCPro"], ["supply-chain"], { levels: ["Fundamentals", "Level One", "Level Two", "Level Three"], group: "supply-chain" }),
  cert("cpp-nigp", "CPPB / CPPO", "UPPCC", "Satınalma və logistika", ["Certified Professional Public Buyer", "Certified Public Procurement Officer"], ["procurement", "tender-management"], { group: "procurement" }),
  cert("fiata", "FIATA Diploma in Freight Forwarding", "FIATA", "Satınalma və logistika", ["FIATA Diploma", "Freight Forwarding Diploma"], ["logistics", "customs-import-export"]),
  cert("iata-dgr", "IATA Dangerous Goods Regulations", "IATA", "Satınalma və logistika", ["IATA DGR", "Dangerous Goods Regulations", "DGR Category"], ["logistics", "safety-procedures"]),
  cert("iata-cargo", "IATA Cargo Introductory / Air Cargo", "IATA", "Satınalma və logistika", ["IATA Cargo", "IATA Air Cargo Professional"], ["logistics"]),
  cert("citp", "CITP | FIBP", "Forum for International Trade Training", "Satınalma və logistika", ["Certified International Trade Professional", "CITP"], ["customs-import-export"]),
  cert("ciltuk", "CILT Qualification", "Chartered Institute of Logistics and Transport", "Satınalma və logistika", ["CILT", "CMILT", "FCILT"], ["logistics", "transport-coordination"], { levels: ["Level 2", "Level 3", "Level 5", "Level 6", "Chartered (CMILT)"] }),
  cert("adr", "ADR Driver Certificate", "UNECE ADR", "Satınalma və logistika", ["ADR certificate", "ADR sertifikatı", "dangerous goods driver"], ["transport-coordination", "safety-procedures"]),

  // Human resources and coaching
  cert("cipd", "CIPD", "Chartered Institute of Personnel and Development", "İnsan resursları və kouçinq", ["CIPD Level", "Chartered MCIPD", "Assoc CIPD", "FCIPD"], ["hr-operations", "employee-relations", "learning-development", "labor-law"], { levels: ["Level 3", "Level 5", "Level 7", "Chartered Member", "Chartered Fellow"], group: "hr-professional" }),
  cert("shrm-cp", "SHRM-CP", "Society for Human Resource Management", "İnsan resursları və kouçinq", ["SHRM Certified Professional"], ["hr-operations", "recruitment", "performance-management"], { group: "hr-professional" }),
  cert("shrm-scp", "SHRM-SCP", "Society for Human Resource Management", "İnsan resursları və kouçinq", ["SHRM Senior Certified Professional"], ["hr-operations", "performance-management", "leadership"], { group: "hr-professional" }),
  cert("phr", "PHR", "HR Certification Institute", "İnsan resursları və kouçinq", ["Professional in Human Resources", "HRCI PHR", "PHRi"], ["hr-operations", "labor-law"], { group: "hr-professional" }),
  cert("sphr", "SPHR", "HR Certification Institute", "İnsan resursları və kouçinq", ["Senior Professional in Human Resources", "SPHRi"], ["hr-operations", "leadership"], { group: "hr-professional" }),
  cert("gphr", "GPHR", "HR Certification Institute", "İnsan resursları və kouçinq", ["Global Professional in Human Resources"], ["hr-operations"], { group: "hr-professional" }),
  cert("aphr", "aPHR", "HR Certification Institute", "İnsan resursları və kouçinq", ["Associate Professional in Human Resources"], ["hr-operations"], { group: "hr-professional" }),
  cert("ccp-worldatwork", "CCP (WorldatWork)", "WorldatWork", "İnsan resursları və kouçinq", ["Certified Compensation Professional"], ["compensation-benefits", "payroll"]),
  cert("cebs", "CEBS", "IFEBP", "İnsan resursları və kouçinq", ["Certified Employee Benefit Specialist"], ["compensation-benefits"]),
  cert("aihr", "AIHR Certificate", "Academy to Innovate HR", "İnsan resursları və kouçinq", ["AIHR People Analytics", "AIHR HR Business Partner"], ["hr-analytics", "hr-operations"]),
  cert("linkedin-recruiter", "LinkedIn Certified Professional – Recruiter", "LinkedIn", "İnsan resursları və kouçinq", ["LinkedIn Recruiter Certification"], ["candidate-sourcing", "recruitment"]),
  cert("icf", "ICF Coaching Credential", "International Coaching Federation", "İnsan resursları və kouçinq", ["ICF ACC", "ICF PCC", "ICF MCC", "Associate Certified Coach", "Professional Certified Coach"], ["learning-development", "leadership"], { levels: ["ACC", "PCC", "MCC"] }),
  cert("mbti", "MBTI Certified Practitioner", "The Myers-Briggs Company", "İnsan resursları və kouçinq", ["MBTI Practitioner", "MBTI certification"], ["learning-development"]),
  cert("hogan", "Hogan Assessment Certification", "Hogan Assessments", "İnsan resursları və kouçinq", ["Hogan Certified"], ["assessment", "recruitment"]),
  cert("atd-cptd", "ATD CPTD / APTD", "Association for Talent Development", "İnsan resursları və kouçinq", ["CPTD", "APTD", "Certified Professional in Talent Development"], ["learning-development"]),

  // Marketing and sales
  cert("google-ads", "Google Ads Certification", "Google", "Marketinq və satış", ["Google Ads Search Certification", "Google Ads Display", "Google AdWords certified", "Google Ads certified"], ["google-ads", "sem-ppc", "digital-marketing"]),
  cert("google-analytics", "Google Analytics Certification (GA4)", "Google", "Marketinq və satış", ["Google Analytics Certification", "GA4 Certification", "Google Analytics IQ", "GAIQ"], ["digital-marketing", "data-analysis"]),
  cert("google-digital-marketing", "Google Digital Marketing & E-commerce Professional Certificate", "Google", "Marketinq və satış", ["Google Digital Marketing Certificate", "Fundamentals of Digital Marketing"], ["digital-marketing", "ecommerce"]),
  cert("meta-blueprint", "Meta Certified Digital Marketing Associate", "Meta", "Marketinq və satış", ["Meta Blueprint", "Facebook Blueprint", "Meta Certified Media Buying Professional", "Meta Certified Marketing Science Professional"], ["meta-ads", "social-media", "digital-marketing"], { levels: ["Associate", "Professional"] }),
  cert("hubspot-inbound", "HubSpot Inbound Marketing Certification", "HubSpot Academy", "Marketinq və satış", ["HubSpot Inbound", "HubSpot Content Marketing", "HubSpot Email Marketing", "HubSpot certified"], ["content-planning", "email-marketing", "digital-marketing"]),
  cert("hubspot-sales", "HubSpot Inbound Sales Certification", "HubSpot Academy", "Marketinq və satış", ["HubSpot Sales Software", "HubSpot Inbound Sales"], ["sales", "crm"]),
  cert("cim", "CIM Qualification", "Chartered Institute of Marketing", "Marketinq və satış", ["Chartered Institute of Marketing", "CIM Diploma", "Chartered Marketer"], ["digital-marketing", "market-research"], { levels: ["Level 4 Certificate", "Level 6 Diploma", "Level 7 Postgraduate Diploma", "Chartered Marketer"] }),
  cert("dmi", "DMI Professional Diploma in Digital Marketing", "Digital Marketing Institute", "Marketinq və satış", ["DMI", "Digital Marketing Institute"], ["digital-marketing", "seo", "social-media"]),
  cert("semrush-seo", "Semrush SEO Certification", "Semrush Academy", "Marketinq və satış", ["Semrush SEO", "Semrush Academy"], ["seo"]),
  cert("hootsuite", "Hootsuite Social Marketing Certification", "Hootsuite Academy", "Marketinq və satış", ["Hootsuite Certified"], ["social-media"]),
  cert("salesforce-marketing", "Salesforce Marketing Cloud Certification", "Salesforce", "Marketinq və satış", ["Marketing Cloud Email Specialist", "Marketing Cloud Consultant"], ["email-marketing", "crm"]),
  cert("csp-sales", "Certified Sales Professional (CSP)", "NASP / ISMM", "Marketinq və satış", ["Certified Sales Professional", "ISMM Diploma"], ["sales", "negotiation"]),
  cert("cpsp-sales", "Certified Professional Sales Person (CPSP)", "National Association of Sales Professionals", "Marketinq və satış", ["CPSP"], ["sales"]),
  cert("prca", "CIPR / PRCA Qualification", "Chartered Institute of Public Relations", "Marketinq və satış", ["CIPR Diploma", "Chartered PR Practitioner"], ["public-relations"]),
  cert("amazon-ads", "Amazon Ads Certification", "Amazon", "Marketinq və satış", ["Amazon Advertising certification"], ["ecommerce", "sem-ppc"]),
  cert("tiktok-ads", "TikTok Academy Certification", "TikTok", "Marketinq və satış", ["TikTok Ads certification"], ["social-media", "digital-marketing"]),

  // Cloud
  cert("aws-ccp", "AWS Certified Cloud Practitioner", "Amazon Web Services", "Bulud texnologiyaları", ["AWS Cloud Practitioner", "AWS CCP"], ["cloud-computing"], { group: "aws" }),
  cert("aws-saa", "AWS Certified Solutions Architect", "Amazon Web Services", "Bulud texnologiyaları", ["AWS Solutions Architect Associate", "AWS Solutions Architect Professional", "AWS SAA", "SAA-C03", "AWS SAP"], ["cloud-computing", "devops"], { levels: AWS_ASSOC, group: "aws" }),
  cert("aws-developer", "AWS Certified Developer – Associate", "Amazon Web Services", "Bulud texnologiyaları", ["AWS Developer Associate", "AWS DVA"], ["cloud-computing", "api"], { group: "aws" }),
  cert("aws-sysops", "AWS Certified SysOps Administrator – Associate", "Amazon Web Services", "Bulud texnologiyaları", ["AWS SysOps", "AWS CloudOps Engineer"], ["cloud-computing", "system-administration"], { group: "aws" }),
  cert("aws-devops", "AWS Certified DevOps Engineer – Professional", "Amazon Web Services", "Bulud texnologiyaları", ["AWS DevOps Professional", "AWS DOP"], ["devops", "ci-cd", "cloud-computing"], { group: "aws" }),
  cert("aws-security", "AWS Certified Security – Specialty", "Amazon Web Services", "Bulud texnologiyaları", ["AWS Security Specialty"], ["cybersecurity", "cloud-computing"], { group: "aws" }),
  cert("aws-data-engineer", "AWS Certified Data Engineer – Associate", "Amazon Web Services", "Bulud texnologiyaları", ["AWS Data Engineer", "AWS Data Analytics Specialty"], ["data-engineering", "cloud-computing"], { group: "aws" }),
  cert("aws-ml", "AWS Certified Machine Learning", "Amazon Web Services", "Bulud texnologiyaları", ["AWS Machine Learning Specialty", "AWS ML Engineer Associate", "AWS AI Practitioner"], ["machine-learning", "cloud-computing"], { group: "aws" }),
  cert("aws-networking", "AWS Certified Advanced Networking – Specialty", "Amazon Web Services", "Bulud texnologiyaları", ["AWS Advanced Networking"], ["network-administration", "cloud-computing"], { group: "aws" }),
  cert("az-900", "Microsoft Certified: Azure Fundamentals (AZ-900)", "Microsoft", "Bulud texnologiyaları", ["AZ-900", "Azure Fundamentals"], ["cloud-computing"], { group: "azure" }),
  cert("az-104", "Microsoft Certified: Azure Administrator Associate (AZ-104)", "Microsoft", "Bulud texnologiyaları", ["AZ-104", "Azure Administrator"], ["cloud-computing", "system-administration"], { group: "azure" }),
  cert("az-204", "Microsoft Certified: Azure Developer Associate (AZ-204)", "Microsoft", "Bulud texnologiyaları", ["AZ-204", "Azure Developer"], ["cloud-computing", "dotnet", "api"], { group: "azure" }),
  cert("az-305", "Microsoft Certified: Azure Solutions Architect Expert (AZ-305)", "Microsoft", "Bulud texnologiyaları", ["AZ-305", "AZ-303", "Azure Solutions Architect"], ["cloud-computing"], { group: "azure" }),
  cert("az-400", "Microsoft Certified: DevOps Engineer Expert (AZ-400)", "Microsoft", "Bulud texnologiyaları", ["AZ-400", "Azure DevOps Engineer"], ["devops", "ci-cd"], { group: "azure" }),
  cert("az-500", "Microsoft Certified: Azure Security Engineer Associate (AZ-500)", "Microsoft", "Bulud texnologiyaları", ["AZ-500", "Azure Security Engineer"], ["cybersecurity", "cloud-computing"], { group: "azure" }),
  cert("az-700", "Microsoft Certified: Azure Network Engineer Associate (AZ-700)", "Microsoft", "Bulud texnologiyaları", ["AZ-700"], ["network-administration", "cloud-computing"], { group: "azure" }),
  cert("gcp-cdl", "Google Cloud Digital Leader", "Google Cloud", "Bulud texnologiyaları", ["Cloud Digital Leader"], ["cloud-computing"], { group: "gcp" }),
  cert("gcp-ace", "Google Associate Cloud Engineer", "Google Cloud", "Bulud texnologiyaları", ["Associate Cloud Engineer", "GCP ACE"], ["cloud-computing"], { group: "gcp" }),
  cert("gcp-pca", "Google Professional Cloud Architect", "Google Cloud", "Bulud texnologiyaları", ["Professional Cloud Architect", "GCP PCA"], ["cloud-computing"], { group: "gcp" }),
  cert("gcp-pde", "Google Professional Data Engineer", "Google Cloud", "Bulud texnologiyaları", ["Professional Data Engineer"], ["data-engineering", "cloud-computing"], { group: "gcp" }),
  cert("gcp-pmle", "Google Professional Machine Learning Engineer", "Google Cloud", "Bulud texnologiyaları", ["Professional Machine Learning Engineer"], ["machine-learning", "cloud-computing"], { group: "gcp" }),
  cert("gcp-devops", "Google Professional Cloud DevOps Engineer", "Google Cloud", "Bulud texnologiyaları", ["Professional Cloud DevOps Engineer"], ["devops", "cloud-computing"], { group: "gcp" }),
  cert("gcp-security", "Google Professional Cloud Security Engineer", "Google Cloud", "Bulud texnologiyaları", ["Professional Cloud Security Engineer"], ["cybersecurity", "cloud-computing"], { group: "gcp" }),
  cert("oci", "Oracle Cloud Infrastructure Certification", "Oracle", "Bulud texnologiyaları", ["OCI Foundations", "OCI Architect", "Oracle Cloud Infrastructure"], ["cloud-computing"], { levels: ["Foundations", "Associate", "Professional"] }),
  cert("cka", "Certified Kubernetes Administrator (CKA)", "CNCF / Linux Foundation", "Bulud texnologiyaları", ["CKA"], ["kubernetes", "devops"], { group: "kubernetes" }),
  cert("ckad", "Certified Kubernetes Application Developer (CKAD)", "CNCF / Linux Foundation", "Bulud texnologiyaları", ["CKAD"], ["kubernetes", "docker"], { group: "kubernetes" }),
  cert("cks", "Certified Kubernetes Security Specialist (CKS)", "CNCF / Linux Foundation", "Bulud texnologiyaları", ["CKS"], ["kubernetes", "cybersecurity"], { group: "kubernetes" }),
  cert("terraform", "HashiCorp Certified: Terraform Associate", "HashiCorp", "Bulud texnologiyaları", ["Terraform Associate", "HashiCorp Terraform"], ["devops", "cloud-computing"]),
  cert("docker-dca", "Docker Certified Associate (DCA)", "Docker / Mirantis", "Bulud texnologiyaları", ["Docker Certified Associate", "DCA Docker"], ["docker", "devops"]),

  // IT, networking and development
  cert("comptia-a", "CompTIA A+", "CompTIA", "İT, şəbəkə və proqramlaşdırma", ["A+ certification", "CompTIA A plus"], ["technical-support", "system-administration"]),
  cert("comptia-network", "CompTIA Network+", "CompTIA", "İT, şəbəkə və proqramlaşdırma", ["Network+", "Network plus"], ["network-administration"]),
  cert("comptia-linux", "CompTIA Linux+", "CompTIA", "İT, şəbəkə və proqramlaşdırma", ["Linux+"], ["linux", "system-administration"]),
  cert("comptia-cloud", "CompTIA Cloud+", "CompTIA", "İT, şəbəkə və proqramlaşdırma", ["Cloud+"], ["cloud-computing"]),
  cert("comptia-server", "CompTIA Server+", "CompTIA", "İT, şəbəkə və proqramlaşdırma", ["Server+"], ["system-administration", "windows-server"]),
  cert("comptia-project", "CompTIA Project+", "CompTIA", "İT, şəbəkə və proqramlaşdırma", ["Project+"], ["project-management"], { group: "project-management" }),
  cert("ccna", "Cisco CCNA", "Cisco", "İT, şəbəkə və proqramlaşdırma", ["CCNA", "Cisco Certified Network Associate"], ["network-administration"], { group: "cisco" }),
  cert("ccnp", "Cisco CCNP", "Cisco", "İT, şəbəkə və proqramlaşdırma", ["CCNP", "Cisco Certified Network Professional", "CCNP Enterprise", "CCNP Security"], ["network-administration"], { group: "cisco" }),
  cert("ccie", "Cisco CCIE", "Cisco", "İT, şəbəkə və proqramlaşdırma", ["CCIE", "Cisco Certified Internetwork Expert"], ["network-administration"], { group: "cisco" }),
  cert("ccst", "Cisco CCST", "Cisco", "İT, şəbəkə və proqramlaşdırma", ["CCST", "Cisco Certified Support Technician"], ["technical-support", "network-administration"], { group: "cisco" }),
  cert("cisco-devnet", "Cisco DevNet Associate", "Cisco", "İT, şəbəkə və proqramlaşdırma", ["DevNet Associate", "DevNet Professional"], ["network-administration", "python", "api"], { group: "cisco" }),
  cert("jncia", "Juniper JNCIA / JNCIS / JNCIP", "Juniper Networks", "İT, şəbəkə və proqramlaşdırma", ["JNCIA", "JNCIS", "JNCIP", "JNCIE"], ["network-administration"], { levels: ["JNCIA", "JNCIS", "JNCIP", "JNCIE"] }),
  cert("mikrotik", "MikroTik Certification (MTCNA)", "MikroTik", "İT, şəbəkə və proqramlaşdırma", ["MTCNA", "MTCRE", "MikroTik certified"], ["network-administration"]),
  cert("fortinet-nse", "Fortinet NSE", "Fortinet", "İT, şəbəkə və proqramlaşdırma", ["NSE 4", "Fortinet Certified Professional", "FCP", "FCSS"], ["network-administration", "cybersecurity"], { levels: ["Associate", "Professional (FCP)", "Solution Specialist (FCSS)", "Expert (FCX)"] }),
  cert("palo-alto", "Palo Alto Networks PCNSA / PCNSE", "Palo Alto Networks", "İT, şəbəkə və proqramlaşdırma", ["PCNSA", "PCNSE"], ["network-administration", "cybersecurity"]),
  cert("vmware-vcp", "VMware Certified Professional (VCP)", "VMware / Broadcom", "İT, şəbəkə və proqramlaşdırma", ["VCP-DCV", "VMware VCP", "VCAP"], ["virtualization", "system-administration"]),
  cert("rhcsa", "Red Hat Certified System Administrator (RHCSA)", "Red Hat", "İT, şəbəkə və proqramlaşdırma", ["RHCSA"], ["linux", "system-administration"], { group: "linux-admin" }),
  cert("rhce", "Red Hat Certified Engineer (RHCE)", "Red Hat", "İT, şəbəkə və proqramlaşdırma", ["RHCE"], ["linux", "bash", "devops"], { group: "linux-admin" }),
  cert("lpic", "LPIC", "Linux Professional Institute", "İT, şəbəkə və proqramlaşdırma", ["LPIC-1", "LPIC-2", "LPIC-3", "Linux Essentials"], ["linux", "system-administration"], { levels: ["Linux Essentials", "LPIC-1", "LPIC-2", "LPIC-3"], group: "linux-admin" }),
  cert("lfcs", "Linux Foundation Certified System Administrator (LFCS)", "Linux Foundation", "İT, şəbəkə və proqramlaşdırma", ["LFCS"], ["linux", "system-administration"], { group: "linux-admin" }),
  cert("ms-windows-server", "Microsoft Certified: Windows Server Hybrid Administrator (AZ-800/801)", "Microsoft", "İT, şəbəkə və proqramlaşdırma", ["AZ-800", "AZ-801", "MCSA Windows Server", "MCSE"], ["windows-server", "active-directory"]),
  cert("ms-365", "Microsoft 365 Certified", "Microsoft", "İT, şəbəkə və proqramlaşdırma", ["MS-900", "MS-102", "Microsoft 365 Administrator", "Modern Desktop Administrator", "MD-102"], ["system-administration", "microsoft-office"], { levels: ["Fundamentals", "Associate", "Expert"] }),
  cert("itil", "ITIL 4", "PeopleCert / AXELOS", "İT, şəbəkə və proqramlaşdırma", ["ITIL Foundation", "ITIL v3", "ITIL Managing Professional", "ITIL Strategic Leader"], ["technical-support", "process-improvement"], { levels: ["Foundation", "Specialist", "Managing Professional", "Strategic Leader", "Master"] }),
  cert("cobit", "COBIT 2019", "ISACA", "İT, şəbəkə və proqramlaşdırma", ["COBIT Foundation", "COBIT Design and Implementation"], ["internal-control", "risk-management"]),
  cert("togaf", "TOGAF", "The Open Group", "İT, şəbəkə və proqramlaşdırma", ["TOGAF 9", "TOGAF Enterprise Architecture", "TOGAF Certified"], ["business-analysis"], { levels: ["Foundation", "Practitioner"] }),
  cert("istqb", "ISTQB", "International Software Testing Qualifications Board", "İT, şəbəkə və proqramlaşdırma", ["ISTQB Foundation", "ISTQB CTFL", "ISTQB Advanced", "CTAL"], ["software-testing", "test-automation"], { levels: ["Foundation (CTFL)", "Advanced (CTAL)", "Expert"] }),
  cert("oracle-java", "Oracle Certified Professional: Java SE", "Oracle", "İT, şəbəkə və proqramlaşdırma", ["OCP Java", "OCA Java", "Oracle Java Certification", "Java SE 17 Developer"], ["java"], { levels: ["Associate (OCA)", "Professional (OCP)"] }),
  cert("oracle-db", "Oracle Database Certification", "Oracle", "İT, şəbəkə və proqramlaşdırma", ["Oracle Database Administrator", "OCP DBA", "Oracle SQL Certified Associate"], ["database-administration", "sql"], { levels: ["Associate", "Professional", "Master"] }),
  cert("ms-dotnet", "Microsoft Certified: .NET / C# Developer", "Microsoft", "İT, şəbəkə və proqramlaşdırma", ["Foundational C# with Microsoft", "MCSD", "Microsoft C# certification"], ["dotnet"]),
  cert("ms-sql", "Microsoft Certified: Azure Database Administrator (DP-300)", "Microsoft", "İT, şəbəkə və proqramlaşdırma", ["DP-300", "MCSA SQL Server"], ["mssql", "database-administration"]),
  cert("pcep", "Python Institute PCEP / PCAP / PCPP", "Python Institute", "İT, şəbəkə və proqramlaşdırma", ["PCEP", "PCAP", "PCPP", "Certified Python Programmer"], ["python"], { levels: ["PCEP (Entry)", "PCAP (Associate)", "PCPP1", "PCPP2"] }),
  cert("meta-frontend", "Meta Front-End Developer Professional Certificate", "Meta / Coursera", "İT, şəbəkə və proqramlaşdırma", ["Meta Front-End Developer"], ["javascript", "react", "html-css"]),
  cert("meta-backend", "Meta Back-End Developer Professional Certificate", "Meta / Coursera", "İT, şəbəkə və proqramlaşdırma", ["Meta Back-End Developer"], ["python", "django", "api"]),
  cert("google-it-support", "Google IT Support Professional Certificate", "Google / Coursera", "İT, şəbəkə və proqramlaşdırma", ["Google IT Support"], ["technical-support"]),
  cert("google-it-automation", "Google IT Automation with Python", "Google / Coursera", "İT, şəbəkə və proqramlaşdırma", ["Google IT Automation"], ["python", "bash"]),
  cert("github", "GitHub Certification", "GitHub", "İT, şəbəkə və proqramlaşdırma", ["GitHub Foundations", "GitHub Actions", "GitHub Advanced Security", "GitHub Administration"], ["git", "ci-cd"]),
  cert("salesforce-admin", "Salesforce Certified Administrator", "Salesforce", "İT, şəbəkə və proqramlaşdırma", ["Salesforce Administrator", "Salesforce Platform Developer", "Salesforce certified"], ["crm"], { levels: ["Associate", "Administrator", "Advanced Administrator", "Platform Developer"] }),
  cert("sap-certified", "SAP Certified Associate", "SAP", "İT, şəbəkə və proqramlaşdırma", ["SAP Certified Application Associate", "SAP Certified Consultant", "SAP S/4HANA certification"], ["sap"]),
  cert("sap-fico", "SAP Certified – Financial Accounting / Management Accounting (FI/CO)", "SAP", "İT, şəbəkə və proqramlaşdırma", ["SAP FI certification", "SAP CO certification", "SAP FICO certified"], ["sap-fi-co", "sap", "accounting"]),
  cert("sap-mm", "SAP Certified – Sourcing and Procurement (MM)", "SAP", "İT, şəbəkə və proqramlaşdırma", ["SAP MM certification", "SAP Ariba certification"], ["sap", "procurement"]),
  cert("oracle-erp-cert", "Oracle ERP Cloud Certification", "Oracle", "İT, şəbəkə və proqramlaşdırma", ["Oracle Financials Cloud", "Oracle Fusion certified"], ["oracle-erp"]),
  cert("1c-specialist", "1C:Peşəkar / 1C:Mütəxəssis", "1C", "İT, şəbəkə və proqramlaşdırma", ["1C:Специалист", "1C:Профессионал", "1C Professional", "1C Specialist", "1C sertifikatı"], ["1c", "accounting"], { levels: ["1C:Peşəkar", "1C:Mütəxəssis"] }),
  cert("unity", "Unity Certified", "Unity", "İT, şəbəkə və proqramlaşdırma", ["Unity Certified User", "Unity Certified Programmer"], ["mobile-development"], { levels: ["User", "Associate", "Professional"] }),
  cert("apple-dev", "Apple App Development with Swift", "Apple", "İT, şəbəkə və proqramlaşdırma", ["App Development with Swift Certified User", "Swift certification"], ["mobile-development"]),
  cert("android-dev", "Associate Android Developer", "Google", "İT, şəbəkə və proqramlaşdırma", ["Google Associate Android Developer"], ["mobile-development"]),

  // Data and AI
  cert("pl-300", "Microsoft Certified: Power BI Data Analyst (PL-300)", "Microsoft", "Məlumat və süni intellekt", ["PL-300", "DA-100", "Power BI Data Analyst", "Power BI certification"], ["power-bi", "data-analysis"]),
  cert("pl-900", "Microsoft Certified: Power Platform Fundamentals (PL-900)", "Microsoft", "Məlumat və süni intellekt", ["PL-900", "Power Platform"], ["data-analysis"]),
  cert("dp-203", "Microsoft Certified: Azure Data Engineer / Fabric Data Engineer", "Microsoft", "Məlumat və süni intellekt", ["DP-203", "DP-700", "DP-600", "Fabric Analytics Engineer"], ["data-engineering", "etl-elt"]),
  cert("dp-100", "Microsoft Certified: Azure Data Scientist (DP-100)", "Microsoft", "Məlumat və süni intellekt", ["DP-100"], ["machine-learning", "data-science"]),
  cert("ai-102", "Microsoft Certified: Azure AI Engineer (AI-102)", "Microsoft", "Məlumat və süni intellekt", ["AI-102", "AI-900", "Azure AI Fundamentals"], ["artificial-intelligence", "machine-learning"], { levels: ["Fundamentals (AI-900)", "Associate (AI-102)"] }),
  cert("tableau", "Tableau Certification", "Tableau / Salesforce", "Məlumat və süni intellekt", ["Tableau Desktop Specialist", "Tableau Certified Data Analyst", "Tableau Desktop Certified"], ["tableau", "data-analysis"], { levels: ["Specialist", "Data Analyst", "Consultant", "Architect"] }),
  cert("qlik", "Qlik Sense Certification", "Qlik", "Məlumat və süni intellekt", ["Qlik Sense Business Analyst", "Qlik Sense Data Architect"], ["qlik", "data-analysis"]),
  cert("google-data-analytics", "Google Data Analytics Professional Certificate", "Google / Coursera", "Məlumat və süni intellekt", ["Google Data Analytics Certificate", "Google Advanced Data Analytics"], ["data-analysis", "sql", "tableau"]),
  cert("ibm-data-science", "IBM Data Science Professional Certificate", "IBM / Coursera", "Məlumat və süni intellekt", ["IBM Data Science", "IBM Data Analyst Professional Certificate"], ["data-science", "python", "sql"]),
  cert("databricks", "Databricks Certified", "Databricks", "Məlumat və süni intellekt", ["Databricks Data Engineer Associate", "Databricks Data Engineer Professional", "Databricks Machine Learning"], ["data-engineering", "apache-spark"], { levels: ["Associate", "Professional"] }),
  cert("snowflake", "SnowPro Certification", "Snowflake", "Məlumat və süni intellekt", ["SnowPro Core", "SnowPro Advanced"], ["data-warehouse", "sql"], { levels: ["Core", "Advanced"] }),
  cert("cloudera", "Cloudera Certified", "Cloudera", "Məlumat və süni intellekt", ["CCA Spark and Hadoop", "Cloudera Data Platform"], ["data-engineering", "apache-spark"]),
  cert("confluent-kafka", "Confluent Certified Developer for Apache Kafka", "Confluent", "Məlumat və süni intellekt", ["CCDAK", "Confluent Kafka certification"], ["apache-kafka"]),
  cert("dbt-cert", "dbt Analytics Engineering Certification", "dbt Labs", "Məlumat və süni intellekt", ["dbt certified"], ["dbt", "data-modeling"]),
  cert("tensorflow", "TensorFlow Developer Certificate", "Google", "Məlumat və süni intellekt", ["TensorFlow Certificate"], ["machine-learning", "python"]),
  cert("deeplearning-ai", "DeepLearning.AI Specialization", "DeepLearning.AI / Coursera", "Məlumat və süni intellekt", ["Deep Learning Specialization", "Machine Learning Specialization", "Generative AI with LLMs"], ["machine-learning", "llm"]),
  cert("sas", "SAS Certified", "SAS Institute", "Məlumat və süni intellekt", ["SAS Certified Specialist", "SAS Base Programmer", "SAS Certified Data Scientist"], ["data-analysis", "data-science"]),
  cert("cap-informs", "Certified Analytics Professional (CAP)", "INFORMS", "Məlumat və süni intellekt", ["INFORMS CAP", "aCAP"], ["data-analysis"]),
  cert("cdmp", "CDMP", "DAMA International", "Məlumat və süni intellekt", ["Certified Data Management Professional", "DAMA CDMP"], ["data-quality", "data-modeling"], { levels: ["Associate", "Practitioner", "Master", "Fellow"] }),

  // Cybersecurity, IT audit and privacy
  cert("cissp", "CISSP", "ISC2", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Certified Information Systems Security Professional", "ISC2 CISSP"], ["cybersecurity", "risk-management"], { group: "security-management" }),
  cert("cism", "CISM", "ISACA", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Certified Information Security Manager"], ["cybersecurity", "risk-management"], { group: "security-management" }),
  cert("cisa", "CISA", "ISACA", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Certified Information Systems Auditor"], ["audit", "internal-control", "cybersecurity"]),
  cert("crisc", "CRISC", "ISACA", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Certified in Risk and Information Systems Control"], ["risk-management", "internal-control"]),
  cert("cgeit", "CGEIT", "ISACA", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Certified in the Governance of Enterprise IT"], ["internal-control"]),
  cert("cdpse", "CDPSE", "ISACA", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Certified Data Privacy Solutions Engineer"], ["compliance", "cybersecurity"], { group: "privacy" }),
  cert("ccsp", "CCSP", "ISC2", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Certified Cloud Security Professional"], ["cybersecurity", "cloud-computing"]),
  cert("sscp", "SSCP", "ISC2", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Systems Security Certified Practitioner"], ["cybersecurity"]),
  cert("isc2-cc", "ISC2 Certified in Cybersecurity (CC)", "ISC2", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Certified in Cybersecurity", "ISC2 CC"], ["cybersecurity"]),
  cert("comptia-security", "CompTIA Security+", "CompTIA", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Security+", "Security plus", "SY0-701"], ["cybersecurity"]),
  cert("comptia-cysa", "CompTIA CySA+", "CompTIA", "Kibertəhlükəsizlik, İT audit və məxfilik", ["CySA+", "Cybersecurity Analyst+"], ["cybersecurity"]),
  cert("comptia-pentest", "CompTIA PenTest+", "CompTIA", "Kibertəhlükəsizlik, İT audit və məxfilik", ["PenTest+"], ["cybersecurity"]),
  cert("comptia-casp", "CompTIA SecurityX (CASP+)", "CompTIA", "Kibertəhlükəsizlik, İT audit və məxfilik", ["CASP+", "SecurityX"], ["cybersecurity"]),
  cert("ceh", "Certified Ethical Hacker (CEH)", "EC-Council", "Kibertəhlükəsizlik, İT audit və məxfilik", ["CEH", "EC-Council CEH"], ["cybersecurity"]),
  cert("chfi", "CHFI", "EC-Council", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Computer Hacking Forensic Investigator"], ["cybersecurity"]),
  cert("ecih", "EC-Council ECIH / CSA", "EC-Council", "Kibertəhlükəsizlik, İT audit və məxfilik", ["ECIH", "Certified SOC Analyst", "CSA EC-Council"], ["cybersecurity"]),
  cert("oscp", "OSCP", "OffSec", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Offensive Security Certified Professional", "OSCP+", "OSEP", "OSWE", "OSCE3"], ["cybersecurity"]),
  cert("ejpt", "eJPT / eCPPT", "INE Security", "Kibertəhlükəsizlik, İT audit və məxfilik", ["eJPT", "eCPPT", "eLearnSecurity"], ["cybersecurity"]),
  cert("giac", "GIAC Certification", "GIAC / SANS", "Kibertəhlükəsizlik, İT audit və məxfilik", ["GSEC", "GCIH", "GPEN", "GCIA", "GCFA", "GIAC certified"], ["cybersecurity"]),
  cert("iso27001-la", "ISO/IEC 27001 Lead Auditor / Lead Implementer", "PECB / IRCA", "Kibertəhlükəsizlik, İT audit və məxfilik", ["ISO 27001 Lead Auditor", "ISO 27001 Lead Implementer", "ISMS Lead Auditor"], ["cybersecurity", "iso-standards", "audit"], { group: "iso-auditor" }),
  cert("iso22301", "ISO 22301 Lead Implementer", "PECB", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Business Continuity Lead Implementer", "ISO 22301"], ["risk-management", "backup-recovery"]),
  cert("cbcp", "CBCP", "DRI International", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Certified Business Continuity Professional"], ["risk-management", "backup-recovery"]),
  cert("pci-isa", "PCI Professional (PCIP / ISA / QSA)", "PCI Security Standards Council", "Kibertəhlükəsizlik, İT audit və məxfilik", ["PCIP", "PCI QSA", "PCI ISA", "PCI DSS certified"], ["cybersecurity", "compliance"]),
  cert("cipp", "CIPP (IAPP)", "International Association of Privacy Professionals", "Kibertəhlükəsizlik, İT audit və məxfilik", ["CIPP/E", "CIPP/US", "Certified Information Privacy Professional", "IAPP"], ["compliance", "legal"], { group: "privacy" }),
  cert("cipm", "CIPM (IAPP)", "International Association of Privacy Professionals", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Certified Information Privacy Manager"], ["compliance"], { group: "privacy" }),
  cert("cipt", "CIPT (IAPP)", "International Association of Privacy Professionals", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Certified Information Privacy Technologist"], ["compliance", "cybersecurity"], { group: "privacy" }),
  cert("aigp", "AIGP (IAPP)", "International Association of Privacy Professionals", "Kibertəhlükəsizlik, İT audit və məxfilik", ["Artificial Intelligence Governance Professional"], ["compliance", "artificial-intelligence"]),

  // HSE and oil & gas safety
  cert("nebosh-igc", "NEBOSH International General Certificate", "NEBOSH", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["NEBOSH IGC", "NEBOSH General Certificate", "NEBOSH"], ["workplace-safety", "risk-assessment", "safety-procedures"], { group: "nebosh" }),
  cert("nebosh-diploma", "NEBOSH International Diploma", "NEBOSH", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["NEBOSH IDip", "NEBOSH Diploma"], ["workplace-safety", "risk-assessment"], { group: "nebosh" }),
  cert("nebosh-process", "NEBOSH Process Safety Management", "NEBOSH", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["NEBOSH PSM", "NEBOSH Oil and Gas", "NEBOSH IOGC"], ["workplace-safety", "process-engineering"], { group: "nebosh" }),
  cert("nebosh-env", "NEBOSH Environmental Management Certificate", "NEBOSH", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["NEBOSH EMC", "NEBOSH Environmental"], ["workplace-safety"], { group: "nebosh" }),
  cert("nebosh-fire", "NEBOSH Fire Safety Certificate", "NEBOSH", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["NEBOSH Fire"], ["safety-procedures"], { group: "nebosh" }),
  cert("iosh-ms", "IOSH Managing Safely", "Institution of Occupational Safety and Health", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["IOSH", "IOSH Managing Safely", "IOSH Working Safely", "CMIOSH", "Chartered Member of IOSH"], ["workplace-safety", "safety-procedures"], { levels: ["Working Safely", "Managing Safely", "Technical Member", "Chartered (CMIOSH)"] }),
  cert("osha", "OSHA Outreach Training", "US Occupational Safety and Health Administration", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["OSHA 10", "OSHA 30", "OSHA 10-Hour", "OSHA 30-Hour"], ["workplace-safety"], { levels: ["10-Hour", "30-Hour"] }),
  cert("csp-bcsp", "CSP / ASP (BCSP)", "Board of Certified Safety Professionals", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["Certified Safety Professional", "Associate Safety Professional", "BCSP"], ["workplace-safety", "risk-assessment"]),
  cert("opito-bosiet", "OPITO BOSIET / FOET", "OPITO", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["BOSIET", "FOET", "T-BOSIET", "CA-EBS", "Basic Offshore Safety Induction"], ["safety-procedures", "workplace-safety"]),
  cert("opito-huet", "OPITO HUET", "OPITO", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["HUET", "Helicopter Underwater Escape Training"], ["safety-procedures"]),
  cert("opito-other", "OPITO Approved Training (H2S, MIST, Fire Team)", "OPITO", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["H2S training", "MIST", "OPITO Fire Team", "OPITO certificate"], ["safety-procedures"]),
  cert("iwcf", "IWCF Well Control", "International Well Control Forum", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["IWCF", "IWCF Drilling Well Control", "IWCF Level 3", "IWCF Level 4"], ["safety-procedures", "risk-assessment"], { levels: ["Level 2", "Level 3 (Driller)", "Level 4 (Supervisor)"], group: "well-control" }),
  cert("iadc-wellsharp", "IADC WellSharp", "International Association of Drilling Contractors", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["WellSharp", "IADC Well Control"], ["safety-procedures"], { levels: ["Introductory", "Driller", "Supervisor"], group: "well-control" }),
  cert("iadc-rigpass", "IADC RigPass", "International Association of Drilling Contractors", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["RigPass"], ["safety-procedures"]),
  cert("gwo", "GWO Basic Safety Training", "Global Wind Organisation", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["GWO BST", "Global Wind Organisation"], ["safety-procedures"]),
  cert("first-aid", "First Aid / CPR Certificate", "Red Cross / EFR / St John Ambulance", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["First Aid at Work", "Emergency First Response", "EFR", "CPR certified", "İlk tibbi yardım sertifikatı"], ["safety-procedures"]),
  cert("working-at-height", "Working at Height / Confined Space", "IPAF / IRATA / Various", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["Working at Height", "Confined Space Entry", "IRATA", "IPAF", "Rope Access"], ["safety-procedures"], { levels: ["Level 1", "Level 2", "Level 3"] }),
  cert("leea-rigging", "LEEA / Rigging and Lifting Certificate", "LEEA / OPITO", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["LEEA", "Rigger certificate", "Banksman Slinger", "Crane Operator certificate"], ["safety-procedures", "mechanical-maintenance"]),
  cert("nfpa", "NFPA Certification", "National Fire Protection Association", "Əməyin mühafizəsi və neft-qaz təhlükəsizliyi", ["CFPS", "Certified Fire Protection Specialist", "NFPA certified"], ["safety-procedures"]),

  // Engineering, inspection and energy
  cert("pe-license", "Professional Engineer (PE)", "NCEES", "Mühəndislik, inspeksiya və enerji", ["PE license", "Licensed Professional Engineer", "FE exam", "EIT"], ["civil-engineering", "electrical-engineering"], { levels: ["FE / EIT", "PE"], group: "chartered-engineer" }),
  cert("ceng", "Chartered Engineer (CEng)", "Engineering Council UK", "Mühəndislik, inspeksiya və enerji", ["CEng", "IEng", "EngTech", "MIET", "MIMechE", "MICE"], ["process-engineering", "technical-documentation"], { levels: ["EngTech", "IEng", "CEng"], group: "chartered-engineer" }),
  cert("api-510", "API 510 Pressure Vessel Inspector", "American Petroleum Institute", "Mühəndislik, inspeksiya və enerji", ["API 510"], ["quality-control", "mechanical-maintenance"], { group: "api-inspector" }),
  cert("api-570", "API 570 Piping Inspector", "American Petroleum Institute", "Mühəndislik, inspeksiya və enerji", ["API 570"], ["quality-control", "mechanical-maintenance"], { group: "api-inspector" }),
  cert("api-653", "API 653 Aboveground Storage Tank Inspector", "American Petroleum Institute", "Mühəndislik, inspeksiya və enerji", ["API 653"], ["quality-control"], { group: "api-inspector" }),
  cert("api-580", "API 580 / 571 Risk Based Inspection", "American Petroleum Institute", "Mühəndislik, inspeksiya və enerji", ["API 580", "API 571", "API 577", "API 1169"], ["quality-control", "risk-assessment"], { group: "api-inspector" }),
  cert("cswip", "CSWIP Welding Inspector", "TWI", "Mühəndislik, inspeksiya və enerji", ["CSWIP 3.1", "CSWIP 3.2", "CSWIP 3.0", "TWI CSWIP"], ["quality-control"], { levels: ["3.0 Visual", "3.1 Welding Inspector", "3.2 Senior Welding Inspector"], group: "welding-inspector" }),
  cert("aws-cwi", "AWS Certified Welding Inspector (CWI)", "American Welding Society", "Mühəndislik, inspeksiya və enerji", ["Certified Welding Inspector", "AWS CWI", "AWS SCWI"], ["quality-control"], { group: "welding-inspector" }),
  cert("iiw-welding", "IIW / EWF Welding Engineer", "International Institute of Welding", "Mühəndislik, inspeksiya və enerji", ["IWE", "IWT", "IWS", "International Welding Engineer"], ["quality-control", "process-engineering"], { levels: ["IWP", "IWS", "IWT", "IWE"] }),
  cert("welder-qualification", "Welder Qualification (ASME IX / ISO 9606)", "ASME / ISO", "Mühəndislik, inspeksiya və enerji", ["ASME IX", "ISO 9606", "6G welder", "qaynaqçı sertifikatı"], ["mechanical-maintenance"]),
  cert("asnt-ndt", "ASNT NDT Level", "American Society for Nondestructive Testing", "Mühəndislik, inspeksiya və enerji", ["ASNT Level II", "ASNT Level III", "NDT Level 2", "UT Level II", "RT Level II", "MT PT Level II", "SNT-TC-1A"], ["quality-control"], { levels: ["Level I", "Level II", "Level III"], group: "ndt" }),
  cert("pcn-ndt", "PCN / ISO 9712 NDT", "BINDT", "Mühəndislik, inspeksiya və enerji", ["PCN Level 2", "ISO 9712", "BINDT PCN"], ["quality-control"], { levels: ["Level 1", "Level 2", "Level 3"], group: "ndt" }),
  cert("ampp-coating", "AMPP / NACE Coating Inspector (CIP)", "AMPP", "Mühəndislik, inspeksiya və enerji", ["NACE CIP", "NACE Coating Inspector", "AMPP Certified Coating Inspector", "FROSIO"], ["quality-control"], { levels: ["Level 1", "Level 2", "Level 3 (Peer Review)"] }),
  cert("ampp-corrosion", "AMPP / NACE Corrosion Technologist / Cathodic Protection", "AMPP", "Mühəndislik, inspeksiya və enerji", ["NACE CP", "Cathodic Protection Technician", "Corrosion Technologist", "NACE CP2"], ["preventive-maintenance"], { levels: ["CP1", "CP2", "CP3", "CP4"] }),
  cert("compex", "CompEx", "JTL", "Mühəndislik, inspeksiya və enerji", ["CompEx Ex01-Ex04", "IECEx CoPC", "Hazardous Area certificate"], ["electrical-engineering", "safety-procedures"]),
  cert("cmrp", "CMRP", "SMRP", "Mühəndislik, inspeksiya və enerji", ["Certified Maintenance & Reliability Professional"], ["preventive-maintenance", "mechanical-maintenance"]),
  cert("cem", "Certified Energy Manager (CEM)", "Association of Energy Engineers", "Mühəndislik, inspeksiya və enerji", ["CEM", "AEE CEM", "Certified Energy Auditor", "CEA"], ["process-improvement"]),
  cert("leed", "LEED Professional Credential", "U.S. Green Building Council", "Mühəndislik, inspeksiya və enerji", ["LEED AP", "LEED Green Associate", "LEED AP BD+C"], ["construction-management", "civil-engineering"], { levels: ["Green Associate", "AP"] }),
  cert("breeam", "BREEAM Assessor", "BRE", "Mühəndislik, inspeksiya və enerji", ["BREEAM AP", "BREEAM Assessor"], ["construction-management"]),
  cert("autodesk", "Autodesk Certified Professional", "Autodesk", "Mühəndislik, inspeksiya və enerji", ["Autodesk Certified User", "AutoCAD Certified Professional", "Revit Certified Professional", "Civil 3D certified"], ["autocad", "revit", "technical-drawing"], { levels: ["Certified User", "Certified Professional"] }),
  cert("solidworks-cert", "SOLIDWORKS Certification (CSWA / CSWP / CSWE)", "Dassault Systèmes", "Mühəndislik, inspeksiya və enerji", ["CSWA", "CSWP", "CSWE"], ["solidworks", "technical-drawing"], { levels: ["CSWA", "CSWP", "CSWE"] }),
  cert("primavera", "Oracle Primavera P6 Certified", "Oracle", "Mühəndislik, inspeksiya və enerji", ["Primavera P6", "P6 certification"], ["project-management", "construction-management"]),
  cert("siemens-plc", "Siemens Certified (SITRAIN / TIA Portal)", "Siemens", "Mühəndislik, inspeksiya və enerji", ["SITRAIN", "Siemens TIA Portal certificate", "Siemens S7 certification"], ["plc-scada"]),
  cert("isa-cap", "ISA CAP / CCST", "International Society of Automation", "Mühəndislik, inspeksiya və enerji", ["Certified Automation Professional", "Certified Control Systems Technician", "ISA/IEC 62443"], ["plc-scada", "electrical-engineering"]),
  cert("hvac-epa", "EPA 608 / F-Gas Certification", "US EPA / EU F-Gas", "Mühəndislik, inspeksiya və enerji", ["EPA 608", "F-Gas certificate", "Refrigerant handling"], ["hvac"]),
  cert("electrical-license", "Elektrik təhlükəsizliyi qrupu / Electrical licence", "Various", "Mühəndislik, inspeksiya və enerji", ["elektrik təhlükəsizliyi qrupu", "electrical safety group", "18th Edition", "BS 7671"], ["electrical-engineering", "safety-procedures"], { levels: ["II qrup", "III qrup", "IV qrup", "V qrup"] }),

  // Legal and compliance
  cert("az-bar", "Azərbaycan Vəkillər Kollegiyasının üzvlüyü", "Azərbaycan Respublikası Vəkillər Kollegiyası", "Hüquq və uyğunluq", ["Vəkillər Kollegiyası", "vəkil lisenziyası", "Bar Association of Azerbaijan"], ["legal", "legal-research", "contracts"], { group: "bar" }),
  cert("bar-intl", "Bar Admission (UK / US)", "Solicitors Regulation Authority / State Bars", "Hüquq və uyğunluq", ["New York Bar", "SQE", "Solicitor of England and Wales", "attorney at law"], ["legal", "contracts"], { group: "bar" }),
  cert("ica-compliance", "ICA International Diploma in Governance, Risk and Compliance", "International Compliance Association", "Hüquq və uyğunluq", ["ICA Compliance Diploma", "ICA Certificate in Compliance", "ICA GRC"], ["compliance", "risk-management"], { levels: ["Certificate", "Advanced Certificate", "Diploma"], group: "compliance-professional" }),
  cert("ccep", "CCEP", "Compliance Certification Board", "Hüquq və uyğunluq", ["Certified Compliance & Ethics Professional", "CCEP-I"], ["compliance"], { group: "compliance-professional" }),
  cert("cedr-mediator", "CEDR Accredited Mediator", "CEDR", "Hüquq və uyğunluq", ["Accredited Mediator", "IMI Certified Mediator", "mediator sertifikatı", "Mediasiya Şurası"], ["conflict-resolution", "negotiation"]),
  cert("ciarb", "CIArb Membership", "Chartered Institute of Arbitrators", "Hüquq və uyğunluq", ["MCIArb", "FCIArb", "Chartered Arbitrator"], ["legal", "conflict-resolution"], { levels: ["Associate (ACIArb)", "Member (MCIArb)", "Fellow (FCIArb)"] }),
  cert("cipm-contracts", "IACCM / WorldCC Contract Management", "World Commerce & Contracting", "Hüquq və uyğunluq", ["WorldCC CCMP", "IACCM Certified", "Certified Commercial Contract Manager"], ["contracts", "negotiation"], { levels: ["Associate", "Practitioner", "Expert"] }),
  cert("cpp-paralegal", "Certified Paralegal", "NALA", "Hüquq və uyğunluq", ["NALA Certified Paralegal", "CP paralegal"], ["legal-research"]),

  // Language certificates
  cert("ielts", "IELTS", "British Council / IDP / Cambridge", "Dil sertifikatları", ["IELTS Academic", "IELTS General Training", "IELTS band"], ["communication"], { scale: { min: 0, max: 9, step: 0.5 }, group: "english" }),
  cert("toefl", "TOEFL iBT", "ETS", "Dil sertifikatları", ["TOEFL", "TOEFL iBT", "TOEFL ITP"], ["communication"], { scale: { min: 0, max: 120, step: 1 }, group: "english" }),
  cert("toeic", "TOEIC", "ETS", "Dil sertifikatları", ["TOEIC Listening and Reading"], ["communication"], { scale: { min: 10, max: 990, step: 5 }, group: "english" }),
  cert("cambridge-english", "Cambridge English Qualification", "Cambridge English", "Dil sertifikatları", ["Cambridge B2 First", "FCE", "CAE", "CPE", "C1 Advanced", "C2 Proficiency", "BEC", "Cambridge Business English"], ["communication"], { levels: ["A2 Key", "B1 Preliminary", "B2 First", "C1 Advanced", "C2 Proficiency"], group: "english" }),
  cert("pte", "PTE Academic", "Pearson", "Dil sertifikatları", ["Pearson PTE", "PTE"], ["communication"], { scale: { min: 10, max: 90, step: 1 }, group: "english" }),
  cert("duolingo", "Duolingo English Test", "Duolingo", "Dil sertifikatları", ["DET Duolingo"], ["communication"], { scale: { min: 10, max: 160, step: 5 }, group: "english" }),
  cert("oxford-test", "Oxford Test of English", "Oxford University Press", "Dil sertifikatları", ["OTE Oxford"], ["communication"], { levels: ["A2", "B1", "B2", "C1"], group: "english" }),
  cert("linguaskill", "Linguaskill", "Cambridge English", "Dil sertifikatları", ["Linguaskill Business", "Linguaskill General"], ["communication"], { levels: CEFR, group: "english" }),
  cert("trki", "TORFL / ТРКИ (rus dili)", "Russian State Testing Centre", "Dil sertifikatları", ["ТРКИ", "TRKI", "TORFL", "Test of Russian as a Foreign Language"], ["communication"], { levels: ["TEU (A1)", "TBU (A2)", "TRKI-1 (B1)", "TRKI-2 (B2)", "TRKI-3 (C1)", "TRKI-4 (C2)"] }),
  cert("tomer", "Türk dili sertifikatı (TÖMER / YEE)", "Ankara University TÖMER / Yunus Emre Institute", "Dil sertifikatları", ["TÖMER", "Yunus Emre Türkçe Yeterlik", "TYS"], ["communication"], { levels: CEFR }),
  cert("yds", "YDS / YÖKDİL", "ÖSYM", "Dil sertifikatları", ["YDS", "YÖKDİL", "e-YDS"], ["communication"], { scale: { min: 0, max: 100, step: 1 } }),
  cert("delf", "DELF / DALF (fransız dili)", "France Éducation international", "Dil sertifikatları", ["DELF", "DALF", "TCF", "TEF"], ["communication"], { levels: CEFR }),
  cert("goethe", "Goethe-Zertifikat (alman dili)", "Goethe-Institut", "Dil sertifikatları", ["Goethe Zertifikat", "TestDaF", "telc Deutsch", "ÖSD", "DSH"], ["communication"], { levels: CEFR }),
  cert("dele", "DELE (ispan dili)", "Instituto Cervantes", "Dil sertifikatları", ["DELE", "SIELE"], ["communication"], { levels: CEFR }),
  cert("cils", "CILS / CELI (italyan dili)", "Università per Stranieri", "Dil sertifikatları", ["CILS", "CELI", "PLIDA"], ["communication"], { levels: CEFR }),
  cert("hsk", "HSK (çin dili)", "Chinese Testing International", "Dil sertifikatları", ["HSK", "汉语水平考试"], ["communication"], { levels: ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6", "HSK 7-9"] }),
  cert("jlpt", "JLPT (yapon dili)", "Japan Foundation", "Dil sertifikatları", ["JLPT", "Japanese-Language Proficiency Test"], ["communication"], { levels: ["N5", "N4", "N3", "N2", "N1"] }),
  cert("topik", "TOPIK (koreya dili)", "NIIED", "Dil sertifikatları", ["TOPIK", "Test of Proficiency in Korean"], ["communication"], { levels: ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6"] }),
  cert("arabic-alpt", "Arabic Language Proficiency Test (ALPT)", "Various", "Dil sertifikatları", ["ALPT", "Arabic proficiency certificate"], ["communication"], { levels: CEFR }),
  cert("cplp", "CAPLE (portuqal dili)", "Camões Institute", "Dil sertifikatları", ["CAPLE", "CELPE-Bras"], ["communication"], { levels: CEFR }),

  // Healthcare
  cert("bls", "BLS (Basic Life Support)", "American Heart Association / ERC", "Səhiyyə", ["Basic Life Support", "AHA BLS", "BLS Provider"], ["patient-service", "nursing"], { group: "resuscitation" }),
  cert("acls", "ACLS", "American Heart Association", "Səhiyyə", ["Advanced Cardiovascular Life Support", "ERC ALS"], ["patient-service"], { group: "resuscitation" }),
  cert("pals", "PALS", "American Heart Association", "Səhiyyə", ["Pediatric Advanced Life Support", "EPLS"], ["patient-service"], { group: "resuscitation" }),
  cert("atls", "ATLS", "American College of Surgeons", "Səhiyyə", ["Advanced Trauma Life Support"], ["patient-service"]),
  cert("usmle", "USMLE", "NBME / FSMB", "Səhiyyə", ["USMLE Step 1", "USMLE Step 2", "ECFMG certified"], ["patient-service"], { levels: ["Step 1", "Step 2 CK", "Step 3", "ECFMG Certified"], group: "medical-licensing" }),
  cert("plab", "PLAB", "General Medical Council", "Səhiyyə", ["PLAB 1", "PLAB 2", "GMC registration"], ["patient-service"], { levels: ["PLAB 1", "PLAB 2", "GMC Registered"], group: "medical-licensing" }),
  cert("nclex", "NCLEX-RN", "NCSBN", "Səhiyyə", ["NCLEX", "Registered Nurse license", "NMC registration"], ["nursing"]),
  cert("oet", "OET (Occupational English Test)", "Cambridge Boxhill", "Səhiyyə", ["Occupational English Test"], ["communication", "patient-service"], { levels: ["C", "C+", "B", "A"] }),
  cert("cpht", "CPhT (Pharmacy Technician)", "PTCB", "Səhiyyə", ["Certified Pharmacy Technician", "PTCB"], ["pharmacy"]),
  cert("gcp-clinical", "ICH GCP Certificate", "NIDA / TransCelerate / Various", "Səhiyyə", ["Good Clinical Practice", "ICH-GCP", "GCP training"], ["professional-standards", "compliance"]),
  cert("gmp", "GMP / GDP Certificate", "Various", "Səhiyyə", ["Good Manufacturing Practice", "Good Distribution Practice", "GMP training"], ["quality-assurance", "pharmacy"]),
  cert("cphq", "CPHQ", "NAHQ", "Səhiyyə", ["Certified Professional in Healthcare Quality"], ["quality-assurance"]),
  cert("chpm", "Medical Coding (CPC / CCS)", "AAPC / AHIMA", "Səhiyyə", ["CPC coder", "Certified Professional Coder", "CCS AHIMA"], ["records-management"]),

  // Food, hospitality and tourism
  cert("haccp", "HACCP Certificate", "Highfield / CIEH / Various", "Qida, otel və turizm", ["HACCP Level 2", "HACCP Level 3", "HACCP Level 4", "HACCP sertifikatı"], ["food-safety"], { levels: ["Level 2", "Level 3", "Level 4"] }),
  cert("food-hygiene", "Food Hygiene / Food Safety Certificate", "Highfield / CIEH / RSPH", "Qida, otel və turizm", ["Food Hygiene Level 2", "Food Safety Level 2", "qida gigiyenası sertifikatı"], ["food-safety"], { levels: ["Level 1", "Level 2", "Level 3", "Level 4"] }),
  cert("servsafe", "ServSafe", "National Restaurant Association", "Qida, otel və turizm", ["ServSafe Manager", "ServSafe Food Handler"], ["food-safety", "food-service"], { levels: ["Food Handler", "Manager"] }),
  cert("wset", "WSET", "Wine & Spirit Education Trust", "Qida, otel və turizm", ["WSET Level 2", "WSET Level 3", "WSET Diploma"], ["food-service"], { levels: ["Level 1", "Level 2", "Level 3", "Diploma"] }),
  cert("sommelier", "Court of Master Sommeliers", "Court of Master Sommeliers", "Qida, otel və turizm", ["Certified Sommelier", "Master Sommelier"], ["food-service"], { levels: ["Introductory", "Certified", "Advanced", "Master"] }),
  cert("sca-barista", "SCA Barista Skills", "Specialty Coffee Association", "Qida, otel və turizm", ["SCA Barista", "Specialty Coffee Association"], ["food-service"], { levels: ["Foundation", "Intermediate", "Professional"] }),
  cert("culinary-cert", "City & Guilds Culinary / Le Cordon Bleu", "City & Guilds / Le Cordon Bleu", "Qida, otel və turizm", ["Le Cordon Bleu", "City and Guilds Professional Cookery", "Grand Diplôme"], ["culinary"]),
  cert("ahlei", "AHLEI Hospitality Certification", "American Hotel & Lodging Educational Institute", "Qida, otel və turizm", ["CHA", "Certified Hospitality Administrator", "CHS", "Certified Hospitality Supervisor", "CHDT"], ["hotel-operations", "guest-service"], { levels: ["Line level", "Supervisor (CHS)", "Manager", "Administrator (CHA)"] }),
  cert("iata-travel", "IATA Travel and Tourism", "IATA", "Qida, otel və turizm", ["IATA Foundation in Travel and Tourism", "IATA Travel Consultant", "IATA/UFTAA"], ["reservation-systems", "guest-service"], { levels: ["Foundation", "Consultant", "Advanced"] }),
  cert("gds", "GDS Certificate (Amadeus / Sabre / Galileo)", "Amadeus / Sabre / Travelport", "Qida, otel və turizm", ["Amadeus certificate", "Sabre certificate", "Galileo GDS"], ["reservation-systems"]),
  cert("opera-pms", "Oracle Hospitality OPERA Certification", "Oracle", "Qida, otel və turizm", ["OPERA PMS certified", "Opera Cloud certification"], ["reservation-systems", "hotel-operations"]),
  cert("tour-guide", "Licensed Tour Guide", "Azərbaycan Turizm Bürosu / Various", "Qida, otel və turizm", ["bələdçi sertifikatı", "tour guide license", "ekskursiya bələdçisi"], ["guest-service", "communication"]),

  // Education and teaching
  cert("celta", "CELTA", "Cambridge English", "Təhsil və tədris", ["Certificate in Teaching English to Speakers of Other Languages"], ["english-teaching", "lesson-planning"], { group: "english-teaching" }),
  cert("delta", "DELTA", "Cambridge English", "Təhsil və tədris", ["Diploma in Teaching English to Speakers of Other Languages"], ["english-teaching", "curriculum-design"], { group: "english-teaching" }),
  cert("tkt", "TKT (Teaching Knowledge Test)", "Cambridge English", "Təhsil və tədris", ["Teaching Knowledge Test"], ["english-teaching"], { levels: ["Band 1", "Band 2", "Band 3", "Band 4"], group: "english-teaching" }),
  cert("tefl", "TEFL / TESOL Certificate", "Various accredited providers", "Təhsil və tədris", ["TEFL", "TESOL", "120-hour TEFL", "Trinity CertTESOL"], ["english-teaching"], { levels: ["60 hours", "120 hours", "Level 5"], group: "english-teaching" }),
  cert("pgce", "PGCE / QTS", "UK universities / DfE", "Təhsil və tədris", ["Postgraduate Certificate in Education", "Qualified Teacher Status", "QTS"], ["teaching", "classroom-management"]),
  cert("ib-educator", "IB Educator Certificate", "International Baccalaureate", "Təhsil və tədris", ["IB Certificate in Teaching and Learning", "IB workshop certificate", "IB educator"], ["teaching", "curriculum-design"]),
  cert("cambridge-ict", "Cambridge Teaching Qualification (CICTT / CPDL)", "Cambridge Assessment International Education", "Təhsil və tədris", ["Cambridge International Certificate for Teachers and Trainers", "CICTT"], ["teaching", "assessment"]),
  cert("az-teacher-cert", "Müəllimlərin sertifikasiyası (Azərbaycan)", "Azərbaycan Respublikası Elm və Təhsil Nazirliyi", "Təhsil və tədris", ["müəllim sertifikasiyası", "MİQ", "müəllimlərin işə qəbulu", "diaqnostik qiymətləndirmə"], ["teaching"]),
  cert("google-educator", "Google Certified Educator", "Google for Education", "Təhsil və tədris", ["Google Certified Educator Level 1", "Google Certified Trainer"], ["teaching"], { levels: ["Level 1", "Level 2", "Trainer", "Innovator"] }),
  cert("microsoft-educator", "Microsoft Innovative Educator", "Microsoft", "Təhsil və tədris", ["MIE", "MIE Expert", "Microsoft Certified Educator"], ["teaching"]),
  cert("cptd-trainer", "Certified Technical Trainer (CTT+)", "CompTIA / The Chauncey Group", "Təhsil və tədris", ["CTT+", "Certified Training Professional"], ["learning-development", "presentation"]),

  // Design and media
  cert("adobe-acp", "Adobe Certified Professional", "Adobe", "Dizayn və media", ["Adobe Certified Expert", "ACE Adobe", "Adobe Photoshop certified", "Adobe Illustrator certified", "Adobe Premiere Pro certified", "Adobe InDesign certified"], ["graphic-design", "video-editing"], { levels: ["Certified Professional", "Certified Expert"] }),
  cert("google-ux", "Google UX Design Professional Certificate", "Google / Coursera", "Dizayn və media", ["Google UX Design Certificate"], ["ui-ux", "figma"]),
  cert("nng-ux", "NN/g UX Certification", "Nielsen Norman Group", "Dizayn və media", ["Nielsen Norman UX Certificate", "UXC"], ["ui-ux"]),
  cert("ixdf", "Interaction Design Foundation Certificate", "Interaction Design Foundation", "Dizayn və media", ["IxDF", "IDF certificate"], ["ui-ux"]),
  cert("autodesk-media", "Autodesk Maya / 3ds Max Certified", "Autodesk", "Dizayn və media", ["Maya Certified Professional", "3ds Max Certified Professional"], ["graphic-design"]),
  cert("apple-fcp", "Apple Final Cut Pro Certification", "Apple", "Dizayn və media", ["Final Cut Pro certified", "Apple Certified Pro"], ["video-editing"]),
  cert("davinci", "Blackmagic DaVinci Resolve Certified", "Blackmagic Design", "Dizayn və media", ["DaVinci Resolve certification"], ["video-editing"]),
  cert("avid", "Avid Certified User (Media Composer / Pro Tools)", "Avid", "Dizayn və media", ["Avid Media Composer", "Pro Tools certified"], ["video-editing"]),

  // Office and digital literacy
  cert("mos", "Microsoft Office Specialist (MOS)", "Microsoft / Certiport", "Ofis və rəqəmsal savadlılıq", ["MOS", "MOS Excel", "MOS Word", "MOS Expert", "MOS Master", "Microsoft Office Specialist Excel"], ["microsoft-office", "excel"], { levels: ["Associate", "Expert", "Master"] }),
  cert("icdl", "ICDL / ECDL", "ICDL Foundation", "Ofis və rəqəmsal savadlılıq", ["ECDL", "ICDL", "European Computer Driving Licence", "International Certification of Digital Literacy"], ["microsoft-office"], { levels: ["Base", "Standard", "Advanced", "Expert"] }),
  cert("ic3", "IC3 Digital Literacy", "Certiport", "Ofis və rəqəmsal savadlılıq", ["IC3", "IC3 GS6"], ["microsoft-office"]),
  cert("google-workspace", "Google Workspace Certification", "Google", "Ofis və rəqəmsal savadlılıq", ["Google Workspace Administrator", "G Suite certification"], ["office-administration"]),
  cert("excel-expert", "Microsoft Excel Expert / Financial Modeling in Excel", "Microsoft / Various", "Ofis və rəqəmsal savadlılıq", ["Excel Expert certification", "MO-201", "Advanced Excel certificate"], ["excel", "data-analysis"]),
  cert("cap-iaap", "Certified Administrative Professional (CAP)", "IAAP", "Ofis və rəqəmsal savadlılıq", ["IAAP CAP", "Certified Administrative Professional"], ["office-administration", "records-management"]),
  cert("pmp-records", "Certified Records Manager (CRM)", "ICRM", "Ofis və rəqəmsal savadlılıq", ["Certified Records Manager", "ICRM"], ["records-management", "document-control"]),

  // Aviation, maritime and transport
  cert("easa-part66", "EASA Part-66 Aircraft Maintenance Licence", "EASA", "Aviasiya, dənizçilik və nəqliyyat", ["Part-66", "B1 licence", "B2 licence", "AML EASA"], ["mechanical-maintenance", "electrical-engineering"], { levels: ["A", "B1", "B2", "C"] }),
  cert("pilot-licence", "Pilot Licence (PPL / CPL / ATPL)", "EASA / ICAO / FAA", "Aviasiya, dənizçilik və nəqliyyat", ["ATPL", "CPL", "PPL", "airline transport pilot licence", "pilot lisenziyası"], ["safety-procedures"], { levels: ["PPL", "CPL", "ATPL"] }),
  cert("cabin-crew", "Cabin Crew Attestation", "EASA / National CAA", "Aviasiya, dənizçilik və nəqliyyat", ["Cabin crew certificate", "stüardessa sertifikatı", "Flight attendant certificate"], ["guest-service", "safety-procedures"]),
  cert("atc", "Air Traffic Controller Licence", "ICAO / National CAA", "Aviasiya, dənizçilik və nəqliyyat", ["ATC licence", "dispetçer lisenziyası", "Air traffic control licence"], ["safety-procedures"]),
  cert("stcw", "STCW Basic Safety Training", "IMO / Maritime administrations", "Aviasiya, dənizçilik və nəqliyyat", ["STCW", "STCW 95", "STCW Basic Safety", "Certificate of Competency", "CoC"], ["safety-procedures"]),
  cert("gmdss", "GMDSS Operator Certificate", "IMO / ITU", "Aviasiya, dənizçilik və nəqliyyat", ["GMDSS GOC", "GMDSS ROC"], ["communication", "safety-procedures"]),
  cert("dp-operator", "Dynamic Positioning (DP) Certificate", "The Nautical Institute", "Aviasiya, dənizçilik və nəqliyyat", ["DP Operator", "DPO certificate", "Nautical Institute DP"], ["safety-procedures"], { levels: ["Induction", "Simulator", "Limited", "Unlimited"] }),
  cert("cpc-driver", "Driver CPC / Professional Driver Certificate", "EU / National transport authorities", "Aviasiya, dənizçilik və nəqliyyat", ["Driver CPC", "Code 95", "professional driver certificate"], ["transport-coordination"]),
  cert("forklift", "Forklift Operator Certificate", "RTITB / AITT / Various", "Aviasiya, dənizçilik və nəqliyyat", ["Forklift licence", "forklift sertifikatı", "RTITB", "Reach truck certificate"], ["warehouse-management", "safety-procedures"]),
];

export const normalizeCertificationKey = normalizeSkillKey;

// Admin-added certifications are loaded at runtime (server: per request from
// the database, browser: from the state payload) and used as the default
// extension of the static catalog.
let customRegistry: CertificationDefinition[] = [];
export function setCustomCertifications(list: CertificationDefinition[]) {
  customRegistry = Array.isArray(list) ? list : [];
  detectionCache.clear();
}
export function customCertifications() {
  return customRegistry;
}
const detectionCache = new Map<string, CandidateCertification[]>();

const byId = new Map(CERTIFICATION_CATALOG.map((definition) => [definition.id, definition]));
const byAlias = new Map<string, CertificationDefinition>();
for (const definition of CERTIFICATION_CATALOG)
  for (const alias of definition.aliases) {
    const key = normalizeCertificationKey(alias);
    if (key && !byAlias.has(key)) byAlias.set(key, definition);
  }

export function certificationById(id: string, extra: CertificationDefinition[] = customRegistry) {
  return byId.get(id) || extra.find((definition) => definition.id === id) || null;
}

export function canonicalCertification(value: string, extra: CertificationDefinition[] = customRegistry) {
  const key = normalizeCertificationKey(value);
  if (!key) return null;
  return (
    byId.get(value) ||
    byAlias.get(key) ||
    extra.find((definition) => definition.id === value || definition.aliases.some((alias) => normalizeCertificationKey(alias) === key)) ||
    null
  );
}

export function searchCertifications(
  query: string,
  selected: string[] = [],
  limit = 10,
  extra: CertificationDefinition[] = customRegistry,
) {
  const needle = normalizeCertificationKey(query);
  const chosen = new Set(selected);
  const all = [...CERTIFICATION_CATALOG, ...extra];
  const scored = all
    .filter((definition) => !chosen.has(definition.id))
    .map((definition) => {
      if (!needle) return { definition, rank: 3 };
      const keys = definition.aliases.map(normalizeCertificationKey);
      if (keys.some((key) => key === needle)) return { definition, rank: 0 };
      if (keys.some((key) => key.startsWith(needle))) return { definition, rank: 1 };
      if (
        keys.some((key) => key.includes(needle)) ||
        normalizeCertificationKey(`${definition.issuer} ${definition.category} ${definition.categoryEn}`).includes(needle)
      )
        return { definition, rank: 2 };
      return null;
    })
    .filter((x): x is { definition: CertificationDefinition; rank: number } => !!x)
    .sort((a, b) => a.rank - b.rank);
  return scored.slice(0, limit).map((x) => x.definition);
}

// Position of a level within a definition: higher is better; -1 = unknown.
export function certificationLevelRank(definition: CertificationDefinition, level: string | undefined) {
  if (!level) return -1;
  if (definition.scale) {
    const value = Number(String(level).replace(",", "."));
    return Number.isFinite(value) ? value : -1;
  }
  const key = normalizeCertificationKey(level);
  return (definition.levels || []).findIndex((item) => normalizeCertificationKey(item) === key);
}

export function normalizeCertificationLevel(definition: CertificationDefinition, value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (definition.scale) {
    const number = Number(raw.replace(",", "."));
    if (!Number.isFinite(number) || number < definition.scale.min || number > definition.scale.max) return "";
    return String(Math.round(number / definition.scale.step) * definition.scale.step);
  }
  const index = certificationLevelRank(definition, raw);
  return index >= 0 ? definition.levels![index] : "";
}

export const CERTIFICATION_STATUSES = ["active", "in_progress", "expired"] as const;
export type CertificationStatus = (typeof CERTIFICATION_STATUSES)[number];
export type CandidateCertification = {
  id: string;
  status: CertificationStatus;
  level?: string;
  year?: string;
  credentialUrl?: string;
  // Free-text progress note, e.g. "5/13 imtahan: BT, MA, FA, LW, FR".
  detail?: string;
  // Module codes passed and currently being prepared.
  passed?: string[];
  preparing?: string[];
  source?: "profile" | "cv";
};
export type JobCertification = { id: string; required: boolean; minLevel?: string; modules?: string[] };

const PROGRESS = /(student|telebe|davam|in progress|ongoing|pursuing|studying|prepar|candidate|namized|hazirlas|exams? passed|papers? passed|imtahan|\d+\s*\/\s*\d+|part [12]|level [i1] passed)/;
const PLANNED = /(oyren|istey|planlas|hedef|arzu|niyyet|want|plan to|planning|aim to|hope|will take|maraql)/;
const EXPIRED = /(expired|bitib|vaxti kecib|muddeti bitib|lapsed)/;
const fold = (s: string) => normalizeCertificationKey(s).replace(/ə/g, "e");

// Recognizes certifications in free text. Acronyms of up to four letters
// must appear as an exact upper-case word to avoid matching common words.
export function detectCertifications(text: string, extra: CertificationDefinition[] = customRegistry) {
  if (!text.trim()) return [] as CandidateCertification[];
  const cached = extra === customRegistry ? detectionCache.get(text) : undefined;
  if (cached) return cached;
  const result = detectUncached(text, extra);
  if (extra === customRegistry) {
    if (detectionCache.size > 300) detectionCache.clear();
    detectionCache.set(text, result);
  }
  return result;
}
type CompiledAlias = { pattern?: RegExp; key?: string };
const compiled = new Map<string, CompiledAlias[]>();
function compiledAliases(definition: CertificationDefinition) {
  const existing = compiled.get(definition.id);
  if (existing) return existing;
  const list = definition.aliases.map((alias): CompiledAlias => {
    const compact = alias.replace(/[^\p{L}\p{N}+]/gu, "");
    if (compact.length <= 4 && /^[\p{Lu}\p{N}+\-/]+$/u.test(alias))
      return { pattern: new RegExp(`(^|[^\\p{L}\\p{N}])${alias.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`, "u") };
    const key = normalizeCertificationKey(alias);
    return key.length >= 4 ? { key: ` ${key} ` } : {};
  });
  for (const pattern of definition.patterns || []) list.push({ pattern });
  compiled.set(definition.id, list);
  return list;
}
function detectUncached(text: string, extra: CertificationDefinition[]) {
  const found = new Map<string, CandidateCertification>();
  // Split on sentence ends but keep decimals such as "IELTS 7.5" intact.
  const sentences = text
    .split(/[\n;•]+|\.(?=\s|$)/)
    .filter((s) => s.trim())
    .map((raw) => ({ raw, key: ` ${normalizeCertificationKey(raw)} ` }));
  for (const definition of [...CERTIFICATION_CATALOG, ...extra]) {
    const aliases = compiledAliases(definition);
    for (const { raw: sentence, key: sentenceKey } of sentences) {
      const hit = aliases.some((alias) =>
        alias.pattern ? alias.pattern.test(sentence) : alias.key ? sentenceKey.includes(alias.key) : false,
      );
      if (!hit) continue;
      const context = fold(sentence);
      if (PLANNED.test(context)) continue;
      const status: CertificationStatus = EXPIRED.test(context)
        ? "expired"
        : PROGRESS.test(context)
          ? "in_progress"
          : "active";
      let level = "";
      if (definition.scale) {
        const numbers = sentence.match(/\d+(?:[.,]\d+)?/g) || [];
        level = numbers
          .map((n) => normalizeCertificationLevel(definition, n))
          .find((n) => n && Number(n) > definition.scale!.min) || "";
      } else if (definition.levels) {
        const matches = definition.levels.filter((item) => context.includes(fold(item)));
        level = matches.sort((a, b) => certificationLevelRank(definition, b) - certificationLevelRank(definition, a))[0] || "";
      }
      const year = sentence.match(/\b(19[89]\d|20[0-4]\d)\b/)?.[1];
      // A completed intermediate stage is progress, not the full award.
      const staged = STAGED.has(definition.id) && definition.levels && level && level !== definition.levels.at(-1);
      const finalStatus: CertificationStatus = staged && status === "active" ? "in_progress" : status;
      const previous = found.get(definition.id);
      // Prefer the strongest statement when a certification is mentioned twice.
      if (!previous || (previous.status !== "active" && finalStatus === "active"))
        found.set(definition.id, {
          id: definition.id,
          status: finalStatus,
          ...(level ? { level } : {}),
          ...(year ? { year } : {}),
          source: "cv",
        });
    }
  }
  for (const definition of [...CERTIFICATION_CATALOG, ...extra]) {
    if (!definition.modules) continue;
    const progress = moduleProgress(definition, text);
    if (!progress) continue;
    const previous = found.get(definition.id);
    const complete = definition.completeLevel
      ? certificationLevelRank(definition, definition.completeLevel)
      : Infinity;
    // A stated membership outranks a list of passed exams.
    if (previous?.level && certificationLevelRank(definition, previous.level) >= complete) continue;
    found.set(definition.id, { ...previous, ...progress, source: "cv" });
  }
  return [...found.values()];
}

const STAGED = new Set(["az-pms-ifrs"]);

// Level, status and progress note derived from passed modules.
export function moduleSummary(
  definition: CertificationDefinition,
  passed: string[],
  preparing: string[] = [],
): Pick<CandidateCertification, "status" | "level" | "detail"> | null {
  const modules = definition.modules || [];
  const done = modules.filter((mod) => passed.includes(mod.code));
  const next = modules.filter((mod) => preparing.includes(mod.code) && !passed.includes(mod.code));
  if (!done.length && !next.length) return null;
  const required = definition.modulesRequired || modules.length;
  const complete = done.length >= required;
  const highest = done.reduce(
    (best, mod) => Math.max(best, certificationLevelRank(definition, mod.level)),
    -1,
  );
  const level = complete && definition.completeLevel
    ? definition.completeLevel
    : highest >= 0
      ? definition.levels![highest]
      : undefined;
  return {
    status: complete ? "active" : "in_progress",
    ...(level ? { level } : {}),
    detail: `${Math.min(done.length, required)}/${required} imtahan${done.length ? `: ${done.map((mod) => mod.code).join(", ")}` : ""}${next.length ? ` · hazırlaşır: ${next.map((mod) => mod.code).join(", ")}` : ""}`,
  };
}

// Reads passed and in-preparation exams from lines that name the
// certification (e.g. "Financial Reporting (FR) · ACCA").
function moduleProgress(
  definition: CertificationDefinition,
  text: string,
): Omit<CandidateCertification, "source"> | null {
  const modules = definition.modules || [];
  const passed = new Set<string>();
  const pending = new Set<string>();
  const aliases = compiledAliases(definition);
  for (const line of text.split(/[\n;•]+|\.(?=\s|$)/)) {
    const lineKey = ` ${normalizeCertificationKey(line)} `;
    if (!aliases.some((alias) => (alias.pattern ? alias.pattern.test(line) : alias.key ? lineKey.includes(alias.key) : false)))
      continue;
    const context = fold(line);
    if (PLANNED.test(context)) continue;
    const inProgress = /(prepar|hazirlas|studying|davam|in progress|ongoing|registered|qeydiyyat)/.test(context);
    for (const mod of modules) {
      // "Financial Management" must not be read inside "Advanced Financial Management".
      const longer = modules.some(
        (other) =>
          other !== mod &&
          other.name.length > mod.name.length &&
          context.includes(fold(other.name)) &&
          fold(other.name).includes(fold(mod.name)),
      );
      const named = context.includes(fold(mod.name)) && !longer;
      const coded = new RegExp(`(^|[^A-Za-z0-9])${mod.code.replace(/\s+/g, "\\s*")}([^A-Za-z0-9]|$)`, "i").test(line) &&
        (mod.code.length > 2 || new RegExp(`(^|[^A-Za-z])${mod.code}([^A-Za-z]|$)`).test(line));
      if (!named && !coded) continue;
      (inProgress ? pending : passed).add(mod.code);
    }
  }
  for (const code of passed) pending.delete(code);
  const summary = moduleSummary(definition, [...passed], [...pending]);
  if (!summary || !passed.size) return null;
  return {
    id: definition.id,
    ...summary,
    passed: modules.filter((mod) => passed.has(mod.code)).map((mod) => mod.code),
    ...(pending.size ? { preparing: modules.filter((mod) => pending.has(mod.code)).map((mod) => mod.code) } : {}),
  };
}

export function normalizeCandidateCertifications(
  values: unknown,
  extra: CertificationDefinition[] = customRegistry,
): CandidateCertification[] {
  if (!Array.isArray(values)) return [];
  const result: CandidateCertification[] = [];
  const seen = new Set<string>();
  for (const value of values.slice(0, 40)) {
    if (!value || typeof value !== "object") continue;
    const item = value as Record<string, unknown>;
    const definition = certificationById(String(item.id || ""), extra);
    if (!definition || seen.has(definition.id)) continue;
    seen.add(definition.id);
    const status = CERTIFICATION_STATUSES.includes(item.status as CertificationStatus)
      ? (item.status as CertificationStatus)
      : "active";
    const level = normalizeCertificationLevel(definition, item.level);
    const year = typeof item.year === "string" && /^(19|20)\d{2}$/.test(item.year.trim()) ? item.year.trim() : "";
    const url = typeof item.credentialUrl === "string" ? item.credentialUrl.trim().slice(0, 400) : "";
    const detail = typeof item.detail === "string" ? item.detail.trim().replace(/\s+/g, " ").slice(0, 200) : "";
    const codes = new Set((definition.modules || []).map((mod) => mod.code));
    const passed = Array.isArray(item.passed) ? [...new Set(item.passed.filter((code): code is string => typeof code === "string" && codes.has(code)))] : [];
    const preparing = Array.isArray(item.preparing)
      ? [...new Set(item.preparing.filter((code): code is string => typeof code === "string" && codes.has(code) && !passed.includes(code)))]
      : [];
    result.push({
      id: definition.id,
      status,
      ...(level ? { level } : {}),
      ...(year ? { year } : {}),
      ...(/^https:\/\/[^\s]+$/i.test(url) ? { credentialUrl: url } : {}),
      ...(detail ? { detail } : {}),
      ...(passed.length ? { passed } : {}),
      ...(preparing.length ? { preparing } : {}),
      source: "profile",
    });
  }
  return result;
}

export function normalizeJobCertifications(
  values: unknown,
  extra: CertificationDefinition[] = customRegistry,
): JobCertification[] {
  if (!Array.isArray(values)) return [];
  const result: JobCertification[] = [];
  const seen = new Set<string>();
  for (const value of values.slice(0, 12)) {
    const item = (typeof value === "string" ? { id: value } : value) as Record<string, unknown> | null;
    if (!item) continue;
    const definition = certificationById(String(item.id || ""), extra) || canonicalCertification(String(item.id || ""), extra);
    if (!definition || seen.has(definition.id)) continue;
    seen.add(definition.id);
    const minLevel = normalizeCertificationLevel(definition, item.minLevel);
    const codes = new Set((definition.modules || []).map((mod) => mod.code));
    const modules = Array.isArray(item.modules)
      ? [...new Set(item.modules.filter((code): code is string => typeof code === "string" && codes.has(code)))]
      : [];
    result.push({
      id: definition.id,
      required: item.required === true,
      ...(minLevel ? { minLevel } : {}),
      ...(modules.length ? { modules } : {}),
    });
  }
  return result;
}

export function certificationDisplayName(id: string, extra: CertificationDefinition[] = customRegistry) {
  return certificationById(id, extra)?.name || id;
}
