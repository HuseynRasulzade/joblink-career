// What a vacancy's pay means after tax, and how it compares with the candidate's wish.
// Both sides are compared on net pay (lib/tax.ts). If a side did not say gross or net, the result says so instead of guessing.
import { compareSalary, normalizeSalary, type SalaryKind } from "./tax.ts";

export type SalaryInsight = { lines: string[]; verdict: "meets" | "partial" | "below" | "unclear" | null };
const kindOf = (value: unknown): SalaryKind => (value === "gross" || value === "net" ? value : "unknown");
const money = (n: number) => Math.round(n).toLocaleString("fr-FR");

export function salaryInsight(
  job: { minSalary: number; maxSalary: number; salaryKind?: string },
  profile?: { salary: number; salaryMax?: number; salaryKind?: string } | null,
): SalaryInsight {
  const lines: string[] = [];
  const kind = kindOf(job.salaryKind);
  const top = job.maxSalary || job.minSalary;
  if (!top) return { lines, verdict: null };
  try {
    const low = job.minSalary && job.minSalary !== top ? normalizeSalary({ value: job.minSalary, kind }) : null;
    const high = normalizeSalary({ value: top, kind });
    if (kind === "unknown") lines.push("Maaşın gross və ya net olduğu göstərilməyib.");
    else if (kind === "gross") lines.push(`Vergilər çıxıldıqdan sonra təxminən ${low?.net ? `${money(low.net)}–` : ""}${money(high.net as number)} AZN (net).`);
    else lines.push(`Vergilər daxil təxminən ${low?.gross ? `${money(low.gross)}–` : ""}${money(high.gross as number)} AZN (gross).`);
    if (!profile || !profile.salary) return { lines, verdict: null };
    const result = compareSalary({ value: profile.salary, kind: kindOf(profile.salaryKind) }, { value: top, kind });
    const wish = `${money(profile.salary)} AZN`;
    const text = {
      meets: `Maaş gözləntinizi (${wish}) ödəyir.`,
      partial: `Maaş gözləntinizə (${wish}) qismən uyğundur.`,
      below: `Maaş gözləntinizdən (${wish}) aşağıdır.`,
      unclear: `Gözləntinizlə (${wish}) müqayisə dəqiq deyil: gross/net göstərilməyib.`,
    }[result.status];
    lines.push(text);
    return { lines, verdict: result.status };
  } catch {
    return { lines, verdict: null };
  }
}
