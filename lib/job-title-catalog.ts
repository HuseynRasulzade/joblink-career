import { normalizeSkillKey } from "./skill-catalog.ts";
import { EXTRA_JOB_TITLES, RU_LABELS_OF_BASE } from "./job-title-catalog-extra.ts";

// Shared list of job titles used by vacancies and candidate experience.
// `family` matches ROLE_FAMILIES in model.ts and drives role relevance.
export type JobTitleDefinition = {
  id: string;
  label: string;
  labelEn: string;
  // Russian display name; optional because admin-added titles may not have one.
  labelRu?: string;
  family: string;
  aliases: string[];
  // Seniority variants point at the plain profession they were derived from.
  base?: string;
  level?: string;
};

const title = (
  id: string,
  label: string,
  labelEn: string,
  family: string,
  aliases: string[] = [],
): JobTitleDefinition => ({ id, label, labelEn, family, aliases: [label, labelEn, ...aliases] });

export const JOB_TITLE_FAMILIES: Record<string, { az: string; en: string }> = {
  finance: { az: "Maliyyə, mühasibatlıq və bank", en: "Finance, accounting and banking" },
  hr: { az: "İnsan resursları", en: "Human resources" },
  sales: { az: "Satış və müştəri xidməti", en: "Sales and customer service" },
  supply: { az: "Satınalma, logistika və anbar", en: "Procurement, logistics and warehouse" },
  engineering: { az: "Mühəndislik, tikinti və istehsal", en: "Engineering, construction and manufacturing" },
  it: { az: "İT və məlumat", en: "IT and data" },
  marketing: { az: "Marketinq, media və dizayn", en: "Marketing, media and design" },
  legal: { az: "Hüquq və uyğunluq", en: "Legal and compliance" },
  education: { az: "Təhsil və təlim", en: "Education and training" },
  hospitality: { az: "Otel, restoran və turizm", en: "Hospitality and tourism" },
  health: { az: "Səhiyyə və əczaçılıq", en: "Healthcare and pharmacy" },
  security: { az: "Təhlükəsizlik və əməyin mühafizəsi", en: "Security and HSE" },
  admin: { az: "İnzibati və idarəetmə", en: "Administration and management" },
  oilgas: { az: "Neft-qaz, energetika və mədənçıxarma", en: "Oil, gas, energy and mining" },
  agriculture: { az: "Kənd təsərrüfatı və qida istehsalı", en: "Agriculture and food production" },
  trades: { az: "Peşə və istehsal işçiləri", en: "Skilled trades and production workers" },
  transport: { az: "Nəqliyyat və aviasiya", en: "Transport and aviation" },
  science: { az: "Elm, tədqiqat və laboratoriya", en: "Science, research and laboratory" },
  social: { az: "Sosial xidmət və qeyri-kommersiya", en: "Social services and non-profit" },
  personal: { az: "Gözəllik, idman və şəxsi xidmət", en: "Beauty, sports and personal services" },
  public: { az: "Dövlət və bələdiyyə xidməti", en: "Public service and government" },
};

export const BASE_JOB_TITLES: JobTitleDefinition[] = [
  // Finance, accounting and banking
  title("accountant", "Mühasib", "Accountant", "finance", ["mühasib", "бухгалтер"]),
  title("chief-accountant", "Baş mühasib", "Chief Accountant", "finance", ["baş mühasib", "главный бухгалтер", "head accountant"]),
  title("assistant-accountant", "Mühasib köməkçisi", "Assistant Accountant", "finance", ["köməkçi mühasib", "junior accountant", "accounting assistant"]),
  title("senior-accountant", "Böyük mühasib", "Senior Accountant", "finance", ["aparıcı mühasib", "lead accountant"]),
  title("tax-accountant", "Vergi üzrə mühasib", "Tax Accountant", "finance", ["vergi mühasibi", "tax specialist", "vergi mütəxəssisi"]),
  title("payroll-accountant", "Əməkhaqqı üzrə mühasib", "Payroll Accountant", "finance", ["payroll specialist", "əməkhaqqı mütəxəssisi"]),
  title("fixed-assets-accountant", "Əsas vəsaitlər üzrə mühasib", "Fixed Assets Accountant", "finance", ["fixed asset accountant"]),
  title("ap-ar-accountant", "Debitor-kreditor üzrə mühasib", "Accounts Payable / Receivable Accountant", "finance", ["AP accountant", "AR accountant", "debitor kreditor mütəxəssisi"]),
  title("cashier-accountant", "Kassir-mühasib", "Cashier Accountant", "finance", ["kassir mühasib"]),
  title("financial-analyst", "Maliyyə analitiki", "Financial Analyst", "finance", ["maliyyə təhlilçisi", "finance analyst"]),
  title("senior-financial-analyst", "Böyük maliyyə analitiki", "Senior Financial Analyst", "finance"),
  title("fpa-specialist", "Büdcə və planlaşdırma mütəxəssisi", "FP&A Specialist", "finance", ["FP&A analyst", "büdcə mütəxəssisi", "budget analyst", "büdcə, xərclərə nəzarət və hesabatlıq üzrə mütəxəssis"]),
  title("finance-specialist", "Maliyyə mütəxəssisi", "Finance Specialist", "finance", ["maliyyə üzrə mütəxəssis", "finance officer"]),
  title("finance-manager", "Maliyyə meneceri", "Finance Manager", "finance", ["maliyyə rəhbəri", "head of finance"]),
  title("cfo", "Maliyyə direktoru", "Chief Financial Officer (CFO)", "finance", ["CFO", "finance director", "maliyyə direktoru"]),
  title("controller", "Kontroller", "Financial Controller", "finance", ["controller", "maliyyə nəzarətçisi"]),
  title("treasury-specialist", "Xəzinədarlıq mütəxəssisi", "Treasury Specialist", "finance", ["xəzinədar", "treasurer"]),
  title("internal-auditor", "Daxili auditor", "Internal Auditor", "finance", ["daxili audit mütəxəssisi"]),
  title("external-auditor", "Auditor", "Auditor", "finance", ["external auditor", "audit assistant", "audit associate"]),
  title("audit-manager", "Audit meneceri", "Audit Manager", "finance"),
  title("cost-accountant", "Maya dəyəri üzrə mütəxəssis", "Cost Accountant", "finance", ["cost controller", "xərc nəzarətçisi"]),
  title("economist", "İqtisadçı", "Economist", "finance", ["iqtisadçı", "экономист"]),
  title("credit-specialist", "Kredit mütəxəssisi", "Credit Specialist", "finance", ["kredit eksperti", "loan officer", "kredit inspektoru"]),
  title("credit-analyst", "Kredit analitiki", "Credit Analyst", "finance", ["kredit risk analitiki"]),
  title("risk-analyst", "Risk analitiki", "Risk Analyst", "finance", ["risk manager", "risk meneceri"]),
  title("bank-operator", "Bank əməliyyatçısı", "Bank Operations Officer", "finance", ["operator bank", "əməliyyat mütəxəssisi", "operationist"]),
  title("bank-teller", "Kassir (bank)", "Bank Teller", "finance", ["teller", "bank kassiri"]),
  title("relationship-manager", "Müştəri münasibətləri meneceri (bank)", "Relationship Manager", "finance", ["RM", "corporate relationship manager"]),
  title("aml-specialist", "AML / Compliance mütəxəssisi", "AML Specialist", "finance", ["AML analyst", "KYC specialist", "monitorinq mütəxəssisi"]),
  title("investment-analyst", "İnvestisiya analitiki", "Investment Analyst", "finance"),
  title("insurance-agent", "Sığorta agenti", "Insurance Agent", "finance", ["sığorta məsləhətçisi"]),
  title("underwriter", "Anderrayter", "Underwriter", "finance", ["anderrayter"]),
  title("actuary", "Aktuari", "Actuary", "finance"),
  title("collector", "Borcların yığılması üzrə mütəxəssis", "Collections Specialist", "finance", ["kollektor", "debt collector"]),

  // Human resources
  title("hr-specialist", "HR mütəxəssisi", "HR Specialist", "hr", ["insan resursları mütəxəssisi", "kadr mütəxəssisi", "HR officer"]),
  title("hr-generalist", "HR generalist", "HR Generalist", "hr"),
  title("hr-manager", "HR meneceri", "HR Manager", "hr", ["insan resursları meneceri", "kadrlar şöbəsinin rəisi"]),
  title("hr-director", "İnsan resursları direktoru", "HR Director", "hr", ["HRD", "CHRO", "head of HR"]),
  title("hr-business-partner", "HR biznes tərəfdaşı", "HR Business Partner", "hr", ["HRBP"]),
  title("recruiter", "Rekruter", "Recruiter", "hr", ["işə qəbul mütəxəssisi", "talent acquisition specialist", "rekruter"]),
  title("it-recruiter", "İT rekruter", "IT Recruiter", "hr", ["tech recruiter"]),
  title("talent-acquisition-manager", "İşə qəbul meneceri", "Talent Acquisition Manager", "hr"),
  title("training-specialist", "Təlim və inkişaf mütəxəssisi", "Learning and Development Specialist", "hr", ["L&D specialist", "təlim meneceri"]),
  title("compensation-specialist", "Əməkhaqqı və imtiyazlar mütəxəssisi", "Compensation and Benefits Specialist", "hr", ["C&B specialist"]),
  title("personnel-officer", "Kadr işləri üzrə inspektor", "Personnel Officer", "hr", ["kadr inspektoru", "kadrlar üzrə mütəxəssis"]),
  title("hr-analyst", "HR analitiki", "HR Analyst", "hr", ["people analyst"]),
  title("hr-assistant", "HR köməkçisi", "HR Assistant", "hr"),

  // Sales and customer service
  title("sales-specialist", "Satış mütəxəssisi", "Sales Specialist", "sales", ["satış nümayəndəsi", "sales representative", "sales executive"]),
  title("sales-manager", "Satış meneceri", "Sales Manager", "sales", ["satış üzrə menecer"]),
  title("head-of-sales", "Satış şöbəsinin rəhbəri", "Head of Sales", "sales", ["sales director", "satış direktoru"]),
  title("key-account-manager", "Əsas müştərilər üzrə menecer", "Key Account Manager", "sales", ["KAM", "key account"]),
  title("account-manager", "Müştəri hesabları meneceri", "Account Manager", "sales"),
  title("b2b-sales-manager", "Korporativ satış meneceri", "B2B Sales Manager", "sales", ["corporate sales manager"]),
  title("business-development-manager", "Biznesin inkişafı meneceri", "Business Development Manager", "sales", ["BDM", "business developer"]),
  title("sales-consultant", "Satış məsləhətçisi", "Sales Consultant", "sales", ["satıcı-məsləhətçi", "satış konsultantı", "satıcı"]),
  title("cashier", "Kassir", "Cashier", "sales", ["kassir"]),
  title("store-manager", "Mağaza müdiri", "Store Manager", "sales", ["mağaza rəhbəri", "shop manager"]),
  title("merchandiser", "Merçendayzer", "Merchandiser", "sales", ["merchandiser"]),
  title("call-center-operator", "Çağrı mərkəzi operatoru", "Call Center Operator", "sales", ["zəng mərkəzi operatoru", "contact center agent", "operator"]),
  title("customer-service-specialist", "Müştəri xidmətləri mütəxəssisi", "Customer Service Specialist", "sales", ["customer support specialist", "müştəri xidməti əməkdaşı"]),
  title("customer-success-manager", "Müştəri uğuru meneceri", "Customer Success Manager", "sales"),
  title("sales-supervisor", "Satış supervayzeri", "Sales Supervisor", "sales", ["supervisor"]),
  title("telesales", "Telesatış mütəxəssisi", "Telesales Agent", "sales"),
  title("real-estate-agent", "Daşınmaz əmlak agenti", "Real Estate Agent", "sales", ["rieltor", "realtor"]),
  title("medical-representative", "Tibbi nümayəndə", "Medical Representative", "sales", ["med rep", "tibbi təmsilçi"]),

  // Procurement, logistics and warehouse
  title("procurement-specialist", "Satınalma mütəxəssisi", "Procurement Specialist", "supply", ["satınalma üzrə mütəxəssis", "buyer", "purchasing specialist", "tədarük mütəxəssisi"]),
  title("procurement-manager", "Satınalma meneceri", "Procurement Manager", "supply", ["purchasing manager", "satınalma şöbəsinin rəisi"]),
  title("tender-specialist", "Tender mütəxəssisi", "Tender Specialist", "supply"),
  title("supply-chain-specialist", "Təchizat zənciri mütəxəssisi", "Supply Chain Specialist", "supply", ["supply chain analyst"]),
  title("supply-chain-manager", "Təchizat zənciri meneceri", "Supply Chain Manager", "supply"),
  title("logistics-specialist", "Logistika mütəxəssisi", "Logistics Specialist", "supply", ["logist", "logistics coordinator"]),
  title("logistics-manager", "Logistika meneceri", "Logistics Manager", "supply"),
  title("warehouse-manager", "Anbar müdiri", "Warehouse Manager", "supply", ["anbar rəisi"]),
  title("storekeeper", "Anbardar", "Storekeeper", "supply", ["anbar işçisi", "warehouse keeper", "кладовщик"]),
  title("warehouse-worker", "Anbar fəhləsi", "Warehouse Worker", "supply", ["yükləyici", "loader"]),
  title("customs-broker", "Gömrük brokeri", "Customs Broker", "supply", ["gömrük deklarantı", "customs declarant"]),
  title("freight-forwarder", "Ekspeditor", "Freight Forwarder", "supply", ["ekspeditor"]),
  title("driver", "Sürücü", "Driver", "supply", ["sürücü-ekspeditor", "водитель"]),
  title("truck-driver", "Yük maşını sürücüsü", "Truck Driver", "supply", ["TIR sürücüsü"]),
  title("courier", "Kuryer", "Courier", "supply", ["çatdırılma əməkdaşı", "delivery courier"]),
  title("forklift-operator", "Forklift operatoru", "Forklift Operator", "supply", ["pogruzçik operatoru"]),
  title("dispatcher", "Dispetçer", "Dispatcher", "supply", ["логист-диспетчер"]),
  title("inventory-specialist", "İnventar mütəxəssisi", "Inventory Specialist", "supply", ["stok mütəxəssisi"]),

  // Engineering, construction and manufacturing
  title("civil-engineer", "İnşaat mühəndisi", "Civil Engineer", "engineering"),
  title("site-engineer", "Sahə mühəndisi", "Site Engineer", "engineering", ["obyekt mühəndisi"]),
  title("construction-manager", "Tikinti meneceri", "Construction Manager", "engineering", ["iş icraçısı", "prorab", "site manager"]),
  title("structural-engineer", "Konstruktor mühəndis", "Structural Engineer", "engineering"),
  title("architect", "Memar", "Architect", "engineering", ["arxitektor"]),
  title("estimator", "Smetaçı", "Cost Estimator", "engineering", ["smeta mühəndisi", "quantity surveyor"]),
  title("mechanical-engineer", "Mexanika mühəndisi", "Mechanical Engineer", "engineering"),
  title("electrical-engineer", "Elektrik mühəndisi", "Electrical Engineer", "engineering", ["energetik"]),
  title("electrician", "Elektrik", "Electrician", "engineering", ["elektrik ustası", "elektromontyor"]),
  title("plumber", "Santexnik", "Plumber", "engineering", ["santexnik"]),
  title("welder", "Qaynaqçı", "Welder", "engineering", ["svarşik"]),
  title("hvac-engineer", "HVAC mühəndisi", "HVAC Engineer", "engineering", ["ventilyasiya mühəndisi"]),
  title("process-engineer", "Proses mühəndisi", "Process Engineer", "engineering"),
  title("production-engineer", "İstehsal mühəndisi", "Production Engineer", "engineering"),
  title("production-manager", "İstehsalat müdiri", "Production Manager", "engineering", ["sex rəisi"]),
  title("maintenance-engineer", "Texniki xidmət mühəndisi", "Maintenance Engineer", "engineering"),
  title("maintenance-technician", "Texniki xidmət ustası", "Maintenance Technician", "engineering", ["texnik", "mechanic"]),
  title("auto-mechanic", "Avtomexanik", "Auto Mechanic", "engineering", ["avtoservis ustası"]),
  title("quality-engineer", "Keyfiyyət mühəndisi", "Quality Engineer", "engineering", ["QA/QC engineer", "keyfiyyətə nəzarət mütəxəssisi"]),
  title("qc-inspector", "Keyfiyyətə nəzarət inspektoru", "QC Inspector", "engineering", ["inspector"]),
  title("petroleum-engineer", "Neft mühəndisi", "Petroleum Engineer", "engineering", ["neft-qaz mühəndisi", "drilling engineer", "qazma mühəndisi"]),
  title("geologist", "Geoloq", "Geologist", "engineering"),
  title("automation-engineer", "Avtomatlaşdırma mühəndisi", "Automation Engineer", "engineering", ["PLC engineer", "SCADA engineer"]),
  title("project-engineer", "Layihə mühəndisi", "Project Engineer", "engineering"),
  title("draftsman", "Çertyojçu / CAD operatoru", "Draftsman / CAD Operator", "engineering", ["AutoCAD operator", "texniki rəssam"]),
  title("operator-machine", "Dəzgah operatoru", "Machine Operator", "engineering", ["CNC operator", "istehsal operatoru"]),
  title("laborer", "Fəhlə", "General Worker", "engineering", ["köməkçi fəhlə", "разнорабочий"]),
  title("environmental-engineer", "Ekoloq mühəndis", "Environmental Engineer", "engineering", ["ekoloq"]),

  // IT and data
  title("software-developer", "Proqram təminatı tərtibatçısı", "Software Developer", "it", ["proqramçı", "developer", "software engineer", "programmer"]),
  title("backend-developer", "Backend developer", "Backend Developer", "it", ["backend proqramçı", "backend engineer"]),
  title("frontend-developer", "Frontend developer", "Frontend Developer", "it", ["frontend proqramçı", "react developer", "frontend engineer"]),
  title("fullstack-developer", "Full-stack developer", "Full-stack Developer", "it", ["fullstack"]),
  title("mobile-developer", "Mobil tətbiq tərtibatçısı", "Mobile Developer", "it", ["iOS developer", "Android developer", "Flutter developer"]),
  title("python-developer", "Python developer", "Python Developer", "it"),
  title("java-developer", "Java developer", "Java Developer", "it"),
  title("dotnet-developer", ".NET developer", ".NET Developer", "it", ["C# developer"]),
  title("php-developer", "PHP developer", "PHP Developer", "it", ["Laravel developer"]),
  title("1c-programmer", "1C proqramçısı", "1C Developer", "it", ["1C programmer", "программист 1С"]),
  title("qa-engineer", "QA mühəndisi", "QA Engineer", "it", ["tester", "test mühəndisi", "software tester"]),
  title("devops-engineer", "DevOps mühəndisi", "DevOps Engineer", "it"),
  title("system-administrator", "Sistem administratoru", "System Administrator", "it", ["sysadmin", "sistem inzibatçısı"]),
  title("network-engineer", "Şəbəkə mühəndisi", "Network Engineer", "it", ["network administrator", "şəbəkə administratoru"]),
  title("it-support", "İT dəstək mütəxəssisi", "IT Support Specialist", "it", ["helpdesk", "texniki dəstək", "IT specialist"]),
  title("it-manager", "İT meneceri", "IT Manager", "it", ["İT şöbəsinin rəisi", "head of IT"]),
  title("cto", "Texnologiya direktoru", "Chief Technology Officer (CTO)", "it", ["CTO"]),
  title("data-analyst", "Məlumat analitiki", "Data Analyst", "it", ["data analitik", "BI analyst"]),
  title("data-scientist", "Data Scientist", "Data Scientist", "it", ["məlumat alimi"]),
  title("data-engineer", "Data mühəndisi", "Data Engineer", "it"),
  title("ml-engineer", "Maşın öyrənməsi mühəndisi", "Machine Learning Engineer", "it", ["AI engineer"]),
  title("database-administrator", "Verilənlər bazası administratoru", "Database Administrator", "it", ["DBA"]),
  title("business-analyst", "Biznes analitik", "Business Analyst", "it", ["BA", "biznes təhlilçisi"]),
  title("system-analyst", "Sistem analitiki", "System Analyst", "it"),
  title("product-manager", "Məhsul meneceri", "Product Manager", "it", ["product owner", "PO"]),
  title("project-manager-it", "İT layihə meneceri", "IT Project Manager", "it", ["scrum master"]),
  title("cybersecurity-specialist", "Kibertəhlükəsizlik mütəxəssisi", "Cybersecurity Specialist", "it", ["information security specialist", "SOC analyst", "informasiya təhlükəsizliyi mütəxəssisi"]),
  title("ui-ux-designer", "UI/UX dizayner", "UI/UX Designer", "it", ["product designer", "UX designer"]),
  title("erp-consultant", "ERP məsləhətçisi", "ERP Consultant", "it", ["SAP consultant", "Oracle consultant"]),

  // Marketing, media and design
  title("marketing-specialist", "Marketinq mütəxəssisi", "Marketing Specialist", "marketing", ["marketoloq", "marketinq üzrə mütəxəssis"]),
  title("marketing-manager", "Marketinq meneceri", "Marketing Manager", "marketing", ["marketinq rəhbəri", "head of marketing"]),
  title("digital-marketing-specialist", "Rəqəmsal marketinq mütəxəssisi", "Digital Marketing Specialist", "marketing", ["digital marketer"]),
  title("smm-specialist", "SMM mütəxəssisi", "SMM Specialist", "marketing", ["SMM manager", "social media manager"]),
  title("content-manager", "Kontent meneceri", "Content Manager", "marketing", ["content creator", "kontent yaradıcısı"]),
  title("copywriter", "Kopirayter", "Copywriter", "marketing", ["mətn yazarı"]),
  title("seo-specialist", "SEO mütəxəssisi", "SEO Specialist", "marketing"),
  title("ppc-specialist", "Performans marketinq mütəxəssisi", "Performance Marketing Specialist", "marketing", ["PPC specialist", "target specialist", "targetoloq"]),
  title("brand-manager", "Brend meneceri", "Brand Manager", "marketing"),
  title("pr-specialist", "PR mütəxəssisi", "PR Specialist", "marketing", ["ictimaiyyətlə əlaqələr mütəxəssisi", "public relations"]),
  title("event-manager", "Tədbirlərin təşkili meneceri", "Event Manager", "marketing", ["event coordinator"]),
  title("market-researcher", "Bazar araşdırmaları mütəxəssisi", "Market Research Analyst", "marketing"),
  title("graphic-designer", "Qrafik dizayner", "Graphic Designer", "marketing", ["dizayner", "designer"]),
  title("motion-designer", "Motion dizayner", "Motion Designer", "marketing"),
  title("video-editor", "Video montajçı", "Video Editor", "marketing", ["montajçı"]),
  title("videographer", "Videoqraf", "Videographer", "marketing", ["operator (video)"]),
  title("photographer", "Fotoqraf", "Photographer", "marketing"),
  title("journalist", "Jurnalist", "Journalist", "marketing", ["müxbir", "reporter"]),
  title("editor", "Redaktor", "Editor", "marketing"),
  title("translator", "Tərcüməçi", "Translator", "marketing", ["interpreter", "переводчик"]),
  title("interior-designer", "İnteryer dizayneri", "Interior Designer", "marketing"),
  title("ecommerce-manager", "E-ticarət meneceri", "E-commerce Manager", "marketing"),

  // Legal and compliance
  title("lawyer", "Hüquqşünas", "Lawyer", "legal", ["hüquq məsləhətçisi", "legal counsel", "юрист"]),
  title("senior-lawyer", "Baş hüquqşünas", "Senior Legal Counsel", "legal"),
  title("head-of-legal", "Hüquq şöbəsinin rəhbəri", "Head of Legal", "legal", ["legal director"]),
  title("attorney", "Vəkil", "Attorney / Advocate", "legal", ["advokat", "advocate"]),
  title("compliance-officer", "Uyğunluq (compliance) mütəxəssisi", "Compliance Officer", "legal", ["compliance specialist"]),
  title("paralegal", "Hüquqşünas köməkçisi", "Paralegal", "legal", ["legal assistant"]),
  title("notary", "Notarius", "Notary", "legal"),
  title("contract-manager", "Müqavilələr üzrə mütəxəssis", "Contract Manager", "legal", ["contracts specialist"]),

  // Education and training
  title("teacher", "Müəllim", "Teacher", "education", ["müəllimə", "учитель"]),
  title("english-teacher", "İngilis dili müəllimi", "English Teacher", "education", ["ESL teacher"]),
  title("math-teacher", "Riyaziyyat müəllimi", "Mathematics Teacher", "education"),
  title("primary-teacher", "İbtidai sinif müəllimi", "Primary School Teacher", "education"),
  title("tutor", "Repetitor", "Tutor", "education", ["fərdi müəllim"]),
  title("trainer", "Təlimçi", "Trainer", "education", ["coach", "kouç"]),
  title("lecturer", "Müəllim (ali məktəb)", "Lecturer", "education", ["dosent", "professor"]),
  title("preschool-teacher", "Tərbiyəçi", "Preschool Teacher", "education", ["bağça müəllimi", "kindergarten teacher"]),
  title("school-principal", "Məktəb direktoru", "School Principal", "education"),
  title("academic-coordinator", "Tədris koordinatoru", "Academic Coordinator", "education", ["tədris hissə müdiri"]),
  title("psychologist", "Psixoloq", "Psychologist", "education", ["məktəb psixoloqu"]),

  // Hospitality and tourism
  title("waiter", "Ofisiant", "Waiter", "hospitality", ["ofisiant", "waitress", "официант"]),
  title("barista", "Barista", "Barista", "hospitality"),
  title("bartender", "Barmen", "Bartender", "hospitality", ["barmen"]),
  title("cook", "Aşpaz", "Cook", "hospitality", ["aşpaz köməkçisi", "повар"]),
  title("chef", "Baş aşpaz", "Chef", "hospitality", ["şef aşpaz", "head chef", "executive chef"]),
  title("pastry-chef", "Qənnadçı", "Pastry Chef", "hospitality", ["şirniyyatçı"]),
  title("restaurant-manager", "Restoran meneceri", "Restaurant Manager", "hospitality", ["restoran müdiri"]),
  title("receptionist", "Resepşn", "Receptionist", "hospitality", ["front desk agent", "resepşionist"]),
  title("hotel-manager", "Otel meneceri", "Hotel Manager", "hospitality", ["otel müdiri", "general manager hotel"]),
  title("housekeeper", "Xadimə", "Housekeeper", "hospitality", ["housekeeping", "otaq xidmətçisi"]),
  title("tour-guide", "Bələdçi", "Tour Guide", "hospitality", ["ekskursiya bələdçisi"]),
  title("travel-agent", "Turizm meneceri", "Travel Agent", "hospitality", ["tur operator", "travel consultant"]),
  title("dishwasher", "Qabyuyan", "Dishwasher", "hospitality"),
  title("cleaner", "Təmizlikçi", "Cleaner", "hospitality", ["xadimə (ofis)", "cleaning staff"]),

  // Healthcare and pharmacy
  title("doctor", "Həkim", "Doctor", "health", ["physician", "врач"]),
  title("dentist", "Stomatoloq", "Dentist", "health", ["diş həkimi"]),
  title("nurse", "Tibb bacısı", "Nurse", "health", ["medsestra"]),
  title("pharmacist", "Əczaçı", "Pharmacist", "health", ["farmasevt", "провизор"]),
  title("lab-technician", "Laborant", "Laboratory Technician", "health", ["laborant"]),
  title("radiologist", "Radioloq", "Radiologist", "health"),
  title("physiotherapist", "Fizioterapevt", "Physiotherapist", "health"),
  title("midwife", "Mama", "Midwife", "health"),
  title("pediatrician", "Pediatr", "Pediatrician", "health", ["uşaq həkimi"]),
  title("medical-administrator", "Tibb müəssisəsi administratoru", "Medical Administrator", "health", ["klinika administratoru"]),
  title("veterinarian", "Baytar", "Veterinarian", "health", ["veterinar"]),

  // Security and HSE
  title("hse-specialist", "HSE mütəxəssisi", "HSE Specialist", "security", ["əməyin mühafizəsi mütəxəssisi", "safety officer", "təhlükəsizlik texnikası mühəndisi"]),
  title("hse-manager", "HSE meneceri", "HSE Manager", "security"),
  title("security-guard", "Mühafizəçi", "Security Guard", "security", ["təhlükəsizlik işçisi", "охранник"]),
  title("security-manager", "Təhlükəsizlik xidmətinin rəhbəri", "Security Manager", "security"),
  title("fire-safety-specialist", "Yanğın təhlükəsizliyi mütəxəssisi", "Fire Safety Specialist", "security"),

  // Administration and management
  title("office-manager", "Ofis meneceri", "Office Manager", "admin", ["ofis müdiri"]),
  title("administrator", "Administrator", "Administrator", "admin", ["inzibatçı"]),
  title("secretary", "Katibə", "Secretary", "admin", ["katib", "секретарь"]),
  title("personal-assistant", "Şəxsi köməkçi", "Personal Assistant", "admin", ["executive assistant", "direktor köməkçisi", "assistant"]),
  title("document-specialist", "Sənəd dövriyyəsi üzrə mütəxəssis", "Document Control Specialist", "admin", ["document controller", "kargüzar", "делопроизводитель"]),
  title("archivist", "Arxivçi", "Archivist", "admin"),
  title("operations-manager", "Əməliyyatlar meneceri", "Operations Manager", "admin", ["operations director", "əməliyyat direktoru"]),
  title("project-manager", "Layihə meneceri", "Project Manager", "admin", ["layihə rəhbəri", "PM"]),
  title("project-coordinator", "Layihə koordinatoru", "Project Coordinator", "admin"),
  title("general-director", "Baş direktor", "General Director / CEO", "admin", ["CEO", "icraçı direktor", "managing director", "direktor"]),
  title("deputy-director", "Direktor müavini", "Deputy Director", "admin"),
  title("branch-manager", "Filial müdiri", "Branch Manager", "admin"),
  title("department-head", "Şöbə müdiri", "Head of Department", "admin", ["şöbə rəisi", "department manager"]),
  title("strategy-manager", "Strategiya meneceri", "Strategy Manager", "admin", ["strategy analyst"]),
  title("consultant", "Məsləhətçi", "Consultant", "admin", ["konsultant", "management consultant"]),
  title("data-entry-operator", "Məlumat daxiletmə operatoru", "Data Entry Operator", "admin", ["operator (PC)"]),
  title("intern", "Təcrübəçi", "Intern", "admin", ["internship", "stajor", "təcrübə proqramı iştirakçısı"]),
].map((t) => (RU_LABELS_OF_BASE[t.id] ? { ...t, labelRu: RU_LABELS_OF_BASE[t.id], aliases: [...t.aliases, RU_LABELS_OF_BASE[t.id]] } : t));

// Hand-written core titles plus the large generated list.
// Everyday short forms people write instead of the full title ("maliyyəçi").
const SHORT_FORMS: Record<string, string[]> = {
  "procurement-specialist": ["satınalmaçı"],
  "hr-specialist": ["kadrlar mütəxəssisi"],
  "logistics-specialist": ["logistik"],
  controller: ["maliyyə kontrolleri"],
};
export const JOB_TITLE_CATALOG: JobTitleDefinition[] = [...BASE_JOB_TITLES, ...EXTRA_JOB_TITLES].map((t) =>
  SHORT_FORMS[t.id] ? { ...t, aliases: [...t.aliases, ...SHORT_FORMS[t.id]] } : t,
);

export const normalizeJobTitleKey = (value: string) =>
  normalizeSkillKey(value).replace(/ə/g, "e");

// Seniority levels are derived on demand instead of stored: every profession
// can be "Junior …", "Senior …", "Lead …" or "Head of …". Variants share the
// base profession's family and count as the same profession when matching.
// Nothing is generated at import time: Workers have a tiny per-request CPU
// budget, so lookups stay O(1) over the base catalog.
export const SENIORITY_LEVELS: { id: string; en: string; az: string; aliases: string[] }[] = [
  { id: "intern", en: "Intern", az: "Təcrübəçi", aliases: ["stajyor", "trainee"] },
  { id: "assistant", en: "Assistant", az: "Köməkçi", aliases: ["köməkçi"] },
  { id: "junior", en: "Junior", az: "Kiçik", aliases: ["junior", "başlanğıc səviyyə", "entry level"] },
  { id: "middle", en: "Middle", az: "Middle", aliases: ["orta səviyyə", "mid-level", "mid"] },
  { id: "senior", en: "Senior", az: "Böyük", aliases: ["senior", "təcrübəli"] },
  { id: "lead", en: "Lead", az: "Aparıcı", aliases: ["lead", "team lead", "komanda lideri"] },
  { id: "chief", en: "Chief", az: "Baş", aliases: ["chief", "principal"] },
  { id: "head", en: "Head of", az: "Rəhbər", aliases: ["rəhbər"] },
];
const SENIORITY_WORDS = /^(senior|junior|middle|lead|head|chief|assistant|deputy|intern|principal|vice|trainee)\b|\b(chief|director|head of|intern|ceo|cfo|cto|coo)\b/i;


// Admin-added titles loaded at runtime (server per request, browser from state).
let customRegistry: JobTitleDefinition[] = [];
export function setCustomJobTitles(list: JobTitleDefinition[]) {
  customRegistry = Array.isArray(list) ? list : [];
}
export function customJobTitles() {
  return customRegistry;
}
function allTitles(extra: JobTitleDefinition[]) {
  return extra.length ? [...JOB_TITLE_CATALOG, ...extra] : JOB_TITLE_CATALOG;
}

const keyCache = new WeakMap<JobTitleDefinition, string[]>();
const aliasKeys = (t: JobTitleDefinition) => {
  let keys = keyCache.get(t);
  if (!keys || keys.length !== t.aliases.length) {
    keys = t.aliases.map(normalizeJobTitleKey);
    keyCache.set(t, keys);
  }
  return keys;
};
let baseIndex: Map<string, JobTitleDefinition> | null = null;
function indexed() {
  if (!baseIndex) {
    baseIndex = new Map();
    for (const t of JOB_TITLE_CATALOG) {
      for (const k of aliasKeys(t)) if (!baseIndex.has(k)) baseIndex.set(k, t);
      baseIndex.set(t.id, t);
    }
  }
  return baseIndex;
}

// "Mühasib" -> "mühasib", but acronyms ("HR mütəxəssisi") keep their capitals.
const lowerFirst = (value: string) =>
  /^\p{Lu}{2}/u.test(value) ? value : value.charAt(0).toLocaleLowerCase("az") + value.slice(1);
// Titles that already say their level ("Baş mühasib", "Köməkçi") get no prefix.
const AZ_LEVEL_WORDS = /^(baş|aparıcı|kiçik|böyük|senior|junior|köməkçi|təcrübəçi|rəhbər|müavin)\b/i;
const variants = new Map<string, JobTitleDefinition>();
function variantOf(base: JobTitleDefinition, levelId: string): JobTitleDefinition | null {
  const level = SENIORITY_LEVELS.find((l) => l.id === levelId);
  if (!level || SENIORITY_WORDS.test(base.labelEn) || AZ_LEVEL_WORDS.test(base.label)) return null;
  const id = `${level.id}-${base.id}`;
  const cached = variants.get(id);
  if (cached) return cached;
  const lowerAz = lowerFirst(base.label);
  const en = level.id === "head" ? `Head of ${base.labelEn}` : `${level.en} ${base.labelEn}`;
  const az = level.id === "head" ? `${base.label} üzrə rəhbər` : `${level.az} ${lowerAz}`;
  const made: JobTitleDefinition = {
    id,
    label: az,
    labelEn: en,
    family: base.family,
    aliases: [az, en, ...level.aliases.map((a) => `${a} ${lowerAz}`), ...(level.id === "head" ? [`${lowerAz} rəhbəri`] : [])],
    base: base.id,
    level: level.id,
  };
  variants.set(id, made);
  return made;
}
// "senior mühasib" / "Mühasib üzrə rəhbər" -> { level, rest }
function splitLevel(key: string): { level: string; rest: string } | null {
  for (const level of SENIORITY_LEVELS) {
    const words = [level.en, level.az, ...level.aliases].map(normalizeJobTitleKey);
    for (const word of words) {
      if (word && key.startsWith(`${word} `)) return { level: level.id, rest: key.slice(word.length + 1) };
    }
  }
  const tail = key.match(/^(.*) uzre rehber$/);
  return tail ? { level: "head", rest: tail[1] } : null;
}

export function canonicalJobTitle(value: string, extra: JobTitleDefinition[] = customRegistry) {
  const key = normalizeJobTitleKey(value);
  if (!key) return null;
  const direct = indexed().get(value) || indexed().get(key);
  if (direct) return direct;
  const custom = extra.find((t) => t.id === value || aliasKeys(t).includes(key));
  if (custom) return custom;
  const split = splitLevel(key);
  if (split) {
    const base = indexed().get(split.rest) || extra.find((t) => aliasKeys(t).includes(split.rest));
    if (base && !base.base) return variantOf(base, split.level);
  }
  return null;
}

function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 3) return 9;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function searchBase(needle: string, limit: number, extra: JobTitleDefinition[]) {
  const tolerance = needle.length >= 8 ? 2 : needle.length >= 4 ? 1 : 0;
  return allTitles(extra)
    .map((t) => {
      const keys = aliasKeys(t);
      if (keys.includes(needle)) return { t, rank: 0 };
      if (keys.some((k) => k.startsWith(needle))) return { t, rank: 1 };
      if (keys.some((k) => k.includes(needle))) return { t, rank: 2 };
      const best = Math.min(...keys.map((k) => distance(k, needle)));
      if (best <= tolerance) return { t, rank: 3 + best };
      return null;
    })
    .filter((x): x is { t: JobTitleDefinition; rank: number } => !!x)
    .sort((a, b) => a.rank - b.rank || a.t.label.length - b.t.label.length)
    .slice(0, limit)
    .map((x) => x.t);
}

// Exact, prefix, substring and typo-tolerant search (1–2 letter mistakes).
// "senior accountant" finds the Senior variant; plain "accountant" also
// offers the Junior/Senior/Lead/Head variants of the best match.
export function searchJobTitles(query: string, limit = 8, extra: JobTitleDefinition[] = customRegistry) {
  const needle = normalizeJobTitleKey(query);
  if (!needle) return [] as JobTitleDefinition[];
  const split = splitLevel(needle);
  if (split && split.rest) {
    const bases = searchBase(split.rest, 3, extra).filter((t) => !t.base);
    const made = bases.map((t) => variantOf(t, split.level)).filter((t): t is JobTitleDefinition => !!t);
    if (made.length) return made.slice(0, limit);
  }
  const found = searchBase(needle, limit, extra);
  const first = found.find((t) => !t.base && !SENIORITY_WORDS.test(t.labelEn));
  if (!first) return found;
  // The levels of the best match come right after it, so "mühasib" offers
  // Kiçik / Böyük / Aparıcı / Baş mühasib before other titles that contain the word.
  // A level the catalog already has as a title of its own ("Baş mühasib") is used as it is.
  const seen = new Set(found.slice(0, found.indexOf(first) + 1).map((t) => normalizeJobTitleKey(t.label)));
  const extras: JobTitleDefinition[] = [];
  for (const level of ["junior", "senior", "lead", "chief", "head"]) {
    const made = variantOf(first, level);
    if (!made) continue;
    const key = normalizeJobTitleKey(made.label);
    const own = indexed().get(key);
    const title = own && normalizeJobTitleKey(own.label) === key ? own : made;
    if (seen.has(key) || seen.has(normalizeJobTitleKey(title.label))) continue;
    seen.add(key);
    seen.add(normalizeJobTitleKey(title.label));
    extras.push(title);
  }
  const rest = found.filter((t) => t !== first && !extras.some((e) => e.id === t.id));
  return [first, ...extras, ...rest].slice(0, limit);
}

// Every base title and every seniority variant (exports and tests only).
export function fullJobTitleCatalog() {
  const out = [...JOB_TITLE_CATALOG];
  const ids = new Set(out.map((t) => t.id));
  for (const t of JOB_TITLE_CATALOG)
    for (const level of SENIORITY_LEVELS) {
      const made = variantOf(t, level.id);
      if (made && !ids.has(made.id) && !made.aliases.some((alias) => indexed().has(normalizeJobTitleKey(alias)))) {
        ids.add(made.id);
        out.push(made);
      }
    }
  return out;
}

export function jobTitleFamily(value: string, extra: JobTitleDefinition[] = customRegistry) {
  return canonicalJobTitle(value, extra)?.family || "";
}

// ---- International occupations -----------------------------------------
// ESCO occupations (English names) that the curated catalog does not have.
// Served as a static file and loaded in the browser on demand; they are
// suggestions for the title field, not matching data.
export type WorldJobTitle = string;

const worldTitleKeys = new WeakMap<WorldJobTitle[], string[]>();
const worldKeysOf = (list: WorldJobTitle[]) => {
  let keys = worldTitleKeys.get(list);
  if (!keys) {
    keys = list.map(normalizeJobTitleKey);
    worldTitleKeys.set(list, keys);
  }
  return keys;
};

export function searchWorldJobTitles(list: WorldJobTitle[], query: string, limit = 8) {
  const needle = normalizeJobTitleKey(query);
  if (needle.length < 2) return [] as WorldJobTitle[];
  const keys = worldKeysOf(list);
  const ranked: { i: number; rank: number }[] = [];
  for (let i = 0; i < list.length; i++) {
    const key = keys[i];
    let rank = 9;
    if (key === needle) rank = 0;
    else if (key.startsWith(needle)) rank = 1;
    else if (key.split(" ").some((w) => w.startsWith(needle))) rank = 2;
    else if (needle.length >= 3 && key.includes(needle)) rank = 3;
    if (rank < 9) ranked.push({ i, rank });
  }
  return ranked
    .sort((a, b) => a.rank - b.rank || list[a.i].length - list[b.i].length)
    .slice(0, limit)
    .map((r) => list[r.i]);
}

export function worldJobTitleKnown(list: WorldJobTitle[], value: string) {
  const key = normalizeJobTitleKey(value);
  if (!key) return null;
  const index = worldKeysOf(list).indexOf(key);
  return index >= 0 ? list[index] : null;
}
