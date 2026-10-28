// Personal data of an employee: identity card, birth, address, family, bank. Kept as one JSON object
// next to the employee and shown only to HR, the director and the account owner.
export type EmployeeProfile = {
  birthDate: string;
  birthPlace: string;
  gender: "" | "male" | "female";
  citizenship: string;
  fin: string;
  idSeries: string;
  idNumber: string;
  idIssuedBy: string;
  idIssuedDate: string;
  idExpires: string;
  address: string;
  registeredAddress: string;
  maritalStatus: "" | "single" | "married" | "divorced" | "widowed";
  childrenUnder14: number;
  hasDisabledChild: boolean;
  soleParent: boolean;
  ssn: string;
  voen: string;
  iban: string;
  educationLevel: string;
  militaryStatus: string;
  emergencyName: string;
  emergencyPhone: string;
};

export const EMPTY_PROFILE: EmployeeProfile = {
  birthDate: "", birthPlace: "", gender: "", citizenship: "Azərbaycan", fin: "", idSeries: "", idNumber: "",
  idIssuedBy: "", idIssuedDate: "", idExpires: "", address: "", registeredAddress: "", maritalStatus: "",
  childrenUnder14: 0, hasDisabledChild: false, soleParent: false, ssn: "", voen: "", iban: "",
  educationLevel: "", militaryStatus: "", emergencyName: "", emergencyPhone: "",
};

const text = (value: unknown, max: number) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const isoDate = (value: unknown) => {
  const v = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? "" : v;
};

// IBAN check digits (ISO 7064 mod 97-10).
export function validIban(iban: string) {
  const compact = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false;
  const moved = compact.slice(4) + compact.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const digits = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

export type ProfileResult = { profile: EmployeeProfile; issues: string[] };

// Cleans what came from the form or a file; wrong values are left empty and reported.
export function normalizeProfile(input: unknown): ProfileResult {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const issues: string[] = [];
  const dates = (key: keyof EmployeeProfile, label: string) => {
    const given = text(raw[key], 10);
    const ok = isoDate(raw[key]);
    if (given && !ok) issues.push(`${label}: tarix düzgün deyil.`);
    return ok;
  };
  const fin = text(raw.fin, 7).toUpperCase();
  if (fin && !/^[A-Z0-9]{7}$/.test(fin)) issues.push("FİN 7 simvoldan (rəqəm və latın hərfi) ibarət olmalıdır.");
  const iban = text(raw.iban, 34).replace(/\s+/g, "").toUpperCase();
  if (iban && !validIban(iban)) issues.push("IBAN düzgün deyil.");
  const series = text(raw.idSeries, 6).toUpperCase();
  const idNumber = text(raw.idNumber, 12).replace(/\s+/g, "");
  if (idNumber && !/^\d{6,9}$/.test(idNumber)) issues.push("Şəxsiyyət vəsiqəsinin nömrəsi 6–9 rəqəmdən ibarət olmalıdır.");
  const profile: EmployeeProfile = {
    birthDate: dates("birthDate", "Doğum tarixi"),
    birthPlace: text(raw.birthPlace, 120),
    gender: raw.gender === "male" || raw.gender === "female" ? raw.gender : "",
    citizenship: text(raw.citizenship, 80),
    fin: /^[A-Z0-9]{7}$/.test(fin) ? fin : "",
    idSeries: series,
    idNumber: /^\d{6,9}$/.test(idNumber) ? idNumber : "",
    idIssuedBy: text(raw.idIssuedBy, 120),
    idIssuedDate: dates("idIssuedDate", "Verilmə tarixi"),
    idExpires: dates("idExpires", "Etibarlılıq müddəti"),
    address: text(raw.address, 300),
    registeredAddress: text(raw.registeredAddress, 300),
    maritalStatus: ["single", "married", "divorced", "widowed"].includes(String(raw.maritalStatus)) ? (raw.maritalStatus as EmployeeProfile["maritalStatus"]) : "",
    childrenUnder14: Math.max(0, Math.min(30, Math.round(Number(raw.childrenUnder14) || 0))),
    hasDisabledChild: raw.hasDisabledChild === true,
    soleParent: raw.soleParent === true,
    ssn: text(raw.ssn, 20),
    voen: text(raw.voen, 20),
    iban: iban && validIban(iban) ? iban : "",
    educationLevel: text(raw.educationLevel, 80),
    militaryStatus: text(raw.militaryStatus, 80),
    emergencyName: text(raw.emergencyName, 120),
    emergencyPhone: text(raw.emergencyPhone, 40),
  };
  if (profile.idIssuedDate && profile.idExpires && profile.idExpires < profile.idIssuedDate)
    issues.push("Etibarlılıq müddəti verilmə tarixindən əvvəl ola bilməz.");
  if (profile.birthDate && profile.birthDate > new Date().toISOString().slice(0, 10)) {
    issues.push("Doğum tarixi gələcəkdə ola bilməz.");
    profile.birthDate = "";
  }
  return { profile, issues };
}

export function parseProfile(json: string | null | undefined): EmployeeProfile {
  try {
    const profile = normalizeProfile(JSON.parse(json || "{}")).profile;
    return { ...profile, citizenship: profile.citizenship || EMPTY_PROFILE.citizenship };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

// Age in whole years on a day.
export function ageOn(birthDate: string, day: string) {
  if (!isoDate(birthDate) || !isoDate(day)) return null;
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = day.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

// Documents that run out soon (identity card).
export function idExpiresSoon(profile: EmployeeProfile, today: string, days = 60) {
  if (!profile.idExpires) return false;
  const left = (new Date(`${profile.idExpires}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000;
  return left <= days;
}
