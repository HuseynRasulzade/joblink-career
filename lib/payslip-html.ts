// The pay slip as a printable page (Labor Code art. 173): used by the employer's payroll page and by the employee's own profile.
export type SlipLine = { id: string; label: string; amount: number; article: string };
export type SlipPayment = { kind: string; amount: number; paidOn: string; method: string; note: string; title?: string; reversed?: boolean };
export type SlipRow = {
  name: string; position: string; department: string; section?: string; startDate: string; fin?: string; ssn?: string; iban?: string; benefit?: string;
  monthlySalary: number; weekHours: number; advances: number; salaryPaid: number; outstanding: number;
  annual?: { months: number; estimated: boolean; averageMonthly: number; calendarDays: number } | null;
  inputs: { overtimeHours: number; restDayHours: number; restDayWithinNorm: boolean; nightHours: number; nightPercent: number; note: string };
  payments: SlipPayment[];
  result: {
    normDays: number; workedDays: number; paidLeaveDays: number; downtimeDays: number; benefitDays: number; unpaidDays: number; hourly: number;
    lines: SlipLine[]; gross: number; incomeTax: number; employeeSocial: number; employeeUnemployment: number; employeeMedical: number;
    employerSocial: number; employerUnemployment: number; employerMedical: number; net: number; taxReduction: number;
    otherDeductions: { label: string; amount: number; applied: number; kind: "general" | "writ" | "alimony" }[]; toPay: number; advanceExcess: number; notes: string[];
  };
};
export type SlipData = { company: string; month: string; approved: boolean; payDate: string; row: SlipRow; showEmployer?: boolean };

const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
export const monthLabel = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
const azn = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—");
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const KIND_TEXT = { general: "Ümumi (20%-dək)", writ: "İcra sənədi (50%-dək)", alimony: "Aliment və s. (70%-dək)" };

export function payslipHtml(data: SlipData): string {
  const r = data.row;
  const lines = r.result.lines.map((l) => `<tr><td>${esc(l.label)}</td><td>${esc(l.article)}</td><td>${azn(l.amount)}</td></tr>`).join("");
  const x = r.result;
  const legal = [
    ["Gəlir vergisi", x.incomeTax, `Vergi Məcəlləsi, md. 101${x.taxReduction ? ` (güzəşt: ${azn(x.taxReduction)}${r.benefit ? `, ${r.benefit}` : ""})` : ""}`],
    ["DSMF (işçi payı)", x.employeeSocial, "Məcburi dövlət sosial sığorta"],
    ["İşsizlik sığortası", x.employeeUnemployment, "İşsizlikdən sığorta"],
    ["İcbari tibbi sığorta", x.employeeMedical, "İcbari tibbi sığorta"],
  ] as [string, number, string][];
  const others = x.otherDeductions.map((d) => [`${d.label || "Digər tutulma"}${d.applied < d.amount ? ` (tələb: ${azn(d.amount)})` : ""}`, d.applied, KIND_TEXT[d.kind]] as [string, number, string]);
  const rowsHtml = (list: [string, number, string][]) => list.filter((d) => d[1] || d === list[0]).map((d) => `<tr><td>${esc(d[0])}</td><td>${esc(d[2])}</td><td>${azn(d[1])}</td></tr>`).join("");
  const pays = r.payments.map((p) => `<tr><td>${dmy(p.paidOn)}</td><td>${p.kind === "advance" ? "Avans" : "Əmək haqqı"}${p.method ? ` · ${({ bank: "bank", card: "kart", cash: "nağd", other: "digər" } as Record<string, string>)[p.method] || esc(p.method)}` : ""}${p.note ? ` · ${esc(p.note)}` : ""}</td><td>${azn(p.amount)}</td></tr>`).join("");
  const days = [
    ["Norma (iş günü)", x.normDays],
    ["İşlənmiş gün", x.workedDays],
    ["Ödənişli məzuniyyət/icazə", x.paidLeaveDays],
    ["Boşdayanma (2/3)", x.downtimeDays],
    ["Müavinətlə ödənilən gün", x.benefitDays],
    ["Ödənişsiz gün", x.unpaidDays],
  ].filter((d, i) => i < 2 || Number(d[1]) > 0) as [string, number][];
  const inputs = [
    r.inputs.overtimeHours ? `Artıq iş: ${r.inputs.overtimeHours} saat` : "",
    r.inputs.restDayHours ? `İstirahət/bayram günü işi: ${r.inputs.restDayHours} saat${r.inputs.restDayWithinNorm ? " (norma daxilində)" : ""}` : "",
    r.inputs.nightHours ? `Gecə işi: ${r.inputs.nightHours} saat, ${r.inputs.nightPercent}%` : "",
    r.inputs.note ? `Qeyd: ${esc(r.inputs.note)}` : "",
  ].filter(Boolean);
    return `<!doctype html><html lang="az"><head><meta charset="utf-8"><title>Haqq-hesab vərəqəsi ${esc(r.name)} ${data.month}</title><style>
    body{font:14px/1.5 Arial,sans-serif;color:#17332b;max-width:780px;margin:24px auto;padding:0 16px}
    h1{font-size:19px;margin:0} h2{font-size:15px;margin:18px 0 6px} table{width:100%;border-collapse:collapse}
    td{border-bottom:1px solid #dfe8e3;padding:6px 8px} td:last-child{text-align:right;white-space:nowrap} td:nth-child(2){color:#5b7068;font-size:12px}
    .tot td{font-weight:700;border-top:2px solid #17332b} p{font-size:12px;color:#556;margin:6px 0} .sign{margin-top:36px;display:flex;justify-content:space-between}
    .who{display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;border:1px solid #dfe8e3;border-radius:6px;padding:8px 12px;margin-top:10px} .who span{font-size:13px} .who b{font-weight:600}
    .days{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px} .days span b{font-size:15px}
    .half td:last-child{text-align:left;white-space:normal} .half td:nth-child(2){color:#17332b;font-size:14px}
  </style></head><body>
    <h1>Haqq-hesab vərəqəsi — ${esc(monthLabel(data.month))}</h1>
    <p>${esc(data.company)}${data.approved ? " · ay təsdiqlənib" : " · ay hələ təsdiqlənməyib (ilkin hesablama)"}</p>
    <div class="who">
      <span>İşçi: <b>${esc(r.name)}</b></span><span>Vəzifə: <b>${esc(r.position || "—")}</b></span>
      <span>Departament: <b>${esc([r.department, r.section].filter(Boolean).join(" / ") || "—")}</b></span><span>İşə qəbul: <b>${dmy(r.startDate)}</b></span>
      ${r.fin ? `<span>FİN: <b>${esc(r.fin)}</b></span>` : ""}${r.ssn ? `<span>SSN: <b>${esc(r.ssn)}</b></span>` : ""}
      <span>Aylıq maaş (gross): <b>${azn(r.monthlySalary)}</b></span><span>Saatlıq tarif: <b>${azn(x.hourly)}</b></span>
      ${r.weekHours < 40 ? `<span>İş həftəsi: <b>${r.weekHours} saat</b></span>` : ""}${r.iban ? `<span>IBAN: <b>${esc(r.iban)}</b></span>` : ""}
    </div>
    <h2>İş günləri</h2>
    <div class="days">${days.map((d) => `<span>${esc(d[0])}: <b>${d[1]}</b></span>`).join("")}</div>
    ${inputs.length ? `<p>${inputs.join(" · ")}</p>` : ""}
    <h2>Hesablanıb</h2><table>${lines}<tr class="tot"><td>Cəmi hesablanıb (gross)</td><td></td><td>${azn(x.gross)}</td></tr></table>
    <h2>Tutulub</h2><table>${rowsHtml(legal)}<tr class="tot"><td>Net (vergilərdən sonra)</td><td></td><td>${azn(x.net)}</td></tr>
      ${others.length ? rowsHtml(others) : ""}${r.advances ? `<tr><td>Verilmiş avans</td><td>Əvvəlcədən ödənilib</td><td>${azn(r.advances)}</td></tr>` : ""}</table>
    <h2>Ödənilir</h2><table>
      <tr class="tot"><td>Əlinə veriləcək məbləğ</td><td></td><td>${azn(x.toPay)}</td></tr>
      ${r.salaryPaid ? `<tr><td>Faktiki ödənilib</td><td></td><td>${azn(r.salaryPaid)}</td></tr>` : ""}
      <tr><td>Ödənilməmiş qalıq</td><td></td><td>${azn(r.outstanding)}</td></tr>
      <tr><td>Ödəniş tarixi (Əmək M. 172)</td><td></td><td>${dmy(data.payDate)}</td></tr></table>
    ${pays ? `<h2>Ödənişlər</h2><table class="half">${pays}</table>` : ""}
    ${x.advanceExcess ? `<p>Avans hesablanmış məbləğdən ${azn(x.advanceExcess)} artıqdır: işçinin borcu.</p>` : ""}
    ${r.annual ? `<p>Məzuniyyət haqqının əsası (Əmək M. 140): əvvəlki ${r.annual.months} ayın orta aylıq əmək haqqı ${azn(r.annual.averageMonthly)}, günlük ${azn(r.annual.averageMonthly / 30.4)}; ${r.annual.calendarDays} təqvim günü.${r.annual.estimated ? " Bəzi aylar üçün təsdiqlənmiş cədvəl olmadığından cari maaş götürülüb (təxmini)." : ""}</p>` : ""}
    ${x.notes.map((n) => `<p>${esc(n)}</p>`).join("")}
    <p>İşəgötürən tərəfindən əlavə ödənilir (işçidən tutulmur): DSMF ${azn(x.employerSocial)}, işsizlik ${azn(x.employerUnemployment)}, tibbi sığorta ${azn(x.employerMedical)}.</p>
    <p>Bu vərəqə Əmək Məcəlləsinin 173-cü maddəsinə uyğun hazırlanıb.</p>
    <div class="sign"><span>Mühasib: ____________</span><span>İşçi ilə tanış oldum: ____________</span></div>
  </body></html>`;
}
