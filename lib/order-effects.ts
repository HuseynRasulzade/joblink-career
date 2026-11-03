// What a signed order changes in the employee card, worked out as a plan: the new values, the date they take effect, the
// days to mark and a bonus to pay. The server applies the plan, keeps what was there before and can take it back.
export type CardSnapshot = { name: string; position: string; department: string; salaryCents: number; salaryType: string; status: string; endDate: string; exitType: string; exitReason: string; probationEnd: string };
export type CardPatch = Partial<CardSnapshot>;
export type EffectPlan = {
  kind: string;
  effectiveDate: string;
  patch: CardPatch; // the card fields that change
  marks?: { from: string; to: string; code: string }; // attendance days to mark
  bonus?: { amount: number; month: string }; // an amount for the pay of a month
  events?: { type: string; from: string; to: string; note: string }[]; // lines for the history of the card only
  summary: string[];
};

export const EFFECT_KINDS = ["transfer", "salary", "name", "termination", "reduction", "probation", "suspension", "bonus", "discipline", "extend", "substitute", "schedule"] as const;
export const hasEffect = (kind: string) => (EFFECT_KINDS as readonly string[]).includes(kind);

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const amount = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};
const azn = (cents: number) => `${(cents / 100).toFixed(2).replace(/\.00$/, "")} AZN`;
const FAILED = /kecmed|ugursuz|neqativ|qane|yararsiz|failed/;
const fold = (v: string) => v.toLocaleLowerCase("az").replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g");

export function planOrderEffect(kind: string, input: Record<string, unknown>, card: CardSnapshot, orderDate: string): EffectPlan | null {
  if (!hasEffect(kind)) return null;
  const effectiveDate = isDate(input.from) ? input.from : orderDate;
  const patch: CardPatch = {};
  const summary: string[] = [];
  const plan = (extra: Partial<EffectPlan> = {}): EffectPlan | null => (Object.keys(patch).length || extra.marks || extra.bonus || extra.events ? { kind, effectiveDate, patch, summary, ...extra } : null);
  const newSalary = amount(input.salary);
  const setSalary = () => {
    if (newSalary > 0 && Math.round(newSalary * 100) !== card.salaryCents) {
      patch.salaryCents = Math.round(newSalary * 100);
      summary.push(`Maaş: ${card.salaryCents ? azn(card.salaryCents) : "—"} → ${azn(patch.salaryCents)}`);
    }
  };
  if (kind === "transfer") {
    const position = text(input.newPosition);
    const department = text(input.newDepartment);
    if (position && position !== card.position) { patch.position = position; summary.push(`Vəzifə: ${card.position || "—"} → ${position}`); }
    if (department && department !== card.department) { patch.department = department; summary.push(`Departament: ${card.department || "—"} → ${department}`); }
    setSalary();
    return plan();
  }
  if (kind === "salary") {
    setSalary();
    return plan();
  }
  if (kind === "name") {
    const name = text(input.newName);
    if (name && name !== card.name) { patch.name = name; summary.push(`Ad: ${card.name} → ${name}`); }
    return plan();
  }
  if (kind === "termination" || kind === "reduction") {
    if (card.status !== "left" || card.endDate !== effectiveDate) {
      patch.status = "left";
      patch.endDate = effectiveDate;
      patch.exitType = kind === "reduction" ? "dismissal" : card.exitType || "other";
      patch.exitReason = kind === "reduction" ? "restructuring" : card.exitReason;
      summary.push(`İşdən çıxır: son iş günü ${effectiveDate.split("-").reverse().join(".")}`);
    }
    return plan();
  }
  if (kind === "probation") {
    if (card.probationEnd && !FAILED.test(fold(text(input.result)))) {
      patch.probationEnd = "";
      summary.push("Sınaq müddəti uğurla başa çatdı");
    }
    return plan();
  }
  if (kind === "suspension") {
    const to = isDate(input.to) && input.to >= effectiveDate ? input.to : effectiveDate;
    summary.push(`İşdən kənarlaşdırma günləri tabeldə işarələnir: ${effectiveDate} – ${to}`);
    return plan({ marks: { from: effectiveDate, to, code: "suspension" } });
  }
  if (kind === "bonus") {
    const value = amount(input.salary);
    if (!value) return null;
    const month = orderDate.slice(0, 7);
    summary.push(`Mükafat ${value} AZN ${month} ayının əmək haqqına əlavə olunur`);
    return plan({ bonus: { amount: value, month } });
  }
  const day = (v: string) => v.split("-").reverse().join(".");
  if (kind === "discipline") {
    const penalty = text(input.penalty) || "İntizam tənbehi";
    summary.push(`Kartın tarixçəsinə yazılır: ${penalty}`);
    return plan({ events: [{ type: "discipline", from: "", to: penalty, note: text(input.basis) }] });
  }
  if (kind === "extend") {
    const to = isDate(input.to) ? input.to : "";
    summary.push(`Kartın tarixçəsinə yazılır: əmək müqaviləsi ${to ? `${day(to)} tarixinədək ` : ""}uzadıldı`);
    return plan({ events: [{ type: "contract", from: "", to: to || "uzadıldı", note: text(input.basis) }] });
  }
  if (kind === "substitute") {
    const to = isDate(input.to) ? input.to : "";
    const position = text(input.newPosition) || "əlavə vəzifə";
    summary.push(`Kartın tarixçəsinə yazılır: müvəqqəti əvəzetmə — ${position}${to ? `, ${day(to)} tarixinədək` : ""}`);
    return plan({ events: [{ type: "substitute", from: card.position, to: position, note: `${day(effectiveDate)}${to ? ` – ${day(to)}` : ""}` }] });
  }
  if (kind === "schedule") {
    const schedule = text(input.schedule) || "yeni iş rejimi";
    summary.push(`Kartın tarixçəsinə yazılır: iş rejimi — ${schedule}`);
    return plan({ events: [{ type: "schedule", from: "", to: schedule, note: text(input.basis) }] });
  }
  return null;
}

// The values that stood there before the patch, to put them back.
export function beforeOf(card: CardSnapshot, patch: CardPatch): CardPatch {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(patch) as (keyof CardSnapshot)[]) out[key] = card[key];
  return out as CardPatch;
}

// What will happen once the order is signed, in plain words, for the form to show before it is sent.
export function previewOrder(kind: string, input: Record<string, unknown>, card: CardSnapshot, orderDate: string, leaveCode?: string): string[] {
  const out: string[] = [];
  const plan = planOrderEffect(kind, input, card, orderDate);
  if (plan) {
    out.push(...plan.summary);
    if (plan.effectiveDate > new Date().toISOString().slice(0, 10) && Object.keys(plan.patch).length) out.push(`Dəyişiklik ${plan.effectiveDate.split("-").reverse().join(".")} tarixində, həmin gün gələndə tətbiq olunacaq`);
  }
  const from = isDate(input.from) ? input.from : "";
  const to = isDate(input.to) && input.to >= from ? input.to : from;
  if (leaveCode && from) out.push(`Tabeldə ${from.split("-").reverse().join(".")} – ${to.split("-").reverse().join(".")} günləri avtomatik işarələnir`);
  if (["vacation", "addleave", "creative"].includes(kind) && from) out.push("Məzuniyyət qrafikində həmin dövr “götürülüb” olur, məzuniyyət balansı yenilənir");
  if (kind === "overtime" || kind === "restday") out.push("Həmin günlərin artıq saatı təsdiqlənmiş sayılır (əmək haqqına düşür)");
  if (kind === "termination" || kind === "reduction") out.push("Çıxış işi (offboarding) avtomatik açılır");
  if (kind === "hire") out.push("İşçi kartı və başlama tarixi əmrlə eyni olur");
  if (!out.length) out.push("Kartda dəyişiklik olmur: əmr yalnız sənəd kimi saxlanır");
  out.push("Hamısı imzalar tamamlananda özü tətbiq olunur; əmrin səhifəsindən geri qaytarmaq olar");
  return out;
}
