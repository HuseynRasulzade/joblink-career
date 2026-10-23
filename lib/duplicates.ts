// Spots repeated applicants among one company's applications: the same person applying to several
// vacancies, and different accounts that share an e-mail or phone number.
export type DuplicateInput = { id: string; candidateId: string; jobId: string; name: string; email: string; phone: string };
export type DuplicateInfo = { otherVacancies: number; sameContactAs: string[] };

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
// Azerbaijani numbers: "+994 50 123 45 67", "050 123 45 67" and "50 123 45 67" are one number.
export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("994")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length >= 7 ? digits : "";
}

export function findDuplicates(applications: DuplicateInput[]): Record<string, DuplicateInfo> {
  const byContact = new Map<string, DuplicateInput[]>();
  for (const a of applications) {
    for (const key of [normalizeEmail(a.email) && `e:${normalizeEmail(a.email)}`, normalizePhone(a.phone) && `p:${normalizePhone(a.phone)}`]) {
      if (key) byContact.set(key, [...(byContact.get(key) || []), a]);
    }
  }
  const result: Record<string, DuplicateInfo> = {};
  for (const a of applications) {
    const vacancies = new Set(applications.filter((o) => o.candidateId === a.candidateId && o.jobId !== a.jobId).map((o) => o.jobId));
    const names = new Set<string>();
    for (const key of [normalizeEmail(a.email) && `e:${normalizeEmail(a.email)}`, normalizePhone(a.phone) && `p:${normalizePhone(a.phone)}`]) {
      for (const other of key ? byContact.get(key) || [] : []) if (other.candidateId !== a.candidateId) names.add(other.name || "Namizəd");
    }
    if (vacancies.size || names.size) result[a.id] = { otherVacancies: vacancies.size, sameContactAs: [...names].slice(0, 3) };
  }
  return result;
}
