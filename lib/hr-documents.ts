// Personnel documents filled in from the company and employee data: the employment contract, an addendum to it,
// a work certificate, an agreement on full liability and a confidentiality undertaking. Unknown values stay as blanks
// to be filled by hand. The texts are drafts: the Labor Code of the Republic of Azerbaijan governs.
export type DocCompany = { name: string; voen: string; address: string; director: string; phone?: string };
export type DocEmployee = {
  name: string; fin: string; idSeries: string; idNumber: string; idIssuedBy: string; address: string;
  position: string; department: string; section: string; startDate: string;
  gross: number; weekHours: number;
};
export type DocKind = "contract" | "addendum" | "certificate" | "liability" | "confidentiality";
export type DocOptions = {
  date: string; number: string;
  term: "indefinite" | "fixed"; endDate: string; probationMonths: number; workPlace: string; leaveDays: number; payDay: number;
  changeFrom: string; newPosition: string; newGross: string; newHours: string; changeReason: string;
  withSalary: boolean; purpose: string;
  valuables: string;
};
export const DOC_KINDS_HR: { id: DocKind; label: string; hint: string }[] = [
  { id: "contract", label: "Əmək müqaviləsi", hint: "İşə qəbul olunan işçi ilə bağlanan əmək müqaviləsi" },
  { id: "addendum", label: "Əmək müqaviləsinə əlavə", hint: "Vəzifə, maaş və ya iş vaxtı dəyişəndə" },
  { id: "certificate", label: "İş yerindən arayış", hint: "Maaşlı və ya maaşsız arayış" },
  { id: "liability", label: "Maddi məsuliyyət haqqında müqavilə", hint: "Maddi dəyərlilərə cavabdeh işçilər üçün" },
  { id: "confidentiality", label: "Məxfilik öhdəliyi", hint: "Kommersiya sirri və məlumatların qorunması" },
];
export type HrDocument = { title: string; number: string; sections: { heading: string; paragraphs: string[] }[]; signatures: { role: string; name: string }[]; note: string };

export const EMPTY_DOC_OPTIONS: DocOptions = {
  date: "", number: "", term: "indefinite", endDate: "", probationMonths: 0, workPlace: "", leaveDays: 21, payDay: 28,
  changeFrom: "", newPosition: "", newGross: "", newHours: "", changeReason: "", withSalary: true, purpose: "tələb olunan yer", valuables: "",
};

const BLANK = "__________";
const fill = (v: string | undefined | null) => (v && String(v).trim() ? String(v).trim() : BLANK);
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : BLANK);
const money = (v: number) => (v > 0 ? `${v.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN` : BLANK);
const idLine = (e: DocEmployee) => [e.idSeries && e.idNumber ? `vəsiqə ${e.idSeries} ${e.idNumber}` : e.idNumber ? `vəsiqə № ${e.idNumber}` : "", e.fin ? `FİN ${e.fin}` : "", e.idIssuedBy ? `verən orqan: ${e.idIssuedBy}` : ""].filter(Boolean).join(", ");
const unit = (e: DocEmployee) => [e.department, e.section].filter(Boolean).join(" / ");
const NOTE = "Bu mətn layihədir; Azərbaycan Respublikasının Əmək Məcəlləsinə və şirkətin daxili qaydalarına görə yoxlanmalı və boş xanalar doldurulmalıdır.";

const parties = (c: DocCompany, e: DocEmployee) =>
  `${fill(c.name)} (VÖEN ${fill(c.voen)}, ünvan: ${fill(c.address)}) adından direktor ${fill(c.director)} (bundan sonra — İşəgötürən) və ${fill(e.name)}${idLine(e) ? ` (${idLine(e)})` : ""}${e.address ? `, ünvan: ${e.address}` : ""} (bundan sonra — İşçi)`;
const signatures = (c: DocCompany, e: DocEmployee) => [
  { role: "İşəgötürən", name: `${fill(c.name)}\nDirektor ${fill(c.director)}` },
  { role: "İşçi", name: fill(e.name) },
];

export function buildHrDocument(kind: DocKind, company: DocCompany, employee: DocEmployee, options: Partial<DocOptions> = {}): HrDocument {
  const o = { ...EMPTY_DOC_OPTIONS, ...options };
  const date = o.date || "";
  const number = o.number || BLANK;
  const place = o.workPlace || company.address;
  if (kind === "contract") {
    const term = o.term === "fixed" ? `müddətli, ${dmy(employee.startDate)} tarixindən ${dmy(o.endDate)} tarixinədək` : `müddətsiz, ${dmy(employee.startDate)} tarixindən`;
    return {
      title: `Əmək müqaviləsi № ${number}`,
      number,
      sections: [
        { heading: "Tərəflər", paragraphs: [`${dmy(date)} tarixində ${parties(company, employee)} aşağıdakı şərtlərlə bu müqaviləni bağladılar.`] },
        {
          heading: "1. Müqavilənin predmeti",
          paragraphs: [
            `1.1. İşçi İşəgötürənin ${fill(unit(employee)) === BLANK ? "" : `${unit(employee)} bölməsində `}${fill(employee.position)} vəzifəsində işləməyi, İşəgötürən isə işçiyə bu işə görə əmək haqqı ödəməyi və qanunla müəyyən edilmiş əmək şəraitini təmin etməyi öhdəsinə götürür.`,
            `1.2. İş yeri: ${fill(place)}. Bu iş İşçi üçün əsas iş yeridir.`,
            `1.3. Müqavilə ${term} qüvvəyə minir.`,
            o.probationMonths > 0 ? `1.4. İşçiyə ${o.probationMonths} ay sınaq müddəti müəyyən edilir. Sınaq müddətində tərəflər Əmək Məcəlləsində nəzərdə tutulmuş qaydada müqaviləyə xitam verə bilər.` : "1.4. Sınaq müddəti müəyyən edilmir.",
          ],
        },
        {
          heading: "2. İş vaxtı və istirahət vaxtı",
          paragraphs: [
            `2.1. İşçinin həftəlik iş vaxtı ${employee.weekHours > 0 ? employee.weekHours : 40} saatdır; iş həftəsi 5 gündür, şənbə və bazar istirahət günləridir.`,
            `2.2. İşçiyə hər il ${o.leaveDays > 0 ? o.leaveDays : 21} təqvim günü əmək məzuniyyəti, qanunda nəzərdə tutulan hallarda əlavə məzuniyyət verilir. Bayram günləri məzuniyyətə daxil edilmir.`,
            "2.3. İş vaxtından artıq iş, gecə işi, istirahət və bayram günlərində iş qanunvericiliyə uyğun ödənilir.",
          ],
        },
        {
          heading: "3. Əmək haqqı",
          paragraphs: [
            `3.1. İşçiyə aylıq ${money(employee.gross)} (vergilər tutulmamış, gross) əmək haqqı ödənilir.`,
            `3.2. Əmək haqqı ayda ən azı bir dəfə, hər ayın ${o.payDay > 0 ? o.payDay : 28}-ci günündən gec olmayaraq ödənilir; ödəniş günü istirahət və ya bayram gününə düşərsə, əvvəlki iş günü ödənilir.`,
            "3.3. Əmək haqqından qanunla nəzərdə tutulmuş vergi və sığorta ödənişləri tutulur. Digər tutulmalar yalnız qanunun müəyyən etdiyi hallarda və həddə aparılır.",
          ],
        },
        {
          heading: "4. Tərəflərin hüquq və vəzifələri",
          paragraphs: [
            "4.1. İşçi əmək funksiyasını vicdanla yerinə yetirməyə, daxili əmək intizamı qaydalarına, əməyin mühafizəsi tələblərinə əməl etməyə, İşəgötürənin əmlakına və kommersiya sirrinə hörmətlə yanaşmağa borcludur.",
            "4.2. İşəgötürən işçiyə müqavilədə nəzərdə tutulmuş işi verməyə, təhlükəsiz əmək şəraiti yaratmağa, əmək haqqını vaxtında ödəməyə, işçini məcburi dövlət sosial sığortasına cəlb etməyə borcludur.",
          ],
        },
        {
          heading: "5. Yekun müddəalar",
          paragraphs: [
            "5.1. Müqavilənin şərtləri yalnız tərəflərin yazılı razılığı ilə dəyişdirilir; dəyişiklik əlavə sazişlə rəsmiləşdirilir.",
            "5.2. Müqaviləyə xitam Əmək Məcəlləsində nəzərdə tutulmuş əsaslarla və qaydada aparılır. Bu müqavilədə nəzərdə tutulmayan məsələlərdə Əmək Məcəlləsi tətbiq edilir.",
            "5.3. Müqavilə iki nüsxədə bağlanıb; hər tərəfdə bir nüsxə saxlanılır.",
          ],
        },
      ],
      signatures: signatures(company, employee),
      note: NOTE,
    };
  }
  if (kind === "addendum") {
    const changes = [
      o.newPosition ? `işçi ${fill(o.newPosition)} vəzifəsinə keçirilir` : "",
      o.newGross ? `aylıq əmək haqqı ${fill(o.newGross)} AZN (gross) müəyyən edilir` : "",
      o.newHours ? `həftəlik iş vaxtı ${o.newHours} saat müəyyən edilir` : "",
    ].filter(Boolean);
    return {
      title: `Əmək müqaviləsinə əlavə saziş № ${number}`,
      number,
      sections: [
        { heading: "Tərəflər", paragraphs: [`${dmy(date)} tarixində ${parties(company, employee)} əvvəl bağlanmış əmək müqaviləsinə aşağıdakı dəyişikliyi etdilər.`] },
        {
          heading: "Razılaşdırılmış dəyişiklik",
          paragraphs: [
            `1. ${dmy(o.changeFrom)} tarixindən etibarən: ${changes.length ? changes.join("; ") : BLANK}.`,
            o.changeReason ? `2. Əsas: ${o.changeReason}.` : "2. Əsas: tərəflərin razılığı.",
            "3. Müqavilənin bu sazişlə dəyişdirilməyən digər şərtləri qüvvədə qalır.",
            "4. Saziş iki nüsxədə bağlanıb; hər tərəfdə bir nüsxə saxlanılır.",
          ],
        },
      ],
      signatures: signatures(company, employee),
      note: `${NOTE} Əmək şəraitinin dəyişdirilməsi işçinin yazılı razılığı ilə aparılır.`,
    };
  }
  if (kind === "certificate") {
    return {
      title: "Arayış",
      number,
      sections: [
        {
          heading: "",
          paragraphs: [
            `Verilir: ${fill(employee.name)}${employee.fin ? ` (FİN ${employee.fin})` : ""} haqqında ki, o, ${fill(company.name)} (VÖEN ${fill(company.voen)}) təşkilatında ${dmy(employee.startDate)} tarixindən hazırda ${fill(unit(employee))}${unit(employee) ? " bölməsində " : " "}${fill(employee.position)} vəzifəsində çalışır.`,
            o.withSalary ? `Aylıq əmək haqqı ${money(employee.gross)} (vergilər tutulmamış) təşkil edir.` : "",
            `Arayış ${fill(o.purpose)} təqdim etmək üçün verilmişdir.`,
            `Arayışın verilmə tarixi: ${dmy(date)}. № ${number}.`,
          ].filter(Boolean),
        },
      ],
      signatures: [{ role: "Direktor", name: fill(company.director) }, { role: "Mühasib / Kadrlar şöbəsi", name: BLANK }],
      note: "Möhür və imza ilə təsdiq edildikdə qüvvəyə minir.",
    };
  }
  if (kind === "liability") {
    return {
      title: `Tam fərdi maddi məsuliyyət haqqında müqavilə № ${number}`,
      number,
      sections: [
        { heading: "Tərəflər", paragraphs: [`${dmy(date)} tarixində ${parties(company, employee)} aşağıdakı müqaviləni bağladılar.`] },
        {
          heading: "Müqavilənin şərtləri",
          paragraphs: [
            `1. İşçi ${fill(employee.position)} vəzifəsində işləməklə ona etibar olunmuş maddi dəyərlilərin (${fill(o.valuables)}) saxlanılması, qəbulu, istifadəsi və ya ötürülməsi ilə bağlı tam fərdi maddi məsuliyyət daşıyır.`,
            "2. İşçi dəyərlilərin qorunması üçün lazım olan tədbirləri görməyə, itki və zərərin qarşısını almağa, uçotun düzgün aparılmasına və inventarizasiyada iştirak etməyə borcludur.",
            "3. İşəgötürən işçiyə dəyərlilərin saxlanılması üçün normal şərait yaratmağa, inventarizasiyanı vaxtında aparmağa borcludur.",
            "4. Dəyərlilərin çatışmazlığı və ya zədələnməsi nəticəsində vurulan real zərər Əmək Məcəlləsində müəyyən edilmiş qaydada və həddə işçidən tutulur; işçinin təqsiri olmadıqda (fors-major, işəgötürənin şərait yaratmaması) məsuliyyət yaranmır.",
            "5. Müqavilə işçi həmin dəyərlilərə cavabdeh olduğu müddətdə qüvvədədir və iki nüsxədə bağlanıb.",
          ],
        },
      ],
      signatures: signatures(company, employee),
      note: `${NOTE} Tam maddi məsuliyyət yalnız qanunda nəzərdə tutulmuş hallarda və vəzifələr üzrə müəyyən edilə bilər.`,
    };
  }
  return {
    title: `Məxfilik öhdəliyi № ${number}`,
    number,
    sections: [
      { heading: "", paragraphs: [`${dmy(date)} tarixində ${fill(employee.name)}${idLine(employee) ? ` (${idLine(employee)})` : ""}, ${fill(company.name)} təşkilatında ${fill(employee.position)} vəzifəsində işləməklə aşağıdakı öhdəliyi qəbul edir.`] },
      {
        heading: "Öhdəliklər",
        paragraphs: [
          "1. İş prosesində mənə məlum olan kommersiya sirrini, müştəri və tərəfdaş məlumatlarını, maliyyə və texniki məlumatları, şəxsi məlumatları üçüncü şəxslərə verməyəcəyəm və öz məqsədlərim üçün istifadə etməyəcəyəm.",
          "2. Sənədləri, elektron faylları və giriş məlumatlarını (parol, kod) qoruyacağam, icazəsiz surət çıxarmayacağam və xaricə aparmayacağam.",
          "3. Əmək münasibətləri dayandıqdan sonra da qanunla müəyyən edilmiş müddətdə bu öhdəlik qüvvədə qalır; iş yerində olan sənəd və daşıyıcıları geri qaytaracağam.",
          "4. Öhdəliyin pozulması qanunvericiliyə uyğun məsuliyyətə səbəb olur.",
        ],
      },
    ],
    signatures: [{ role: "İşçi", name: fill(employee.name) }, { role: "İşəgötürən", name: `${fill(company.name)}\nDirektor ${fill(company.director)}` }],
    note: NOTE,
  };
}

export function hrDocumentHtml(doc: HrDocument): string {
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html><html lang="az"><head><meta charset="utf-8"><title>${esc(doc.title)}</title>
<style>body{font-family:"Times New Roman",serif;font-size:13pt;line-height:1.5;max-width:760px;margin:40px auto;padding:0 24px}
h1{font-size:15pt;text-align:center;text-transform:uppercase}h2{font-size:13pt;margin:18px 0 4px}p{margin:6px 0;text-align:justify}
.sign{display:flex;justify-content:space-between;gap:24px;margin-top:48px}.sign div{flex:1}.sign small{display:block;color:#555}.line{border-top:1px solid #000;margin-top:34px;padding-top:2px}.note{margin-top:34px;font-size:9pt;color:#666}</style></head>
<body><h1>${esc(doc.title)}</h1>${doc.sections.map((s) => `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ""}${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}`).join("")}
<div class="sign">${doc.signatures.map((s) => `<div><b>${esc(s.role)}</b><br>${esc(s.name).replace(/\n/g, "<br>")}<div class="line"><small>imza</small></div></div>`).join("")}</div>
<p class="note">${esc(doc.note)}</p></body></html>`;
}
