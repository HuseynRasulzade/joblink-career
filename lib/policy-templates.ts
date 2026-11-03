// Starting texts for the documents a company keeps: drafts only, to be read and changed by the company's lawyer.
export const POLICY_TEMPLATES: { id: string; kind: "rules" | "policy" | "consent"; title: string; body: string }[] = [
  {
    id: "rules",
    kind: "rules",
    title: "Daxili əmək qaydaları",
    body: `1. Ümumi müddəalar
Bu qaydalar Azərbaycan Respublikasının Əmək Məcəlləsinə uyğun olaraq işəgötürən və işçilər arasında əmək münasibətlərini tənzimləyir. Qaydalar bütün işçilər üçün məcburidir.

2. İş vaxtı və istirahət
İş vaxtı həftədə 40 saatdan çox olmamaqla əmək müqaviləsində göstərilən qrafikə uyğun müəyyən edilir. İşə gəlmə və çıxma vaxtı, nahar fasiləsi və növbə qrafiki şirkətin cədvəlində göstərilir. İstirahət və bayram günlərində işə cəlb yalnız yazılı əmrlə və qanunda nəzərdə tutulmuş qaydada həyata keçirilir.

3. Məzuniyyət
İllik əmək məzuniyyəti məzuniyyət qrafikinə əsasən verilir. Məzuniyyət barədə ərizə qabaqcadan rəhbərə təqdim edilir və əmrlə rəsmiləşdirilir.

4. İşçinin vəzifələri
Əmək funksiyalarını vicdanla yerinə yetirmək, əmək intizamına və əməyin mühafizəsi qaydalarına riayət etmək, şirkətin əmlakına qayğı göstərmək, kommersiya sirrini və şəxsi məlumatları qorumaq.

5. İşəgötürənin vəzifələri
Əmək müqaviləsinə uyğun iş və təhlükəsiz əmək şəraiti təmin etmək, əmək haqqını vaxtında ödəmək, işçilərin hüquqlarına hörmət etmək.

6. Həvəsləndirmə və intizam
Nümunəvi əməyə görə mükafat verilə bilər. Əmək intizamının pozulmasına görə qanunda nəzərdə tutulmuş intizam tənbehi tətbiq edilir; tənbehdən əvvəl işçidən izahat tələb olunur.

7. Əməyin mühafizəsi
İşçi giriş və dövri təlimatlardan keçir, tibbi baxışdan keçmək və təhlükəli vəziyyət barədə rəhbərə dərhal məlumat vermək öhdəliyini daşıyır. Hər bir qəza və yaxın hadisə qeydə alınır.

8. Yekun müddəalar
Qaydalar dəyişdikdə yeni versiya təsdiq edilir və işçilər yenidən tanış edilir.`,
  },
  {
    id: "consent",
    kind: "consent",
    title: "Şəxsi məlumatların işlənməsinə razılıq",
    body: `Mən, bu razılığı təsdiq edən işçi, şirkətin mənim şəxsi məlumatlarımı (ad, soyad, ata adı, doğum tarixi, FİN, şəxsiyyət vəsiqəsi məlumatları, ünvan, əlaqə məlumatları, təhsil və iş stajı, bank hesabı, sağlamlıq və əlillik haqqında məlumat, ailə vəziyyəti) aşağıdakı məqsədlərlə işləməsinə razılıq verirəm:
- əmək münasibətlərinin rəsmiləşdirilməsi və kadr uçotunun aparılması,
- əmək haqqının hesablanması, vergi və sosial sığorta ödənişlərinin həyata keçirilməsi,
- əməyin mühafizəsi və tibbi baxışların təşkili,
- qanunvericiliklə nəzərdə tutulmuş hallarda dövlət orqanlarına məlumat verilməsi.

Məlumatlar yalnız bu məqsədlər üçün və qanunla müəyyən edilmiş müddət ərzində saxlanılır. Mən bu razılığı istənilən vaxt geri götürə bilərəm; bu halda məlumatların işlənməsi qanunla məcburi olan hallar istisna olmaqla dayandırılır.`,
  },
  {
    id: "privacy",
    kind: "policy",
    title: "Şəxsi məlumatların qorunması siyasəti",
    body: `Şirkət işçilərin şəxsi məlumatlarını yalnız əmək münasibətlərinin tələb etdiyi həddə toplayır, onlara yalnız vəzifə öhdəliyi olan şəxslərin çıxışını verir və qanunla müəyyən edilmiş müddət bitəndən sonra məhv edir.
Hər işçi öz məlumatlarına baxa, düzəliş tələb edə və razılığını geri götürə bilər. Müraciətlər kadr şöbəsinə yazılı şəkildə edilir.
Məlumatların üçüncü şəxslərə ötürülməsi yalnız qanunvericilikdə nəzərdə tutulan hallarda və ya işçinin razılığı ilə həyata keçirilir.`,
  },
];
