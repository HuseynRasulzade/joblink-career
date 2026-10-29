// What has to be done when an employee leaves, and the exit interview that explains why.
export const OFFBOARDING_ITEMS: { id: string; label: string; hint: string }[] = [
  { id: "order", label: "İşdən çıxarma əmri imzalanıb", hint: "Əmr reyestrində xitam əmri" },
  { id: "assets", label: "Şirkət əmlakı qaytarılıb", hint: "Noutbuk, telefon, açar, forma — aktivlər bölməsi" },
  { id: "access", label: "Giriş hüquqları bağlanıb", hint: "E-poçt, sistemlər, bina kartı, parollar" },
  { id: "handover", label: "İş təhvil verilib", hint: "Sənədlər, layihələr, müştərilər başqa işçiyə ötürülüb" },
  { id: "leave", label: "İstifadə olunmamış məzuniyyət hesablanıb", hint: "Kompensasiya əmək haqqı cədvəlində avtomatik hesablanır (md. 143)" },
  { id: "settlement", label: "Son haqq-hesab ödənilib", hint: "Xitam günü işçi ilə tam hesablaşma (md. 77, 172)" },
  { id: "book", label: "Əmək kitabçası və qeydiyyat tamamlanıb", hint: "Əmək kitabçasına qeyd, dövlət sistemində xitam" },
  { id: "certificate", label: "İş yerindən arayış verilib", hint: "İşçi istəyərsə" },
  { id: "interview", label: "Çıxış müsahibəsi keçirilib", hint: "Aşağıdakı suallar" },
  { id: "archive", label: "Şəxsi iş arxivə verilib", hint: "Saxlama müddəti qanunla müəyyən edilir" },
];

export type ChecklistState = Record<string, { done: boolean; at?: string; by?: string }>;

export const EXIT_QUESTIONS: { id: string; label: string; kind: "choice" | "scale" | "yesno" | "text"; options?: string[] }[] = [
  { id: "reason", label: "Ayrılmağın əsas səbəbi", kind: "choice", options: ["Daha yaxşı təklif", "Əmək haqqı", "İnkişaf imkanı yoxdur", "Rəhbərlə münasibət", "İş şəraiti", "Ailə və ya şəxsi səbəb", "Köçmə", "Təhsil", "Digər"] },
  { id: "manager", label: "Rəhbərinizlə iş münasibətini qiymətləndirin", kind: "scale" },
  { id: "conditions", label: "İş şəraitini qiymətləndirin", kind: "scale" },
  { id: "pay", label: "Əmək haqqı və müavinətləri qiymətləndirin", kind: "scale" },
  { id: "growth", label: "İnkişaf imkanlarını qiymətləndirin", kind: "scale" },
  { id: "recommend", label: "Şirkəti dostunuza tövsiyə edərdinizmi?", kind: "yesno" },
  { id: "return", label: "Gələcəkdə geri qayıtmağı düşünərdinizmi?", kind: "yesno" },
  { id: "better", label: "Şirkətdə nəyi dəyişərdiniz?", kind: "text" },
];

export function checklistProgress(state: ChecklistState) {
  const done = OFFBOARDING_ITEMS.filter((i) => state[i.id]?.done).length;
  return { done, total: OFFBOARDING_ITEMS.length, percent: Math.round((done / OFFBOARDING_ITEMS.length) * 100) };
}

export function cleanAnswers(raw: unknown): Record<string, string> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const q of EXIT_QUESTIONS) {
    const v = String(o[q.id] ?? "").trim().slice(0, q.kind === "text" ? 1000 : 120);
    if (!v) continue;
    if (q.kind === "scale" && !/^[1-5]$/.test(v)) continue;
    if (q.kind === "yesno" && !["yes", "no"].includes(v)) continue;
    if (q.kind === "choice" && !(q.options || []).includes(v)) continue;
    out[q.id] = v;
  }
  return out;
}

export function cleanChecklist(raw: unknown): ChecklistState {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, { done?: unknown; at?: unknown; by?: unknown }>;
  const out: ChecklistState = {};
  for (const item of OFFBOARDING_ITEMS) if (o[item.id]?.done === true) out[item.id] = { done: true, at: String(o[item.id].at ?? "").slice(0, 30), by: String(o[item.id].by ?? "").slice(0, 80) };
  return out;
}
