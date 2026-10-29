// What the Labor Code and the Tax Code give an employee because of disability, children and similar status,
// worked out from the personal data of the employee. Article numbers are those of the codes.
import type { EmployeeProfile } from "./employee-profile.ts";
import { ageOn } from "./employee-profile.ts";

export type TaxBenefit = { id: string; label: string; short: string; amount: number; article: string };

// Income-tax reductions of a monthly wage at the main workplace (Tax Code 102.1-1, 102.2, 102.3, 102.4).
export const TAX_BENEFITS: TaxBenefit[] = [
  { id: "martyr-family", short: "Şəhid ailəsi", label: "Şəhid statusu almış şəxslərin valideynləri, dul arvadları (ərləri) və övladları", amount: 800, article: "102.1-1" },
  { id: "hero-patriotic-war", short: "Vətən Müharibəsi Qəhrəmanı", label: "Vətən Müharibəsi Qəhrəmanı", amount: 400, article: "102.2.1" },
  { id: "hero-national", short: "Milli Qəhrəman", label: "Azərbaycanın Milli Qəhrəmanı", amount: 400, article: "102.2.1-1" },
  { id: "hero-soviet", short: "Sovet Qəhrəmanı", label: "Sovet İttifaqı və ya Sosialist Əməyi Qəhrəmanı", amount: 400, article: "102.2.2" },
  { id: "order-glory", short: "Şöhrət ordeni", label: "Şöhrət ordeninin üç dərəcəsi ilə təltif edilmiş şəxs", amount: 400, article: "102.2.3" },
  { id: "war-disabled-12", short: "Müharibə əlili (I-II)", label: "I və II qrup müharibə ilə əlaqədar əlilliyi olan şəxs", amount: 400, article: "102.2.4" },
  { id: "fallen-widow-child", short: "Döyüşçünün dul arvadı və ya övladı", label: "Həlak olmuş döyüşçülərin (şəhid olmayan) dul arvadı (əri) və övladları", amount: 400, article: "102.2.5" },
  { id: "rear-front", short: "Arxa cəbhə təltifli", label: "1941–1945-ci illərdə arxa cəbhədə əməyinə görə orden və medallarla təltif edilmiş şəxs", amount: 400, article: "102.2.6" },
  { id: "war-veteran", short: "Müharibə veteranı", label: "Müharibə veteranı", amount: 400, article: "102.2.7" },
  { id: "chernobyl-radiation", short: "Çernobıl və radiasiya", label: "Çernobıl və digər radiasiya qəzalarında şüa xəstəliyinə tutulmuş şəxs", amount: 400, article: "102.2.8" },
  { id: "mine-clearance-family", short: "Minatəmizləyənin ailəsi", label: "Minatəmizləmədə həlak olanların valideyni, dul arvadı (əri) və övladları", amount: 400, article: "102.2.9" },
  { id: "disabled-61-100", short: "Əlillik 61-100%", label: "Orqanizmin funksiyalarının 61–100% pozulmasına görə əlilliyi olan şəxs (müharibə ilə əlaqədar olanlar istisna)", amount: 200, article: "102.3" },
  { id: "disabled-child-self", short: "Əlilliyi olan uşaq", label: "Əlilliyi olan uşaq", amount: 200, article: "102.3" },
  { id: "carer-permanent", short: "Daimi qulluq edən (200)", label: "Daimi qulluq tələb edən əlilliyi olan uşağa və ya 81–100% əlilliyi olan şəxsə baxan və onunla yaşayan valideyn, arvad (ər), himayəçi, qəyyum", amount: 200, article: "102.3" },
  { id: "fallen-parent", short: "Həlak olanın valideyni", label: "Həlak olmuş döyüşçülərin və vəzifə borcunu yerinə yetirərkən həlak olmuş dövlət qulluqçularının valideyni (arvadı/əri)", amount: 100, article: "102.4.1" },
  { id: "jan20-territorial-family", short: "20 Yanvar və ərazi bütövlüyü ailəsi", label: "20 Yanvar və ərazi bütövlüyünün müdafiəsində həlak olanların valideyni, arvadı (əri), övladları", amount: 100, article: "102.4.2" },
  { id: "afghan-servicemen", short: "Əfqanıstan və döyüş ölkələri", label: "Əfqanıstana və döyüş əməliyyatları aparılan ölkələrə göndərilmiş hərbi qulluqçu, təlim toplanışına çağırılmış hərbi vəzifəli", amount: 100, article: "102.4.3" },
  { id: "carer-degree1", short: "Daimi qulluq edən (I dərəcə)", label: "Daimi qulluq tələb edən sağlamlıq imkanları məhdud uşağa və ya I dərəcə əlilliyi olan şəxsə baxan və onunla yaşayan valideyn, arvad (ər), himayəçi, qəyyum", amount: 100, article: "102.4.4" },
  { id: "idp", short: "Məcburi köçkün", label: "Məcburi köçkün və ona bərabər tutulan şəxs", amount: 100, article: "102.4.5" },
];
export const DEPENDENTS_REDUCTION = 50; // 102.5
export const taxBenefit = (id: string) => TAX_BENEFITS.find((b) => b.id === id);

// Benefits the personal data points to (the largest first); the employee still has to hand in the papers (102.8).
export function suggestedBenefits(profile: EmployeeProfile): TaxBenefit[] {
  const ids: string[] = [];
  const impaired = profile.disability === "p61_80" || profile.disability === "p81_100";
  if (profile.disabilityWar && (profile.disabilityDegree === "I" || profile.disabilityDegree === "II")) ids.push("war-disabled-12");
  else if (impaired && !profile.disabilityWar) ids.push("disabled-61-100");
  if (profile.careDependent === "child" || profile.careDependent === "adult81") ids.push("carer-permanent");
  if (profile.careDependent === "degree1") ids.push("carer-degree1");
  return ids.map((id) => taxBenefit(id)!).sort((a, b) => b.amount - a.amount);
}

// The monthly reduction of the taxable wage: the one chosen benefit (only the largest of 102.1-1, 102.2, 102.3, 102.4
// is given, 102.7) plus 50 AZN for a supporter of three or more (102.5, which is not in that list). Only at the main
// workplace and from the month the papers were handed in (102.8).
export function taxReduction(profile: Pick<EmployeeProfile, "taxBenefit" | "taxBenefitFrom" | "dependents3" | "mainJob">, today: string): number {
  if (!profile.mainJob) return 0;
  const started = !profile.taxBenefitFrom || profile.taxBenefitFrom <= today;
  const benefit = started ? taxBenefit(profile.taxBenefit)?.amount || 0 : 0;
  return benefit + (profile.dependents3 ? DEPENDENTS_REDUCTION : 0);
}

export type Right = { id: string; text: string; article: string };

// Rights and limits that follow from the data, for the HR officer and the calculators.
export function employeeRights(profile: EmployeeProfile, today: string): Right[] {
  const out: Right[] = [];
  const age = ageOn(profile.birthDate, today);
  const impaired = profile.disability === "p61_80" || profile.disability === "p81_100";
  const disabled = Boolean(profile.disability) || Boolean(profile.disabilityDegree);
  if (impaired) out.push({ id: "short-week", text: "Qısaldılmış iş vaxtı: həftədə 36 saatdan çox olmamalıdır; əmək haqqı tam ödənilir.", article: "Əmək M. 91.2, 159.2" });
  if (disabled) {
    out.push({ id: "leave-time", text: "Əmək məzuniyyəti arzusu ilə özünə əlverişli vaxtda verilir.", article: "Əmək M. 133.3" });
    out.push({ id: "first-year-leave", text: "Birinci iş ilinin məzuniyyətindən altı ay işləmədən də istifadə edə bilər.", article: "Əmək M. 131.4" });
    out.push({ id: "part-time", text: "Tibbi rəyə görə natamam iş vaxtı (iş günü və ya həftəsi) tələb edə bilər; işəgötürən müəyyən etməlidir.", article: "Əmək M. 94.3" });
  }
  if (disabled && age !== null && age < 18) {
    out.push({ id: "leave-42", text: "Əmək məzuniyyəti 42 təqvim günündən az olmamalıdır (əlavə məzuniyyətlər verilmir).", article: "Əmək M. 119.2, 116.3" });
    out.push({ id: "unpaid-month", text: "Xahişlə bir təqvim ayınadək ödənişsiz məzuniyyət.", article: "Əmək M. 130-ç" });
  }
  if (profile.disabledChildren > 0) {
    out.push({ id: "unpaid-14", text: "Əlilliyi olan uşağa görə xahişlə 14 təqvim gününədək ödənişsiz məzuniyyət (bir iş ilində).", article: "Əmək M. 130-x, 130-ə" });
    out.push({ id: "retention", text: "Ştat ixtisarında işdə saxlanmağa üstünlüyü var (əlilliyi olan uşağı və ya 81–100% əlilliyi olan ailə üzvü olan işçi).", article: "Əmək M. 78" });
    if (profile.gender === "female") {
      out.push({ id: "extra-leave-5", text: "Əlavə 5 təqvim günü məzuniyyət (əsas və əlavə məzuniyyətdən asılı olmayaraq).", article: "Əmək M. 117" });
      out.push({ id: "no-night", text: "Gecə işinə, iş vaxtından artıq işə, istirahət və bayram günlərində işə cəlb edilməsinə və ezamiyyətə göndərilməsinə yalnız onun yazılı razılığı ilə yol verilir.", article: "Əmək M. 98.3, 242.1" });
      out.push({ id: "convenient-leave", text: "Məzuniyyət onun üçün əlverişli vaxtda verilir.", article: "Əmək M. 133.3" });
    }
  }
  if (profile.careDependent === "adult81" || profile.careDependent === "child") {
    out.push({ id: "retention-care", text: "Öhdəsində daimi qulluq tələb edən ailə üzvü olduğuna görə ixtisarda işdə saxlanma üstünlüyü.", article: "Əmək M. 78" });
  }
  const reduction = taxReduction(profile, today);
  const chosen = taxBenefit(profile.taxBenefit);
  if (chosen) out.push({ id: "tax", text: `Gəlir vergisi güzəşti: vergi tutulan aylıq gəlir ${chosen.amount} AZN azaldılır${profile.taxBenefitFrom && profile.taxBenefitFrom > today ? ` (${profile.taxBenefitFrom} tarixindən)` : ""}.`, article: `Vergi M. ${chosen.article}` });
  if (profile.dependents3) out.push({ id: "tax-50", text: `Himayəsində azı üç nəfər olan işçinin vergi tutulan aylıq gəliri ${DEPENDENTS_REDUCTION} AZN azaldılır.`, article: "Vergi M. 102.5" });
  if (!profile.mainJob && (chosen || profile.dependents3)) out.push({ id: "tax-main", text: "Vergi güzəştləri yalnız əsas iş yerində (əmək kitabçasının olduğu yerdə) tətbiq edilir; bu iş yerində güzəşt hesablanmır.", article: "Vergi M. 102.8" });
  if (reduction > 0 || chosen) out.push({ id: "tax-note", text: "Güzəştlərdən yalnız biri — məbləğcə ən böyüyü — verilir (102.1-1, 102.2, 102.3, 102.4); güzəşt sənəd təqdim edildiyi andan tətbiq olunur.", article: "Vergi M. 102.7, 102.8" });
  return out;
}

export type WeekHours = { hours: 24 | 36 | 40; reason: string };

// The longest working week of the employee: 24 hours under 16, 36 hours at 16–17 and with 61–100% impairment of body
// functions (Labor Code 91.2), otherwise the normal 40 hours (89.3). Pay stays that of the full norm (159.2).
// Pregnant women and mothers or sole parents of small children are also named in 91.2, but their data is not kept here.
export function weeklyHours(profile: Pick<EmployeeProfile, "birthDate" | "disability">, today: string): WeekHours {
  const age = ageOn(profile.birthDate, today);
  if (age !== null && age < 16) return { hours: 24, reason: "16 yaşınadək işçi (Əmək M. 91.2)" };
  if (age !== null && age < 18) return { hours: 36, reason: "16–18 yaşlı işçi (Əmək M. 91.2)" };
  if (profile.disability === "p61_80" || profile.disability === "p81_100") return { hours: 36, reason: "orqanizmin funksiyalarının 61–100% pozulmasına görə əlillik (Əmək M. 91.2)" };
  return { hours: 40, reason: "" };
}
