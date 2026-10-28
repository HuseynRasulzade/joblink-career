// Orders (əmr) an employer issues about an employee: hiring, leave, pay change, transfer and
// termination. The text is a draft: the legal basis must be checked by a lawyer.
export type OrderKind = "hire" | "vacation" | "salary" | "transfer" | "termination";

export const ORDER_KINDS: { id: OrderKind; label: string }[] = [
  { id: "hire", label: "İşə qəbul haqqında əmr" },
  { id: "vacation", label: "Məzuniyyət verilməsi haqqında əmr" },
  { id: "salary", label: "Əmək haqqının dəyişdirilməsi haqqında əmr" },
  { id: "transfer", label: "Başqa vəzifəyə keçirmə haqqında əmr" },
  { id: "termination", label: "Əmək müqaviləsinə xitam haqqında əmr" },
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
  }
  const paragraphs = [
    `${fill(company.name)}${company.voen ? ` (VÖEN: ${company.voen})` : ""}`,
    header,
    `${input.number ? `№ ${input.number}` : "№ ____"} — ${meta.label}`,
    ...body,
    "Əsas: işçinin ərizəsi və ya əmək müqaviləsi.",
    "İşçi bu əmrlə imza qarşılığında tanış edilsin.",
  ];
  const signature = `${fill(company.directorTitle || "Direktor")}: ${fill(company.director)}   ____________   İşçi ilə tanış oldum: ${fill(employee.name)}   ____________`;
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
  `${date.slice(0, 4)}-${{ hire: "İQ", vacation: "M", salary: "ƏH", transfer: "K", termination: "X" }[kindId]}-${employeeId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
