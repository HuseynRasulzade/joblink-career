// Checks of a payroll month before it is approved: what is wrong, what is unusual, what changed since the month before.
export type CheckRow = {
  employeeId: string; name: string; monthlySalary: number; payMethod: string; iban: string; card: string; status: string;
  result: { gross: number; net: number; toPay: number; advanceExcess: number; workedDays: number; paidLeaveDays: number; downtimeDays: number; benefitDays: number; unpaidDays: number; normDays: number };
};
export type Finding = { level: "error" | "warn" | "info"; employeeId: string; name: string; text: string };

const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null);

export function checkPayroll(rows: CheckRow[], previous: CheckRow[] | null, changeLimit = 20): { findings: Finding[]; totals: { gross: number; previousGross: number | null; change: number | null } } {
  const out: Finding[] = [];
  const add = (level: Finding["level"], r: CheckRow, text: string) => out.push({ level, employeeId: r.employeeId, name: r.name, text });
  const before = new Map((previous || []).map((r) => [r.employeeId, r]));
  for (const r of rows) {
    if (r.monthlySalary <= 0) { add("error", r, "Maaş daxil edilməyib."); continue; }
    if (r.result.advanceExcess > 0.005) add("error", r, `Avans hesablanan məbləğdən ${r.result.advanceExcess.toFixed(2)} AZN artıqdır.`);
    if (r.payMethod !== "cash" && !r.iban && !r.card) add("error", r, "Bank hesabı (IBAN) və ya kart yoxdur: bank vasitəsilə ödəmək olmaz.");
    const covered = r.result.workedDays + r.result.paidLeaveDays + r.result.downtimeDays + r.result.benefitDays;
    if (covered <= 0 && r.result.normDays > 0) add("warn", r, "Bu ay heç bir iş/ödənişli gün yoxdur: davamiyyət cədvəli doldurulubmu?");
    if (r.result.unpaidDays >= 5) add("info", r, `${r.result.unpaidDays} gün ödənişsiz: maaş ona görə azalıb.`);
    if (r.result.toPay <= 0 && r.result.gross > 0) add("warn", r, "Ödəniləcək məbləğ sıfırdır (tutulma və ya avans bütün net məbləği örtür).");
    const was = before.get(r.employeeId);
    if (previous && !was) add("info", r, "Əvvəlki ay cədvəldə yox idi (yeni işçi).");
    if (was) {
      const change = pct(r.result.gross, was.result.gross);
      if (change !== null && Math.abs(change) >= changeLimit && Math.abs(r.monthlySalary - was.monthlySalary) < 0.005)
        add("warn", r, `Gross əvvəlki aya görə ${change > 0 ? "+" : ""}${change}% dəyişib (${was.result.gross.toFixed(2)} → ${r.result.gross.toFixed(2)} AZN), maaş isə eyni qalıb: əlavə, tutulma və ya gün sayını yoxlayın.`);
      else if (Math.abs(r.monthlySalary - was.monthlySalary) >= 0.005) add("info", r, `Maaş dəyişib: ${was.monthlySalary.toFixed(2)} → ${r.monthlySalary.toFixed(2)} AZN.`);
    }
  }
  const now = new Set(rows.map((r) => r.employeeId));
  for (const r of previous || []) if (!now.has(r.employeeId)) add("info", r, "Əvvəlki ay cədvəldə idi, bu ay yoxdur (işdən çıxıb və ya statusu dəyişib).");
  const gross = Math.round(rows.reduce((s, r) => s + r.result.gross, 0) * 100) / 100;
  const previousGross = previous ? Math.round(previous.reduce((s, r) => s + r.result.gross, 0) * 100) / 100 : null;
  const order = { error: 0, warn: 1, info: 2 } as const;
  out.sort((a, b) => order[a.level] - order[b.level] || a.name.localeCompare(b.name, "az"));
  return { findings: out, totals: { gross, previousGross, change: previousGross ? pct(gross, previousGross) : null } };
}
