import { PLAN_PERIOD_DAYS, type Plan } from "./plans.ts";

// Platform service agreement generated for a chosen package. It is a draft
// that must be reviewed by a lawyer before it is relied on.
export type ContractParty = {
  kind: "candidate" | "company";
  name: string;
  email: string;
  voen?: string;
  address?: string;
  representative?: string;
};
export type ContractOperator = { name: string; voen: string; address: string; email: string };
export type ContractInput = {
  id: string;
  date: string; // YYYY-MM-DD
  party: ContractParty;
  plan: Plan;
  operator: ContractOperator;
  autoRenew: boolean;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
};
export type Contract = { number: string; title: string; sections: { heading: string; paragraphs: string[] }[]; text: string };

const missing = "[daxil edilməlidir]";
const fill = (value: string | undefined) => (value && value.trim() ? value.trim() : missing);
export const contractNumber = (id: string, date: string) => `JL-${date.replace(/-/g, "")}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
const price = (azn: number) => `${azn.toLocaleString("az-AZ", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} AZN`;

// 2026-11-10 -> "10.11.2026"
const dmy = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

export function buildServiceContract(input: ContractInput): Contract {
  const { party, plan, operator } = input;
  const number = contractNumber(input.id, input.date);
  const company = party.kind === "company";
  const partyLabel = company ? "İstifadəçi (işəgötürən)" : "İstifadəçi";
  const partyIntro = company
    ? `${fill(party.name)} (VÖEN: ${fill(party.voen)}), ${fill(party.representative)} simasında, nizamnamə və ya etibarnamə əsasında fəaliyyət göstərən hüquqi şəxs`
    : `${fill(party.name)}, fiziki şəxs`;
  const limits = plan.limits;
  const included = [
    ...plan.features,
    ...(limits.aiAccess ? ["Süni intellekt köməkçisi, xülasə yazma, karyera tövsiyəsi və vakansiya uyğunluğu şərhi"] : []),
  ];
  const sections: Contract["sections"] = [
    {
      heading: "1. Müqavilənin predmeti",
      paragraphs: [
        `1.1. Operator İstifadəçiyə Joblink onlayn platformasında “${plan.name}” paketi üzrə xidmətlərin göstərilməsini, İstifadəçi isə həmin xidmətlərə görə haqqı ödəməyi öhdəsinə götürür.`,
        "1.2. Platforma iş axtaranlarla işəgötürənləri bir araya gətirən vasitəçi xidmətdir. Operator işə qəbul, müsahibə, əmək müqaviləsi və ya işə düzəlmə nəticəsinə zəmanət vermir.",
      ],
    },
    {
      heading: "2. Paket və xidmətlərin həcmi",
      paragraphs: [
        `2.1. Paket: “${plan.name}”. Qiymət: ${price(plan.priceAzn)} / ${PLAN_PERIOD_DAYS} gün.`,
        `2.2. Paketə daxildir: ${included.join("; ")}.`,
        ...(limits.aiApplyPerDay || limits.cvAnalysesPerDay || limits.cvFixesPerDay
          ? [`2.3. Gündəlik limitlər: AI vasitəsilə müraciət — ${limits.aiApplyPerDay} şirkət, AI CV analizi — ${limits.cvAnalysesPerDay}, ATS təklifləri ilə CV düzəlişi — ${limits.cvFixesPerDay}. Limitlər hər təqvim günü yenilənir və növbəti günə keçmir.`]
          : []),
        `2.${limits.aiApplyPerDay || limits.cvAnalysesPerDay || limits.cvFixesPerDay ? 4 : 3}. Xidmətlər paketin qüvvədə olduğu müddətdə göstərilir. Müddət bitdikdə və yenilənmədikdə İstifadəçinin hesabı ödənişsiz (paketsiz) profil rejiminə keçir, hesab və daxil edilmiş məlumatlar silinmir.`,
      ],
    },
    {
      heading: "3. Qiymət və ödəniş qaydası",
      paragraphs: [
        `3.1. Paketin müddəti ${dmy(input.periodStart)} – ${dmy(input.periodEnd)} tarixlərini əhatə edir (${PLAN_PERIOD_DAYS} gün). Haqq Azərbaycan manatı ilə, İstifadəçinin seçdiyi ödəniş vasitəsi ilə ödənilir.`,
        input.autoRenew
          ? "3.2. İstifadəçi avtomatik ödənişi seçib: hər dövr bitdikdə növbəti dövrün haqqı saxlanılmış ödəniş vasitəsindən avtomatik tutulur. İstifadəçi avtomatik yenilənməni hesab ayarlarından istənilən vaxt söndürə bilər; bu halda cari dövr sonunadək xidmət davam edir, sonra yenilənmir."
          : "3.2. İstifadəçi avtomatik ödənişi seçməyib: dövr bitdikdə paket yenilənmir və İstifadəçi paketi yenidən seçə bilər.",
        "3.3. Ödəniş alınmadıqda (məsələn, vəsait çatışmadıqda) paket yenilənmir və xidmətlər göstərilməsi dayandırılır. Kart nömrəsi Operatorun serverində saxlanılmır; yalnız kartın növü, son dörd rəqəmi və bitmə tarixi görünür.",
        "3.4. Göstərilmiş dövr üçün ödənilmiş haqq, xidmət göstərildiyi halda, qanunvericiliklə başqa hal nəzərdə tutulmayıbsa, geri qaytarılmır.",
      ],
    },
    {
      heading: "4. Tərəflərin hüquq və vəzifələri",
      paragraphs: [
        "4.1. Operator xidmətləri paketin şərtlərinə uyğun göstərməyə, texniki nasazlıqları ağlabatan müddətdə aradan qaldırmağa və İstifadəçinin məlumatlarını qorumağa borcludur.",
        `4.2. ${partyLabel} qeydiyyat zamanı düzgün məlumat verməyə, hesabın giriş məlumatlarını üçüncü şəxslərə verməməyə, platformadan qanuna zidd məqsədlə və ya yanlış (saxta) məlumatla istifadə etməməyə borcludur.`,
        ...(company
          ? [
              "4.3. İşəgötürən platformadan istifadə edərək işə qəbul etdiyi işçilərin ad, soyad və digər məlumatlarını platformada qeydiyyata almaq üçün zəruri razılıqları əldə etməyə və bu məlumatları yalnız qanuni məqsədlə işləməyə borcludur. İşçilərin əmək haqqı və ayrılma səbəbləri kimi məlumatlar yalnız şirkətin səlahiyyətli şəxslərinə (HR, direktor, hesab sahibi) görünür.",
              "4.4. İşəgötürən vakansiyalarda ayrı-seçkilik edən tələblər (cins, yaş, milli mənsubiyyət, din və s.) yerləşdirməməyə borcludur.",
            ]
          : [
              "4.3. İstifadəçi özü haqqında daxil etdiyi məlumatların (iş yeri, təhsil, sertifikat) düzgünlüyünə görə məsuliyyət daşıyır. Operator bu məlumatları sənədlə təsdiqləmək üçün xidmət göstərə bilər, lakin düzgünlüyünə zəmanət vermir.",
            ]),
      ],
    },
    {
      heading: "5. Şəxsi məlumatların qorunması",
      paragraphs: [
        "5.1. Operator İstifadəçinin şəxsi məlumatlarını “Şəxsi məlumatlar haqqında” Azərbaycan Respublikası Qanununa uyğun, yalnız xidmətlərin göstərilməsi məqsədi ilə işləyir.",
        "5.2. Süni intellekt xidmətlərindən istifadə edildikdə CV və profil mətni analiz məqsədi ilə xarici xidmət təchizatçısına ötürülə bilər. Bu, yalnız İstifadəçinin müvafiq razılığı ilə həyata keçirilir.",
        "5.3. İstifadəçi öz məlumatlarına baxmaq, düzəltmək və hesabı silməklə məlumatların silinməsini tələb etmək hüququna malikdir.",
      ],
    },
    {
      heading: "6. Məsuliyyət",
      paragraphs: [
        "6.1. Tərəflər müqavilə üzrə öhdəliklərini yerinə yetirmədikdə Azərbaycan Respublikasının qanunvericiliyinə uyğun məsuliyyət daşıyırlar.",
        "6.2. Operatorun məsuliyyəti İstifadəçinin cari dövr üçün ödədiyi haqq məbləği ilə məhdudlaşır, qanunvericiliklə başqa hal nəzərdə tutulmayıbsa. Operator işəgötürənlərin və ya namizədlərin təqdim etdiyi məlumatların düzgünlüyünə və üçüncü şəxslərin hərəkətlərinə görə məsuliyyət daşımır.",
        "6.3. Qarşısıalınmaz hallar (fors-major) zamanı tərəflər məsuliyyətdən azad olunurlar.",
      ],
    },
    {
      heading: "7. Müqavilənin müddəti və xitam",
      paragraphs: [
        `7.1. Müqavilə İstifadəçinin təsdiqlədiyi gündən (${dmy(input.date)}) qüvvəyə minir və paketin ödənilmiş dövrü bitənədək qüvvədə qalır. Avtomatik yenilənmə seçilibsə, müqavilə hər yeni dövr üçün eyni şərtlərlə davam edir.`,
        "7.2. İstifadəçi istənilən vaxt avtomatik yenilənməni söndürməklə və ya hesabı silməklə müqaviləni dayandıra bilər. Operator şərtlərin pozulması halında xidməti dayandıra bilər.",
        "7.3. Operator paketlərin qiymətini və tərkibini dəyişə bilər; dəyişiklik İstifadəçiyə ən azı 30 gün əvvəl bildirilir və cari ödənilmiş dövrə təsir etmir.",
      ],
    },
    {
      heading: "8. Mübahisələrin həlli",
      paragraphs: [
        "8.1. Mübahisələr danışıqlar yolu ilə həll edilir. Razılıq əldə olunmadıqda mübahisə Azərbaycan Respublikasının qüvvədə olan qanunvericiliyinə uyğun olaraq səlahiyyətli məhkəmədə baxılır.",
        ...(company ? [] : ["8.2. İstifadəçi fiziki şəxs kimi “İstehlakçıların hüquqlarının müdafiəsi haqqında” Qanunla nəzərdə tutulmuş hüquqlardan istifadə edə bilər."]),
      ],
    },
    {
      heading: "9. Digər şərtlər",
      paragraphs: [
        "9.1. Müqavilə elektron formada, İstifadəçinin platformada paketi seçib şərtlərlə razılığını təsdiqləməsi ilə bağlanır. Elektron təsdiq “Elektron imza və elektron sənəd haqqında” Azərbaycan Respublikası Qanununa uyğun sənəd hesab olunur.",
        "9.2. Müqaviləyə dəyişikliklər yazılı və ya platforma vasitəsilə elektron formada edilir.",
        "9.3. Müqavilənin bu şərtlərində nəzərdə tutulmayan məsələlərə Azərbaycan Respublikasının Mülki Məcəlləsi və digər qanunvericilik aktları tətbiq edilir.",
      ],
    },
    {
      heading: "10. Tərəflərin rekvizitləri",
      paragraphs: [
        `Operator: ${fill(operator.name)}; VÖEN: ${fill(operator.voen)}; ünvan: ${fill(operator.address)}; e-poçt: ${fill(operator.email)}.`,
        `${partyLabel}: ${partyIntro}; e-poçt: ${fill(party.email)}${company ? `; ünvan: ${fill(party.address)}` : ""}.`,
      ],
    },
  ];
  const title = `Joblink platformasında “${plan.name}” paketi üzrə xidmət müqaviləsi`;
  const head = [
    title,
    `№ ${number}`,
    `Bakı şəhəri, ${dmy(input.date)}`,
    "",
    `${fill(operator.name)} (bundan sonra “Operator”) bir tərəfdən və ${partyIntro} (bundan sonra “İstifadəçi”) digər tərəfdən aşağıdakı şərtlərlə müqavilə bağladılar:`,
  ];
  const body = sections.flatMap((section) => ["", section.heading, ...section.paragraphs]);
  return { number, title, sections, text: [...head, ...body].join("\n") };
}


