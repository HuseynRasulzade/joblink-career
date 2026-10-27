// How widely a credential is recognized, so that certificates of the same field
// are not weighed equally: a global chartered qualification counts more than a
// national programme or an entry-level award.
export type Prestige = {
  weight: number;
  label: "dünya səviyyəli" | "beynəlxalq" | "başlanğıc səviyyə" | "milli";
};
const GLOBAL = [
  "acca", "cima", "cgma", "cpa-us", "icaew-aca", "icas-ca", "ca-anz",
  "cpa-australia", "cfa", "cma-ima", "cia", "frm", "cams", "cfe", "cfp",
  "caia", "cipfa",
];
const INTERNATIONAL = [
  "acca-dipifr", "acca-certifr", "icaew-ifrs", "fmva", "cta-uk", "adit",
  "cisi", "prm", "garp-scr", "ica-aml", "cgss", "ctp", "aci-dealing", "ccra",
  "cdcs", "ciob", "ea-irs", "crma", "bloomberg-bmc",
];
const ENTRY = ["acca-fia"];
export function certificationPrestige(id: string): Prestige {
  if (GLOBAL.includes(id)) return { weight: 1, label: "dünya səviyyəli" };
  if (ENTRY.includes(id)) return { weight: 0.5, label: "başlanğıc səviyyə" };
  if (id.startsWith("az-")) return { weight: 0.4, label: "milli" };
  if (INTERNATIONAL.includes(id)) return { weight: 0.7, label: "beynəlxalq" };
  // Not ranked yet: treated as international, neither top nor local.
  return { weight: 0.75, label: "beynəlxalq" };
}
