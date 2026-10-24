// Warning signs on an account, shown to the admin as hints (the admin decides; nothing happens automatically).
export type AccountInput = { name: string; email: string; role: string; jobsCount: number; applicationsCount: number; created: string; verified?: boolean };
const DISPOSABLE = new Set(["mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com"]);

export function accountSignals(a: AccountInput, now = new Date()): string[] {
  const out: string[] = [];
  const domain = a.email.split("@")[1]?.toLowerCase() || "";
  if (DISPOSABLE.has(domain)) out.push("Birdəfəlik e-poçt ünvanı");
  const letters = a.name.replace(/[^\p{L}]/gu, "");
  if (a.name.trim().length > 0 && letters.length < Math.ceil(a.name.trim().length / 2)) out.push("Adda rəqəm və ya işarələr çoxdur");
  const ageDays = (now.getTime() - Date.parse(a.created)) / 86400000;
  if (a.role === "company" && a.jobsCount >= 5 && !a.verified) out.push(`Təsdiqlənməmiş şirkət ${a.jobsCount} vakansiya yaradıb`);
  if (a.role === "candidate" && a.applicationsCount >= 40 && ageDays <= 3) out.push(`${Math.round(Math.max(ageDays, 0.1) * 10) / 10} gündə ${a.applicationsCount} müraciət`);
  return out;
}
