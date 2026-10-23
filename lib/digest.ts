// Scheduled summary e-mails: when one is due and what it says.
export type DigestFrequency = "off" | "weekly" | "monthly";
export const normalizeFrequency = (value: unknown): DigestFrequency => (value === "weekly" || value === "monthly" ? value : "off");

const DAY = 86400000;
// The job runs once a day. A weekly summary goes out on Monday, a monthly one on the 1st,
// and never twice in the same period even if the job runs again.
export function isDue(frequency: DigestFrequency, lastSent: string, now = new Date()) {
  if (frequency === "off") return false;
  const last = lastSent ? Date.parse(lastSent) : 0;
  if (frequency === "weekly") return now.getUTCDay() === 1 && now.getTime() - last > 5 * DAY;
  if (now.getUTCDate() !== 1) return false;
  return !lastSent || lastSent.slice(0, 7) !== now.toISOString().slice(0, 7);
}

export type DigestData = {
  companyName: string;
  frequency: DigestFrequency;
  from: string;
  to: string;
  applications: number;
  previousApplications: number;
  hires: number;
  attention: { label: string; count: number }[];
};

export function digestSubject(data: DigestData) {
  return `Joblink ${data.frequency === "monthly" ? "aylıq" : "həftəlik"} hesabat: ${data.companyName}`;
}

export function digestText(data: DigestData) {
  const change = data.previousApplications > 0 ? Math.round(((data.applications - data.previousApplications) / data.previousApplications) * 100) : null;
  const lines = [
    `${data.companyName}: ${data.from} – ${data.to}`,
    "",
    `Yeni müraciət: ${data.applications}${change === null ? "" : ` (əvvəlki dövrə görə ${change > 0 ? "+" : ""}${change}%)`}`,
    `İşə qəbul: ${data.hires}`,
  ];
  if (data.attention.length) {
    lines.push("", "Diqqət tələb edənlər:");
    for (const item of data.attention) lines.push(`- ${item.count} ${item.label}`);
  } else lines.push("", "Diqqət tələb edən iş yoxdur.");
  lines.push("", "Joblink-də ətraflı hesabatlara baxın. Bu e-poçtu “Hesabatlar” bölməsindən söndürə bilərsiniz.");
  return lines.join("\n");
}
