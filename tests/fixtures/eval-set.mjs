// A set of candidate–vacancy pairs with the decision a sensible HR manager would
// make. It measures the rule-based fit (and, with the AI on, the AI) against a
// fixed yardstick, so a change that helps one case but breaks others shows up.
// The decisions were written by the developers as a starting set; replace or
// extend them with real HR decisions (see docs/AI_EVAL.md).
import { blankProfile } from "../../lib/model.ts";

export { recommendationForScore as categoryForScore } from "../../lib/ai-eval.ts";

const vacancy = (title, category, skills, minYears, description, extra = {}) => ({
  id: `job-${title}`, owner: "c", title, company: "Test MMC", city: "Bakı", mode: "Ofisdə", type: "Tam ştat",
  category, minSalary: 0, maxSalary: 0, minYears, maxYears: minYears + 4, skills, description, requirements: "", status: "published", ...extra,
});
const person = (title, description, start, skills, extra = {}) => ({
  ...blankProfile, city: "Bakı", mode: "Ofisdə", title, skills,
  experiences: [{ id: "1", title, company: "X", employmentType: "", start, end: "", current: true, description }],
  ...extra,
});
const FIN = "Maliyyə, bankçılıq və sığorta";
const SALES = "Satış və müştəri xidməti";
const IT = "İT və məlumat analitikası";
const HR = "Biznes, idarəetmə və HR";
const SUPPLY = "Satınalma və təchizat zənciri";

const accountantJob = vacancy("Mühasib", FIN, ["Microsoft Excel", "Debitor və kreditor uçotu", "1C"], 2, "Debitor və kreditor uçotu, aylıq hesabatların hazırlanması, 1C-də əməliyyatların uçotu");
const chiefJob = vacancy("Baş mühasib", FIN, ["Maliyyə hesabatlılığı", "Vergi uçotu", "1C"], 5, "Maliyyə və vergi hesabatlarının hazırlanmasına nəzarət, mühasibatlıq komandasının idarə edilməsi");
const operatorJob = vacancy("Mühasib operator", FIN, ["Microsoft Excel", "1C"], 0, "İlkin sənədlərin daxil edilməsi, kassa əməliyyatları, qaimə-fakturaların uçotu");
const analystJob = vacancy("Maliyyə analitiki", FIN, ["Microsoft Excel", "Maliyyə təhlili", "Maliyyə hesabatlılığı"], 3, "Aylıq maliyyə hesabatlarının hazırlanması və təhlili, büdcənin icrasına nəzarət, rəhbərliyə hesabatlar");
const reactJob = vacancy("Frontend developer", IT, ["React", "TypeScript", "JavaScript"], 3, "React ilə veb tətbiqlərin hazırlanması, komponentlərin yazılması, kodun nəzərdən keçirilməsi");
const salesMgrJob = vacancy("Satış meneceri", SALES, ["Müştəri xidməti", "Danışıqlar", "Microsoft Excel"], 3, "Yeni müştərilərin cəlb edilməsi, satış planının icrası, müştəri görüşləri və danışıqlar");
const hrJob = vacancy("HR mütəxəssisi", HR, ["İşə qəbul", "Əmək qanunvericiliyi", "Microsoft Excel"], 2, "Namizədlərin seçilməsi, müsahibələrin təşkili, kadr sənədlərinin aparılması");
const procurementJob = vacancy("Satınalma mütəxəssisi", SUPPLY, ["Satınalma", "Təchizatçılarla danışıqlar", "Microsoft Excel"], 2, "Satınalma tenderlərinin keçirilməsi, təchizatçılarla danışıqlar, müqavilələrin hazırlanması");
const accaJob = vacancy("Maliyyə meneceri", FIN, ["Maliyyə hesabatlılığı", "Büdcələşdirmə"], 4, "Maliyyə hesabatlarının hazırlanması, büdcənin idarə edilməsi, komandaya rəhbərlik", { certifications: [{ id: "acca", required: true, minLevel: "", modules: [] }] });

export const EVAL_CASES = [
  { id: "acc-fit", note: "5 il mühasib, mühasib vakansiyası", expected: "interview", job: accountantJob, profile: person("Mühasib", "Debitor və kreditor uçotunun aparılması, 1C-də əməliyyatlar, Excel-də aylıq hesabatlar", "2019-01", ["Microsoft Excel", "Debitor və kreditor uçotu", "1C"]) },
  { id: "acc-junior-vs-chief", note: "1 illik mühasib baş mühasib vakansiyasına", expected: "reject", job: chiefJob, profile: person("Mühasib köməkçisi", "Sənədlərin daxil edilməsi, 1C", "2025-06", ["1C"]) },
  { id: "chief-vs-operator", note: "baş mühasib operator vakansiyasına (həddindən artıq təcrübəli)", expected: "consider", job: operatorJob, profile: person("Baş mühasib", "Maliyyə hesabatlarına nəzarət, komandanın idarə edilməsi, vergi uçotu", "2012-01", ["Microsoft Excel", "1C", "Vergi uçotu"]) },
  { id: "operator-fit", note: "operator operator vakansiyasına", expected: "interview", job: operatorJob, profile: person("Mühasib operator", "İlkin sənədlərin daxil edilməsi, kassa əməliyyatları, qaimə-fakturaların uçotu, 1C", "2022-02", ["Microsoft Excel", "1C"]) },
  { id: "dev-fit", note: "React developer React vakansiyasına", expected: "interview", job: reactJob, profile: person("Frontend developer", "React ilə komponentlərin yazılması, TypeScript, kodun nəzərdən keçirilməsi", "2021-03", ["React", "TypeScript", "JavaScript"]) },
  { id: "backend-vs-react", note: "backend developer frontend vakansiyasına", expected: "consider", job: reactJob, profile: person("Backend developer", "Node.js servislərinin və REST API-lərin hazırlanması, PostgreSQL", "2019-01", ["Node.js", "PostgreSQL", "JavaScript"]) },
  { id: "acc-vs-dev", note: "mühasib developer vakansiyasına", expected: "reject", job: reactJob, profile: person("Mühasib", "Debitor və kreditor uçotu, 1C, Excel", "2018-01", ["Microsoft Excel", "1C"]) },
  { id: "sales-fit", note: "satış meneceri satış meneceri vakansiyasına", expected: "interview", job: salesMgrJob, profile: person("Satış meneceri", "Yeni müştərilərin cəlb edilməsi, satış planının icrası, danışıqlar aparılması", "2018-05", ["Müştəri xidməti", "Danışıqlar", "Microsoft Excel"]) },
  { id: "cashier-vs-sales-mgr", note: "kassir satış meneceri vakansiyasına", expected: "reject", job: salesMgrJob, profile: person("Kassir", "Kassa əməliyyatları, ödənişlərin qəbulu", "2023-01", ["Microsoft Excel"]) },
  { id: "hr-fit", note: "HR mütəxəssisi HR vakansiyasına", expected: "interview", job: hrJob, profile: person("HR mütəxəssisi", "Namizədlərin seçilməsi, müsahibələrin təşkili, kadr sənədlərinin aparılması", "2020-02", ["İşə qəbul", "Əmək qanunvericiliyi", "Microsoft Excel"]) },
  { id: "recruiter-vs-hr", note: "rekruter HR mütəxəssisi vakansiyasına (işlərin çoxu üst-üstə düşür)", expected: "interview", job: hrJob, profile: person("Rekruter", "Namizədlərin axtarışı və seçilməsi, müsahibələr", "2021-06", ["İşə qəbul", "Microsoft Excel"]) },
  { id: "procurement-fit", note: "satınalma mütəxəssisi satınalma vakansiyasına", expected: "interview", job: procurementJob, profile: person("Satınalma mütəxəssisi", "Satınalma tenderlərinin keçirilməsi, təchizatçılarla danışıqlar, müqavilələr", "2019-03", ["Satınalma", "Təchizatçılarla danışıqlar", "Microsoft Excel"]) },
  { id: "storekeeper-vs-procurement", note: "anbardar satınalma vakansiyasına (qonşu sahə)", expected: "consider", job: procurementJob, profile: person("Anbardar", "Malların qəbulu və anbarda saxlanması", "2020-01", ["Microsoft Excel"]) },
  { id: "changer-sales-acc", note: "işi mühasibat olan satış meneceri mühasib vakansiyasına", expected: "consider", job: accountantJob, profile: person("Satış meneceri", "Müştərilərin debitor və kreditor uçotu, 1C-də əməliyyatlar, Excel ilə hesabatlar", "2019-01", ["Microsoft Excel", "Debitor və kreditor uçotu", "1C"]) },
  { id: "fin-director-vs-analyst", note: "maliyyə direktoru analitik vakansiyasına", expected: "consider", job: analystJob, profile: person("Maliyyə direktoru", "Maliyyə strategiyasının hazırlanması, komandanın idarə edilməsi, investorlara təqdimatlar", "2012-01", ["Microsoft Excel", "Maliyyə hesabatlılığı", "Maliyyə təhlili"]) },
  { id: "chef-vs-acc", note: "aşpaz mühasib vakansiyasına", expected: "reject", job: accountantJob, profile: person("Aşpaz", "Yeməklərin hazırlanması, mətbəxin idarə edilməsi", "2015-01", []) },
  { id: "analyst-fit", note: "maliyyə analitiki analitik vakansiyasına", expected: "interview", job: analystJob, profile: person("Maliyyə analitiki", "Aylıq maliyyə hesabatlarının hazırlanması və təhlili, büdcənin icrasına nəzarət, Excel-də modelləşdirmə", "2018-01", ["Microsoft Excel", "Maliyyə təhlili", "Maliyyə hesabatlılığı"]) },
  { id: "accountant-vs-analyst", note: "mühasib analitik vakansiyasına (analitik iş yoxdur)", expected: "consider", job: analystJob, profile: person("Mühasib", "Debitor və kreditor uçotu, 1C, vergi bəyannamələri", "2017-01", ["Microsoft Excel", "Maliyyə hesabatlılığı"]) },
  { id: "graduate-vs-analyst", note: "təcrübəsiz maliyyə məzunu analitik vakansiyasına", expected: "consider", job: { ...analystJob, minYears: 0, maxYears: 2 }, profile: { ...blankProfile, city: "Bakı", mode: "Ofisdə", title: "Maliyyə üzrə məzun", skills: ["Microsoft Excel", "Maliyyə hesabatlılığı"], experiences: [], education: [{ id: "e", school: "Azərbaycan Dövlət İqtisad Universiteti", degree: "Bakalavr · Maliyyə", year: "2025" }] } },
  { id: "acca-held", note: "ACCA-sı olan maliyyəçi ACCA tələb edən vakansiyaya", expected: "interview", job: accaJob, profile: person("Maliyyə meneceri", "Maliyyə hesabatlarının hazırlanması, büdcənin idarə edilməsi, 6 nəfərlik komandaya rəhbərlik", "2016-01", ["Maliyyə hesabatlılığı", "Büdcələşdirmə"], { certifications: [{ id: "acca", status: "active", level: "", passed: [] }] }) },
  { id: "acca-missing", note: "eyni maliyyəçi, ACCA yoxdur", expected: "consider", job: accaJob, profile: person("Maliyyə meneceri", "Maliyyə hesabatlarının hazırlanması, büdcənin idarə edilməsi, 6 nəfərlik komandaya rəhbərlik", "2016-01", ["Maliyyə hesabatlılığı", "Büdcələşdirmə"]) },
  { id: "backend-vs-accountant", note: "developer mühasib vakansiyasına", expected: "reject", job: accountantJob, profile: person("Backend developer", "REST API-lərin hazırlanması, PostgreSQL, Docker", "2018-01", ["Node.js", "PostgreSQL", "Docker"]) },
  { id: "hr-vs-sales", note: "HR mütəxəssisi satış meneceri vakansiyasına", expected: "reject", job: salesMgrJob, profile: person("HR mütəxəssisi", "Namizədlərin seçilməsi, müsahibələr, kadr sənədləri", "2019-01", ["İşə qəbul", "Microsoft Excel"]) },
  { id: "senior-sales-vs-junior", note: "10 illik satış direktoru kiçik satış vakansiyasına", expected: "consider", job: vacancy("Satış üzrə mütəxəssis", SALES, ["Müştəri xidməti"], 1, "Müştərilərlə görüşlər və satışların icrası"), profile: person("Satış direktoru", "Satış strategiyasının hazırlanması, satış komandasına rəhbərlik, iri müqavilələr", "2013-01", ["Müştəri xidməti", "Danışıqlar"]) },
  { id: "empty-profile", note: "boş profil", expected: "reject", job: accountantJob, profile: { ...blankProfile } },
  { id: "dev-vs-senior-dev", note: "1 illik developer 5 illik tələb edən vakansiyaya", expected: "consider", job: { ...reactJob, minYears: 5, maxYears: 9 }, profile: person("Frontend developer", "React ilə komponentlərin yazılması, TypeScript", "2025-05", ["React", "TypeScript", "JavaScript"]) },
  { id: "acc-wrong-skills", note: "mühasib, tələb olunan bacarıqların heç biri yoxdur", expected: "consider", job: accountantJob, profile: person("Mühasib", "Maliyyə hesabatlarının hazırlanması və uçot işləri", "2019-01", []) },
  { id: "procurement-vs-analyst", note: "satınalma mütəxəssisi maliyyə analitiki vakansiyasına", expected: "reject", job: analystJob, profile: person("Satınalma mütəxəssisi", "Tenderlərin keçirilməsi, təchizatçılarla danışıqlar", "2019-01", ["Satınalma", "Microsoft Excel"]) },
];

// Written after the rules were tuned on the set above and not used for tuning:
// a check that the rules do not merely fit the first cases.
const lawJob = vacancy("Hüquqşünas", "Hüquq və uyğunluq", ["Hüquq"], 3, "Müqavilələrin hazırlanması və hüquqi ekspertizası, hüquqi rəylərin yazılması, məhkəmələrdə təmsilçilik");
const designJob = vacancy("Qrafik dizayner", "Dizayn və yaradıcı sahələr", ["Qrafik dizayn"], 2, "Reklam və sosial media üçün vizualların hazırlanması, loqotip və broşür dizaynı");
const nurseJob = vacancy("Tibb bacısı", "Səhiyyə və əczaçılıq", [], 1, "Xəstələrə qulluq, inyeksiyaların aparılması, tibbi sənədlərin doldurulması");
const driverJob = vacancy("Sürücü", "Əmlak və təsərrüfat", [], 1, "Şirkət avtomobilinin idarə edilməsi, rəhbərliyin daşınması, avtomobilin texniki vəziyyətinə nəzarət");
const qaJob = vacancy("QA mühəndisi", IT, ["Proqram təminatının test edilməsi", "SQL"], 2, "Test ssenarilərinin yazılması, funksional və API testlərinin icrası, xətaların sənədləşdirilməsi");
const marketingJob = vacancy("Marketinq meneceri", "Marketinq və kommunikasiya", ["Rəqəmsal marketinq", "SEO"], 3, "Marketinq strategiyasının hazırlanması, reklam kampaniyalarının idarə edilməsi, nəticələrin təhlili");

export const BLIND_CASES = [
  { id: "lawyer-fit", note: "hüquqşünas hüquqşünas vakansiyasına", expected: "interview", job: lawJob, profile: person("Hüquqşünas", "Müqavilələrin hazırlanması, hüquqi rəylərin yazılması, məhkəmələrdə təmsilçilik", "2018-01", ["Hüquq"]) },
  { id: "accountant-vs-lawyer", note: "mühasib hüquqşünas vakansiyasına", expected: "reject", job: lawJob, profile: person("Mühasib", "Uçot işləri, 1C, hesabatlar", "2016-01", ["1C", "Microsoft Excel"]) },
  { id: "designer-fit", note: "qrafik dizayner dizayner vakansiyasına", expected: "interview", job: designJob, profile: person("Qrafik dizayner", "Loqotip və broşür dizaynı, sosial media vizualları, Photoshop və Illustrator", "2020-01", ["Qrafik dizayn"]) },
  { id: "marketer-vs-designer", note: "marketoloq dizayner vakansiyasına", expected: "consider", job: designJob, profile: person("Marketinq mütəxəssisi", "Sosial media kampaniyaları, kontent planı, Canva ilə sadə vizuallar", "2021-01", ["Rəqəmsal marketinq"]) },
  { id: "nurse-fit", note: "tibb bacısı tibb bacısı vakansiyasına", expected: "interview", job: nurseJob, profile: person("Tibb bacısı", "Xəstələrə qulluq, inyeksiyaların aparılması, tibbi sənədlərin doldurulması", "2019-01", []) },
  { id: "sales-vs-nurse", note: "satıcı tibb bacısı vakansiyasına", expected: "reject", job: nurseJob, profile: person("Satış məsləhətçisi", "Müştərilərə xidmət, malların satışı", "2020-01", []) },
  { id: "driver-fit", note: "sürücü sürücü vakansiyasına", expected: "interview", job: driverJob, profile: person("Sürücü", "Şirkət avtomobilinin idarə edilməsi, rəhbərliyin daşınması, texniki baxışa nəzarət", "2015-01", []) },
  { id: "tester-fit", note: "test mühəndisi QA vakansiyasına", expected: "interview", job: qaJob, profile: person("QA mühəndisi", "Test ssenarilərinin yazılması, API testləri Postman ilə, SQL sorğuları, xətaların sənədləşdirilməsi", "2020-01", ["Proqram təminatının test edilməsi", "SQL"]) },
  { id: "dev-vs-qa", note: "developer QA vakansiyasına", expected: "consider", job: qaJob, profile: person("Backend developer", "REST API-lərin hazırlanması, SQL, vahid testlərin yazılması", "2019-01", ["SQL", "Node.js"]) },
  { id: "marketing-fit", note: "marketinq meneceri marketinq vakansiyasına", expected: "interview", job: marketingJob, profile: person("Marketinq meneceri", "Marketinq strategiyasının hazırlanması, reklam kampaniyalarının idarə edilməsi, Google Analytics ilə nəticələrin təhlili", "2017-01", ["Rəqəmsal marketinq", "SEO"]) },
];
