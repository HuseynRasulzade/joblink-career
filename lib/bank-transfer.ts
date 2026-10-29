// Salary transfer orders: who gets how much and to which account, and the file a bank takes.
// Nothing here talks to a bank; the director approves the order, the file goes to the bank,
// and the payments are recorded when the bank has paid.
export type TransferItem = {
  employeeId: string;
  name: string;
  fin: string;
  iban: string;
  card: string; // full card number, kept only inside the order
  method: "bank" | "card";
  amountCents: number;
};
export type TransferSkip = { name: string; reason: string };
export type TransferCandidate = {
  employeeId: string;
  name: string;
  fin: string;
  iban: string;
  cardNumber: string;
  payMethod: "" | "bank" | "card" | "cash";
  amount: number; // AZN
};

export function buildTransfers(candidates: TransferCandidate[]): { items: TransferItem[]; skipped: TransferSkip[] } {
  const items: TransferItem[] = [];
  const skipped: TransferSkip[] = [];
  for (const c of candidates) {
    const cents = Math.round(c.amount * 100);
    if (cents <= 0) continue;
    if (c.payMethod === "cash") {
      skipped.push({ name: c.name, reason: "Maaş nağd verilir" });
      continue;
    }
    // A salary card is paid to its own number; everything else goes to the IBAN.
    const toCard = c.payMethod === "card" && !!c.cardNumber;
    if (!toCard && !c.iban) {
      skipped.push({ name: c.name, reason: c.cardNumber ? "Kart seçilməyib və IBAN yoxdur" : "IBAN və kart nömrəsi yoxdur" });
      continue;
    }
    items.push({ employeeId: c.employeeId, name: c.name, fin: c.fin, iban: toCard ? "" : c.iban, card: toCard ? c.cardNumber : "", method: toCard ? "card" : "bank", amountCents: cents });
  }
  return { items, skipped };
}

export type BatchKind = "advance" | "salary" | "vacation" | "benefit";
export const BATCH_KIND_TEXT: Record<BatchKind, string> = { advance: "əmək haqqı avansı", salary: "əmək haqqı", vacation: "məzuniyyət haqqı", benefit: "sosial sığorta müavinəti" };
export const transferPurpose = (month: string, kind: BatchKind) => `${month} ayı üçün ${BATCH_KIND_TEXT[kind]}`;

export type SenderAccount = { bankName: string; iban: string; holder: string; voen: string; currency: string };

export const BATCH_STATUS: Record<string, string> = {
  draft: "Layihə (təsdiq gözləyir)",
  approved: "Təsdiqləndi (banka göndərilməli)",
  sent: "Banka göndərildi",
  paid: "Ödənildi",
  cancelled: "Ləğv edildi",
};

// The rows of the bank file: sender first on every row, so the bank can take the file as it is.
export function transferFileRows(items: TransferItem[], sender: SenderAccount, purpose: string): (string | number)[][] {
  return items.map((it, i) => [i + 1, it.name, it.fin, it.method === "card" ? "" : it.iban, it.method === "card" ? it.card : "", Math.round(it.amountCents) / 100, sender.currency || "AZN", purpose, sender.iban]);
}
export const TRANSFER_HEADERS = ["№", "Alıcının adı", "FİN", "Alıcının IBAN-ı", "Alıcının kartı", "Məbləğ", "Valyuta", "Təyinat", "Göndərənin IBAN-ı"];

export const batchTotal = (items: TransferItem[]) => items.reduce((t, i) => t + i.amountCents, 0);

// ── Bank statement: which lines of an order the bank has paid ──────────────────────────────

export type StatementRow = { line: number; date: string; iban: string; card: string; name: string; amountCents: number; purpose: string };

const fold = (v: string) => v.toLocaleLowerCase("az").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ə/g, "e").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/[^a-z0-9]+/g, " ").trim();
const numberOf = (text: string) => {
  const t = text.replace(/\s/g, "").replace(/[^\d,.\-]/g, "");
  if (!t) return NaN;
  // 1.234,56 and 1,234.56 and 1234,56 are all read.
  const comma = t.lastIndexOf(",");
  const dot = t.lastIndexOf(".");
  const normalized = comma > dot ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  return Number(normalized);
};
const dateOf = (text: string) => {
  const t = text.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  return dmy ? `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}` : "";
};

export function parseBankStatement(rows: string[][]): { rows: StatementRow[]; issues: { line: number; reason: string }[] } {
  const headerIndex = rows.findIndex((r) => r.some((c) => /mebleg|amount|debet|borc/.test(fold(c))));
  if (headerIndex < 0) return { rows: [], issues: [{ line: 1, reason: "Çıxarışda “Məbləğ” (və ya Debet) sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const head = rows[headerIndex].map(fold);
  const find = (re: RegExp) => head.findIndex((h) => re.test(h));
  const col = { date: find(/tarix|date/), iban: find(/iban|hesab/), card: find(/kart|card/), name: find(/alici|ad|name|benefic/), amount: find(/mebleg|amount|debet|borc/), purpose: find(/teyinat|izah|purpose|description|melumat/) };
  const out: StatementRow[] = [];
  const issues: { line: number; reason: string }[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.every((c) => !String(c).trim())) continue;
    const cellAt = (c: number) => (c >= 0 ? String(row[c] ?? "") : "");
    const amount = Math.abs(numberOf(cellAt(col.amount)));
    if (!Number.isFinite(amount) || amount <= 0) {
      issues.push({ line: i + 1, reason: `Məbləğ oxunmadı: “${cellAt(col.amount)}”.` });
      continue;
    }
    out.push({ line: i + 1, date: dateOf(cellAt(col.date)), iban: cellAt(col.iban).replace(/\s/g, "").toUpperCase(), card: cellAt(col.card).replace(/\D/g, ""), name: cellAt(col.name), amountCents: Math.round(amount * 100), purpose: cellAt(col.purpose) });
  }
  return { rows: out, issues };
}

// Finds each line of an order in the statement: the same IBAN (or card) and amount, or, without an account in the statement, the same name and amount.
export function matchStatement(items: TransferItem[], rows: StatementRow[], used: Set<number>) {
  let found = 0;
  let lastDate = "";
  const missing: string[] = [];
  for (const item of items) {
    const index = rows.findIndex((r, i) => {
      if (used.has(i) || r.amountCents !== item.amountCents) return false;
      if (item.method === "card" && r.card) return r.card === item.card;
      if (item.iban && r.iban) return r.iban === item.iban;
      return fold(r.name) !== "" && fold(r.name) === fold(item.name);
    });
    if (index < 0) {
      missing.push(`${item.name} (${(item.amountCents / 100).toFixed(2)} AZN)`);
      continue;
    }
    used.add(index);
    found++;
    if (rows[index].date > lastDate) lastDate = rows[index].date;
  }
  return { found, missing, lastDate };
}
