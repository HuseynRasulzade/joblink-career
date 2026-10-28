// Orders (əmr) an employer issues about an employee: hiring, leave, pay change, transfer and
// termination. The text is a draft: the legal basis must be checked by a lawyer.
export type OrderKind =
  | "hire"
  | "vacation"
  | "maternity"
  | "childcare"
  | "paternity"
  | "study"
  | "unpaid"
  | "recall"
  | "trip"
  | "training"
  | "salary"
  | "bonus"
  | "transfer"
  | "substitute"
  | "schedule"
  | "probation"
  | "extend"
  | "suspension"
  | "name"
  | "discipline"
  | "reduction"
  | "termination";

// The fields of the order form that apply to each kind.
export type OrderField = "from" | "to" | "vacationKind" | "salary" | "newPosition" | "newDepartment" | "basis" | "place" | "penalty" | "newName" | "result" | "schedule";

export const ORDER_KINDS: { id: OrderKind; label: string; group: string; fields: OrderField[]; leaveCode?: string }[] = [
  { id: "hire", label: "İşə qəbul haqqında əmr", group: "İşə qəbul və xitam", fields: [] },
  { id: "probation", label: "Sınaq müddətinin yekunları haqqında əmr", group: "İşə qəbul və xitam", fields: ["from", "result", "basis"] },
  { id: "extend", label: "Əmək müqaviləsinin müddətinin uzadılması haqqında əmr", group: "İşə qəbul və xitam", fields: ["from", "to", "basis"] },
  { id: "reduction", label: "Ştat ixtisarı ilə əlaqədar xitam haqqında əmr", group: "İşə qəbul və xitam", fields: ["from", "basis"] },
  { id: "termination", label: "Əmək müqaviləsinə xitam haqqında əmr", group: "İşə qəbul və xitam", fields: ["from", "basis"] },
  { id: "vacation", label: "İllik əmək məzuniyyəti haqqında əmr", group: "Məzuniyyət", fields: ["from", "to", "vacationKind"], leaveCode: "annual" },
  { id: "maternity", label: "Hamiləlik və doğuş (analıq) məzuniyyəti haqqında əmr", group: "Məzuniyyət", fields: ["from", "to", "basis"], leaveCode: "maternity" },
  { id: "childcare", label: "Uşağa qulluq məzuniyyəti haqqında əmr", group: "Məzuniyyət", fields: ["from", "to", "basis"], leaveCode: "childcare" },
  { id: "paternity", label: "Atalıq məzuniyyəti haqqında əmr", group: "Məzuniyyət", fields: ["from", "to", "basis"], leaveCode: "paternity" },
  { id: "study", label: "Təhsil məzuniyyəti haqqında əmr", group: "Məzuniyyət", fields: ["from", "to", "basis"], leaveCode: "study" },
  { id: "unpaid", label: "Ödənişsiz (öz hesabına) məzuniyyət haqqında əmr", group: "Məzuniyyət", fields: ["from", "to", "basis"], leaveCode: "unpaid" },
  { id: "recall", label: "Məzuniyyətdən geri çağırma haqqında əmr", group: "Məzuniyyət", fields: ["from", "basis"] },
  { id: "trip", label: "Ezamiyyət haqqında əmr", group: "İş yeri və iş rejimi", fields: ["from", "to", "place", "basis"], leaveCode: "trip" },
  { id: "training", label: "Təlimə göndərmə haqqında əmr", group: "İş yeri və iş rejimi", fields: ["from", "to", "place", "basis"] },
  { id: "transfer", label: "Başqa vəzifəyə keçirmə haqqında əmr", group: "İş yeri və iş rejimi", fields: ["from", "newPosition", "newDepartment", "salary", "basis"] },
  { id: "substitute", label: "Müvəqqəti əvəzetmə (əlavə vəzifənin icrası) haqqında əmr", group: "İş yeri və iş rejimi", fields: ["from", "to", "newPosition", "salary", "basis"] },
  { id: "schedule", label: "İş rejiminin dəyişdirilməsi haqqında əmr", group: "İş yeri və iş rejimi", fields: ["from", "schedule", "basis"] },
  { id: "suspension", label: "İşdən kənarlaşdırma haqqında əmr", group: "İş yeri və iş rejimi", fields: ["from", "to", "basis"] },
  { id: "name", label: "Ad və ya soyadın dəyişdirilməsi haqqında əmr", group: "İş yeri və iş rejimi", fields: ["from", "newName", "basis"] },
  { id: "salary", label: "Əmək haqqının dəyişdirilməsi haqqında əmr", group: "Əmək haqqı və mükafat", fields: ["from", "salary", "basis"] },
  { id: "bonus", label: "Mükafatlandırma haqqında əmr", group: "Əmək haqqı və mükafat", fields: ["salary", "basis"] },
  { id: "discipline", label: "İntizam tənbehi haqqında əmr", group: "Əmək haqqı və mükafat", fields: ["penalty", "basis"] },
];

export type OrderInput = {
  kind: OrderKind;
  number: string;
  date: string; // YYYY-MM-DD, the day the order is issued
  city: string;
  company: { name: string; voen?: string; director?: string; directorTitle?: string };
  employee: { name: string; position: string; department: string; section?: string; startDate?: string };
  // Kind-specific values the person fills in.
  salary?: number; // hire: pay; salary: new pay
  salaryBefore?: number;
  salaryType?: "gross" | "net";
  probationEnd?: string;
  from?: string; // vacation start, transfer or pay change date, termination date
  to?: string; // vacation end
  days?: number;
  vacationKind?: string;
  newPosition?: string;
  newDepartment?: string;
  basis?: string; // legal basis or reason
  place?: string; // trip or training: where
  penalty?: string; // disciplinary penalty
  newName?: string; // new name or surname
  result?: string; // probation result
  schedule?: string; // new work schedule
  // Who signs: the section head and the director. A signer with a date has approved it electronically.
  signers?: { role: string; title: string; name: string; approvedAt?: string }[];
};

export type Order = { number: string; title: string; paragraphs: string[]; signature: string; text: string };

const missing = "[daxil edilməlidir]";
const fill = (value: string | undefined) => (value && value.trim() ? value.trim() : missing);
const dmy = (iso: string | undefined) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : missing);
const azn = (value: number | undefined) =>
  typeof value === "number" && value > 0 ? `${value.toLocaleString("az-AZ", { maximumFractionDigits: 2 })} AZN` : missing;
const kind = (type: "gross" | "net" | undefined) => (type === "net" ? "əlinə veriləcək (net)" : "gross (vergilərdən əvvəl)");

// Calendar days from the first to the last day of leave, both included.
export function leaveDays(from: string, to: string) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) && b >= a ? Math.round((b - a) / 86_400_000) + 1 : 0;
}

export function buildOrder(input: OrderInput): Order {
  const { employee, company } = input;
  const who = `${fill(employee.name)} (${fill(employee.position)}${employee.department ? `, ${employee.department}${employee.section ? ` / ${employee.section}` : ""}` : ""})`;
  const header = `${input.city || "Bakı"} şəhəri, ${dmy(input.date)}`;
  const meta = ORDER_KINDS.find((item) => item.id === input.kind)!;
  let body: string[] = [];
  switch (input.kind) {
    case "hire":
      body = [
        `Əmək müqaviləsi əsasında ${fill(employee.name)} ${dmy(input.from || employee.startDate)} tarixindən ${fill(employee.position)} vəzifəsinə${employee.department ? `, ${employee.department}${employee.section ? ` / ${employee.section}` : ""} bölməsinə` : ""} qəbul edilsin.`,
        `Aylıq əmək haqqı ${azn(input.salary)} (${kind(input.salaryType)}) müəyyən edilsin.`,
        input.probationEnd ? `Sınaq müddəti ${dmy(input.probationEnd)} tarixinədək müəyyən edilsin.` : "Sınaq müddəti müəyyən edilməsin.",
      ];
      break;
    case "vacation": {
      const days = input.days || leaveDays(input.from || "", input.to || "");
      body = [
        `${who} ${dmy(input.from)} tarixindən ${dmy(input.to)} tarixinədək, ${days || missing} təqvim günü müddətinə ${input.vacationKind || "illik əmək məzuniyyəti"} verilsin.`,
        "Mühasibatlığa məzuniyyət müddəti üçün orta aylıq əmək haqqına əsasən məzuniyyət haqqının hesablanması və ödənilməsi tapşırılsın.",
      ];
      break;
    }
    case "salary":
      body = [
        `${who} üçün ${dmy(input.from)} tarixindən aylıq əmək haqqı ${azn(input.salaryBefore)} məbləğindən ${azn(input.salary)} (${kind(input.salaryType)}) məbləğinədək dəyişdirilsin.`,
        input.basis ? `Əsas: ${input.basis}.` : "",
      ].filter(Boolean);
      break;
    case "transfer":
      body = [
        `${who} ${dmy(input.from)} tarixindən ${fill(input.newPosition)} vəzifəsinə${input.newDepartment ? `, ${input.newDepartment} bölməsinə` : ""} keçirilsin.`,
        input.salary ? `Yeni aylıq əmək haqqı ${azn(input.salary)} (${kind(input.salaryType)}) müəyyən edilsin.` : "",
        input.basis ? `Əsas: ${input.basis}.` : "İşçinin yazılı razılığı əsasında.",
      ].filter(Boolean);
      break;
    case "termination":
      body = [
        `${who} ilə bağlanmış əmək müqaviləsinə ${dmy(input.from)} tarixindən xitam verilsin.`,
        `Xitamın əsası: ${fill(input.basis)}.`,
        "Mühasibatlığa işçi ilə yekun hesablaşmanın aparılması, istifadə edilməmiş məzuniyyət üçün kompensasiyanın ödənilməsi, kadrlar şöbəsinə isə əmək kitabçasının və digər sənədlərin təhvil verilməsi tapşırılsın.",
      ];
      break;
    case "reduction":
      body = [
        `Ştat ixtisarı ilə əlaqədar ${who} ilə bağlanmış əmək müqaviləsinə ${dmy(input.from)} tarixindən xitam verilsin, ${employee.position ? `“${employee.position}”` : missing} ştat vahidi ştat cədvəlindən çıxarılsın.`,
        `Əsas: ${fill(input.basis)}.`,
        "İşçi ixtisar barədə qanunvericilikdə nəzərdə tutulmuş qaydada və müddətdə yazılı xəbərdar edilsin, ona yekun hesablaşma və qanunvericilikdə nəzərdə tutulan ödənişlər həyata keçirilsin.",
      ];
      break;
    case "probation":
      body = [
        `${who} üçün müəyyən edilmiş sınaq müddətinin nəticəsi: ${fill(input.result)}.`,
        `Qərar ${dmy(input.from)} tarixindən qüvvəyə minir.`,
        input.basis ? `Əsas: ${input.basis}.` : "",
      ].filter(Boolean);
      break;
    case "extend":
      body = [
        `${who} ilə bağlanmış əmək müqaviləsinin müddəti ${dmy(input.from)} tarixindən ${dmy(input.to)} tarixinədək uzadılsın.`,
        input.basis ? `Əsas: ${input.basis}.` : "Tərəflərin razılığı əsasında.",
      ];
      break;
    case "maternity":
    case "childcare":
    case "paternity":
    case "study":
    case "unpaid": {
      const days = leaveDays(input.from || "", input.to || "");
      const name = { maternity: "hamiləlik və doğuş məzuniyyəti", childcare: "uşağa qulluq məzuniyyəti", paternity: "atalıq məzuniyyəti", study: "təhsil məzuniyyəti", unpaid: "ödənişsiz (öz hesabına) məzuniyyət" }[input.kind];
      body = [
        `${who} ${dmy(input.from)} tarixindən ${dmy(input.to)} tarixinədək, ${days || missing} təqvim günü müddətinə ${name} verilsin.`,
        input.kind === "unpaid"
          ? "Bu müddət üçün əmək haqqı saxlanılmır; məzuniyyət işçinin ərizəsi və tərəflərin razılığı əsasında verilir."
          : input.kind === "maternity" || input.kind === "paternity"
            ? "Müavinətin təyin edilməsi və ödənilməsi qanunvericilikdə nəzərdə tutulmuş qaydada həyata keçirilsin."
            : "Məzuniyyət müddətinin ödənilməsi qanunvericilikdə nəzərdə tutulmuş qaydada həyata keçirilsin.",
        input.basis ? `Əsas: ${input.basis}.` : "",
      ].filter(Boolean);
      break;
    }
    case "recall":
      body = [
        `${who} ${dmy(input.from)} tarixindən illik əmək məzuniyyətindən geri çağırılsın və işə başlasın.`,
        `Çağırışın səbəbi: ${fill(input.basis)}.`,
        "İstifadə edilməmiş məzuniyyət günləri işçinin razılığı ilə həmin ilin sonunadək və ya sonrakı dövrə keçirilsin.",
      ];
      break;
    case "trip":
      body = [
        `${who} ${dmy(input.from)} tarixindən ${dmy(input.to)} tarixinədək, ${leaveDays(input.from || "", input.to || "") || missing} gün müddətinə ${fill(input.place)} ezam edilsin.`,
        `Ezamiyyətin məqsədi: ${fill(input.basis)}.`,
        "Ezamiyyət xərcləri (yol, yaşayış, gündəlik) qanunvericilikdə və şirkətin daxili qaydalarında nəzərdə tutulmuş qaydada ödənilsin; ezamiyyətdən qayıdandan sonra hesabat təqdim edilsin.",
      ];
      break;
    case "training":
      body = [
        `${who} ${dmy(input.from)} tarixindən ${dmy(input.to)} tarixinədək, ${fill(input.place)} üzrə təlimə göndərilsin.`,
        `Təlimin məqsədi: ${fill(input.basis)}.`,
        "Təlim müddətində işçinin əmək haqqı və iş yeri saxlanılsın.",
      ];
      break;
    case "substitute":
      body = [
        `${who} ${dmy(input.from)} tarixindən ${dmy(input.to)} tarixinədək əsas işindən ayrılmadan ${fill(input.newPosition)} vəzifəsinin müvəqqəti icrasına təyin edilsin.`,
        input.salary ? `Əlavə iş üçün ${azn(input.salary)} məbləğində əlavə haqq ödənilsin.` : "Əlavə haqqın məbləği ayrıca müəyyən ediləcək.",
        input.basis ? `Əsas: ${input.basis}.` : "İşçinin razılığı əsasında.",
      ];
      break;
    case "schedule":
      body = [
        `${who} üçün ${dmy(input.from)} tarixindən iş rejimi dəyişdirilsin: ${fill(input.schedule)}.`,
        input.basis ? `Əsas: ${input.basis}.` : "İşçinin razılığı əsasında.",
      ];
      break;
    case "suspension":
      body = [
        `${who} ${dmy(input.from)} tarixindən ${input.to ? `${dmy(input.to)} tarixinədək` : "sonrakı əmrə qədər"} işdən kənarlaşdırılsın.`,
        `Əsas: ${fill(input.basis)}.`,
        "İşdən kənarlaşdırma müddətində əmək haqqının saxlanılması və ya saxlanılmaması qanunvericiliyə uyğun müəyyən edilsin.",
      ];
      break;
    case "name":
      body = [
        `${who} ${dmy(input.from)} tarixindən ad və ya soyadını “${fill(input.newName)}” kimi dəyişdiyinə görə kadr sənədlərində müvafiq dəyişiklik edilsin.`,
        input.basis ? `Əsas: ${input.basis}.` : "Əsas: şəxsiyyət vəsiqəsinin yeni surəti və ya mülki vəziyyət aktının qeydiyyatı haqqında şəhadətnamə.",
      ];
      break;
    case "bonus":
      body = [
        `${who} ${fill(input.basis)} nəticələrinə görə ${azn(input.salary)} məbləğində mükafatlandırılsın.`,
        "Mükafat məbləği əmək haqqı ilə birlikdə, qanunvericilikdə nəzərdə tutulmuş vergi və sığorta ödənişləri tutulmaqla ödənilsin.",
      ];
      break;
    case "discipline":
      body = [
        `${who} əmək intizamını pozduğuna görə ona “${fill(input.penalty)}” intizam tənbehi verilsin.`,
        `Pozuntunun mahiyyəti: ${fill(input.basis)}.`,
        "İntizam tənbehi verilməzdən əvvəl işçidən yazılı izahat tələb edilməli və pozuntunun hallarına baxılmalıdır; izahatın və ya imtina aktının nömrəsini əmrdə göstərin.",
      ];
      break;
  }
  const paragraphs = [
    `${fill(company.name)}${company.voen ? ` (VÖEN: ${company.voen})` : ""}`,
    header,
    `${input.number ? `№ ${input.number}` : "№ ____"} — ${meta.label}`,
    ...body,
    "Əsas: işçinin ərizəsi və ya əmək müqaviləsi.",
    "İşçi bu əmrlə imza qarşılığında tanış edilsin.",
  ];
  const signers = input.signers && input.signers.length ? input.signers : [{ role: "director", title: company.directorTitle || "Direktor", name: company.director || "" }];
  const signature = [
    ...signers.map((signer) => `${signer.title}: ${fill(signer.name)} — ${signer.approvedAt ? `elektron təsdiq ${dmy(signer.approvedAt.slice(0, 10))}` : "____________"}`),
    `İşçi ilə tanış oldum: ${fill(employee.name)} — ____________`,
  ].join("\n");
  return {
    number: input.number,
    title: meta.label,
    paragraphs,
    signature,
    text: [...paragraphs, "", signature, "", "Bu mətn layihədir; hüquqi əsaslar Azərbaycan Respublikasının Əmək Məcəlləsinə görə yoxlanmalıdır."].join("\n"),
  };
}

// Order number: year, kind and a running part taken from the employee id.
export const orderNumber = (kindId: OrderKind, date: string, employeeId: string) =>
  `${date.slice(0, 4)}-${{ hire: "İQ", vacation: "M", maternity: "AN", childcare: "UQ", paternity: "AT", study: "TM", unpaid: "ÖM", recall: "GÇ", trip: "EZ", training: "TL", salary: "ƏH", bonus: "MK", transfer: "K", substitute: "ƏV", schedule: "İR", probation: "SM", extend: "UZ", suspension: "KN", name: "AD", discipline: "İT", reduction: "Üİ", termination: "X" }[kindId]}-${employeeId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

// ---- Job offer letter to a current employee (a new post, a raise or a transfer) ----
export type EmployeeOfferInput = {
  date: string;
  city: string;
  company: { name: string; voen?: string; director?: string };
  employee: { name: string; position: string; department?: string };
  position: string;
  department?: string;
  salary?: number;
  salaryType?: "gross" | "net";
  startDate?: string;
  contractType?: string;
  probationMonths?: number;
  workSchedule?: string;
  location?: string;
  benefits?: string;
  validUntil?: string;
  message?: string;
  signerName?: string;
  signerTitle?: string;
};
export type EmployeeOffer = { subject: string; paragraphs: string[]; signature: string; text: string };

export function buildEmployeeOffer(input: EmployeeOfferInput): EmployeeOffer {
  const company = fill(input.company.name);
  const lines = [
    `Hörmətli ${fill(input.employee.name)},`,
    input.message?.trim() ||
      `${company} olaraq sizə ${input.position ? `“${input.position}”` : missing} vəzifəsi üzrə yeni iş təklifi göndərməkdən məmnunuq. Hazırda ${fill(input.employee.position)} vəzifəsində çalışırsınız.`,
    "Təklifin şərtləri:",
    `• Vəzifə: ${fill(input.position)}${input.department ? ` (${input.department})` : ""}`,
    `• Aylıq əmək haqqı: ${azn(input.salary)} (${kind(input.salaryType)})`,
    `• Başlama tarixi: ${dmy(input.startDate)}`,
    `• Müqavilə növü: ${input.contractType || "Müddətsiz"}`,
    input.probationMonths ? `• Sınaq müddəti: ${input.probationMonths} ay` : "• Sınaq müddəti: yoxdur",
    input.workSchedule ? `• İş qrafiki: ${input.workSchedule}` : "",
    input.location ? `• İş yeri: ${input.location}` : "",
    input.benefits ? `• Əlavə imkanlar: ${input.benefits}` : "",
    input.validUntil ? `Təklif ${dmy(input.validUntil)} tarixinədək qüvvədədir. Qərarınızı həmin tarixədək bildirməyinizi xahiş edirik.` : "Qərarınızı yaxın günlərdə bildirməyinizi xahiş edirik.",
    "Təklifi qəbul etdiyiniz halda yeni şərtlər əmək müqaviləsinə əlavə və müvafiq əmrlə rəsmiləşdiriləcək.",
  ].filter(Boolean);
  const signature = `${fill(input.signerName || input.company.director)}${input.signerTitle ? `, ${input.signerTitle}` : ""}, ${company}`;
  return {
    subject: `${company}: iş təklifi — ${fill(input.position)}`,
    paragraphs: [`${input.city || "Bakı"}, ${dmy(input.date)}`, ...lines],
    signature,
    text: [`${input.city || "Bakı"}, ${dmy(input.date)}`, "", ...lines, "", signature].join("\n"),
  };
}
