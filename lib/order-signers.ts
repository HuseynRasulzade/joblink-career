// Who signs an order about an employee: the head of the employee's section (or
// department) and the company director, picked from the staff list.
import { titleLevel } from "./role-level.ts";

export type SignerPerson = { id: string; name: string; position: string; department: string; section: string; status: string };
export type Signer = { role: "head" | "director"; title: string; name: string; position: string; source: "staff" | "profile" | "" };

const fold = (value: string) =>
  (value || "")
    .toLocaleLowerCase("az")
    .replace(/[əƏ]/g, "e")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// The company's own director, not a department's: "Direktor", "Baş direktor", "CEO", "İcraçı direktor".
export const isCompanyDirector = (position: string) => {
  const text = fold(position);
  if (/\b(muavin|deputy|vice)\b/.test(text)) return false;
  return /^(direktor|bas direktor|icraci direktor|general director|ceo|managing director|prezident|president|genel mudur)$/.test(text) || /\b(bas direktor|icraci direktor|general director|chief executive)\b/.test(text);
};

export function pickSigners(
  employee: { id: string; department: string; section: string },
  people: SignerPerson[],
  profileDirector: string,
): { head: Signer | null; director: Signer | null } {
  const active = people.filter((p) => p.status !== "left" && p.status !== "removed" && p.id !== employee.id);
  const sameDepartment = active.filter((p) => fold(p.department) === fold(employee.department));
  const level = (p: SignerPerson) => titleLevel(p.position) ?? 0;
  const bySection = employee.section ? sameDepartment.filter((p) => fold(p.section) === fold(employee.section) && level(p) >= 5 && !isCompanyDirector(p.position)) : [];
  const byDepartment = sameDepartment.filter((p) => level(p) >= 5 && !isCompanyDirector(p.position));
  const managers = sameDepartment.filter((p) => level(p) === 4);
  const headPerson = bySection[0] || byDepartment.sort((a, b) => level(b) - level(a))[0] || (employee.section ? managers.find((p) => fold(p.section) === fold(employee.section)) : undefined) || managers[0];
  const directorPerson = active.find((p) => isCompanyDirector(p.position));
  return {
    head: headPerson ? { role: "head", title: "Şöbə rəhbəri", name: headPerson.name, position: headPerson.position, source: "staff" } : null,
    director: directorPerson
      ? { role: "director", title: "Direktor", name: directorPerson.name, position: directorPerson.position, source: "staff" }
      : profileDirector
        ? { role: "director", title: "Direktor", name: profileDirector, position: "Direktor", source: "profile" }
        : null,
  };
}

// The same person written in two ways ("Əli Əliyev" and "ƏLİ ƏLİYEV").
export const sameName = (left: string, right: string) => !!fold(left) && fold(left) === fold(right);
