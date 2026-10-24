export type SkillDefinition = {
  id: string;
  label: string;
  labelEn: string;
  category: string;
  categoryEn: string;
  aliases: string[];
};

const ENGLISH_CATEGORIES: Record<string, string> = {
  "Maliyyə": "Finance",
  "Bank": "Banking",
  "Sığorta": "Insurance",
  "Proqramlar": "Software",
  "Məlumat": "Data",
  "İT": "IT",
  "İnsan resursları": "Human Resources",
  "Satış": "Sales",
  "Biznes": "Business",
  "Təchizat": "Procurement and Supply Chain",
  "İdarəetmə": "Management",
  "Hüquq": "Legal",
  "Marketinq": "Marketing",
  "Dizayn": "Design",
  "Təhsil": "Education",
  "Xidmət": "Hospitality and Service",
  "Səhiyyə": "Healthcare",
  "Mühəndislik": "Engineering",
  "Təhlükəsizlik": "Safety",
};

// Overrides retain the standard English product/acronym spelling and make
// combined skills explicit. Other English labels come from the first alias.
const ENGLISH_LABEL_OVERRIDES: Record<string, string> = {
  "accounts-receivable-payable": "Accounts Receivable and Accounts Payable",
  "vat-einvoice": "Electronic Invoicing and VAT Accounting",
  "fp-and-a": "Financial Planning and Analysis (FP&A)",
  "aml-kyc": "AML / KYC",
  excel: "Microsoft Excel",
  "microsoft-office": "Microsoft Office",
  "1c": "1C",
  sap: "SAP",
  "sap-fi-co": "SAP FI/CO",
  "oracle-erp": "Oracle ERP",
  serp: "SERP",
  btb: "BTB",
  "power-bi": "Power BI",
  tableau: "Tableau",
  qlik: "Qlik",
  sql: "SQL",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  mssql: "Microsoft SQL Server",
  "data-science": "Data Science",
  "data-warehouse": "Data Warehouse",
  "etl-elt": "ETL / ELT",
  "apache-spark": "Apache Spark",
  "apache-kafka": "Apache Kafka",
  "apache-airflow": "Apache Airflow",
  dbt: "dbt",
  llm: "Large Language Models and Generative AI",
  python: "Python",
  django: "Django",
  flask: "Flask",
  javascript: "JavaScript",
  nodejs: "Node.js",
  typescript: "TypeScript",
  java: "Java",
  "spring-boot": "Spring Boot",
  dotnet: ".NET / C#",
  php: "PHP",
  react: "React",
  angular: "Angular",
  vue: "Vue.js",
  "react-native": "React Native",
  "html-css": "HTML / CSS",
  git: "Git",
  docker: "Docker",
  kubernetes: "Kubernetes",
  linux: "Linux",
  "windows-server": "Windows Server",
  "active-directory": "Active Directory",
  devops: "DevOps",
  "ci-cd": "CI/CD",
  powershell: "PowerShell",
  bash: "Bash",
  "jira-confluence": "Jira / Confluence",
  hris: "HRIS",
  crm: "CRM",
  rfq: "Request for Quotation (RFQ)",
  seo: "SEO",
  "sem-ppc": "SEM / PPC",
  "google-ads": "Google Ads",
  "meta-ads": "Meta Ads",
  autocad: "AutoCAD",
  revit: "Revit",
  solidworks: "SolidWorks",
  figma: "Figma",
  "ui-ux": "UI / UX Design",
  "food-safety": "Food Safety / HACCP",
  hvac: "HVAC",
  "plc-scada": "PLC / SCADA",
  "iso-standards": "ISO Standards",
  ifrs: "IFRS",
};

const capitalizeEnglish = (value: string) =>
  value ? value[0].toLocaleUpperCase("en") + value.slice(1) : value;

const skill = (
  id: string,
  label: string,
  category: string,
  aliases: string[] = [],
): SkillDefinition => {
  const labelEn =
    ENGLISH_LABEL_OVERRIDES[id] || capitalizeEnglish(aliases[0] || label);
  return {
    id,
    label,
    labelEn,
    category,
    categoryEn: ENGLISH_CATEGORIES[category] || category,
    aliases: [label, labelEn, ...aliases],
  };
};

// One shared taxonomy for candidate CVs, vacancy requirements and matching.
// Labels are intentionally concise and searchable; aliases absorb language,
// spelling, version and phrasing differences without creating duplicate tags.
export const SKILL_CATALOG: SkillDefinition[] = [
  skill("finance", "Maliyyə", "Maliyyə", ["finance", "financial", "финансы", "финансовый"]),
  skill("accounting", "Mühasibatlıq", "Maliyyə", ["accounting", "bookkeeping", "mühasib", "бухгалтерия", "бухгалтерский учет"]),
  skill("financial-accounting", "Maliyyə uçotu", "Maliyyə", ["financial accounting", "maliyyə uçotunun təşkili"]),
  skill("management-accounting", "İdarəetmə uçotu", "Maliyyə", ["management accounting", "idarəetmə mühasibatlığı"]),
  skill("cost-accounting", "Maya dəyəri uçotu", "Maliyyə", ["cost accounting", "hesabatlıq və cost accounting", "maya dəyərinin hesablanması", "maya dəyəri üzrə hesabat"]),
  skill("financial-reporting", "Maliyyə hesabatlılığı", "Maliyyə", ["financial reporting", "hesabatlılıq", "maliyyə hesabatları", "maliyyə hesabatlarının hazırlanması", "maliyyə hesabatlarının hazırlanması sofp pl cf soce", "sofp pl cf soce"]),
  skill("financial-analysis", "Maliyyə təhlili", "Maliyyə", ["financial analysis", "financial ratio analysis", "maliyyə hesabatlarının analizi", "analiz npv pv fv irr financial ratio analysis", "npv pv fv irr"]),
  skill("budgeting", "Büdcələşdirmə", "Maliyyə", ["budgeting", "budget planning", "büdcə", "büdcənin hazırlanması", "illik büdcənin hazırlanması", "büdcələşdirmə və planlama", "büdcə və planlama"]),
  skill("cost-control", "Xərclərə nəzarət", "Maliyyə", ["cost control", "xərc nəzarəti", "xərc mərkəzlərinə nəzarət", "xərclərin idarə edilməsi"]),
  skill("accounts-receivable-payable", "Debitor və kreditor uçotu", "Maliyyə", ["accounts receivable", "accounts payable", "ap ar", "debitor və kreditor hesabatı", "debitor kreditor", "debitor/kreditor nəzarəti", "debitor kreditor nəzarəti"]),
  skill("fixed-assets", "Əsas vəsaitlərin uçotu", "Maliyyə", ["fixed asset accounting", "fixed assets", "əsas vəsaitlər", "əsas vəsaitlər uçotu", "amortizasiya uçotu"]),
  skill("tax-accounting", "Vergi uçotu", "Maliyyə", ["tax accounting", "taxation", "vergi", "vergi hesabatları", "налог"]),
  skill("vat-einvoice", "E-qaimə və ƏDV uçotu", "Maliyyə", ["e-qaimə", "elektron qaimə", "ədv", "vat", "e-qaimə üzrə ədv məbləğlərinin ödənilməsi və əvəzləşdirilməsi"]),
  skill("payroll", "Əməkhaqqı hesablanması", "Maliyyə", ["payroll", "salary calculation", "əməkhaqqı", "зарплата"]),
  skill("bank-reporting", "Bank hesabatları", "Maliyyə", ["bank reporting", "bank üçün hesabatların hazırlanması və təqdim edilməsi"]),
  skill("treasury", "Xəzinədarlıq", "Maliyyə", ["treasury", "cash management", "kassa və bank əməliyyatları"]),
  skill("cash-flow", "Pul vəsaitlərinin hərəkəti", "Maliyyə", ["cash flow", "cash flow statement", "pul axını", "pul axınlarının idarə edilməsi", "pul vəsaitlərinin hərəkəti haqqında hesabat", "cf statement", "pl cf"]),
  skill("internal-control", "Daxili nəzarət", "Maliyyə", ["internal control", "internal controls", "daxili nəzarət prosedurları", "uyğunluq və daxili nəzarət"]),
  skill("reconciliation", "Üzləşmə", "Maliyyə", ["reconciliation", "kontragentlər üzrə üzləşmə", "üzləşmələrin aparılması"]),
  skill("audit", "Audit", "Maliyyə", ["auditing", "аудит"]),
  skill("ifrs", "MHBS / IFRS", "Maliyyə", ["ifrs", "mhbs", "international financial reporting standards"]),
  skill("inventory", "İnventarizasiya", "Maliyyə", ["inventory", "stocktaking", "inventarizasiyanın təşkili"]),
  skill("month-end-closing", "Aylıq bağlanış", "Maliyyə", ["month end closing", "monthly closing", "aylıq bağlanış prosesi"]),
  skill("variance-analysis", "Variasiya təhlili", "Maliyyə", ["variance analysis", "variasiya analizi"]),
  skill("financial-modeling", "Maliyyə modelləşdirməsi", "Maliyyə", ["financial modeling", "financial modelling"]),
  skill("fp-and-a", "Maliyyə planlaması və təhlili", "Maliyyə", ["fp&a", "fpa", "financial planning and analysis"]),
  skill("credit-analysis", "Kredit təhlili", "Bank", ["credit analysis", "kredit analizi", "loan analysis"]),
  skill("credit-risk", "Kredit riski", "Bank", ["credit risk", "кредитный риск"]),
  skill("loan-underwriting", "Kredit anderraytinqi", "Bank", ["loan underwriting", "credit underwriting", "anderraytinq"]),
  skill("banking-operations", "Bank əməliyyatları", "Bank", ["banking operations", "bank operations"]),
  skill("leasing", "Lizinq", "Bank", ["leasing", "lease operations", "lizinq əməliyyatları"]),
  skill("insurance", "Sığorta", "Sığorta", ["insurance", "страхование"]),
  skill("aml-kyc", "AML / KYC", "Bank", ["aml", "kyc", "anti money laundering", "müştərini tanı"]),
  skill("debt-collection", "Borc yığımı", "Maliyyə", ["debt collection", "collections", "cash collection", "borcların yığılması"]),
  skill("risk-management", "Risklərin idarə edilməsi", "İdarəetmə", ["risk management", "operational risk", "əməliyyat riskləri"]),
  skill("excel", "Microsoft Excel", "Proqramlar", ["excel", "ms excel", "pivot table", "vlookup", "xlookup", "power query"]),
  skill("microsoft-office", "Microsoft Office", "Proqramlar", ["ms office", "office", "microsoft office proqramları"]),
  skill("1c", "1C", "Proqramlar", ["1c 8.3", "1c 8.3 proqramı", "1c proqramı", "1c mühasibatlıq", "1с", "1с 8.3"]),
  skill("sap", "SAP", "Proqramlar", ["sap erp", "sap proqramı"]),
  skill("sap-fi-co", "SAP FI/CO", "Proqramlar", ["sap fico", "sap fi", "sap co"]),
  skill("oracle-erp", "Oracle ERP", "Proqramlar", ["oracle", "oracle fusion", "oracle ebs"]),
  skill("serp", "SERP", "Proqramlar", ["serp proqramı", "serp program"]),
  skill("btb", "BTB", "Proqramlar", ["btb proqramı", "btb program"]),
  skill("power-bi", "Power BI", "Məlumat", ["powerbi", "power bi desktop"]),
  skill("tableau", "Tableau", "Məlumat", ["tableau desktop"]),
  skill("qlik", "Qlik", "Məlumat", ["qlik sense", "qlikview"]),
  skill("data-analysis", "Məlumat təhlili", "Məlumat", ["data analysis", "data analytics", "dataların analiz olunması", "analitika"]),
  skill("sql", "SQL", "Məlumat", ["t-sql", "database query", "verilənlər bazası sorğuları"]),
  skill("mysql", "MySQL", "Məlumat", ["mysql database"]),
  skill("postgresql", "PostgreSQL", "Məlumat", ["postgres", "postgres database"]),
  skill("mssql", "Microsoft SQL Server", "Məlumat", ["mssql", "ms sql server"]),
  skill("database-administration", "Verilənlər bazası administrasiyası", "Məlumat", ["database administration", "dba", "database administrator"]),
  skill("data-engineering", "Məlumat mühəndisliyi", "Məlumat", ["data engineering", "data engineer"]),
  skill("data-science", "Data Science", "Məlumat", ["data scientist", "məlumat elmi"]),
  skill("data-warehouse", "Data Warehouse", "Məlumat", ["data warehousing", "dwh", "data lake", "data lakehouse"]),
  skill("data-modeling", "Məlumat modelləşdirməsi", "Məlumat", ["data modeling", "data modelling"]),
  skill("data-quality", "Məlumat keyfiyyəti", "Məlumat", ["data quality", "data lineage", "metadata management"]),
  skill("etl-elt", "ETL / ELT", "Məlumat", ["etl", "elt", "data pipeline", "data pipelines"]),
  skill("apache-spark", "Apache Spark", "Məlumat", ["spark", "spark sql", "pyspark"]),
  skill("apache-kafka", "Apache Kafka", "Məlumat", ["kafka", "streaming data"]),
  skill("apache-airflow", "Apache Airflow", "Məlumat", ["airflow", "workflow orchestration"]),
  skill("dbt", "dbt", "Məlumat", ["data build tool"]),
  skill("machine-learning", "Maşın öyrənməsi", "Məlumat", ["machine learning", "ml", "машинное обучение"]),
  skill("artificial-intelligence", "Süni intellekt", "Məlumat", ["artificial intelligence", "ai", "ai engineering"]),
  skill("llm", "LLM və generativ AI", "Məlumat", ["large language models", "generative ai", "genai", "prompt engineering"]),
  skill("python", "Python", "İT", ["python programming", "pandas"]),
  skill("django", "Django", "İT", ["django rest framework", "drf"]),
  skill("flask", "Flask", "İT", ["flask framework"]),
  skill("javascript", "JavaScript", "İT", ["js", "ecmascript"]),
  skill("nodejs", "Node.js", "İT", ["nodejs", "node js", "express.js", "expressjs"]),
  skill("typescript", "TypeScript", "İT", ["ts"]),
  skill("java", "Java", "İT", ["java programming", "core java"]),
  skill("spring-boot", "Spring Boot", "İT", ["spring framework", "springboot"]),
  skill("dotnet", ".NET / C#", "İT", [".net", "dotnet", "c#", "asp.net", "asp net core"]),
  skill("php", "PHP", "İT", ["laravel", "php development"]),
  skill("react", "React", "İT", ["reactjs", "react.js"]),
  skill("angular", "Angular", "İT", ["angularjs", "angular framework"]),
  skill("vue", "Vue.js", "İT", ["vue", "vuejs"]),
  skill("react-native", "React Native", "İT", ["react native development"]),
  skill("mobile-development", "Mobil tətbiqlərin hazırlanması", "İT", ["mobile", "mobile development", "mobil tətbiq", "mobil proqramlaşdırma"]),
  skill("html-css", "HTML / CSS", "İT", ["html", "css", "frontend markup"]),
  skill("api", "API inteqrasiyası", "İT", ["rest api", "api integration", "web services"]),
  skill("git", "Git", "İT", ["github", "gitlab", "version control"]),
  skill("docker", "Docker", "İT", ["containerization", "containers"]),
  skill("kubernetes", "Kubernetes", "İT", ["k8s", "container orchestration"]),
  skill("linux", "Linux", "İT", ["ubuntu", "debian", "red hat", "centos", "rhel"]),
  skill("windows-server", "Windows Server", "İT", ["windows server 2022", "windows server 2025"]),
  skill("active-directory", "Active Directory", "İT", ["ad ds", "group policy", "gpo", "dns dhcp wsus"]),
  skill("system-administration", "Sistem administrasiyası", "İT", ["system administration", "sysadmin", "server administration"]),
  skill("network-administration", "Şəbəkə administrasiyası", "İT", ["network administration", "tcp/ip", "lan", "wan", "switches and routers"]),
  skill("virtualization", "Virtuallaşdırma", "İT", ["virtualization", "vmware", "vsphere", "esxi", "proxmox"]),
  skill("backup-recovery", "Ehtiyat nüsxələmə və bərpa", "İT", ["backup and recovery", "disaster recovery", "veeam", "acronis"]),
  skill("cybersecurity", "Kibertəhlükəsizlik", "İT", ["cybersecurity", "information security", "server hardening"]),
  skill("cloud-computing", "Bulud texnologiyaları", "İT", ["cloud computing", "aws", "azure", "google cloud", "gcp"]),
  skill("devops", "DevOps", "İT", ["dev ops", "infrastructure automation"]),
  skill("ci-cd", "CI/CD", "İT", ["continuous integration", "continuous delivery", "continuous deployment"]),
  skill("powershell", "PowerShell", "İT", ["powershell scripting"]),
  skill("bash", "Bash", "İT", ["shell scripting", "bash scripting"]),
  skill("technical-support", "Texniki dəstək", "İT", ["technical support", "it support", "help desk", "helpdesk"]),
  skill("software-testing", "Proqram təminatının test edilməsi", "İT", ["software testing", "manual testing", "qa testing"]),
  skill("test-automation", "Test avtomatlaşdırılması", "İT", ["test automation", "automated testing", "selenium", "cypress", "playwright"]),
  skill("jira-confluence", "Jira / Confluence", "Proqramlar", ["jira", "confluence", "jira itsm"]),
  skill("hr-operations", "HR əməliyyatları", "İnsan resursları", ["human resources", "insan resursları", "hr", "kadrlar", "кадры"]),
  skill("recruitment", "İşə qəbul", "İnsan resursları", ["recruitment", "recruiting", "talent acquisition"]),
  skill("tech-recruitment", "Texnoloji işə qəbul", "İnsan resursları", ["tech recruitment", "tech recruiter", "it recruitment"]),
  skill("candidate-sourcing", "Namizəd axtarışı", "İnsan resursları", ["candidate sourcing", "talent sourcing", "headhunting"]),
  skill("interviewing", "Müsahibələrin aparılması", "İnsan resursları", ["interviewing", "conducting interviews", "müsahibə"]),
  skill("onboarding", "İşə uyğunlaşdırma", "İnsan resursları", ["onboarding", "employee onboarding"]),
  skill("performance-management", "Performans idarəetməsi", "İnsan resursları", ["performance management", "performance appraisal"]),
  skill("learning-development", "Təlim və inkişaf", "İnsan resursları", ["learning and development", "l&d", "training and development"]),
  skill("hr-analytics", "HR analitikası", "İnsan resursları", ["hr analytics", "people analytics"]),
  skill("hris", "HRIS", "İnsan resursları", ["human resources information system", "hr information system"]),
  skill("compensation-benefits", "Əməkhaqqı və imtiyazlar", "İnsan resursları", ["compensation and benefits", "c&b", "total rewards"]),
  skill("employee-relations", "Əməkdaşlarla münasibətlər", "İnsan resursları", ["employee relations", "employee engagement", "employee loyalty"]),
  skill("employer-branding", "İşəgötürən brendi", "İnsan resursları", ["employer branding", "employee branding"]),
  skill("labor-law", "Əmək qanunvericiliyi", "İnsan resursları", ["labor law", "labour law", "əmək məcəlləsi"]),
  skill("sales", "Satış", "Satış", ["sales", "продажи"]),
  skill("b2b-sales", "B2B satış", "Satış", ["b2b sales", "corporate sales", "korporativ satış"]),
  skill("retail-sales", "Pərakəndə satış", "Satış", ["retail sales", "retail"]),
  skill("account-management", "Müştəri hesablarının idarə edilməsi", "Satış", ["account management", "account manager", "client management"]),
  skill("key-account-management", "Əsas müştərilərin idarə edilməsi", "Satış", ["key account management", "key account", "kam"]),
  skill("lead-generation", "Potensial müştəri axtarışı", "Satış", ["lead generation", "prospecting", "cold calling", "soyuq zənglər"]),
  skill("crm", "CRM", "Satış", ["crm system", "crm sistemi", "customer relationship management", "salesforce", "hubspot"]),
  skill("customer-service", "Müştəri xidməti", "Satış", ["customer service", "customer support", "клиентский сервис"]),
  skill("contact-center", "Əlaqə mərkəzi", "Satış", ["contact center", "call center", "çağrı mərkəzi"]),
  skill("complaint-management", "Şikayətlərin idarə edilməsi", "Satış", ["complaint management", "complaint handling"]),
  skill("negotiation", "Danışıqlar", "Biznes", ["negotiation", "danışıqların aparılması"]),
  skill("supplier-negotiation", "Təchizatçı danışıqları", "Təchizat", ["supplier negotiation", "təchizatçılarla danışıqlar"]),
  skill("procurement", "Satınalma", "Təchizat", ["procurement", "purchasing"]),
  skill("strategic-sourcing", "Strateji təchizatçı axtarışı", "Təchizat", ["strategic sourcing", "sourcing", "supplier sourcing"]),
  skill("tender-management", "Tenderlərin idarə edilməsi", "Təchizat", ["tender management", "tender", "rfp", "request for proposal"]),
  skill("rfq", "Qiymət sorğusu / RFQ", "Təchizat", ["rfq", "request for quotation", "qiymət sorğusu"]),
  skill("vendor-management", "Təchizatçıların idarə edilməsi", "Təchizat", ["vendor management", "supplier management", "vendor list"]),
  skill("supply-chain", "Təchizat zənciri", "Təchizat", ["supply chain", "təchizat"]),
  skill("logistics", "Logistika", "Təchizat", ["logistics", "логистика"]),
  skill("warehouse-management", "Anbar idarəetməsi", "Təchizat", ["warehouse management", "warehouse operations", "anbar uçotu"]),
  skill("transport-coordination", "Nəqliyyat koordinasiyası", "Təchizat", ["transport coordination", "transportation management", "fleet management"]),
  skill("customs-import-export", "Gömrük və idxal-ixrac", "Təchizat", ["customs", "import export", "import and export", "gömrük əməliyyatları"]),
  skill("project-management", "Layihə idarəetməsi", "İdarəetmə", ["project management", "scrum", "agile"]),
  skill("team-management", "Komanda idarəetməsi", "İdarəetmə", ["team management", "iş bölgüsünün aparılması", "işçilərin idarə edilməsi"]),
  skill("process-improvement", "Proseslərin təkmilləşdirilməsi", "İdarəetmə", ["process improvement", "proses optimallaşdırılması"]),
  skill("document-control", "Sənəd dövriyyəsi", "Biznes", ["document control", "sənədləşmə", "document management"]),
  skill("operations-coordination", "Əməliyyatların koordinasiyası", "Biznes", ["operations coordination", "operational coordination"]),
  skill("business-analysis", "Biznes təhlili", "Biznes", ["business analysis", "business analyst", "requirements analysis"]),
  skill("product-management", "Məhsul idarəetməsi", "Biznes", ["product management", "product owner"]),
  skill("office-administration", "Ofis administrasiyası", "Biznes", ["office administration", "administrative support", "office management"]),
  skill("records-management", "Arxiv və qeydiyyat idarəetməsi", "Biznes", ["records management", "archiving", "arxivləşdirmə"]),
  skill("portfolio", "Portfolio", "Biznes", ["portfolio management", "portfolio preparation"]),
  skill("legal", "Hüquq", "Hüquq", ["legal", "law", "hüquqşünas", "юрист"]),
  skill("contracts", "Müqavilələrin idarə edilməsi", "Hüquq", ["contract management", "müqavilələr"]),
  skill("compliance", "Uyğunluq / Compliance", "Hüquq", ["compliance", "normativ uyğunluq"]),
  skill("legal-research", "Hüquqi araşdırma", "Hüquq", ["legal research"]),
  skill("digital-marketing", "Rəqəmsal marketinq", "Marketinq", ["digital marketing", "marketing", "marketinq"]),
  skill("market-research", "Bazar araşdırması", "Marketinq", ["market research", "marketing research"]),
  skill("seo", "SEO", "Marketinq", ["search engine optimization", "axtarış optimallaşdırması"]),
  skill("sem-ppc", "SEM / PPC", "Marketinq", ["sem", "ppc", "paid search", "performance marketing"]),
  skill("google-ads", "Google Ads", "Marketinq", ["google adwords", "google advertising"]),
  skill("meta-ads", "Meta Ads", "Marketinq", ["facebook ads", "instagram ads", "meta advertising"]),
  skill("email-marketing", "E-poçt marketinqi", "Marketinq", ["email marketing", "mailchimp"]),
  skill("social-media", "Sosial media idarəetməsi", "Marketinq", ["social media", "smm", "sosial media"]),
  skill("content-planning", "Kontent planlaması", "Marketinq", ["content planning", "content strategy", "kontent planlama"]),
  skill("content-creation", "Kontent yaradılması", "Marketinq", ["content creation", "content production"]),
  skill("copywriting", "Kopiraytinq", "Marketinq", ["copywriting", "content writing", "mətn yazarlığı"]),
  skill("campaign-management", "Kampaniyaların idarə edilməsi", "Marketinq", ["campaign management", "marketing campaigns"]),
  skill("public-relations", "İctimaiyyətlə əlaqələr", "Marketinq", ["public relations", "pr", "media relations"]),
  skill("event-management", "Tədbirlərin təşkili", "Marketinq", ["event management", "event planning", "tədbir təşkili"]),
  skill("ecommerce", "Elektron ticarət", "Marketinq", ["e-commerce", "ecommerce", "online sales"]),
  skill("graphic-design", "Qrafik dizayn", "Dizayn", ["graphic design", "photoshop", "illustrator"]),
  skill("video-production", "Video çəkilişi", "Dizayn", ["video production", "videography", "video shooting", "mobiloqrafiya"]),
  skill("video-editing", "Video montajı", "Dizayn", ["video editing", "reels editing", "capcut", "premiere pro", "after effects"]),
  skill("autocad", "AutoCAD", "Mühəndislik", ["autocad drawing", "cad"]),
  skill("revit", "Revit", "Mühəndislik", ["autodesk revit", "bim"]),
  skill("solidworks", "SolidWorks", "Mühəndislik", ["solid works", "3d cad"]),
  skill("figma", "Figma", "Dizayn", ["figma design"]),
  skill("ui-ux", "UI / UX dizayn", "Dizayn", ["ui ux", "ux design", "user interface design", "user experience design"]),
  skill("visual-communication", "Vizual kommunikasiya", "Dizayn", ["visual communication"]),
  skill("teaching", "Tədris", "Təhsil", ["teaching", "education", "müəllim", "преподавание"]),
  skill("lesson-planning", "Tədris planlaması", "Təhsil", ["lesson planning", "teaching plan"]),
  skill("assessment", "Qiymətləndirmə", "Təhsil", ["assessment", "evaluation"]),
  skill("english-teaching", "İngilis dilinin tədrisi", "Təhsil", ["english teaching", "english teacher", "esl", "tefl"]),
  skill("curriculum-design", "Kurikulum hazırlanması", "Təhsil", ["curriculum design", "course development"]),
  skill("classroom-management", "Sinfin idarə edilməsi", "Təhsil", ["classroom management"]),
  skill("guest-service", "Qonaq xidməti", "Xidmət", ["guest service", "hospitality service"]),
  skill("hotel-operations", "Otel əməliyyatları", "Xidmət", ["hotel operations", "hospitality management"]),
  skill("reservation-systems", "Rezervasiya sistemləri", "Xidmət", ["reservation systems", "booking systems", "opera pms"]),
  skill("food-service", "İaşə xidməti", "Xidmət", ["food service", "restaurant service", "waiter service"]),
  skill("culinary", "Aşpazlıq", "Xidmət", ["culinary", "cooking", "chef", "mətbəx"]),
  skill("food-safety", "Qida təhlükəsizliyi / HACCP", "Xidmət", ["food safety", "haccp", "qida gigiyenası"]),
  skill("patient-service", "Pasiyent xidməti", "Səhiyyə", ["patient service", "patient care"]),
  skill("nursing", "Tibb bacısı işi", "Səhiyyə", ["nursing", "nurse"]),
  skill("pharmacy", "Əczaçılıq", "Səhiyyə", ["pharmacy", "pharmacist"]),
  skill("professional-standards", "Peşə standartları", "Biznes", ["professional standards"]),
  skill("presentation", "Təqdimat", "Biznes", ["presentation", "public speaking"]),
  skill("communication", "Ünsiyyət", "Biznes", ["communication", "kommunikasiya"]),
  skill("problem-solving", "Problemlərin həlli", "Biznes", ["problem solving", "problem-solving"]),
  skill("teamwork", "Komanda işi", "Biznes", ["teamwork", "team working"]),
  skill("collaboration", "Əməkdaşlıq", "Biznes", ["collaboration", "cross-functional collaboration"]),
  skill("conflict-resolution", "Münaqişələrin həlli", "Biznes", ["conflict resolution", "conflict management"]),
  skill("leadership", "Liderlik", "İdarəetmə", ["leadership", "people leadership"]),
  skill("stakeholder-management", "Maraqlı tərəflərin idarə edilməsi", "İdarəetmə", ["stakeholder management", "stakeholder engagement"]),
  skill("time-management", "Vaxtın idarə edilməsi", "Biznes", ["time management", "prioritization"]),
  skill("adaptability", "Uyğunlaşma bacarığı", "Biznes", ["adaptability", "flexibility"]),
  skill("analytical-thinking", "Analitik düşüncə", "Biznes", ["analytical thinking", "critical thinking"]),
  skill("product-knowledge", "Məhsul biliyi", "Satış", ["product knowledge", "product expertise"]),
  skill("debugging", "Proqram xətalarının aradan qaldırılması", "İT", ["debugging", "error analysis", "troubleshooting"]),
  skill("technical-documentation", "Texniki sənədləşmə", "Mühəndislik", ["technical documentation"]),
  skill("quality-control", "Keyfiyyətə nəzarət", "Mühəndislik", ["quality control", "qc", "keyfiyyət nəzarəti"]),
  skill("quality-assurance", "Keyfiyyət təminatı", "Mühəndislik", ["quality assurance", "qa", "quality management"]),
  skill("iso-standards", "ISO standartları", "Mühəndislik", ["iso 9001", "iso 14001", "iso 45001", "quality standards"]),
  skill("mechanical-maintenance", "Mexaniki texniki xidmət", "Mühəndislik", ["mechanical maintenance", "equipment maintenance", "mechanic"]),
  skill("electrical-engineering", "Elektrik mühəndisliyi", "Mühəndislik", ["electrical engineering", "electrician", "electrical maintenance"]),
  skill("civil-engineering", "İnşaat mühəndisliyi", "Mühəndislik", ["civil engineering", "construction engineering"]),
  skill("construction-management", "Tikinti idarəetməsi", "Mühəndislik", ["construction management", "site management"]),
  skill("hvac", "HVAC", "Mühəndislik", ["heating ventilation air conditioning", "ventilation", "air conditioning"]),
  skill("plc-scada", "PLC / SCADA", "Mühəndislik", ["plc", "scada", "industrial automation"]),
  skill("preventive-maintenance", "Profilaktik texniki xidmət", "Mühəndislik", ["preventive maintenance", "planned maintenance"]),
  skill("production-planning", "İstehsal planlaması", "Mühəndislik", ["production planning", "manufacturing planning"]),
  skill("process-engineering", "Proses mühəndisliyi", "Mühəndislik", ["process engineering", "process engineer"]),
  skill("technical-drawing", "Texniki çertyoj", "Mühəndislik", ["technical drawing", "engineering drawing"]),
  skill("workplace-safety", "Əməyin mühafizəsi", "Mühəndislik", ["workplace safety", "hse", "safety standards", "təhlükəsizlik standartları"]),
  skill("risk-assessment", "Risk qiymətləndirməsi", "Təhlükəsizlik", ["risk assessment"]),
  skill("safety-procedures", "Təhlükəsizlik prosedurları", "Təhlükəsizlik", ["safety procedures"]),
];

export const normalizeSkillKey = (value: string) =>
  value
    .toLocaleLowerCase("az")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/&/g, " və ")
    .replace(/[^\p{L}\p{N}+#/]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const catalogByAlias = new Map<string, SkillDefinition>();
for (const definition of SKILL_CATALOG)
  for (const alias of definition.aliases)
    catalogByAlias.set(normalizeSkillKey(alias), definition);

export function canonicalSkill(value: string) {
  return catalogByAlias.get(normalizeSkillKey(value)) || null;
}

export function localizedSkillLabel(
  value: string,
  language: "az" | "en" | "ru" = "az",
) {
  const definition = canonicalSkill(value);
  if (!definition) return value;
  return language === "en" ? definition.labelEn : definition.label;
}

export function localizedSkillCategory(
  definition: SkillDefinition,
  language: "az" | "en" | "ru" = "az",
) {
  return language === "en" ? definition.categoryEn : definition.category;
}

export function skillId(value: string) {
  return canonicalSkill(value)?.id || `custom:${normalizeSkillKey(value)}`;
}

function customSkillLabel(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[,;|•·\-–—]+|[,;|•·\-–—]+$/g, "")
    .slice(0, 70);
}

export function normalizeSkills(
  values: unknown,
  options: { allowCustom?: boolean; max?: number } = {},
) {
  const allowCustom = options.allowCustom === true;
  const max = Math.max(1, Math.min(50, options.max || 30));
  const input = Array.isArray(values) ? values : [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    if (typeof item !== "string") continue;
    const raw = customSkillLabel(item);
    if (!raw) continue;
    const definition = canonicalSkill(raw);
    // Very long sentences are responsibilities, not searchable skills.
    if (!definition && (!allowCustom || raw.length > 55 || raw.split(/\s+/).length > 7))
      continue;
    const label = definition?.label || raw;
    const id = definition?.id || `custom:${normalizeSkillKey(label)}`;
    if (!id.endsWith(":") && !seen.has(id)) {
      seen.add(id);
      result.push(label);
    }
    if (result.length >= max) break;
  }
  return result;
}

export function normalizeSkillsWithAllowedCustom(
  values: unknown,
  allowedCustom: string[] = [],
  options: { max?: number } = {},
) {
  const allowed = new Map(
    allowedCustom
      .map((label) => [normalizeSkillKey(label), customSkillLabel(label)] as const)
      .filter(([key, label]) => key && label),
  );
  const input = Array.isArray(values) ? values : [];
  const filtered = input.flatMap((value) => {
    if (typeof value !== "string") return [];
    if (canonicalSkill(value)) return [value];
    const custom = allowed.get(normalizeSkillKey(value));
    return custom ? [custom] : [];
  });
  return normalizeSkills(filtered, { allowCustom: true, max: options.max });
}

export function searchSkills(query: string, selected: string[] = [], limit = 10) {
  const needle = normalizeSkillKey(query);
  const chosen = new Set(selected.map(skillId));
  return SKILL_CATALOG
    .filter((definition) => !chosen.has(definition.id))
    .filter((definition) =>
      !needle ||
      normalizeSkillKey(definition.category).includes(needle) ||
      normalizeSkillKey(definition.categoryEn).includes(needle) ||
      definition.aliases.some((alias) => normalizeSkillKey(alias).includes(needle)),
    )
    .slice(0, limit);
}

export const SKILL_CATALOG_LABELS = SKILL_CATALOG.map((item) => item.label);
