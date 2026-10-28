// An employee's written application (ərizə) for leave, permission or a change in work: HR records it and the
// order is drawn up from it, so the order always rests on the application. Pure rules, shared by the screens,
// the server and the tests.
import { ORDER_KINDS, leaveDays, unpaidReason, type OrderKind } from "./orders.ts";
import { resignationDate } from "./hr-calc.ts";

export type RequestKind = Extract<
  OrderKind,
  "vacation" | "addleave" | "creative" | "study" | "unpaid" | "childcare" | "maternity" | "paternity" | "postpone" | "extendleave" | "compensation" | "donor" | "medical" | "remote" | "schedule" | "name" | "termination"
>;

export const REQUEST_KINDS: { id: RequestKind; label: string; hint: string }[] = [
  { id: "vacation", label: "İllik əmək məzuniyyəti ərizəsi", hint: "Əmr məzuniyyətin başlanmasına azı 5 gün qalmış verilməlidir (138-ci maddə)." },
  { id: "addleave", label: "Əlavə əmək məzuniyyəti ərizəsi", hint: "Staj (116), uşaqlı işçi (117) və ya zərərli şərait (115) əsasında." },
  { id: "creative", label: "Yaradıcılıq məzuniyyəti ərizəsi", hint: "Elmi şuranın arayışı ilə (122-ci maddə)." },
  { id: "study", label: "Təhsil məzuniyyəti ərizəsi", hint: "Təhsil müəssisəsinin çağırış arayışı ilə (123–124-cü maddələr)." },
  { id: "unpaid", label: "Ödənişsiz məzuniyyət ərizəsi", hint: "Səbəb və müddət Əmək Məcəlləsinin 130-cu maddəsinə uyğun olmalıdır." },
  { id: "childcare", label: "Uşağa qulluq məzuniyyəti ərizəsi", hint: "Uşaq üç yaşınadək (127-ci maddə)." },
  { id: "maternity", label: "Hamiləlik və doğuş məzuniyyəti ərizəsi", hint: "Tibbi rəy və ya vərəqə ilə (125-ci maddə)." },
  { id: "paternity", label: "Atalıq məzuniyyəti ərizəsi", hint: "Tibb müəssisəsinin arayışı ilə 14 təqvim günü (125.4)." },
  { id: "postpone", label: "Məzuniyyətin başqa vaxta keçirilməsi ərizəsi", hint: "Əsaslandırma və tərəflərin razılığı ilə (134-cü maddə)." },
  { id: "extendleave", label: "Məzuniyyətin uzadılması ərizəsi", hint: "Xəstəlik vərəqəsi və ya bayram günləri üzrə (114.6, 134.3)." },
  { id: "compensation", label: "İstifadə edilməmiş məzuniyyət kompensasiyası ərizəsi", hint: "Yalnız əmək müqaviləsinə xitam verilərkən (143–144-cü maddələr)." },
  { id: "donor", label: "Donor günü ərizəsi", hint: "Tibb müəssisəsinin arayışı ilə (104.3)." },
  { id: "medical", label: "Tibbi müayinə üçün icazə ərizəsi", hint: "Arayışla; iş yeri və orta əmək haqqı saxlanılır (179.2-k)." },
  { id: "remote", label: "Uzaqdan işləmə ərizəsi", hint: "İşçinin ərizəsi və tərəflərin razılığı ilə." },
  { id: "schedule", label: "İş rejiminin dəyişdirilməsi (natamam iş vaxtı) ərizəsi", hint: "Natamam iş vaxtı üçün 94-cü maddə." },
  { id: "name", label: "Ad və ya soyadın dəyişdirilməsi ərizəsi", hint: "Yeni sənədin surəti ilə." },
  { id: "termination", label: "İstefa (əmək müqaviləsinə xitam) ərizəsi", hint: "İşçi bir təqvim ay qabaqcadan xəbərdarlıq edir (69.1)." },
];
// A letter to the company that no order follows: HR answers it.
export const OTHER_REQUEST = { id: "other", label: "Digər ərizə və ya müraciət (cavab tələb edir)", hint: "Sərbəst mətnlə yazılan ərizə: əmr yaradılmır, HR cavab yazır." } as const;
export const requestKindLabel = (id: string) => (id === OTHER_REQUEST.id ? OTHER_REQUEST.label : REQUEST_KINDS.find((k) => k.id === id)?.label || id);
export const isApplicationKind = (id: string) => isRequestKind(id) || id === OTHER_REQUEST.id;

export const isRequestKind = (id: string): id is RequestKind => REQUEST_KINDS.some((k) => k.id === id);

export type RequestData = { from: string; to: string; quantity: number; reason: string; basis: string };
export type RequestStatus = "new" | "ordered" | "rejected" | "answered" | "withdrawn";

const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");

// What the application must hold, as a list of problems (empty when it can be recorded).
export function requestProblems(kind: string, data: Partial<RequestData>): string[] {
  const out: string[] = [];
  if (kind === OTHER_REQUEST.id) return (data.reason || "").trim().length >= 5 ? [] : ["Ərizənin mətnini yazın (ən azı 5 simvol)."];
  if (!isRequestKind(kind)) return ["Ərizənin növü düzgün deyil."];
  const fields = ORDER_KINDS.find((k) => k.id === kind)?.fields || [];
  if (fields.includes("from") && !isDate(data.from || "")) out.push("Başlanğıc tarixini yazın.");
  if (fields.includes("to") && kind !== "remote" && !isDate(data.to || "")) out.push("Bitmə tarixini yazın.");
  if (isDate(data.from || "") && isDate(data.to || "") && (data.to as string) < (data.from as string)) out.push("Bitmə tarixi başlanğıcdan əvvəl ola bilməz.");
  if (kind === "compensation" && !(Number(data.quantity) > 0)) out.push("Kompensasiya ödənilən gün sayını yazın.");
  if (["unpaid", "extendleave", "postpone", "schedule", "name"].includes(kind) && (data.basis || data.reason || "").trim().length < 2) out.push("Səbəbi və ya əsası yazın.");
  return out;
}

// Things to check before the order, which do not stop the application from being recorded.
export function requestWarnings(kind: string, data: Partial<RequestData>, applied: string): string[] {
  const out: string[] = [];
  if (kind === "vacation" && isDate(data.from || "") && isDate(applied)) {
    const gap = Math.round((Date.parse(`${data.from}T00:00:00Z`) - Date.parse(`${applied}T00:00:00Z`)) / 86_400_000);
    if (gap < 5) out.push("Məzuniyyət haqqında əmr başlanmasına azı 5 gün qalmış verilməlidir (Əmək Məcəlləsi, 138.2). Tarixi dəyişin və ya işçinin razılığını qeyd edin.");
  }
  if (kind === "termination" && isDate(data.from || "") && isDate(applied)) {
    const earliest = resignationDate(applied);
    if (earliest && (data.from as string) < earliest)
      out.push(`İşçi ərizəsi ilə xitam üçün bir təqvim ay qabaqcadan xəbərdarlıq lazımdır: ən tez ${dmy(earliest)} (69.1). Daha tez tarix yalnız 69.3-də sadalanan hallarda mümkündür.`);
  }
  if (kind === "unpaid") {
    const reason = unpaidReason(data.basis || "");
    const days = leaveDays(data.from || "", data.to || "");
    if (reason?.maxDays && days > reason.maxDays) out.push(`Seçilən əsas üçün ən çox ${reason.maxDays} təqvim günü verilir (130-cu maddə); ərizədə ${days} gün var.`);
    if (!reason) out.push("Ödənişsiz məzuniyyətin əsasını 130-cu maddənin hallarından seçin.");
  }
  if (kind === "compensation") out.push("Kompensasiya yalnız əmək müqaviləsinə xitam verilərkən ödənilir; iş davam edərkən məzuniyyəti pulla əvəz etmək olmaz (144.1).");
  return out;
}

// The order form values that come from the application.
export function orderPrefill(kind: string, data: Partial<RequestData>, applied: string) {
  const note = (data.reason || "").trim();
  const base = `işçinin ${dmy(applied)} tarixli ərizəsi`;
  return {
    kind: kind as OrderKind,
    from: data.from || "",
    to: data.to || "",
    quantity: data.quantity ? String(data.quantity) : "",
    vacationKind: kind === "unpaid" ? data.basis || "" : "",
    basis: `${base}${note ? `: ${note}` : ""}${kind === "unpaid" || !data.basis ? "" : ` (${data.basis})`}`,
  };
}
