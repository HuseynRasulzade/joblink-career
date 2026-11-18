// Texts of the two public legal pages, in the three site languages. They are a working draft written from how the platform actually
// behaves; the operator's lawyer must review them before launch. The operator's details come from the PLATFORM_* variables.
export type Operator = { name: string; voen: string; address: string; email: string };
export type LegalSection = { title: string; body: string[] };
export type LegalLang = "az" | "en" | "ru";
export type LegalDoc = { title: string; summaryTitle: string; summary: string[]; sections: LegalSection[] };

// Shown at the top of both pages; change it whenever the text changes.
export const LEGAL_UPDATED = { az: "18 noyabr 2026", en: "18 November 2026", ru: "18 ноября 2026" } as const;

const L = <T,>(lang: LegalLang, az: T, en: T, ru: T): T => (lang === "en" ? en : lang === "ru" ? ru : az);

export function privacyDoc(op: Operator, lang: LegalLang): LegalDoc {
  const who = op.name || "Digilabs";
  const mail = op.email || "info@digilabs.az";
  const voen = op.voen ? L(lang, `, VÖEN ${op.voen}`, `, tax ID ${op.voen}`, `, VÖEN ${op.voen}`) : "";
  const addr = op.address ? L(lang, `, ünvan: ${op.address}`, `, address: ${op.address}`, `, адрес: ${op.address}`) : "";
  const az: LegalSection[] = [
    { title: "Bu siyasət nə haqqındadır", body: [
      "Bu siyasət JobMatch platformasının (sayt və onun bütün bölmələri) şəxsi məlumatları necə topladığını, nə üçün işlətdiyini, kimlərlə paylaşdığını və necə qoruduğunu izah edir. Siyasət hesab yaratmamış ziyarətçilərə, iş axtaranlara, işəgötürənlərə və işəgötürənin platformada qeydə aldığı işçilərə şamil olunur.",
    ] },
    { title: "Hüquqi çərçivə və prinsiplər", body: [
      "Bu siyasət Azərbaycan Respublikasının «Fərdi məlumatlar haqqında» Qanununa (11 may 2010-cu il, № 998-IIIQ), «İnformasiya, informasiyalaşdırma və informasiyanın mühafizəsi haqqında» Qanununa və digər qüvvədə olan qaydalara uyğun hazırlanıb.",
      "Platformadan Avropa İqtisadi Məkanında və Böyük Britaniyada istifadə edənlər üçün Ümumi Məlumatların Qorunması Qaydasının (GDPR) əsas prinsiplərini bütün istifadəçilərimiz üçün eyni qaydada tətbiq etməyi öhdəmizə götürürük: qanunilik, ədalətlilik və şəffaflıq; məqsədlə məhdudlaşma; məlumatın minimallaşdırılması; dəqiqlik; saxlama müddətinin məhdudlaşdırılması; bütövlük və məxfilik; hesabatlılıq.",
      "Bu yanaşma o deməkdir ki, yalnız lazım olan məlumatı toplayırıq, onu açıq şəkildə izah etdiyimiz məqsədlər üçün işlədirik və sizə öz məlumatlarınız üzərində real nəzarət veririk.",
    ] },
    { title: "Operator (məlumatlara cavabdeh tərəf)", body: [
      `Platformanın operatoru: ${who}${voen}${addr}. Əlaqə: ${mail}.`,
      "İş axtaranın və platformanın öz hesab məlumatları üçün operator məlumatları idarə edən tərəfdir. İşəgötürənin öz işçiləri və namizədləri haqqında platformaya daxil etdiyi məlumatlar üçün isə işəgötürən məlumatları idarə edən, operator isə onun tapşırığı ilə məlumatı emal edən tərəfdir (bax: «İşəgötürənlərin yüklədiyi işçi və namizəd məlumatları»).",
    ] },
    { title: "Hansı məlumatları toplayırıq", body: [
      "Hesab məlumatları: ad (və ya şirkət adı), e-poçt ünvanı, şifrənin geri qaytarılması mümkün olmayan təhlükəsiz forması (açıq şifrə saxlanmır), hesab növü, e-poçtun təsdiq vəziyyəti, iki mərhələli giriş qurulubsa onun ayarları.",
      "İş axtaranlar: CV və profil məlumatları (təcrübə, təhsil, bacarıqlar, dillər, sertifikatlar, əlaqə məlumatları, istəyə bağlı şəkil), saxlanmış vakansiyalar, müraciətlər, müsahibələr, test və qiymətləndirmə nəticələri, mesajlar, iş bildirişi ayarları.",
      "İşəgötürənlər: şirkət məlumatları, vakansiyalar, namizəd qeydləri və qiymətləndirmələri, paket və ödəniş qeydləri, komanda üzvləri və onların rolları.",
      "İşəgötürənin qeydə aldığı işçilər: işçi kartı (ad, vəzifə, struktur, əlaqə), əmək müqaviləsi və əmrlər, məzuniyyət, davamiyyət və iş saatları, əmək haqqı və ödəniş qeydləri, sənədlər, istəyə bağlı olaraq sağlamlıq və güzəşt məlumatları (məsələn, əlillik və vergi güzəşti). Bu məlumatlar həssas ola bilər və yalnız işəgötürənin və onun səlahiyyət verdiyi şəxslərin görməsi üçündür.",
      "Texniki məlumatlar: giriş vaxtı, IP ünvanı, cihaz və brauzer məlumatı, təhlükəsizlik və xəta jurnalları, sessiya məlumatları.",
      "Siz bizə birbaşa yazdıqda: dəstək müraciətləri və yazışmalar.",
    ] },
    { title: "Nə üçün və hansı əsasla işləyirik", body: [
      "Xidməti göstərmək üçün (müqaviləni yerinə yetirmək): hesab yaratmaq, CV və profili saxlamaq, vakansiyaları göstərmək, müraciətləri və müsahibələri idarə etmək, kadr və əmək haqqı alətlərini işlətmək.",
      "Təhlükəsizlik və sui-istifadənin qarşısını almaq üçün (qanuni maraq): girişlərin qeydi, robot yoxlaması, cəhd limitləri, saxta və spam hesabların aşkarlanması.",
      "Qanunvericiliyin tələbi: kadr və maliyyə sənədlərinin saxlanması, səlahiyyətli dövlət orqanlarının qanuni sorğularına cavab.",
      "Razılığınızla: istəyə bağlı funksiyalar (məsələn, profilin istedad bazasında görünməsi, CV şəklinin vizual analizi, xəbər və bildiriş məktubları). Razılığı istədiyiniz vaxt geri götürə bilərsiniz; bu, əvvəlki emalın qanuniliyinə təsir etmir.",
    ] },
    { title: "E-poçtun təsdiqi və bildirişlər", body: [
      "Yeni hesab yaradılanda e-poçt ünvanınıza 6 rəqəmli təsdiq kodu göndərilir; kod 15 dəqiqə qüvvədədir və yalnız ünvanın sizə aid olduğunu yoxlamaq üçündür. Kodu heç kimlə bölüşməyin.",
      "Şifrə bərpası, təhlükəsizlik xəbərdarlıqları və hesabınızla bağlı vacib məlumatlar həmin ünvana göndərilir. Məktubların göndərilməsi üçün e-poçt xidməti təminatçısından istifadə olunur.",
    ] },
    { title: "İşəgötürənlərin yüklədiyi işçi və namizəd məlumatları", body: [
      "İşəgötürən işçilərinin və namizədlərin məlumatlarını platformaya daxil edərkən bunun üçün hüquqi əsasa (məsələn, əmək müqaviləsi, qanuni vəzifə və ya razılıq) malik olduğunu və işçiləri məlumatlandırdığını təsdiq edir. Bu məlumatlar yalnız işəgötürənin tapşırığı ilə, onun kadr və işə qəbul məqsədləri üçün emal olunur.",
      "Platformada işçi məlumatları digər şirkətlərə görünmür. Şəxsi məlumatların şifrələnməsi ayarı işəgötürən tərəfindən aktivləşdirilə bilər.",
      `İşçi və ya namizəd olaraq məlumatlarınıza baxmaq, düzəltdirmək və ya silinməsini istəmək üçün öncə işəgötürənə müraciət edin; ${mail} ünvanına yazsanız, sorğunu işəgötürənə yönləndirə bilərik.`,
    ] },
    { title: "Süni intellekt ilə emal", body: [
      "CV analizi, CV-nin yenidən yazılması, vakansiyaya uyğunluq izahı, AI köməkçi və digər AI funksiyaları işlədildikdə həmin əməliyyata aid mətn xarici AI xidmət təminatçısına (OpenAI və ya DeepSeek) göndərilə bilər. Yalnız həmin əməliyyat üçün lazım olan məlumat göndərilir; digər hesabların məlumatı göndərilmir.",
      "CV şəklinin OCR və ya vizual analizi ayrıca razılıq tələb edir. Sorğu mətnləri platformada AI xərcinin uçotu üçün saxlanmır, yalnız say və ölçü qeyd olunur.",
      "AI nəticəsi yardımçı rəydir və yanlış ola bilər. İşə qəbul və kadr qərarlarını insan verir; AI yalnız avtomatik qərar vermir.",
    ] },
    { title: "Məlumatlar kimlərlə paylaşılır", body: [
      "İş axtaran müraciət etdikdə profili və CV-si yalnız müraciət etdiyi şirkətə görünür. Profil «aktiv» olduqda şirkətlərin istedad bazasında görünə bilər; bunu profilinizdən istənilən vaxt söndürə bilərsiniz.",
      "Texniki xidmət təminatçıları məlumatı yalnız xidməti göstərmək üçün işlədir: hostinq və verilənlər bazası (Cloudflare), e-poçt göndərilməsi, ödəniş xidməti, AI təminatçıları, robot yoxlaması (Cloudflare Turnstile). Onlar məlumatı öz məqsədləri üçün işlədə bilməz.",
      "Qanunun tələb etdiyi hallarda məlumat səlahiyyətli dövlət orqanlarına verilə bilər.",
      "Məlumatlarınız satılmır və reklam məqsədilə üçüncü tərəflərə ötürülmür.",
    ] },
    { title: "Xidmət təminatçıları (alt-emalçılar)", body: [
      "Cloudflare, Inc. — hostinq (Workers), verilənlər bazası (D1) və Turnstile robot yoxlaması. Məlumat: platformanın bütün məlumatları (şifrələnmiş rabitə ilə). Yer: qlobal şəbəkə.",
      "Resend — e-poçt göndərilməsi. Məlumat: e-poçt ünvanı və məktubun məzmunu (təsdiq kodu, şifrə bərpası, bildirişlər).",
      "OpenAI və ya DeepSeek — süni intellekt funksiyaları. Məlumat: yalnız həmin əməliyyat üçün lazım olan mətn (məsələn, CV mətni və vakansiya təsviri). Bu təminatçılar göndərilən məlumatı öz modellərini öyrətmək üçün işlətməməlidir; bunu müqavilə şərtləri ilə məhdudlaşdırmağa çalışırıq.",
      "Ödəniş xidməti — onlayn ödəniş hazırda aktiv deyil. Aktivləşdikdə bu siyahı yenilənəcək; bank kartı məlumatları platformada saxlanmır, ödəniş təminatçısı tərəfindən emal olunur.",
      "Siyahı dəyişdikdə (yeni təminatçı əlavə olunduqda) bu səhifə yenilənir.",
    ] },
    { title: "Başqa ölkələrə ötürülmə", body: [
      "Hostinq, e-poçt və AI təminatçılarının serverləri Azərbaycandan, Avropa İqtisadi Məkanından və Böyük Britaniyadan kənarda (məsələn, ABŞ-da və ya qlobal şəbəkədə) yerləşə bilər.",
      "Belə ötürmələr yalnız xidməti göstərmək üçün və təminatçıların məlumat emalı şərtləri (DPA), Avropa Komissiyasının standart müqavilə maddələri (SCC) və ya adekvatlıq qərarı kimi müvafiq mühafizə mexanizmlərinə əsaslanaraq həyata keçirilir.",
      `Təminatçıların tətbiq etdiyi mexanizm barədə məlumat almaq istəsəniz ${mail} ünvanına yazın.`,
    ] },
    { title: "Saxlama müddəti", body: [
      "Məlumatlar hesabınız aktiv olduğu müddətdə saxlanır. Hesabı sildikdə şəxsi məlumatlarınız silinir.",
      "Qanunla saxlanması tələb olunan qeydlər (məsələn, kadr və maliyyə sənədləri) müvafiq müddət ərzində saxlanılır. Texniki ehtiyat nüsxələr məhdud müddətdən (təxminən 30 gün) sonra avtomatik köhnəlir.",
      "Təsdiqlənməmiş e-poçt kodları və bərpa linkləri qısa müddətdən sonra etibarsız olur.",
    ] },
    { title: "Sizin hüquqlarınız", body: [
      "Azərbaycan Respublikasının «Fərdi məlumatlar haqqında» Qanununa və (tətbiq olunduqda) GDPR-a uyğun olaraq aşağıdakı hüquqlara malikdirsiniz:",
      "Giriş: sizin haqqınızda hansı məlumatların işləndiyini öyrənmək və surətini almaq. Düzəliş: yanlış və ya natamam məlumatın düzəldilməsi. Silmə: məlumatın silinməsini tələb etmək («unudulmaq hüququ»), qanunla saxlanması tələb olunan hallar istisna olmaqla. Məhdudlaşdırma: mübahisə zamanı emalın dayandırılması.",
      "Köçürülmə: məlumatlarınızı strukturlaşdırılmış, maşınla oxunan formatda almaq (hesab ayarlarından yükləyə bilərsiniz). Etiraz: qanuni maraq əsasında edilən emala etiraz etmək. Razılığın geri götürülməsi: istənilən vaxt, əvvəlki emalın qanuniliyinə təsir etmədən.",
      "Avtomatlaşdırılmış qərarlar: sizin üçün hüquqi və ya oxşar əhəmiyyətli nəticə doğuran qərarlar yalnız avtomatik emal ilə verilmir; uyğunluq balı və AI nəticələri yardımçıdır. İstəsəniz insan tərəfindən yenidən baxılmasını tələb edə bilərsiniz.",
      `Sorğu üçün ${mail} ünvanına yazın (mövzu: «Məxfilik»). Şəxsiyyətinizi yoxlamaq üçün əlavə məlumat istəyə bilərik. Sorğuya əsassız gecikmədən, ən geci 30 gün ərzində cavab veririk; bu xidmət pulsuzdur (aşkar əsassız və ya həddindən çox təkrarlanan sorğular istisna).`,
      "Hüquqlarınızın pozulduğunu düşünsəniz, öncə bizə yazın; razı qalmasanız, səlahiyyətli dövlət orqanına (Azərbaycanda müvafiq icra hakimiyyəti orqanına, Avropa İqtisadi Məkanında və Böyük Britaniyada isə yerli məlumatların mühafizəsi nəzarət orqanına) və ya məhkəməyə müraciət edə bilərsiniz.",
    ] },
    { title: "Təhlükəsizlik və pozuntu hallarında tədbirlər", body: [
      "Texniki tədbirlər: şifrələr yalnız təhlükəsiz hash şəklində saxlanır; giriş və təsdiq kodu cəhdləri məhdudlaşdırılır; robot yoxlaması və iki mərhələli giriş (autentifikator tətbiqi və ehtiyat kodlar) mövcuddur; rabitə HTTPS ilə qorunur; aktiv sessiyalara hesab ayarlarından baxıb bağlaya bilərsiniz; işəgötürən şəxsi məlumat sahələrinin şifrələnməsini aktivləşdirə bilər.",
      "Təşkilati tədbirlər: məlumata çıxış rollar üzrə məhdudlaşdırılır, əməliyyatlar jurnallaşdırılır, administratorlar yalnız zəruri hallarda məlumata baxır.",
      `Heç bir sistem tam risksiz deyil. Şəxsi məlumatların pozulması (icazəsiz çıxış, itki, sızma) aşkar olunarsa, riski qiymətləndiririk, səbəbi aradan qaldırırıq və təsirə məruz qalan şəxsləri və səlahiyyətli orqanı qanunun tələb etdiyi qaydada, əsassız gecikmədən (mümkünsə 72 saat ərzində) məlumatlandırırıq. Şübhəli hal görsəniz ${mail} ünvanına dərhal yazın.`,
    ] },
    { title: "Çərəzlər və yerli yaddaş", body: [
      "Zəruri çərəz: giriş üçün sessiya çərəzi (HttpOnly, 7 gün). Onsuz hesaba daxil olmaq mümkün deyil və razılıq tələb etmir.",
      "Brauzer yaddaşı: seçdiyiniz dil və görünüş (tema) kimi interfeys üstünlükləri; oflayn işləmə üçün səhifə keşi (service worker). Bunlar cihazınızda qalır və bizə göndərilmir.",
      "Reklam, izləmə və üçüncü tərəf analitika çərəzləri yoxdur. Robot yoxlaması işə salınıbsa, Cloudflare öz təhlükəsizlik məqsədləri üçün texniki məlumat oxuya bilər. Çərəzləri brauzer ayarlarından silə bilərsiniz; bu halda yenidən daxil olmalı olacaqsınız.",
    ] },
    { title: "Uşaqlar", body: [
      `Platforma 16 yaşdan kiçik şəxslər üçün nəzərdə tutulmayıb və bilərəkdən onların məlumatını toplamırıq. Uşağın məlumatının bizə verildiyini bilsəniz ${mail} ünvanına yazın, onu dərhal siləcəyik.`,
    ] },
    { title: "ABŞ sakinləri (Kaliforniya və s.)", body: [
      "Şəxsi məlumatlarınızı satmırıq və CCPA/CPRA mənasında çarpaz kontekstli reklam üçün «paylaşmırıq». Həssas məlumatları qanunun icazə verdiyi məqsədlərdən kənar işlətmirik.",
      `Kaliforniya və analoji qanunları olan digər ştatların sakinləri bilmək, silmək, düzəltmək və hüquqlarından istifadəyə görə ayrı-seçkiliyə məruz qalmamaq hüququna malikdir. Sorğunu ${mail} ünvanına göndərin; icazəli nümayəndə vasitəsilə də müraciət edə bilərsiniz.`,
    ] },
    { title: "Dəyişikliklər və əlaqə", body: [
      "Bu siyasət dəyişdikdə yeni versiya bu səhifədə dərc olunur və «son yenilənmə» tarixi dəyişir. Əhəmiyyətli dəyişikliklər barədə hesab e-poçtuna əvvəlcədən məlumat göndərilə bilər.",
      `Məlumatların mühafizəsi üzrə əlaqə: ${who}, e-poçt: ${mail} (mövzu: «Məxfilik»).`,
    ] },
  ];
  const en: LegalSection[] = [
    { title: "What this policy is about", body: [
      "This policy explains how the JobMatch platform (the site and all its sections) collects personal data, why it uses it, who it is shared with and how it is protected. It applies to visitors without an account, job seekers, employers and the employees an employer records on the platform.",
    ] },
    { title: "Legal framework and principles", body: [
      "This policy is prepared in line with the Law of the Republic of Azerbaijan «On Personal Data» (11 May 2010, No. 998-IIIQ), the Law «On Information, Informatization and Protection of Information» and other rules in force.",
      "For people using the platform in the European Economic Area and the United Kingdom, we undertake to apply the core principles of the General Data Protection Regulation (GDPR) to all our users alike: lawfulness, fairness and transparency; purpose limitation; data minimisation; accuracy; storage limitation; integrity and confidentiality; accountability.",
      "In practice this means we collect only the data we need, use it only for the purposes we explain openly, and give you real control over your data.",
    ] },
    { title: "Operator (the party responsible for the data)", body: [
      `The platform operator is ${who}${voen}${addr}. Contact: ${mail}.`,
      "For job seekers' data and the platform's own account data the operator is the data controller. For data an employer enters about its own employees and candidates, the employer is the controller and the operator processes it on the employer's instructions (see “Employee and candidate data uploaded by employers”).",
    ] },
    { title: "What data we collect", body: [
      "Account data: name (or company name), e-mail address, a secure irreversible form of the password (the plain password is never stored), account type, e-mail verification status and, if set up, two-step sign-in settings.",
      "Job seekers: CV and profile data (experience, education, skills, languages, certificates, contact details, an optional photo), saved vacancies, applications, interviews, test and assessment results, messages, job alert settings.",
      "Employers: company details, vacancies, candidate notes and assessments, package and payment records, team members and their roles.",
      "Employees recorded by an employer: employee card (name, position, structure, contact), employment contract and orders, leave, attendance and working hours, payroll and payment records, documents and, optionally, health and relief data (for example disability and tax relief). This data can be sensitive and is meant to be seen only by the employer and people it authorises.",
      "Technical data: sign-in time, IP address, device and browser information, security and error logs, session data.",
      "When you write to us directly: support requests and correspondence.",
    ] },
    { title: "Why we process it and on what basis", body: [
      "To provide the service (performance of the contract): creating an account, storing the CV and profile, showing vacancies, managing applications and interviews, running HR and payroll tools.",
      "For security and to prevent abuse (legitimate interest): sign-in records, robot checks, attempt limits, detecting fake and spam accounts.",
      "Legal obligations: keeping HR and financial documents, answering lawful requests of competent state authorities.",
      "With your consent: optional features (for example showing your profile in the talent pool, visual analysis of a CV image, news and notification e-mails). You can withdraw consent at any time; this does not affect the lawfulness of earlier processing.",
    ] },
    { title: "E-mail verification and notifications", body: [
      "When a new account is created, a 6-digit verification code is sent to your e-mail address. The code is valid for 15 minutes and only proves that the address belongs to you. Do not share it with anyone.",
      "Password recovery, security alerts and important information about your account are sent to that address. An e-mail service provider is used to send the messages.",
    ] },
    { title: "Employee and candidate data uploaded by employers", body: [
      "By entering data about its employees and candidates, an employer confirms that it has a legal basis for it (for example an employment contract, a legal duty or consent) and has informed them. This data is processed only on the employer's instructions for its HR and recruitment purposes.",
      "Employee data is not visible to other companies on the platform. The employer can switch on encryption of personal data.",
      `As an employee or candidate, first contact the employer to view, correct or ask for deletion of your data; if you write to ${mail}, we can forward the request to the employer.`,
    ] },
    { title: "Processing with artificial intelligence", body: [
      "When CV analysis, CV rewriting, vacancy match explanation, the AI assistant or other AI features are used, the text for that operation may be sent to an external AI provider (OpenAI or DeepSeek). Only the data needed for that operation is sent; other accounts' data is not.",
      "OCR or visual analysis of a CV image requires separate consent. Request texts are not stored on the platform for AI cost accounting; only counts and sizes are recorded.",
      "An AI result is an assisting opinion and may be wrong. People make hiring and HR decisions; AI does not decide automatically on its own.",
    ] },
    { title: "Who the data is shared with", body: [
      "When a job seeker applies, the profile and CV are visible only to the company applied to. When the profile is “active” it may appear in companies' talent pool; you can switch this off in your profile at any time.",
      "Technical service providers use data only to provide the service: hosting and database (Cloudflare), e-mail delivery, payment service, AI providers, robot check (Cloudflare Turnstile). They may not use it for their own purposes.",
      "Where the law requires, data may be given to competent state authorities.",
      "Your data is not sold and is not passed to third parties for advertising.",
    ] },
    { title: "Service providers (sub-processors)", body: [
      "Cloudflare, Inc. — hosting (Workers), database (D1) and the Turnstile robot check. Data: all platform data (over encrypted connections). Location: global network.",
      "Resend — e-mail delivery. Data: the e-mail address and the content of the message (verification code, password reset, notifications).",
      "OpenAI or DeepSeek — artificial intelligence features. Data: only the text needed for that operation (for example CV text and a vacancy description). We seek to restrict these providers by contract from using the submitted data to train their models.",
      "Payment service — online payment is not active at the moment. This list will be updated when it is activated; bank card details are not stored on the platform and are processed by the payment provider.",
      "This page is updated whenever the list changes (a new provider is added).",
    ] },
    { title: "Transfers to other countries", body: [
      "The servers of hosting, e-mail and AI providers may be located outside Azerbaijan, the European Economic Area and the United Kingdom (for example in the USA or on a global network).",
      "Such transfers are made only to provide the service and rely on appropriate safeguards such as the providers' data processing terms (DPA), the European Commission's standard contractual clauses (SCC) or an adequacy decision.",
      `If you want to know which mechanism a provider applies, write to ${mail}.`,
    ] },
    { title: "Retention", body: [
      "Data is kept while your account is active. When you delete the account, your personal data is deleted.",
      "Records the law requires to be kept (for example HR and financial documents) are kept for the required period. Technical backups expire automatically after a limited time (about 30 days).",
      "Unused e-mail codes and recovery links become invalid after a short time.",
    ] },
    { title: "Your rights", body: [
      "Under the Law of the Republic of Azerbaijan «On Personal Data» and (where applicable) the GDPR you have the following rights:",
      "Access: to learn what data about you is processed and receive a copy. Rectification: to correct inaccurate or incomplete data. Erasure: to ask for deletion («right to be forgotten»), except where the law requires retention. Restriction: to pause processing while a dispute is resolved.",
      "Portability: to receive your data in a structured, machine-readable format (you can download it from account settings). Objection: to object to processing based on legitimate interest. Withdrawal of consent: at any time, without affecting the lawfulness of earlier processing.",
      "Automated decisions: decisions that have legal or similarly significant effects on you are not taken solely by automated processing; the match score and AI results are advisory. You may ask for a human review.",
      `To make a request write to ${mail} (subject: «Privacy»). We may ask for extra information to verify your identity. We answer without undue delay and in any case within 30 days; the service is free of charge (except for manifestly unfounded or excessively repeated requests).`,
      "If you think your rights have been violated, write to us first; if you are not satisfied you may apply to the competent state authority (in Azerbaijan the relevant executive authority, in the European Economic Area and the United Kingdom the local data protection supervisory authority) or to a court.",
    ] },
    { title: "Security and handling of breaches", body: [
      "Technical measures: passwords are stored only as secure hashes; sign-in and verification-code attempts are limited; a robot check and two-step sign-in (authenticator app and backup codes) are available; communication is protected by HTTPS; you can view and close active sessions in account settings; an employer can enable encryption of personal-data fields.",
      "Organisational measures: access to data is limited by role, operations are logged, and administrators view data only when necessary.",
      `No system is entirely risk-free. If a personal data breach (unauthorised access, loss, leak) is found, we assess the risk, remove the cause and notify affected persons and the competent authority as the law requires, without undue delay (where possible within 72 hours). If you notice anything suspicious, write to ${mail} immediately.`,
    ] },
    { title: "Cookies and local storage", body: [
      "Necessary cookie: a session cookie for signing in (HttpOnly, 7 days). You cannot sign in without it and it does not require consent.",
      "Browser storage: interface preferences such as the language and appearance (theme) you chose; a page cache for offline use (service worker). These stay on your device and are not sent to us.",
      "There are no advertising, tracking or third-party analytics cookies. If the robot check is enabled, Cloudflare may read technical information for its own security purposes. You can delete cookies in browser settings; you will then have to sign in again.",
    ] },
    { title: "Children", body: [
      `The platform is not intended for persons under 16 and we do not knowingly collect their data. If you know that a child's data was given to us, write to ${mail} and we will delete it promptly.`,
    ] },
    { title: "US residents (California and others)", body: [
      "We do not sell your personal data and we do not «share» it for cross-context behavioural advertising within the meaning of CCPA/CPRA. We do not use sensitive data beyond the purposes the law allows.",
      `Residents of California and other states with similar laws have the right to know, delete, correct and not be discriminated against for exercising their rights. Send your request to ${mail}; you may also act through an authorised agent.`,
    ] },
    { title: "Changes and contact", body: [
      "When this policy changes, the new version is published on this page and the «last updated» date changes. Material changes may be announced to the account e-mail in advance.",
      `Data protection contact: ${who}, e-mail: ${mail} (subject: «Privacy»).`,
    ] },
  ];
  const ru: LegalSection[] = [
    { title: "О чём эта политика", body: [
      "Эта политика объясняет, как платформа JobMatch (сайт и все его разделы) собирает персональные данные, зачем их использует, кому передаёт и как защищает. Она относится к посетителям без аккаунта, соискателям, работодателям и сотрудникам, которых работодатель учитывает на платформе.",
    ] },
    { title: "Правовая основа и принципы", body: [
      "Настоящая политика подготовлена в соответствии с Законом Азербайджанской Республики «О персональных данных» (11 мая 2010 г., № 998-IIIQ), Законом «Об информации, информатизации и защите информации» и другими действующими нормами.",
      "Для пользователей платформы в Европейской экономической зоне и Великобритании мы обязуемся применять ко всем пользователям одинаково основные принципы Общего регламента по защите данных (GDPR): законность, добросовестность и прозрачность; ограничение целями; минимизация данных; точность; ограничение срока хранения; целостность и конфиденциальность; подотчётность.",
      "На практике это означает, что мы собираем только необходимые данные, используем их лишь для целей, которые открыто объясняем, и даём вам реальный контроль над вашими данными.",
    ] },
    { title: "Оператор (лицо, отвечающее за данные)", body: [
      `Оператор платформы: ${who}${voen}${addr}. Контакт: ${mail}.`,
      "Для данных соискателей и собственных данных аккаунтов оператор является лицом, управляющим данными. Для данных о своих сотрудниках и кандидатах, которые вносит работодатель, управляющим является работодатель, а оператор обрабатывает их по его поручению (см. «Данные сотрудников и кандидатов, загружаемые работодателями»).",
    ] },
    { title: "Какие данные мы собираем", body: [
      "Данные аккаунта: имя (или название компании), e-mail, необратимая защищённая форма пароля (открытый пароль не хранится), тип аккаунта, статус подтверждения e-mail и, если настроен, параметры двухэтапного входа.",
      "Соискатели: данные резюме и профиля (опыт, образование, навыки, языки, сертификаты, контакты, необязательное фото), сохранённые вакансии, отклики, интервью, результаты тестов и оценок, сообщения, настройки оповещений о вакансиях.",
      "Работодатели: данные компании, вакансии, заметки и оценки по кандидатам, записи о пакетах и платежах, члены команды и их роли.",
      "Сотрудники, учтённые работодателем: карточка сотрудника (имя, должность, структура, контакты), трудовой договор и приказы, отпуска, посещаемость и рабочие часы, записи о зарплате и выплатах, документы и, при желании, данные о здоровье и льготах (например, инвалидность и налоговая льгота). Эти данные могут быть чувствительными и предназначены только для работодателя и уполномоченных им лиц.",
      "Технические данные: время входа, IP-адрес, сведения об устройстве и браузере, журналы безопасности и ошибок, данные сессий.",
      "Когда вы пишете нам напрямую: обращения в поддержку и переписка.",
    ] },
    { title: "Зачем и на каком основании мы обрабатываем данные", body: [
      "Для оказания услуги (исполнение договора): создание аккаунта, хранение резюме и профиля, показ вакансий, управление откликами и интервью, работа кадровых и зарплатных инструментов.",
      "Для безопасности и предотвращения злоупотреблений (законный интерес): учёт входов, проверка на робота, лимиты попыток, выявление фальшивых и спам-аккаунтов.",
      "Требования законодательства: хранение кадровых и финансовых документов, ответы на законные запросы компетентных государственных органов.",
      "С вашего согласия: необязательные функции (например, показ профиля в базе талантов, визуальный анализ изображения резюме, новостные и уведомительные письма). Вы можете отозвать согласие в любой момент; это не влияет на законность прежней обработки.",
    ] },
    { title: "Подтверждение e-mail и уведомления", body: [
      "При создании нового аккаунта на ваш e-mail отправляется 6-значный код подтверждения; он действует 15 минут и лишь подтверждает, что адрес принадлежит вам. Никому его не сообщайте.",
      "Восстановление пароля, оповещения о безопасности и важные сведения об аккаунте отправляются на этот адрес. Для отправки писем используется поставщик почтовой услуги.",
    ] },
    { title: "Данные сотрудников и кандидатов, загружаемые работодателями", body: [
      "Внося данные о сотрудниках и кандидатах, работодатель подтверждает, что имеет для этого правовое основание (например, трудовой договор, обязанность по закону или согласие) и уведомил их. Эти данные обрабатываются только по поручению работодателя для его кадровых целей и целей подбора.",
      "Данные сотрудников не видны другим компаниям на платформе. Работодатель может включить шифрование персональных данных.",
      `Как сотрудник или кандидат, сначала обратитесь к работодателю, чтобы посмотреть, исправить или удалить свои данные; если вы напишете на ${mail}, мы сможем передать запрос работодателю.`,
    ] },
    { title: "Обработка с помощью искусственного интеллекта", body: [
      "При использовании анализа резюме, переписывания резюме, объяснения соответствия вакансии, ИИ-помощника и других ИИ-функций текст для этой операции может быть отправлен внешнему поставщику ИИ (OpenAI или DeepSeek). Отправляются только данные, нужные для этой операции; данные других аккаунтов не отправляются.",
      "OCR или визуальный анализ изображения резюме требует отдельного согласия. Тексты запросов на платформе не хранятся для учёта расходов на ИИ, фиксируются только число и размер.",
      "Результат ИИ — вспомогательное мнение и может быть неверным. Решения о найме и кадровые решения принимает человек; ИИ самостоятельно автоматических решений не принимает.",
    ] },
    { title: "С кем передаются данные", body: [
      "Когда соискатель откликается, его профиль и резюме видны только компании, на вакансию которой он откликнулся. Если профиль «активен», он может отображаться в базе талантов компаний; это можно отключить в профиле в любой момент.",
      "Технические поставщики услуг используют данные только для оказания услуги: хостинг и база данных (Cloudflare), отправка e-mail, платёжный сервис, поставщики ИИ, проверка на робота (Cloudflare Turnstile). Использовать данные в своих целях они не вправе.",
      "В случаях, предусмотренных законом, данные могут быть переданы компетентным государственным органам.",
      "Ваши данные не продаются и не передаются третьим лицам в рекламных целях.",
    ] },
    { title: "Поставщики услуг (субобработчики)", body: [
      "Cloudflare, Inc. — хостинг (Workers), база данных (D1) и проверка на робота Turnstile. Данные: все данные платформы (по зашифрованным каналам). Расположение: глобальная сеть.",
      "Resend — отправка e-mail. Данные: адрес e-mail и содержание письма (код подтверждения, сброс пароля, уведомления).",
      "OpenAI или DeepSeek — функции искусственного интеллекта. Данные: только текст, необходимый для данной операции (например, текст резюме и описание вакансии). Мы стремимся договорно ограничить использование этими поставщиками переданных данных для обучения их моделей.",
      "Платёжный сервис — онлайн-оплата сейчас не активна. При её включении этот список будет обновлён; данные банковских карт на платформе не хранятся и обрабатываются платёжным провайдером.",
      "Эта страница обновляется при изменении списка (добавлении нового поставщика).",
    ] },
    { title: "Передача в другие страны", body: [
      "Серверы поставщиков хостинга, e-mail и ИИ могут находиться за пределами Азербайджана, Европейской экономической зоны и Великобритании (например, в США или в глобальной сети).",
      "Такая передача осуществляется только для предоставления сервиса и опирается на соответствующие механизмы защиты: условия обработки данных поставщиков (DPA), стандартные договорные положения Европейской комиссии (SCC) или решение об адекватности.",
      `Если вы хотите узнать, какой механизм применяет поставщик, напишите на ${mail}.`,
    ] },
    { title: "Срок хранения", body: [
      "Данные хранятся, пока ваш аккаунт активен. При удалении аккаунта ваши персональные данные удаляются.",
      "Записи, которые по закону необходимо хранить (например, кадровые и финансовые документы), хранятся в течение требуемого срока. Технические резервные копии автоматически устаревают через ограниченное время (около 30 дней).",
      "Неиспользованные e-mail-коды и ссылки восстановления через короткое время становятся недействительными.",
    ] },
    { title: "Ваши права", body: [
      "В соответствии с Законом Азербайджанской Республики «О персональных данных» и (где применимо) GDPR вы имеете следующие права:",
      "Доступ: узнать, какие данные о вас обрабатываются, и получить копию. Исправление: исправить неточные или неполные данные. Удаление: потребовать удаления («право быть забытым»), кроме случаев, когда закон требует хранения. Ограничение: приостановить обработку на время спора.",
      "Переносимость: получить данные в структурированном, машиночитаемом формате (их можно скачать в настройках аккаунта). Возражение: возразить против обработки на основании законного интереса. Отзыв согласия: в любое время, без влияния на законность прежней обработки.",
      "Автоматизированные решения: решения, имеющие для вас правовые или подобные существенные последствия, не принимаются исключительно автоматически; балл соответствия и результаты ИИ носят вспомогательный характер. Вы можете потребовать пересмотра человеком.",
      `Для запроса напишите на ${mail} (тема: «Конфиденциальность»). Для проверки личности мы можем запросить дополнительные сведения. Мы отвечаем без неоправданной задержки и в любом случае в течение 30 дней; услуга бесплатна (кроме явно необоснованных или чрезмерно повторяющихся запросов).`,
      "Если вы считаете, что ваши права нарушены, сначала напишите нам; если вы не удовлетворены, можно обратиться в компетентный государственный орган (в Азербайджане — соответствующий орган исполнительной власти, в Европейской экономической зоне и Великобритании — местный надзорный орган по защите данных) или в суд.",
    ] },
    { title: "Безопасность и действия при нарушениях", body: [
      "Технические меры: пароли хранятся только в виде безопасных хэшей; попытки входа и ввода кода подтверждения ограничены; доступны проверка на робота и двухэтапный вход (приложение-аутентификатор и резервные коды); связь защищена HTTPS; активные сеансы можно просматривать и закрывать в настройках аккаунта; работодатель может включить шифрование полей персональных данных.",
      "Организационные меры: доступ к данным ограничен по ролям, операции журналируются, администраторы просматривают данные только при необходимости.",
      `Ни одна система не лишена риска полностью. При обнаружении нарушения безопасности персональных данных (несанкционированный доступ, потеря, утечка) мы оцениваем риск, устраняем причину и уведомляем затронутых лиц и компетентный орган в порядке, предусмотренном законом, без неоправданной задержки (по возможности в течение 72 часов). Если заметите что-то подозрительное, сразу напишите на ${mail}.`,
    ] },
    { title: "Файлы cookie и локальное хранилище", body: [
      "Необходимый cookie: сеансовый cookie для входа (HttpOnly, 7 дней). Без него войти нельзя, согласие на него не требуется.",
      "Хранилище браузера: интерфейсные предпочтения, например выбранный язык и оформление (тема); кэш страниц для работы офлайн (service worker). Они остаются на вашем устройстве и нам не передаются.",
      "Рекламных, отслеживающих cookie и сторонней аналитики нет. Если включена проверка на робота, Cloudflare может считывать техническую информацию для собственных целей безопасности. Cookie можно удалить в настройках браузера; тогда потребуется войти заново.",
    ] },
    { title: "Дети", body: [
      `Платформа не предназначена для лиц младше 16 лет, и мы сознательно не собираем их данные. Если вам известно, что данные ребёнка переданы нам, напишите на ${mail} — мы немедленно их удалим.`,
    ] },
    { title: "Жители США (Калифорния и др.)", body: [
      "Мы не продаём ваши персональные данные и не «передаём» их для кросс-контекстной поведенческой рекламы в значении CCPA/CPRA. Мы не используем чувствительные данные сверх целей, разрешённых законом.",
      `Жители Калифорнии и других штатов с аналогичными законами имеют право знать, удалять, исправлять и не подвергаться дискриминации за использование своих прав. Отправьте запрос на ${mail}; можно действовать и через уполномоченного представителя.`,
    ] },
    { title: "Изменения и контакты", body: [
      "При изменении политики новая версия публикуется на этой странице, а дата «последнего обновления» меняется. О существенных изменениях можно заранее уведомить по e-mail аккаунта.",
      `Контакт по вопросам защиты данных: ${who}, e-mail: ${mail} (тема: «Конфиденциальность»).`,
    ] },
  ];
  return {
    title: L(lang, "Məxfilik siyasəti", "Privacy policy", "Политика конфиденциальности"),
    summaryTitle: L(lang, "Qısaca", "In short", "Коротко"),
    summary: L(lang,
      ["Məlumatlarınızı satmırıq və reklam üçün ötürmürük.", "CV-niz yalnız müraciət etdiyiniz şirkətə görünür; istedad bazasında görünməyi özünüz seçirsiniz.", "Şifrə hash şəklində saxlanır; iki mərhələli giriş və robot yoxlaması var.", "AI funksiyalarında yalnız həmin əməliyyat üçün lazım olan mətn AI təminatçısına göndərilir.", "Məlumatlarınızı yükləyə və hesabı silə bilərsiniz."],
      ["We do not sell your data or pass it on for advertising.", "Your CV is visible only to the company you apply to; showing in the talent pool is your choice.", "Passwords are stored as hashes; two-step sign-in and a robot check are available.", "In AI features only the text needed for that operation goes to the AI provider.", "You can download your data and delete your account."],
      ["Мы не продаём ваши данные и не передаём их для рекламы.", "Ваше резюме видно только компании, на вакансию которой вы откликнулись; показ в базе талантов — ваш выбор.", "Пароли хранятся в виде хэшей; доступны двухэтапный вход и проверка на робота.", "В ИИ-функциях поставщику ИИ уходит только текст, нужный для этой операции.", "Вы можете скачать свои данные и удалить аккаунт."]),
    sections: L(lang, az, en, ru),
  };
}

export function termsDoc(op: Operator, lang: LegalLang): LegalDoc {
  const who = op.name || "Digilabs";
  const mail = op.email || "info@digilabs.az";
  const az: LegalSection[] = [
    { title: "Ümumi müddəalar", body: [
      `Bu şərtlər ${who} (bundan sonra «Operator») tərəfindən idarə olunan JobMatch platformasından (sayt, onun işəgötürən, iş axtaran və admin bölmələri, hesablama alətləri) istifadəni tənzimləyir. Qeydiyyatdan keçməklə və ya platformadan istifadə etməklə bu şərtləri və Məxfilik siyasətini qəbul etmiş olursunuz. Razı deyilsinizsə, platformadan istifadə etməyin.`,
      "Platformanın açıq hissələrindən (vakansiyalara baxış, kalkulyatorlar) hesab yaratmadan istifadə etmək olar; hesab tələb edən əməliyyatlar üçün qeydiyyat lazımdır.",
    ] },
    { title: "Təriflər", body: [
      `«Platforma» — JobMatch saytı və onun bütün bölmələri; «Operator» — platformanı idarə edən ${who}; «İstifadəçi» — platformadan istifadə edən hər kəs; «İş axtaran» — iş və ya təcrübə axtaran şəxs; «İşəgötürən» — vakansiya yerləşdirən və ya kadr alətlərindən istifadə edən şirkət və ya onun nümayəndəsi; «Məzmun» — istifadəçinin platformaya yüklədiyi məlumat (CV, vakansiya, mesaj, sənəd və s.); «AI funksiyaları» — süni intellektlə işləyən analiz, tövsiyə və köməkçi alətləri.`,
    ] },
    { title: "Uyğunluq və səlahiyyət", body: [
      "Platformadan istifadə etmək üçün ən azı 16 yaşınız olmalı və qanuni olaraq müqavilə bağlamaq qabiliyyətinə malik olmalısınız. Şirkət adından qeydiyyatdan keçirsinizsə, həmin şirkəti bu şərtlərlə bağlamaq səlahiyyətinizin olduğunu təsdiq edirsiniz.",
      "Bir şəxs bir hesab saxlamalıdır. Hesab başqasına verilə və ya satıla bilməz; hesabdan edilən əməliyyatlara görə hesab sahibi cavabdehdir.",
    ] },
    { title: "Hesab və e-poçt təsdiqi", body: [
      "Qeydiyyat üçün düzgün ad və sizə məxsus e-poçt ünvanı göstərməlisiniz. Yeni hesabın e-poçt ünvanına 6 rəqəmli təsdiq kodu göndərilir; kod daxil olunana qədər hesab aktivləşmir. Kod 15 dəqiqə qüvvədədir, yeni kod istəyə bilərsiniz.",
      "Hesab yalnız qeydiyyatda seçilən növ (iş axtaran və ya işəgötürən) üçün işləyir. Bir şəxs və ya şirkət üçün bir hesab kifayətdir; saxta və ya başqasının adı ilə hesab açmaq qadağandır.",
      "Şifrənin və giriş vasitələrinin qorunmasına istifadəçi cavabdehdir. Hesabınızı başqasına verməyin; icazəsiz girişdən şübhələnsəniz, şifrəni dəyişin, aktiv sessiyaları bağlayın və bizə yazın. Hesabınız altındakı əməliyyatlara görə siz cavabdehsiniz. İki mərhələli girişi aktivləşdirməyi tövsiyə edirik.",
    ] },
    { title: "İş axtaranlar", body: [
      "CV və profildə doğru məlumat yazmalısınız. Başqasının adından müraciət etmək, saxta sənəd və ya yalan təcrübə göstərmək, kütləvi və ya təkrarlanan spam müraciətlər göndərmək qadağandır.",
      "Müraciət etdikdə profiliniz və CV-niz həmin şirkətə görünür. Profili istedad bazasında göstərmək seçimi sizdədir və istənilən vaxt dəyişdirilə bilər.",
      "Platforma iş tapmağı və ya müsahibə dəvəti almağı zəmanət etmir. İş təklifi və şərtləri işəgötürənlə sizin aranızdadır.",
    ] },
    { title: "İşəgötürənlər", body: [
      "Vakansiyalar real olmalı, şirkət və iş şərtləri barədə məlumat doğru göstərilməlidir. Ayrı-seçkilik edən, aldadıcı, pulla iş vəd edən və ya qanuna zidd elanlar dərc olunmur; qaydanı pozan elan və hesablar xəbərdarlıqsız dayandırıla bilər.",
      "Namizəd məlumatları yalnız işə qəbul məqsədilə işlədilməli, üçüncü şəxslərə satılmamalı və ya başqa məqsədlə köçürülməməlidir. Namizədlə əlaqə qaydaları və məxfilik qanunvericiliyinə riayət etmək işəgötürənin öhdəliyidir.",
      "İşçilərin və namizədlərin məlumatlarını platformaya daxil edərkən bunun üçün hüquqi əsasınız olduğunu və işçiləri məlumatlandırdığınızı təsdiq edirsiniz. Bu məlumatlara görə məlumatları idarə edən tərəf sizsiniz, Operator isə sizin tapşırığınızla emal edir.",
      "Kadr və əmək haqqı qeydlərinin, əmrlərin, hesablamaların və hesabatların düzgünlüyünə şirkət özü cavabdehdir. Platformadakı hesablamalar (vergi, sığorta, məzuniyyət, müavinət, ezamiyyət və s.) kömək məqsədi daşıyır, qüvvədə olan qanunvericiliyə əsaslanır, lakin rəsmi mühasibat və kadr uçotunu əvəz etmir. Rəsmi bəyannamə və ödənişdən əvvəl nəticəni mühasibiniz və ya səlahiyyətli orqan yoxlamalıdır.",
    ] },
    { title: "Paketlər, ödənişlər və AI kreditləri", body: [
      "Pulsuz və ödənişli paketlər «Paketlər» bölməsində göstərilir. Ödənişli paket ödəniş təsdiqləndikdən sonra aktivləşir; müqavilə və ödəniş qeydi hesabınızda saxlanır.",
      "Paketin müddəti, limitləri, yenilənmə və ləğv qaydaları ödənişdən əvvəl göstərilir. Geri qaytarma qaydası müqavilədə göstərildiyi kimidir; istifadə olunmuş xidmətə görə ödəniş geri qaytarılmaya bilər.",
      "AI funksiyaları paketə daxil limit və ya əlavə kreditlə işləyir. Limit bitdikdə funksiya yenilənmə və ya əlavə kredit alınana qədər dayanır.",
      "Qiymətlər və paket tərkibi əvvəlcədən xəbər verilməklə dəyişdirilə bilər; dəyişiklik artıq ödənilmiş dövrə təsir etmir.",
    ] },
    { title: "Süni intellekt", body: [
      "AI funksiyaları (CV analizi, CV yenidən yazma, uyğunluq izahı, tövsiyələr, AI köməkçi) yardımçıdır; nəticənin düzgünlüyünə, tamlığına və konkret məqsədə uyğunluğuna zəmanət verilmir. Qərarı istifadəçi verir və nəticəni yoxlamaq onun məsuliyyətidir.",
      "AI nəticələri əsasında insan nəzarəti olmadan namizədə rədd cavabı vermək və ya kadr qərarı qəbul etmək tövsiyə olunmur.",
    ] },
    { title: "Məzmun və intellektual mülkiyyət", body: [
      "Yüklədiyiniz məzmun (CV, şəkil, vakansiya mətni, sənədlər) sizin qalır. Platformada göstərmək, saxlamaq, AI analiz etmək və seçdiyiniz şəxslərə (müraciət etdiyiniz şirkət, işəgötürən) göstərmək üçün Operatora məhdud, qeyri-müstəsna icazə verirsiniz; bu icazə məzmunu sildikdə və ya hesabı bağlayanda sona çatır.",
      "Yalnız yükləməyə haqqınız olan məzmunu yükləyin. Platformanın dizaynı, proqram kodu, kataloqları və marka adı Operatora və ya lisenziya verənlərə məxsusdur; icazəsiz kopyalamaq və yenidən satmaq qadağandır.",
    ] },
    { title: "Qadağan olunanlar", body: [
      "Sistemə icazəsiz müdaxilə, təhlükəsizlik yoxlamalarını (robot yoxlaması, limitlər) yan keçmək, avtomatlaşdırılmış vasitələrlə kütləvi məlumat çıxarmaq, başqalarının hesabına giriş, zərərli fayl və ya qanunsuz, təhqiramiz, aldadıcı məzmun yerləşdirmək, platformanın işini pozmaq və ya digər istifadəçilərə zərər vermək qadağandır.",
      "Bu qaydaların pozulması hesabın xəbərdarlıqla və ya xəbərdarlıqsız dayandırılmasına və hüquqi tədbirlərə səbəb ola bilər.",
    ] },
    { title: "Əlçatanlıq və dəyişikliklər", body: [
      "Platformanın fasiləsiz və xətasız işləməsinə çalışırıq, amma bunu zəmanət vermirik: texniki xidmət, yeniləmə və üçüncü tərəf xidmətlərinin (hostinq, e-poçt, ödəniş, AI) nasazlığı müvəqqəti fasilə yarada bilər.",
      "Funksiyaları inkişaf etdirir, dəyişir və ya ləğv edə bilərik. Əhəmiyyətli dəyişikliklər barədə əvvəlcədən xəbər verməyə çalışırıq.",
    ] },
    { title: "Üçüncü tərəf xidmətləri", body: [
      "Platforma üçüncü tərəf xidmətlərindən (hostinq, e-poçt, AI təminatçıları, ödəniş, xarici vakansiya mənbələri) istifadə edir və ya onlara keçid verə bilər. Həmin xidmətlərin öz şərtləri və məxfilik qaydaları var; onlar üzərində nəzarətimiz yoxdur və məzmununa görə məsuliyyət daşımırıq.",
    ] },
    { title: "Zəmanətlərin rədd edilməsi", body: [
      "Qanunun icazə verdiyi maksimum həddə platforma «olduğu kimi» və «mövcud olduğu kimi» təqdim olunur. Operator xidmətin fasiləsiz, xətasız və ya konkret məqsədə yararlı olacağına, vakansiyaların, namizədlərin və ya AI nəticələrinin dəqiq, tam və ya aktual olacağına dair açıq və ya nəzərdə tutulan zəmanət vermir.",
      "Hesablama alətləri (maaş, məzuniyyət, vergi və s.) məlumat xarakterlidir və rəsmi uçotu əvəz etmir; yekun hesablama üçün qüvvədə olan qanunvericiliyə və mütəxəssisə əsaslanın.",
    ] },
    { title: "Məsuliyyətin həddi", body: [
      "Platforma «olduğu kimi» təqdim olunur. Operator qanunun icazə verdiyi həddə dolayı və nəticə zərərinə, itirilmiş gəlir və ya fürsətə, üçüncü tərəflərin (işəgötürən, namizəd, xidmət təminatçıları) hərəkətlərinə və AI nəticələrinə əsaslanan qərarlara görə məsuliyyət daşımır.",
      "Operatorun məsuliyyəti, qanunla başqa cür tələb olunmayan hallarda, zərərin yarandığı dövrdə sizin ödədiyiniz məbləğlə məhdudlaşır. Bu müddəa qanunla ləğv edilə bilməyən hüquqlarınıza toxunmur.",
    ] },
    { title: "Müəllif hüquqlarının və məzmunla bağlı şikayətlərin qaydası", body: [
      `Platformadakı məzmunun sizin müəllif hüququnuzu, ticarət nişanınızı, şəxsi məlumatınızı və ya digər hüquqlarınızı pozduğunu düşünürsünüzsə, ${mail} ünvanına yazın: hüququn mahiyyəti, pozuntu olduğunu düşündüyünüz məzmunun ünvanı, əlaqə məlumatınız və məlumatın doğruluğuna dair bəyanat göstərilsin.`,
      "Əsaslı şikayət alındıqda məzmun müvəqqəti gizlədilə və ya silinə bilər; məzmunu yükləyən şəxsə cavab hüququ verilir. Təkrarlanan pozuntu hesabın bağlanmasına səbəb ola bilər.",
    ] },
    { title: "Zərərin əvəzinin ödənilməsi", body: [
      "Siz şərtləri, qanunu və ya üçüncü tərəfin hüquqlarını pozmanızdan, yüklədiyiniz məzmundan və ya işəgötürən kimi işçi və namizəd məlumatlarını qanunsuz emal etməyinizdən yaranan üçüncü tərəf tələblərindən Operatoru qoruyacağınıza və bu tələblər üzrə əsaslı zərəri ödəyəcəyinizə razılıq verirsiniz. Bu müddəa istehlakçıların qanunla ləğv edilə bilməyən hüquqlarına toxunmur.",
    ] },
    { title: "Hesabın bağlanması", body: [
      "Hesabı istənilən vaxt hesab ayarlarından silə bilərsiniz; bu halda şəxsi məlumatlar Məxfilik siyasətinə uyğun silinir, qanunla saxlanması tələb olunan qeydlər istisna olmaqla.",
      "Şərtləri pozan, aldadıcı və ya təhlükə yaradan hesab Operator tərəfindən dayandırıla və ya silinə bilər. Ödənişli paketlə bağlı qalıq məbləğ qaydası müqavilədə göstərildiyi kimidir.",
    ] },
    { title: "Qüvvədən kənar hallar", body: [
      "Operator əsaslı nəzarətindən kənar hallar (təbii fəlakət, müharibə, tətil, şəbəkə və ya enerji nasazlığı, üçüncü tərəf xidmətlərinin dayanması, dövlət orqanlarının qərarları və s.) səbəbindən öhdəliklərinin yerinə yetirilməməsinə və ya gecikməsinə görə məsuliyyət daşımır.",
    ] },
    { title: "Sanksiyalar və qanunvericiliyə riayət", body: [
      "Siz platformadan sanksiyalara, ixrac nəzarətinə və kriminal gəlirlərin leqallaşdırılmasına qarşı qüvvədə olan qanunlara zidd şəkildə istifadə etməyəcəyinizi və sanksiyalı şəxslər siyahısında olmadığınızı təsdiq edirsiniz.",
    ] },
    { title: "Şərtlərin dəyişməsi", body: [
      "Şərtlər dəyişdikdə yeni versiya bu səhifədə dərc olunur və «son yenilənmə» tarixi dəyişir. Əhəmiyyətli dəyişikliklərdə hesab e-poçtuna məlumat göndərilə bilər. Dəyişiklikdən sonra platformadan istifadəni davam etmək yeni şərtləri qəbul etmək deməkdir.",
    ] },
    { title: "Tətbiq olunan hüquq və mübahisələr", body: [
      "Bu şərtlər Azərbaycan Respublikasının qanunvericiliyinə tabedir (kolliziya normaları istisna olmaqla). Mübahisələr əvvəlcə 30 gün ərzində danışıqlarla, razılıq olmadıqda Bakı şəhərinin səlahiyyətli məhkəməsində həll olunur. İstehlakçı kimi yaşadığınız ölkənin imperativ qaydaları sizə daha yaxşı müdafiə verirsə, onlar qüvvədə qalır.",
      `Şikayət və suallar üçün: ${mail}.`,
    ] },
    { title: "Bildirişlər və ümumi hüquqi müddəalar", body: [
      `Bildirişlər hesabınızdakı e-poçta, platformada və ya bu səhifədə göndərilə bilər. Sizin Operatora bildirişiniz ${mail} ünvanına göndərilir.`,
      "Şərtlərin hər hansı müddəası qüvvədən düşərsə, qalan müddəalar qüvvədə qalır. Bu şərtlər və Məxfilik siyasəti tərəflər arasında tam razılaşmadır. Operator hüququndan istifadə etməməsi ondan imtina demək deyil. Operator bu şərtlər üzrə hüquq və vəzifələrini (məsələn, biznesin satışı zamanı) üçüncü şəxsə keçirə bilər; siz bunu Operatorun razılığı olmadan edə bilməzsiniz.",
      "Şərtlər Azərbaycan, ingilis və rus dillərində dərc olunur. Fərq olarsa, Azərbaycan dilindəki mətn üstünlük təşkil edir.",
    ] },
  ];
  const en: LegalSection[] = [
    { title: "General", body: [
      `These terms govern the use of the JobMatch platform (the site, its employer, job-seeker and admin sections, and the calculation tools) operated by ${who} (the “Operator”). By registering or using the platform you accept these terms and the Privacy policy. If you do not agree, do not use the platform.`,
      "The open parts of the platform (browsing vacancies, calculators) can be used without an account; operations that need an account require registration.",
    ] },
    { title: "Definitions", body: [
      `«Platform» means the JobMatch website and all its sections; «Operator» means ${who}, which runs the platform; «User» means anyone using the platform; «Job seeker» means a person looking for a job or internship; «Employer» means a company or its representative that posts vacancies or uses the HR tools; «Content» means information the user uploads to the platform (CV, vacancy, message, document and so on); «AI features» means analysis, recommendation and assistant tools powered by artificial intelligence.`,
    ] },
    { title: "Eligibility and authority", body: [
      "To use the platform you must be at least 16 and legally able to enter into a contract. If you register on behalf of a company, you confirm that you are authorised to bind that company to these terms.",
      "One person should keep one account. An account may not be transferred or sold; the account holder is responsible for actions taken through the account.",
    ] },
    { title: "Account and e-mail verification", body: [
      "To register you must give a real name and an e-mail address that belongs to you. A 6-digit verification code is sent to the new account's e-mail; the account is not activated until the code is entered. The code is valid for 15 minutes and you can ask for a new one.",
      "An account works only for the type chosen at registration (job seeker or employer). One account per person or company is enough; opening an account under a fake or another person's name is forbidden.",
      "The user is responsible for protecting the password and sign-in means. Do not give your account to anyone; if you suspect unauthorised access, change the password, close active sessions and write to us. You are responsible for actions under your account. We recommend enabling two-step sign-in.",
    ] },
    { title: "Job seekers", body: [
      "You must write true information in your CV and profile. Applying in someone else's name, showing fake documents or false experience, and sending mass or repeated spam applications are forbidden.",
      "When you apply, your profile and CV become visible to that company. Showing your profile in the talent pool is your choice and can be changed at any time.",
      "The platform does not guarantee that you will find a job or get an interview invitation. A job offer and its terms are between you and the employer.",
    ] },
    { title: "Employers", body: [
      "Vacancies must be real, with true information about the company and the job conditions. Discriminatory, misleading, pay-to-work or unlawful listings are not published; listings and accounts that break the rules can be suspended without notice.",
      "Candidate data must be used only for recruitment and must not be sold to third parties or copied for another purpose. Following candidate-contact rules and privacy law is the employer's duty.",
      "By entering data about employees and candidates you confirm that you have a legal basis for it and have informed them. For this data you are the data controller and the Operator processes it on your instructions.",
      "The company itself is responsible for the accuracy of HR and payroll records, orders, calculations and reports. Calculations on the platform (tax, insurance, leave, benefits, business trips, etc.) are for assistance and based on the legislation in force, but they do not replace official accounting and HR records. Before an official return or payment, your accountant or the competent authority should check the result.",
    ] },
    { title: "Packages, payments and AI credits", body: [
      "Free and paid packages are shown in the “Packages” section. A paid package is activated after payment is confirmed; the contract and payment record are kept in your account.",
      "The package term, limits, renewal and cancellation rules are shown before payment. The refund rule is as stated in the contract; payment for service already used may not be refundable.",
      "AI features work within the limit included in the package or with extra credit. When the limit runs out, the feature stops until renewal or an extra credit purchase.",
      "Prices and package contents can be changed with prior notice; a change does not affect an already paid period.",
    ] },
    { title: "Artificial intelligence", body: [
      "AI features (CV analysis, CV rewriting, match explanation, recommendations, AI assistant) are assistive; the accuracy, completeness and fitness of a result for a specific purpose are not guaranteed. The user decides and is responsible for checking the result.",
      "Rejecting a candidate or making an HR decision on AI results alone, without human review, is not recommended.",
    ] },
    { title: "Content and intellectual property", body: [
      "The content you upload (CV, photo, vacancy text, documents) remains yours. You give the Operator a limited, non-exclusive permission to show, store and AI-analyse it on the platform and to show it to the people you choose (the company you apply to, the employer); this permission ends when you delete the content or close the account.",
      "Upload only content you have the right to upload. The platform's design, software code, catalogues and brand name belong to the Operator or its licensors; copying and reselling without permission is forbidden.",
    ] },
    { title: "Prohibited conduct", body: [
      "It is forbidden to interfere with the system without permission, bypass security checks (robot check, limits), extract data in bulk by automated means, access other people's accounts, post harmful files or unlawful, offensive or misleading content, disrupt the platform or harm other users.",
      "Breaking these rules can lead to suspension of the account, with or without warning, and to legal action.",
    ] },
    { title: "Availability and changes", body: [
      "We try to keep the platform running without interruption or errors but do not guarantee it: maintenance, updates and failures of third-party services (hosting, e-mail, payment, AI) can cause temporary interruptions.",
      "We may develop, change or withdraw features. We try to give advance notice of important changes.",
    ] },
    { title: "Third-party services", body: [
      "The platform uses or may link to third-party services (hosting, e-mail, AI providers, payment, external vacancy sources). Those services have their own terms and privacy rules; we do not control them and are not responsible for their content.",
    ] },
    { title: "Disclaimer of warranties", body: [
      "To the maximum extent permitted by law the platform is provided «as is» and «as available». The Operator gives no express or implied warranty that the service will be uninterrupted, error-free or fit for a particular purpose, or that vacancies, candidates or AI results will be accurate, complete or current.",
      "The calculators (salary, vacation, tax and so on) are informational and do not replace official accounting; rely on the legislation in force and a specialist for the final calculation.",
    ] },
    { title: "Limitation of liability", body: [
      "The platform is provided “as is”. To the extent the law allows, the Operator is not liable for indirect and consequential loss, lost income or opportunity, actions of third parties (employer, candidate, service providers) or decisions based on AI results.",
      "Unless the law requires otherwise, the Operator's liability is limited to the amount you paid in the period in which the loss arose. This does not affect rights that cannot be excluded by law.",
    ] },
    { title: "Copyright and content complaints", body: [
      `If you believe content on the platform infringes your copyright, trademark, personal data or other rights, write to ${mail} stating the right concerned, the address of the content you believe infringes, your contact details and a statement that the information is accurate.`,
      "On a well-founded complaint the content may be hidden or removed temporarily; the person who uploaded it is given a chance to reply. Repeated infringement may lead to closing the account.",
    ] },
    { title: "Indemnification", body: [
      "You agree to protect the Operator against, and to compensate reasonable loss arising from, third-party claims caused by your breach of these terms, the law or third-party rights, by the Content you upload, or, if you are an employer, by your unlawful processing of employee and candidate data. This provision does not affect consumers' rights that cannot be waived by law.",
    ] },
    { title: "Closing an account", body: [
      "You can delete your account at any time in the account settings; your personal data is then deleted under the Privacy policy, except records the law requires to be kept.",
      "An account that breaks the terms, is misleading or creates risk can be suspended or deleted by the Operator. The rule for any balance on a paid package is as stated in the contract.",
    ] },
    { title: "Force majeure", body: [
      "The Operator is not liable for failure or delay in performing its obligations caused by circumstances beyond its reasonable control (natural disaster, war, strike, network or power failure, outage of third-party services, decisions of public authorities and so on).",
    ] },
    { title: "Sanctions and legal compliance", body: [
      "You confirm that you will not use the platform in breach of sanctions, export control or anti-money-laundering laws and that you are not on any list of sanctioned persons.",
    ] },
    { title: "Changes to the terms", body: [
      "When the terms change, the new version is published on this page and the “last updated” date changes. For important changes a message may be sent to the account e-mail. Continuing to use the platform after a change means accepting the new terms.",
    ] },
    { title: "Governing law and disputes", body: [
      "These terms are governed by the law of the Republic of Azerbaijan (excluding conflict-of-law rules). Disputes are first resolved by negotiation within 30 days and, failing agreement, by the competent court of the city of Baku. If you are a consumer and the mandatory rules of your country of residence protect you better, they remain in force.",
      `For complaints and questions: ${mail}.`,
    ] },
    { title: "Notices and general legal provisions", body: [
      `Notices may be sent to the e-mail on your account, on the platform or on this page. Your notices to the Operator go to ${mail}.`,
      "If any provision of the terms becomes invalid, the rest remain in force. These terms and the Privacy policy are the entire agreement between the parties. Failure by the Operator to exercise a right is not a waiver. The Operator may assign its rights and duties under these terms (for example on a sale of the business); you may not do so without the Operator's consent.",
      "The terms are published in Azerbaijani, English and Russian. If they differ, the Azerbaijani text prevails.",
    ] },
  ];
  const ru: LegalSection[] = [
    { title: "Общие положения", body: [
      `Настоящие условия регулируют использование платформы JobMatch (сайт, его разделы для работодателей, соискателей и администратора, инструменты расчётов), которой управляет ${who} (далее «Оператор»). Регистрируясь или используя платформу, вы принимаете эти условия и Политику конфиденциальности. Если вы не согласны, не используйте платформу.`,
      "Открытыми частями платформы (просмотр вакансий, калькуляторы) можно пользоваться без аккаунта; для операций, требующих аккаунта, нужна регистрация.",
    ] },
    { title: "Определения", body: [
      `«Платформа» — сайт JobMatch и все его разделы; «Оператор» — ${who}, управляющий платформой; «Пользователь» — любое лицо, использующее платформу; «Соискатель» — лицо, ищущее работу или стажировку; «Работодатель» — компания или её представитель, размещающий вакансии или использующий кадровые инструменты; «Контент» — информация, загружаемая пользователем на платформу (резюме, вакансия, сообщение, документ и т. д.); «Функции ИИ» — инструменты анализа, рекомендаций и помощника на основе искусственного интеллекта.`,
    ] },
    { title: "Соответствие требованиям и полномочия", body: [
      "Для использования платформы вам должно быть не менее 16 лет, и вы должны быть законно способны заключать договор. Если вы регистрируетесь от имени компании, вы подтверждаете, что имеете полномочия связывать её настоящими условиями.",
      "Один человек должен вести один аккаунт. Аккаунт нельзя передавать или продавать; владелец аккаунта отвечает за действия, совершённые через аккаунт.",
    ] },
    { title: "Аккаунт и подтверждение e-mail", body: [
      "Для регистрации необходимо указать настоящее имя и принадлежащий вам e-mail. На e-mail нового аккаунта отправляется 6-значный код подтверждения; пока код не введён, аккаунт не активируется. Код действует 15 минут, можно запросить новый.",
      "Аккаунт работает только для типа, выбранного при регистрации (соискатель или работодатель). Достаточно одного аккаунта на человека или компанию; создание аккаунта под вымышленным или чужим именем запрещено.",
      "За защиту пароля и средств входа отвечает пользователь. Не передавайте аккаунт другим; при подозрении на несанкционированный доступ смените пароль, закройте активные сессии и напишите нам. За действия под вашим аккаунтом отвечаете вы. Рекомендуем включить двухэтапный вход.",
    ] },
    { title: "Соискатели", body: [
      "В резюме и профиле необходимо указывать достоверные сведения. Запрещено откликаться от чужого имени, указывать поддельные документы или ложный опыт, отправлять массовые или повторяющиеся спам-отклики.",
      "При отклике ваш профиль и резюме становятся видны этой компании. Показ профиля в базе талантов — ваш выбор, его можно изменить в любой момент.",
      "Платформа не гарантирует, что вы найдёте работу или получите приглашение на интервью. Предложение о работе и его условия — между вами и работодателем.",
    ] },
    { title: "Работодатели", body: [
      "Вакансии должны быть реальными, сведения о компании и условиях работы — достоверными. Дискриминационные, вводящие в заблуждение, платные для соискателя и противозаконные объявления не публикуются; нарушающие правила объявления и аккаунты могут быть приостановлены без предупреждения.",
      "Данные кандидатов можно использовать только для подбора персонала; их нельзя продавать третьим лицам или копировать для иных целей. Соблюдение правил связи с кандидатами и законодательства о конфиденциальности — обязанность работодателя.",
      "Внося данные о сотрудниках и кандидатах, вы подтверждаете, что имеете для этого правовое основание и уведомили их. По этим данным управляющим являетесь вы, а Оператор обрабатывает их по вашему поручению.",
      "За точность кадровых и зарплатных записей, приказов, расчётов и отчётов отвечает сама компания. Расчёты на платформе (налоги, страхование, отпуска, пособия, командировки и др.) носят вспомогательный характер и основаны на действующем законодательстве, но не заменяют официальный бухгалтерский и кадровый учёт. Перед официальной отчётностью и платежом результат должен проверить ваш бухгалтер или компетентный орган.",
    ] },
    { title: "Пакеты, платежи и ИИ-кредиты", body: [
      "Бесплатные и платные пакеты показаны в разделе «Пакеты». Платный пакет активируется после подтверждения платежа; договор и запись о платеже хранятся в вашем аккаунте.",
      "Срок пакета, лимиты, правила продления и отмены показываются до оплаты. Правила возврата — как указано в договоре; оплата за уже использованную услугу может не возвращаться.",
      "ИИ-функции работают в рамках лимита, входящего в пакет, или за дополнительный кредит. Когда лимит исчерпан, функция останавливается до продления или покупки дополнительного кредита.",
      "Цены и состав пакетов могут изменяться с предварительным уведомлением; изменение не влияет на уже оплаченный период.",
    ] },
    { title: "Искусственный интеллект", body: [
      "ИИ-функции (анализ резюме, переписывание резюме, объяснение соответствия, рекомендации, ИИ-помощник) носят вспомогательный характер; точность, полнота и пригодность результата для конкретной цели не гарантируются. Решение принимает пользователь, и проверка результата — его ответственность.",
      "Не рекомендуется отказывать кандидату или принимать кадровое решение только на основе результатов ИИ без проверки человеком.",
    ] },
    { title: "Контент и интеллектуальная собственность", body: [
      "Загруженный вами контент (резюме, фото, текст вакансии, документы) остаётся вашим. Вы даёте Оператору ограниченное неисключительное разрешение показывать его на платформе, хранить, анализировать с помощью ИИ и показывать выбранным вами лицам (компании, на вакансию которой вы откликнулись, работодателю); оно прекращается при удалении контента или закрытии аккаунта.",
      "Загружайте только тот контент, который вы вправе загружать. Дизайн платформы, программный код, каталоги и название бренда принадлежат Оператору или его лицензиарам; копирование и перепродажа без разрешения запрещены.",
    ] },
    { title: "Что запрещено", body: [
      "Запрещены несанкционированное вмешательство в систему, обход проверок безопасности (проверка на робота, лимиты), массовое извлечение данных автоматическими средствами, доступ к чужим аккаунтам, размещение вредоносных файлов или противозаконного, оскорбительного, вводящего в заблуждение контента, нарушение работы платформы и причинение вреда другим пользователям.",
      "Нарушение этих правил может привести к приостановке аккаунта с предупреждением или без него и к юридическим мерам.",
    ] },
    { title: "Доступность и изменения", body: [
      "Мы стараемся обеспечить бесперебойную и безошибочную работу платформы, но не гарантируем этого: техническое обслуживание, обновления и сбои сторонних сервисов (хостинг, e-mail, оплата, ИИ) могут вызывать временные перерывы.",
      "Мы можем развивать, изменять или отменять функции. О существенных изменениях стараемся предупреждать заранее.",
    ] },
    { title: "Сторонние сервисы", body: [
      "Платформа использует сторонние сервисы (хостинг, e-mail, поставщики ИИ, оплата, внешние источники вакансий) или может давать на них ссылки. У этих сервисов свои условия и правила конфиденциальности; мы не контролируем их и не отвечаем за их содержание.",
    ] },
    { title: "Отказ от гарантий", body: [
      "В максимальной степени, разрешённой законом, платформа предоставляется «как есть» и «по мере доступности». Оператор не даёт явных или подразумеваемых гарантий бесперебойности, безошибочности и пригодности сервиса для конкретной цели, а также точности, полноты и актуальности вакансий, кандидатов и результатов ИИ.",
      "Калькуляторы (зарплата, отпуск, налоги и т. д.) носят информационный характер и не заменяют официальный учёт; для окончательного расчёта ориентируйтесь на действующее законодательство и специалиста.",
    ] },
    { title: "Ограничение ответственности", body: [
      "Платформа предоставляется «как есть». В пределах, допускаемых законом, Оператор не отвечает за косвенные и последующие убытки, упущенный доход или возможность, действия третьих лиц (работодателя, кандидата, поставщиков услуг) и решения, основанные на результатах ИИ.",
      "Если иное не требуется законом, ответственность Оператора ограничена суммой, уплаченной вами за период, в котором возник ущерб. Это не затрагивает права, которые нельзя исключить по закону.",
    ] },
    { title: "Авторские права и жалобы на контент", body: [
      `Если вы считаете, что контент на платформе нарушает ваше авторское право, товарный знак, персональные данные или иные права, напишите на ${mail}, указав затронутое право, адрес контента, который, по вашему мнению, нарушает права, ваши контактные данные и заявление о достоверности сведений.`,
      "При обоснованной жалобе контент может быть временно скрыт или удалён; загрузившему его лицу даётся возможность ответить. Повторные нарушения могут привести к закрытию аккаунта.",
    ] },
    { title: "Возмещение ущерба", body: [
      "Вы соглашаетесь защищать Оператора и возмещать обоснованный ущерб, возникший из претензий третьих лиц, вызванных вашим нарушением условий, закона или прав третьих лиц, загруженным вами Контентом либо (если вы работодатель) незаконной обработкой вами данных сотрудников и кандидатов. Это положение не затрагивает права потребителей, от которых нельзя отказаться по закону.",
    ] },
    { title: "Закрытие аккаунта", body: [
      "Вы можете удалить аккаунт в любое время в настройках аккаунта; ваши персональные данные при этом удаляются согласно Политике конфиденциальности, за исключением записей, которые по закону необходимо хранить.",
      "Аккаунт, нарушающий условия, вводящий в заблуждение или создающий опасность, может быть приостановлен или удалён Оператором. Правила в отношении остатка по платному пакету — как указано в договоре.",
    ] },
    { title: "Форс-мажор", body: [
      "Оператор не отвечает за неисполнение или задержку исполнения обязательств, вызванные обстоятельствами вне его разумного контроля (стихийное бедствие, война, забастовка, сбой сети или электроснабжения, недоступность сторонних сервисов, решения государственных органов и т. д.).",
    ] },
    { title: "Санкции и соблюдение законодательства", body: [
      "Вы подтверждаете, что не будете использовать платформу в нарушение законов о санкциях, экспортном контроле и противодействии отмыванию денег и что вас нет в списках лиц, на которых распространяются санкции.",
    ] },
    { title: "Изменение условий", body: [
      "При изменении условий новая версия публикуется на этой странице, а дата «последнего обновления» меняется. О существенных изменениях сообщение может быть отправлено на e-mail аккаунта. Продолжение использования платформы после изменения означает принятие новых условий.",
    ] },
    { title: "Применимое право и споры", body: [
      "Настоящие условия регулируются законодательством Азербайджанской Республики (за исключением коллизионных норм). Споры сначала разрешаются путём переговоров в течение 30 дней, а при недостижении согласия — компетентным судом города Баку. Если вы потребитель и императивные нормы страны вашего проживания защищают вас лучше, они сохраняют силу.",
      `По жалобам и вопросам: ${mail}.`,
    ] },
    { title: "Уведомления и общие правовые положения", body: [
      `Уведомления могут направляться на e-mail вашего аккаунта, на платформе или на этой странице. Ваши уведомления Оператору направляются на ${mail}.`,
      "Если какое-либо положение условий станет недействительным, остальные сохраняют силу. Настоящие условия и Политика конфиденциальности составляют полное соглашение сторон. Неиспользование Оператором своего права не означает отказа от него. Оператор вправе передать свои права и обязанности по условиям (например, при продаже бизнеса); вы не вправе делать это без согласия Оператора.",
      "Условия опубликованы на азербайджанском, английском и русском языках. При расхождениях приоритет имеет текст на азербайджанском языке.",
    ] },
  ];
  return {
    title: L(lang, "İstifadə şərtləri", "Terms of use", "Условия использования"),
    summaryTitle: L(lang, "Qısaca", "In short", "Коротко"),
    summary: L(lang,
      ["Doğru məlumat yazın, bir hesab saxlayın və şifrənizi qoruyun.", "Yeni hesab e-poçta gələn 6 rəqəmli kodla təsdiqlənir.", "İşəgötürən işçi və namizəd məlumatlarına, kadr və əmək haqqı qeydlərinin düzgünlüyünə özü cavabdehdir; hesablamalar rəsmi uçotu əvəz etmir.", "AI nəticələri yardımçıdır; qərarı insan verir.", "Hesabı istənilən vaxt silə bilərsiniz."],
      ["Give true information, keep one account and protect your password.", "A new account is verified with a 6-digit code sent by e-mail.", "Employers are responsible for employee and candidate data and for the accuracy of HR and payroll records; calculations do not replace official records.", "AI results are assistive; people make the decision.", "You can delete your account at any time."],
      ["Указывайте достоверные данные, держите один аккаунт и берегите пароль.", "Новый аккаунт подтверждается 6-значным кодом, отправленным на e-mail.", "Работодатель сам отвечает за данные сотрудников и кандидатов и за точность кадровых и зарплатных записей; расчёты не заменяют официальный учёт.", "Результаты ИИ носят вспомогательный характер; решение принимает человек.", "Вы можете удалить аккаунт в любое время."]),
    sections: L(lang, az, en, ru),
  };
}
