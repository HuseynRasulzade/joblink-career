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
  | "termination"
  | "addleave"
  | "creative"
  | "postpone"
  | "extendleave"
  | "compensation"
  | "donor"
  | "medical"
  | "summons"
  | "military"
  | "downtime"
  | "remote"
  | "restday"
  | "overtime";

// The fields of the order form that apply to each kind.
export type OrderField = "from" | "to" | "vacationKind" | "salary" | "newPosition" | "newDepartment" | "basis" | "place" | "penalty" | "newName" | "result" | "schedule" | "quantity";

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
  { id: "unpaid", label: "Ödənişsiz (öz hesabına) məzuniyyət haqqında əmr", group: "Məzuniyyət", fields: ["from", "to", "vacationKind", "basis"], leaveCode: "unpaid" },
  { id: "recall", label: "Məzuniyyətdən geri çağırma haqqında əmr", group: "Məzuniyyət", fields: ["from", "basis"] },
  { id: "addleave", label: "Əlavə əmək məzuniyyəti haqqında əmr (staj, zərərli şərait, uşaqlı işçi)", group: "Məzuniyyət", fields: ["from", "to", "vacationKind", "basis"], leaveCode: "addleave" },
  { id: "creative", label: "Yaradıcılıq məzuniyyəti haqqında əmr", group: "Məzuniyyət", fields: ["from", "to", "basis"], leaveCode: "creative" },
  { id: "postpone", label: "Əmək məzuniyyətinin başqa vaxta keçirilməsi haqqında əmr", group: "Məzuniyyət", fields: ["from", "to", "basis"] },
  { id: "extendleave", label: "Əmək məzuniyyətinin uzadılması haqqında əmr (xəstəlik, bayram günləri)", group: "Məzuniyyət", fields: ["from", "to", "basis"], leaveCode: "annual" },
  { id: "compensation", label: "İstifadə edilməmiş məzuniyyət üçün kompensasiya haqqında əmr", group: "Məzuniyyət", fields: ["quantity", "basis"] },
  { id: "donor", label: "Donor günü və əlavə istirahət günü haqqında əmr", group: "İcazələr və xüsusi hallar", fields: ["from", "to", "basis"], leaveCode: "donor" },
  { id: "medical", label: "Tibbi müayinə üçün icazə haqqında əmr", group: "İcazələr və xüsusi hallar", fields: ["from", "to", "basis"], leaveCode: "medical" },
  { id: "summons", label: "Məhkəmə və ya dövlət orqanına çağırışla əlaqədar əmr", group: "İcazələr və xüsusi hallar", fields: ["from", "to", "place", "basis"], leaveCode: "summons" },
  { id: "military", label: "Hərbi toplanış və ya hərbi çağırışla əlaqədar əmr", group: "İcazələr və xüsusi hallar", fields: ["from", "to", "basis"], leaveCode: "military" },
  { id: "downtime", label: "Boşdayanma haqqında əmr", group: "İcazələr və xüsusi hallar", fields: ["from", "to", "basis"], leaveCode: "downtime" },
  { id: "remote", label: "Uzaqdan (distant) işə keçirmə haqqında əmr", group: "İş yeri və iş rejimi", fields: ["from", "to", "basis"], leaveCode: "remote" },
  { id: "restday", label: "İstirahət və ya bayram günü işə cəlb haqqında əmr", group: "İş yeri və iş rejimi", fields: ["from", "quantity", "basis"] },
  { id: "overtime", label: "İş vaxtından artıq işə cəlb haqqında əmr", group: "İş yeri və iş rejimi", fields: ["from", "to", "quantity", "basis"] },
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
  quantity?: number; // compensation: days; rest-day work and overtime: hours
  // Who signs: the section head and the director. A signer with a date has approved it electronically.
  signers?: { role: string; title: string; name: string; approvedAt?: string }[];
};

export type Order = { number: string; title: string; paragraphs: string[]; signature: string; text: string };

// The cases of the Labor Code (art. 130) in which unpaid leave is given at the employee's request, with its longest length.
export const UNPAID_REASONS: { id: string; label: string; maxDays: number | null }[] = [
  { id: "family", label: "Ailə, məişət və başqa sosial məsələlərin həlli (130-i)", maxDays: 7 },
  { id: "child-under-16", label: "16 yaşınadək uşağı olan qadın, tək valideyn, qəyyum, himayədar (130-c)", maxDays: 14 },
  { id: "wife-birth", label: "Arvadı doğuşla əlaqədar məzuniyyətdə olan kişi (130-b)", maxDays: 14 },
  { id: "sick-child", label: "Xroniki xəstəliyə tutulmuş uşağa qulluq — uşaq 4 yaşınadək (130-a)", maxDays: null },
  { id: "disabled-child", label: "Əlilliyi olan uşağı olan və ya HİV ilə yaşayan uşaq böyüdən işçi (130-x, 130-ə)", maxDays: 14 },
  { id: "family-patient", label: "Ailənin xəstə üzvünə qulluq, tibb müəssisəsinin rəyi ilə (130-h)", maxDays: 14 },
  { id: "disabled-under-18", label: "Əlilliyi olan 18 yaşınadək işçi (130-ç)", maxDays: 30 },
  { id: "veteran", label: "Müharibədə döyüşmüş və ya ərazi bütövlüyünün müdafiəsində xəsarət almış işçi (130-d, 130-e)", maxDays: 14 },
  { id: "doctorate", label: "Doktoranturada (adyunkturada) təhsil alan işçi (130-f)", maxDays: 30 },
  { id: "entrance-exam", label: "Ali (14 gün) və ya orta ixtisas (7 gün) təhsil müəssisəsinə qəbul imtahanı (130-g)", maxDays: 14 },
  { id: "invention", label: "İxtira və ya səmərələşdirici təklifin tətbiqi (130-ğ)", maxDays: 14 },
  { id: "other", label: "Digər hal (tərəflərin razılığı ilə)", maxDays: null },
];
export const unpaidReason = (idOrLabel: string) => UNPAID_REASONS.find((r) => r.id === idOrLabel || r.label === idOrLabel);

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
          ? `Bu müddət üçün əmək haqqı saxlanılmır; məzuniyyət işçinin ərizəsi əsasında verilir${input.vacationKind && unpaidReason(input.vacationKind) ? ` (${unpaidReason(input.vacationKind)!.label})` : ""}.`
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
    case "addleave":
    case "creative": {
      const days = leaveDays(input.from || "", input.to || "");
      const what = input.kind === "creative" ? "yaradıcılıq məzuniyyəti" : input.vacationKind || "əlavə əmək məzuniyyəti";
      body = [
        `${who} ${dmy(input.from)} tarixindən ${dmy(input.to)} tarixinədək, ${days || missing} təqvim günü müddətinə ${what} verilsin.`,
        input.kind === "creative"
          ? "Yaradıcılıq məzuniyyəti müddətində işçiyə Əmək Məcəlləsinin 177-ci maddəsinə uyğun orta əmək haqqı ödənilsin (122-ci maddə)."
          : "Məzuniyyət müddəti üçün orta əmək haqqı Əmək Məcəlləsinin 139–140-cı maddələrinə uyğun hesablanıb ödənilsin; əsas məzuniyyətə əlavə edilir (136-cı maddə).",
        input.basis ? `Əsas: ${input.basis}.` : input.kind === "creative" ? "Əsas: elmi şuranın arayışı (122-ci maddə)." : "Əsas: Əmək Məcəlləsinin 115–117-ci maddələri.",
      ];
      break;
    }
    case "postpone":
      body = [
        `${who} üçün illik əmək məzuniyyəti ${dmy(input.from)} tarixindən ${dmy(input.to)} tarixinədək başqa vaxta keçirilsin.`,
        `Keçirilmənin səbəbi: ${fill(input.basis)}.`,
        "Məzuniyyətin başqa vaxta keçirilməsi tərəflərin qarşılıqlı razılığı ilə həyata keçirilir (Əmək Məcəlləsinin 134-cü maddəsi); məzuniyyət haqqı yeni vaxtda ödənilir.",
      ];
      break;
    case "extendleave":
      body = [
        `${who} üçün əmək məzuniyyəti ${dmy(input.from)} tarixindən ${dmy(input.to)} tarixinədək uzadılsın.`,
        `Uzadılmanın səbəbi: ${fill(input.basis)}.`,
        "Əmək qabiliyyətinin müvəqqəti itirildiyi dövr (xəstəlik vərəqəsi) və ya məzuniyyətə düşən bayram günləri məzuniyyət günü sayılmır, məzuniyyət onların sayı qədər uzadılır (114.6 və 134.3-cü maddələr).",
      ];
      break;
    case "compensation":
      body = [
        `${who} ilə əmək münasibətlərinə xitam verildiyi üçün ona istifadə edilməmiş ${input.quantity ? `${input.quantity} təqvim günü` : missing} əsas məzuniyyətə görə kompensasiya ödənilsin.`,
        "Kompensasiya orta aylıq əmək haqqının 30,4-ə bölünməsi ilə tapılan bir günlük məbləğ gün sayına vurulmaqla hesablanır (Əmək Məcəlləsinin 140.3 və 144-cü maddələri).",
        input.basis ? `Əsas: ${input.basis}.` : "Əsas: əmək müqaviləsinə xitam haqqında əmr.",
      ];
      break;
    case "donor":
      body = [
        `${who} ${dmy(input.from)}${input.to && input.to !== input.from ? ` – ${dmy(input.to)}` : ""} tarixində qan və ya qan komponentlərini pulsuz verdiyinə görə həmin gün tibbi müayinədən keçmə və qan vermə ilə əlaqədar işdən azad edilsin.`,
        "Donora orta əmək haqqı saxlanılmaqla əlavə istirahət günü verilir; bu gün işçinin arzusu ilə illik məzuniyyətinə əlavə edilə və ya il ərzində istənilən vaxt istifadə edilə bilər (104.3 və 179-cu maddələr).",
        `Əsas: ${fill(input.basis || "tibb müəssisəsinin arayışı")}.`,
      ];
      break;
    case "medical":
      body = [
        `${who} ${dmy(input.from)}${input.to && input.to !== input.from ? ` – ${dmy(input.to)}` : ""} tarixində tibbi müayinədən keçməsi ilə əlaqədar işdən azad edilsin.`,
        "Tibb müəssisəsində olduğu vaxt ərzində iş yeri və orta əmək haqqı saxlanılsın (Əmək Məcəlləsinin 179.2-k maddəsi).",
        `Əsas: ${fill(input.basis || "tibb müəssisəsinin arayışı")}.`,
      ];
      break;
    case "summons":
      body = [
        `${who} ${dmy(input.from)}${input.to && input.to !== input.from ? ` – ${dmy(input.to)}` : ""} tarixində ${input.place ? `${input.place} tərəfindən ` : ""}çağırışla əlaqədar işdən azad edilsin.`,
        "Bu müddətdə iş yeri və orta əmək haqqı saxlanılsın (Əmək Məcəlləsinin 179-cu maddəsi).",
        `Əsas: ${fill(input.basis || "çağırış vərəqəsi")}.`,
      ];
      break;
    case "military":
      body = [
        `${who} ${dmy(input.from)} tarixindən ${dmy(input.to)} tarixinədək hərbi toplanış və ya hərbi mükəlləfiyyətlə bağlı tədbirlərdə iştirak etdiyinə görə işdən azad edilsin.`,
        "Bu müddətdə iş yeri və orta əmək haqqı saxlanılsın (Əmək Məcəlləsinin 179.2-g maddəsi).",
        `Əsas: ${fill(input.basis || "hərbi komissarlığın çağırışı")}.`,
      ];
      break;
    case "downtime":
      body = [
        `${dmy(input.from)} tarixindən ${dmy(input.to)} tarixinədək ${who} üçün boşdayanma elan edilsin.`,
        `Boşdayanmanın səbəbi: ${fill(input.basis)}.`,
        "İşçinin təqsiri olmadan boşdayanma vaxtı onun üçün müəyyən edilmiş dərəcənin tarif (vəzifə) maaşının üçdə iki hissəsindən az olmayaraq ödənilsin; işçi boşdayanmanın başlanması barədə xəbərdarlıq etməlidir (169-cu maddə).",
      ];
      break;
    case "remote":
      body = [
        `${who} ${dmy(input.from)} tarixindən ${input.to ? `${dmy(input.to)} tarixinədək` : "sonrakı əmrə qədər"} uzaqdan (distant) işləməyə keçirilsin.`,
        "İş vaxtı, əmək haqqı və digər əmək şərtləri saxlanılır; iş vaxtının uçotu və əlaqə qaydası işçiyə bildirilsin.",
        input.basis ? `Əsas: ${input.basis}.` : "Əsas: işçinin ərizəsi və tərəflərin razılığı.",
      ];
      break;
    case "restday":
      body = [
        `${who} ${dmy(input.from)} tarixində istirahət və ya iş günü hesab edilməyən bayram günündə ${input.quantity ? `${input.quantity} saat` : missing} işə cəlb edilsin.`,
        `İşə cəlbin səbəbi: ${fill(input.basis)}.`,
        "İş yalnız Əmək Məcəlləsinin 107-ci maddəsində nəzərdə tutulan hallarda və işçinin razılığı ilə görülür; əmək haqqı 164-cü maddəyə uyğun ödənilir, işçinin arzusu ilə əmək haqqı əvəzinə başqa istirahət günü verilə bilər.",
      ];
      break;
    case "overtime":
      body = [
        `${who} ${dmy(input.from)}${input.to && input.to !== input.from ? ` – ${dmy(input.to)}` : ""} tarixində iş vaxtından artıq ${input.quantity ? `cəmi ${input.quantity} saat` : missing} işə cəlb edilsin.`,
        `İşə cəlbin səbəbi: ${fill(input.basis)}.`,
        "İş vaxtından artıq iş işçinin razılığı ilə görülür və ardıcıl iki iş günü ərzində 4 saatdan çox ola bilməz (99–100-cü maddələr); hər saat üçün saatlıq tarif maaşının iki mislindən az olmayaraq ödənilir, əlavə istirahət günü ilə əvəz edilmir (165-ci maddə).",
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
  `${date.slice(0, 4)}-${{ hire: "İQ", vacation: "M", maternity: "AN", childcare: "UQ", paternity: "AT", study: "TM", unpaid: "ÖM", recall: "GÇ", trip: "EZ", training: "TL", salary: "ƏH", bonus: "MK", transfer: "K", substitute: "ƏV", schedule: "İR", probation: "SM", extend: "UZ", suspension: "KN", name: "AD", discipline: "İT", reduction: "Üİ", termination: "X", addleave: "ƏM", creative: "YM", postpone: "MK", extendleave: "MU", compensation: "KP", donor: "DN", medical: "TM", summons: "ÇG", military: "HT", downtime: "BD", remote: "Uİ", restday: "İG", overtime: "Aİ" }[kindId]}-${employeeId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

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
