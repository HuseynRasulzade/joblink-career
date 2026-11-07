// The HR costs other than pay and the training plan: each kind has its own budget line in the plan, its own place
// to write an expense, and a place to record the payment. An expense is planned → approved → ordered (sent to the outside program) → paid.
export const EXPENSE_CATEGORIES = [
  { id: "hiring", label: "İşə qəbul", hint: "Elan, agentlik, test, namizəd yol xərci, uyğunlaşdırma" },
  { id: "certificate", label: "Sertifikat və imtahan", hint: "Sertifikat, lisenziya, imtahan və yenilənmə haqqı" },
  { id: "events", label: "Tədbirlər", hint: "Korporativ tədbir, komanda yığıncağı, təqdimat" },
  { id: "gifts", label: "Hədiyyələr və təbriklər", hint: "Ad günü, bayram, yubiley, mükafat hədiyyəsi" },
  { id: "medical", label: "Tibbi sığorta və müayinə", hint: "Sığorta, tibbi baxış, peyvənd" },
  { id: "uniform", label: "Geyim və təchizat", hint: "Uniforma, iş geyimi, şəxsi mühafizə vasitəsi" },
  { id: "other", label: "Digər HR xərcləri", hint: "Yuxarıdakılara aid olmayan kadr xərcləri" },
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["id"];
export const EXPENSE_CATEGORY_IDS: string[] = EXPENSE_CATEGORIES.map((c) => c.id);
export const EXPENSE_STATUS = ["planned", "approved", "ordered", "paid", "cancelled"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUS)[number];
export const PAY_METHODS = ["bank", "card", "cash", "other"] as const;

// What may follow what: a planned expense is approved (or cancelled), an approved one is paid (or cancelled),
// a paid one can only have its payment taken back.
// An approved expense can be sent to the outside program as an order; the order is paid there (the program reports it back)
// or, where nothing is connected, the payment is recorded by hand.
export const NEXT: Record<ExpenseStatus, ExpenseStatus[]> = {
  planned: ["approved", "cancelled"],
  approved: ["ordered", "paid", "cancelled", "planned"],
  ordered: ["paid", "approved", "cancelled"],
  paid: ["approved"],
  cancelled: ["planned"],
};
export const canMove = (from: ExpenseStatus, to: ExpenseStatus) => NEXT[from]?.includes(to) ?? false;

// An expense may not take the year's budget of its kind over its limit. Planned, approved and paid expenses all
// hold the money; cancelled ones do not. Returns the message, or "" when it fits.
export function budgetProblem(label: string, year: string, budget: number, held: number, amount: number): string {
  const money = (v: number) => `${(Math.round(v * 100) / 100).toLocaleString("az-AZ", { minimumFractionDigits: 2 })} AZN`;
  if (!(budget > 0)) return `“${label}” üçün ${year} büdcəsi yoxdur. Əvvəl «Plan və fakt» → «Büdcə» bölməsində bu növ üçün büdcə yazın.`;
  if (held + amount > budget + 0.005) return `“${label}” büdcəsi çatmır: ${year} üçün büdcə ${money(budget)}, artıq ayrılıb ${money(held)}, bu xərc ${money(amount)}. Qalıq ${money(Math.max(0, budget - held))}. Büdcəni artırmaq üçün planı «Redaktə üçün aç» edin.`;
  return "";
}
