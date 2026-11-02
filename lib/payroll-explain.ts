// "Why is this month different?": the changes between two pay slips of an employee, in words.
export type SlipFigures = { month: string; gross: number; net: number; incomeTax: number; insurance: number; deductions: number; workedDays: number; normDays: number; lines: { id: string; label: string; amount: number }[]; toPay: number };

const azn = (v: number) => `${Math.abs(v).toFixed(2)} AZN`;
const LABEL: Record<string, string> = { worked: "işlənmiş günlərə görə maaş", vacation: "məzuniyyət haqqı", "paid-leave": "ödənişli icazə günləri", downtime: "boşdayanma haqqı", overtime: "artıq iş", "rest-day": "istirahət/bayram günü işi", night: "gecə işi", allowance: "əlavələr", bonus: "mükafat", "leave-compensation": "məzuniyyət kompensasiyası" };

export function explainChange(prev: SlipFigures | null, now: SlipFigures): string[] {
  if (!prev) return ["Bu, ilk haqq-hesab vərəqənizdir: müqayisə üçün əvvəlki ay yoxdur."];
  const out: string[] = [];
  const dn = now.net - prev.net;
  if (Math.abs(dn) < 0.005) out.push("Əlinizə verilən məbləğ əvvəlki ayla eynidir.");
  else out.push(`Əlinizə verilən (net) məbləğ əvvəlki aya nisbətən ${azn(dn)} ${dn > 0 ? "çoxdur" : "azdır"}.`);
  if (now.normDays !== prev.normDays || now.workedDays !== prev.workedDays) out.push(`İş günləri: bu ay ${now.workedDays}/${now.normDays}, əvvəlki ay ${prev.workedDays}/${prev.normDays}.`);
  const ids = [...new Set([...now.lines.map((l) => l.id), ...prev.lines.map((l) => l.id)])];
  for (const id of ids) {
    const a = now.lines.find((l) => l.id === id)?.amount || 0;
    const b = prev.lines.find((l) => l.id === id)?.amount || 0;
    if (Math.abs(a - b) < 0.005) continue;
    const name = LABEL[id] || now.lines.find((l) => l.id === id)?.label || prev.lines.find((l) => l.id === id)?.label || id;
    if (!b) out.push(`Yeni: ${name} ${azn(a)}.`);
    else if (!a) out.push(`Bu ay yoxdur: ${name} (əvvəlki ay ${azn(b)}).`);
    else out.push(`${name}: ${azn(a - b)} ${a > b ? "artıb" : "azalıb"} (${azn(b)} → ${azn(a)}).`);
  }
  const dt = now.incomeTax + now.insurance - (prev.incomeTax + prev.insurance);
  if (Math.abs(dt) >= 0.005) out.push(`Vergi və sığorta tutulması ${azn(dt)} ${dt > 0 ? "artıb" : "azalıb"} (hesablanan məbləğə uyğun olaraq).`);
  const dd = now.deductions - prev.deductions;
  if (Math.abs(dd) >= 0.005) out.push(`Digər tutulmalar ${azn(dd)} ${dd > 0 ? "artıb" : "azalıb"}.`);
  return out;
}
