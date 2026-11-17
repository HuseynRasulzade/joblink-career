// Extra permissions may be temporary (a deputy while someone is on leave): after the date they stop counting.
export const GRANT_DATE = /^\d{4}-\d{2}-\d{2}$/;
// The grants that count today: all of them, or none once the end date has passed (the last day itself still counts).
export function activeGrants<T>(grants: T[], until: string, today = new Date().toISOString().slice(0, 10)): T[] {
  return until && GRANT_DATE.test(until) && until < today ? [] : grants;
}
export function grantsUntilProblem(until: string, today = new Date().toISOString().slice(0, 10)): string {
  if (!until) return "";
  if (!GRANT_DATE.test(until)) return "Bitmə tarixini düzgün seçin.";
  if (until < today) return "Bitmə tarixi keçmişdə ola bilməz.";
  return "";
}
