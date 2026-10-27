// How widely a credential is recognized, so that certificates of the same field
// are not weighed equally: a global chartered qualification counts more than a
// national programme, a vendor foundation exam or a short online course.
export type PrestigeLabel =
  | "dünya səviyyəli"
  | "yüksək beynəlxalq"
  | "beynəlxalq"
  | "başlanğıc səviyyə"
  | "milli";
export type Prestige = { weight: number; label: PrestigeLabel };

const ids = (text: string) => new Set(text.split(/\s+/).filter(Boolean));

// Chartered, licensing and expert-level qualifications recognized worldwide.
const GLOBAL = ids(`
  acca cima cgma cpa-us icaew-aca icas-ca ca-anz cpa-australia cfa cma-ima cia
  frm cams cfe cfp caia cipfa
  cii cpcu rics ccim
  pmp pgmp prince2 ipma
  cbap
  cipd shrm-scp sphr gphr
  cips cscp cpim cpsm
  cissp cism cisa crisc ccsp oscp giac ccie
  nebosh-diploma pe-license ceng api-510 api-570 api-653 cswip cmrp
  usmle plab nclex
  bar-intl
`);
// Professional-level vendor and standards credentials.
const HIGH = ids(`
  acca-dipifr icaew-ifrs cta-uk adit prm garp-scr cisi crma
  flmi ains cpm-irem
  pmi-rmp pmi-sp pmi-acp safe msp agilepm apm-pmq
  ccba pmi-pba bcs-ba cmi cpre
  six-sigma asq-cqe asq-cqa asq-cmq iso9001-la iso14001-la iso45001-la iso22000-la iso27001-la
  cltd scpro cpp-nigp
  phr shrm-cp
  ccnp rhce vmware-vcp togaf cobit
  aws-saa aws-devops aws-security aws-data-engineer aws-ml aws-networking
  gcp-pca gcp-pde gcp-pmle gcp-devops gcp-security
  az-305 az-400 az-500 az-700 cks terraform
  databricks snowflake dp-203 dp-100 cap-informs cdmp
  comptia-casp comptia-pentest ceh cbcp cipp cipm cipt aigp pci-isa
  nebosh-igc nebosh-process nebosh-env nebosh-fire iosh-ms csp-bcsp iwcf
  aws-cwi iiw-welding asnt-ndt pcn-ndt ampp-coating ampp-corrosion cem leed breeam isa-cap
  ccep ica-compliance ciarb cedr-mediator
  atls acls pals cphq
  pilot-licence easa-part66 stcw atc
  cim sap-certified sap-fico sap-mm oracle-erp-cert
  wset sommelier pgce celta delta icf
`);
// Foundation exams, short courses and platform certificates.
const ENTRY = ids(`
  acca-fia acca-certifr
  capm ecba
  aws-ccp az-900 pl-900 gcp-cdl comptia-a ccst isc2-cc
  google-ads google-analytics google-digital-marketing meta-blueprint
  hubspot-inbound hubspot-sales semrush-seo hootsuite amazon-ads tiktok-ads
  google-it-support google-it-automation google-data-analytics ibm-data-science
  meta-frontend meta-backend deeplearning-ai google-ux pcep
  mos icdl ic3 excel-expert google-workspace cap-iaap
  bls first-aid food-hygiene haccp tefl tkt
  linkedin-recruiter aihr mbti hogan
  google-educator microsoft-educator cambridge-ict
  working-at-height forklift leea-rigging
  duolingo oxford-test linguaskill
  fmva bloomberg-bmc
`);
// Granted by a national body: respected locally, not recognized worldwide.
const NATIONAL = ids(`
  az-auditor az-professional-accountant az-pms-ifrs az-tax-consultant az-bar
  az-teacher-cert tour-guide 1c-specialist trki tomer yds
`);

export function certificationPrestige(id: string): Prestige {
  if (GLOBAL.has(id)) return { weight: 1, label: "dünya səviyyəli" };
  if (HIGH.has(id)) return { weight: 0.85, label: "yüksək beynəlxalq" };
  if (NATIONAL.has(id)) return { weight: 0.4, label: "milli" };
  if (ENTRY.has(id)) return { weight: 0.5, label: "başlanğıc səviyyə" };
  // Everything else (associate-level vendor exams, language tests, ISO and
  // industry courses): internationally recognized, not top level.
  return { weight: 0.7, label: "beynəlxalq" };
}
