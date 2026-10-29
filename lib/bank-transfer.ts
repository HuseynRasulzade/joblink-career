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
