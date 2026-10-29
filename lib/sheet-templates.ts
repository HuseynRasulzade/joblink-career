// The Excel file to fill in for each import: a sheet with sample rows, and a sheet that says what each column
// holds, whether it is required, its format and the allowed values. The sample rows are read back by the real
// parsers in the tests, so a template can never drift from what the import accepts.
import { ATTENDANCE_CODES } from "./calendar-az.ts";
import type { XlsxCell, XlsxSheet } from "./xlsx.ts";
import { TAX_BENEFITS } from "./employee-rights.ts";

export type SheetKind = "employees" | "staff" | "structure" | "sections" | "attendance" | "calendar" | "profiles" | "questions" | "payroll" | "hours" | "assets";
export type TemplateColumn = { header: string; required: boolean; format: string; description: string; values?: string };
export type SheetTemplate = {
  title: string; // what the file is for
  file: string;
  sheet: string;
  columns: TemplateColumn[];
  examples: XlsxCell[][];
  rules: string[];
};

const DATE = "Tarix: 2026-03-16 və ya 16.03.2026";
const codes = ATTENDANCE_CODES.map((c) => `${c.label.replace(/\s*\(.*\)\s*/, "")} (${c.short})`).join("; ");

export const SHEET_TEMPLATES: Record<SheetKind, SheetTemplate> = {
  employees: {
    title: "İşçilər",
    file: "isciler-numune.xlsx",
    sheet: "İşçilər",
    columns: [
      { header: "Ad Soyad", required: true, format: "Mətn", description: "İşçinin soyadı, adı. Eyni ad və başlama tarixi olan işçi yenilənir." },
      { header: "Vəzifə", required: false, format: "Mətn", description: "Vəzifə kataloqundakı ad; kataloqda yoxdursa şirkət siyahısına əlavə olunur və adminə sorğu gedir." },
      { header: "Departament", required: false, format: "Mətn", description: "Struktur bölməsindəki departament adı; yoxdursa yaradılır." },
      { header: "Şöbə", required: false, format: "Mətn", description: "Həmin departamentin şöbəsi; yoxdursa yaradılır." },
      { header: "İşə başlama", required: false, format: DATE, description: "İşə qəbul tarixi. Staj və məzuniyyət bundan hesablanır." },
      { header: "Əmək haqqı", required: false, format: "Rəqəm, AZN", description: "Aylıq məbləğ. Ştat cədvəlində vəzifəyə maaş həddi varsa, həddən kənar sətir yüklənmir. Maaş icazəsi tələb edir." },
      { header: "Maaş növü (gross/net)", required: false, format: "gross və ya net", description: "Əmək haqqı sütunundakı məbləğ vergilərdən əvvəl (gross) yoxsa sonradır (net).", values: "gross, net" },
      { header: "Sektor (özəl/dövlət)", required: false, format: "özəl və ya dövlət", description: "Vergi dərəcəsi üçün sektor.", values: "özəl, dövlət" },
      { header: "E-poçt", required: false, format: "E-poçt", description: "Varsa eyni e-poçtlu işçi yenilənir." },
      { header: "Telefon", required: false, format: "+994501234567", description: "Əlaqə telefonu." },
      { header: "Məzuniyyət günləri (il üçün)", required: false, format: "Tam ədəd", description: "İllik əsas məzuniyyət hüququ (boşdursa 21).", values: "21, 30" },
      { header: "İstifadə olunmuş məzuniyyət", required: false, format: "Tam ədəd", description: "İndiyədək işçinin istifadə etdiyi məzuniyyət günü." },
    ],
    examples: [
      ["Aysel Məmmədova", "Baş mühasib", "Maliyyə", "Mühasibat", "2024-04-09", 2800, "gross", "özəl", "aysel@example.az", "+994501234567", 21, 5],
      ["Orxan Əliyev", "Satış meneceri", "Satış", "Daxili satış", "2025-01-15", 1500, "net", "özəl", "orxan@example.az", "+994551112233", 21, 0],
      ["Nigar Quliyeva", "Hüquqşünas", "Hüquq", "", "2023-09-01", 2000, "gross", "özəl", "", "", 30, 12],
    ],
    rules: ["Birinci sətirdə sütun adları olmalıdır; sütunların sırası vacib deyil, lazımsız sütunları silə bilərsiniz.", "Bir dəfəyə ən çox 500 işçi yüklənir.", "Departament, şöbə və vəzifə yazılışı fərqli olsa da (böyük-kiçik hərf) kataloqdakı ad seçilir, dublikat yaranmır."],
  },
  staff: {
    title: "Ştat cədvəli",
    file: "stat-numune.xlsx",
    sheet: "Ştat",
    columns: [
      { header: "Departament", required: true, format: "Mətn", description: "Departamentin adı; strukturda yoxdursa yaradılır." },
      { header: "Şöbə", required: false, format: "Mətn", description: "Departamentin şöbəsi; boş ola bilər." },
      { header: "Vəzifə", required: true, format: "Mətn", description: "Vəzifə adı (kataloqdan)." },
      { header: "Ştat sayı", required: false, format: "Tam ədəd", description: "Bu vəzifə üçün neçə nəfər nəzərdə tutulub (boşdursa 1)." },
      { header: "Ştat dərəcəsi", required: false, format: "Mətn", description: "Tam ştat, 3/4, yarım ştat və ya 1/4 ştat.", values: "tam, 3/4, yarım, 1/4" },
      { header: "Əmək haqqı", required: false, format: "Rəqəm, AZN gross", description: "Maaş həddinin minimumu. İşçiyə bu həddən aşağı maaş təyin etmək olmaz." },
      { header: "Maksimum əmək haqqı", required: false, format: "Rəqəm, AZN gross", description: "Maaş həddinin maksimumu. Boşdursa minimumla eynidir; işçiyə bundan yuxarı maaş təyin etmək olmaz." },
      { header: "Qeyd", required: false, format: "Mətn", description: "İstədiyiniz izah." },
    ],
    examples: [
      ["Maliyyə", "Mühasibat", "Baş mühasib", 1, "tam", 2500, 3000, ""],
      ["Maliyyə", "Mühasibat", "Mühasib", 2, "yarım", 800, 1200, "yarım ştat"],
      ["Satış", "Daxili satış", "Satış meneceri", 3, "tam", 1000, 1800, ""],
    ],
    rules: ["Plan təsdiqləndikdən sonra yükləmə direktorun təsdiqinə göndərilir.", "Eyni departament, şöbə və vəzifə olan sətir yenilənir, yenisi əlavə olunur.", "Fayl əvvəlcə “XLSX” ixracı ilə də alına bilər: ixrac fayl bu şablonun sütunları ilə başlayır."],
  },
  structure: {
    title: "Departament və şöbələr",
    file: "struktur-numune.xlsx",
    sheet: "Struktur",
    columns: [
      { header: "Departament", required: true, format: "Mətn", description: "Departamentin adı." },
      { header: "Şöbə", required: false, format: "Mətn", description: "Həmin departamentin şöbəsi. Boşdursa yalnız departament yaradılır." },
    ],
    examples: [
      ["Maliyyə", "Mühasibat"],
      ["Maliyyə", "Büdcə və planlaşdırma"],
      ["Satış", "Daxili satış"],
      ["Satış", "Xarici satış"],
      ["Hüquq", ""],
    ],
    rules: ["Hər sətir bir şöbədir. Eyni departament bir neçə sətirdə təkrarlana bilər.", "Kataloqda olan ad təkrar yaradılmır."],
  },
  sections: {
    title: "Bir departamentin şöbələri",
    file: "sobeler-numune.xlsx",
    sheet: "Şöbələr",
    columns: [{ header: "Şöbə", required: true, format: "Mətn", description: "Şöbənin adı. Hamısı seçdiyiniz departamentə əlavə olunur." }],
    examples: [["Mühasibat"], ["Büdcə və planlaşdırma"], ["Xəzinə"]],
    rules: ["Faylda departament sütunu lazım deyil.", "Kataloqda olan şöbə təkrar yaradılmır."],
  },
  attendance: {
    title: "Davamiyyət (tabel) qeydləri",
    file: "davamiyyet-numune.xlsx",
    sheet: "Davamiyyət",
    columns: [
      { header: "Ad Soyad", required: true, format: "Mətn", description: "İşçi siyahısındakı ad. Eyni adlı iki işçi varsa e-poçt sütunu da əlavə edin." },
      { header: "E-poçt", required: false, format: "E-poçt", description: "Eyni adlı işçiləri fərqləndirmək üçün." },
      { header: "Başlama tarixi", required: true, format: DATE, description: "Qeydin ilk günü." },
      { header: "Bitmə tarixi", required: false, format: DATE, description: "Qeydin son günü. Boşdursa yalnız başlama günüdür." },
      { header: "Səbəb", required: true, format: "Mətn", description: "Davamiyyət növü: adı və ya qısa kodu. “Sil” yazsanız həmin günlərin qeydi silinir.", values: codes },
      { header: "Qeyd", required: false, format: "Mətn", description: "Məsələn xəstəlik vərəqəsinin və ya əmrin nömrəsi." },
    ],
    examples: [
      ["Aysel Məmmədova", "", "2026-03-16", "2026-03-27", "Əmək məzuniyyəti", "Əmr № 12"],
      ["Orxan Əliyev", "", "2026-03-02", "2026-03-03", "Xəstəlik", "Vərəqə XV-123"],
      ["Nigar Quliyeva", "", "2026-03-10", "", "Ezamiyyətdə", "Gəncə"],
    ],
    rules: ["Qeyd bütün günlərə yazılır; istirahət və bayram günləri tabeldə ayrıca görünür.", "Bir sətirdə ən çox 366 gün olar.", "İşçi siyahısında tapılmayan ad yüklənmir və hesabatda göstərilir."],
  },
  calendar: {
    title: "Şirkət təqvimi (qeyri-standart günlər)",
    file: "teqvim-numune.xlsx",
    sheet: "Təqvim",
    columns: [
      { header: "Tarix", required: true, format: DATE, description: "Dəyişdirilən gün." },
      { header: "Növ", required: true, format: "Mətn", description: "Günün şirkətdə necə sayıldığı. “Sil” şirkətin dəyişikliyini silir, gün standart təqvimə qayıdır.", values: "Qeyri-iş günü, İş günü, Qısaldılmış gün, Sil" },
      { header: "Ad", required: false, format: "Mətn", description: "İzah: məsələn “İşlək şənbə” və ya “Korporativ istirahət”." },
    ],
    examples: [
      ["2026-03-14", "İş günü", "Kabinet qərarı ilə işlək şənbə"],
      ["2026-07-17", "Qeyri-iş günü", "Korporativ istirahət"],
      ["2026-12-30", "Qısaldılmış gün", "Bayram qabağı"],
    ],
    rules: ["Rəsmi bayramlar və köçürmələr artıq təqvimdədir; yalnız şirkətin ondan fərqli günlərini yazın.", "Bir dəfəyə ən çox 400 gün yüklənir."],
  },
  payroll: {
    title: "Ayın əmək haqqı məlumatları (mükafat, əlavə, saat, tutulma)",
    file: "emek-haqqi-numune.xlsx",
    sheet: "Əmək haqqı",
    columns: [
      { header: "Ad Soyad", required: true, format: "Mətn", description: "İşçi siyahısındakı ad. Eyni adlı iki işçi varsa e-poçt əlavə edin." },
      { header: "E-poçt", required: false, format: "E-poçt", description: "Eyni adlı işçiləri fərqləndirmək üçün." },
      { header: "Mükafat", required: false, format: "AZN", description: "Ayın mükafatı." },
      { header: "Əlavə", required: false, format: "AZN", description: "Əlavə ödəniş (iş şəraiti, staj və s.)." },
      { header: "Artıq iş saatı", required: false, format: "Saat", description: "İş vaxtından artıq işlənən saat (2 qat, Əmək M. 165)." },
      { header: "İstirahət günü saatı", required: false, format: "Saat", description: "İstirahət və bayram günlərində işlənən saat (md. 164)." },
      { header: "Gecə saatı", required: false, format: "Saat", description: "22:00–06:00 arası işlənən saat." },
      { header: "Gecə əlavəsi", required: false, format: "% (0–100)", description: "Müqavilədəki gecə əlavəsinin faizi." },
      { header: "Tutulma adı", required: false, format: "Mətn", description: "Tutulmanın adı və səbəbi (məsələn kredit, icra sənədi)." },
      { header: "Tutulma məbləği", required: false, format: "AZN", description: "Tutulacaq məbləğ; qanuni həddən (20/50/70%) artıq hissə növbəti aya keçir." },
      { header: "Tutulma növü", required: false, format: "Mətn", description: "Ümumi, İcra sənədi və ya Aliment.", values: "Ümumi; İcra sənədi; Aliment" },
      { header: "Qeyd", required: false, format: "Mətn", description: "Ayın qeydi." },
    ],
    examples: [
      ["Aysel Məmmədova", "", 150, 50, 6, 0, 0, 0, "Bank krediti", 100, "Ümumi", "Rüblük mükafat"],
      ["Orxan Əliyev", "", 0, 0, 0, 8, 12, 20, "", 0, "", ""],
    ],
    rules: ["Birinci sətirdə sütun adları olmalıdır; sütunların sırası vacib deyil.", "Fayl seçilmiş ayın məlumatlarını əvəz edir: yalnız faylda adı olan işçilərin həmin ay üçün əl ilə yazılmış əlavə və saatları yenilənir.", "Təsdiqlənmiş ay dəyişdirilmir.", "Hər işçi üçün bir tutulma yazılır; bir neçə tutulma üçün işçi kartında “Əlavə / tutulma” və ya təkrarlanan maddələrdən istifadə edin."],
  },
  hours: {
    title: "İşlənən saatlar (gün üzrə)",
    file: "saat-ucotu-numune.xlsx",
    sheet: "Saatlar",
    columns: [
      { header: "Ad Soyad", required: true, format: "Mətn", description: "İşçi siyahısındakı ad. Eyni adlı iki işçi varsa e-poçt əlavə edin." },
      { header: "E-poçt", required: false, format: "E-poçt", description: "Eyni adlı işçiləri fərqləndirmək üçün." },
      { header: "Tarix", required: true, format: DATE, description: "İşlənən gün." },
      { header: "Saat", required: true, format: "0–24", description: "Həmin gün işlənən ümumi saat (0 yazılsa həmin günün qeydi silinir)." },
      { header: "Gecə saatı", required: false, format: "0–24", description: "Bunlardan 22:00–06:00 arası işlənən saat." },
      { header: "Qeyd", required: false, format: "Mətn", description: "İstəyə görə izah." },
    ],
    examples: [
      ["Aysel Məmmədova", "", "2026-03-16", 10, 0, "Hesabat dövrü"],
      ["Orxan Əliyev", "", "2026-03-21", 6, 2, "Şənbə növbəsi"],
    ],
    rules: ["Birinci sətirdə sütun adları olmalıdır; sütunların sırası vacib deyil.", "İş günündə gündəlik normadan (həftəlik saat / 5; bayram qabağı gün 1 saat az) artıq saat avtomatik artıq iş sayılır; istirahət və bayram günündə işlənən bütün saat istirahət günü işi sayılır.", "Təsdiqlənmiş aya aid sətirlər yüklənmir.", "Əmək haqqı cədvəlində əl ilə yazılmış saat varsa, o üstünlük təşkil edir."],
  },
  assets: {
    title: "Şirkət əmlakı (aktivlər)",
    file: "emlak-numune.xlsx",
    sheet: "Əmlak",
    columns: [
      { header: "Ad", required: true, format: "Mətn", description: "Əmlakın adı (məsələn: Dell Latitude 5440 noutbuk)." },
      { header: "Kateqoriya", required: false, format: "Mətn", description: "Qrup: Kompüter, Telefon, Mebel və s." },
      { header: "Seriya nömrəsi", required: false, format: "Mətn", description: "İstehsalçının seriya nömrəsi." },
      { header: "İnventar nömrəsi", required: false, format: "Mətn", description: "Şirkətin daxili inventar nömrəsi." },
      { header: "Dəyər", required: false, format: "AZN", description: "Alış və ya balans dəyəri." },
      { header: "Qeyd", required: false, format: "Mətn", description: "İstəyə görə izah." },
    ],
    examples: [
      ["Dell Latitude 5440 noutbuk", "Kompüter", "SN-DL-001", "INV-0001", 1850, "Mühasibat üçün"],
      ["iPhone 14 telefon", "Telefon", "SN-IP-014", "INV-0002", 1500, ""],
    ],
    rules: ["Birinci sətirdə sütun adları olmalıdır; sütunların sırası vacib deyil.", "Yüklənən əmlak “Anbarda” statusu ilə yaranır; işçiyə verilmə aktivlər bölməsində edilir.", "Bir dəfəyə ən çox 500 sətir."],
  },
  questions: {
    title: "Test sualları",
    file: "test-suallari-numune.xlsx",
    sheet: "Suallar",
    columns: [
      { header: "Sual", required: true, format: "Mətn", description: "Sualın mətni." },
      { header: "Variant A", required: false, format: "Mətn", description: "Birinci cavab variantı. Çoxseçimli sual üçün ən azı iki variant lazımdır; variantsız sətir açıq sual olur." },
      { header: "Variant B", required: false, format: "Mətn", description: "İkinci variant." },
      { header: "Variant C", required: false, format: "Mətn", description: "Üçüncü variant (ixtiyari)." },
      { header: "Variant D", required: false, format: "Mətn", description: "Dördüncü variant (ixtiyari). Ən çox 8 variant yazıla bilər: Variant E, F, G, H." },
      { header: "Düzgün cavab", required: false, format: "Hərf və ya variantın mətni", description: "Düzgün variantın hərfi (B). Bir neçə düzgün cavab olarsa vergüllə: A, C. Variantlı sualda cavab yoxdursa sual yüklənmir.", values: "A, B, C, D … və ya A, C" },
      { header: "Bal", required: false, format: "1–20", description: "Sualın balı (boşdursa 1)." },
      { header: "Tip", required: false, format: "Boş və ya açıq", description: "“açıq” yazılsa variantlar nəzərə alınmır və sual açıq (mətn cavablı) olur.", values: "açıq" },
    ],
    examples: [
      ["Aylıq iş vaxtı norması neçə saatdan çox ola bilməz — həftəlik normal iş vaxtı?", "36", "40", "44", "48", "B", 1, ""],
      ["Aşağıdakılardan hansılar əmək haqqına daxildir?", "Tarif maaşı", "Əlavələr", "Mükafatlar", "Pay (səhm) planı üzrə səhm", "A, B, C", 2, ""],
      ["Əmək müqaviləsində sınaq müddəti ən çox neçə ay ola bilər?", "1", "2", "3", "6", "C", 1, ""],
      ["Namizədə iş yerində ilk həftə üçün hansı planı təklif edərdiniz?", "", "", "", "", "", 3, "açıq"],
    ],
    rules: ["Birinci sətirdə sütun adları olmalıdır; sütunların sırası vacib deyil.", "Bir fayldan ən çox 60 sual yüklənir; hər sual üçün 1–20 bal.", "Word, PDF və ya mətn faylı da yükləmək olar: “1. Sual? (2 bal)”, sonra “A) …  B) …” və “Cavab: B”."],
  },
  profiles: {
    title: "İşçilərin şəxsi məlumatları",
    file: "sexsi-melumat-numune.xlsx",
    sheet: "Şəxsi məlumatlar",
    columns: [
      { header: "Ad Soyad", required: true, format: "Mətn", description: "İşçi siyahısındakı ad. Eyni adlı iki işçi varsa e-poçt əlavə edin." },
      { header: "E-poçt", required: false, format: "E-poçt", description: "Eyni adlı işçiləri fərqləndirmək üçün." },
      { header: "FİN", required: false, format: "7 simvol", description: "Şəxsiyyət vəsiqəsinin FİN kodu (rəqəm və latın hərfləri)." },
      { header: "Seriya", required: false, format: "AZE / AA", description: "Vəsiqənin seriyası." },
      { header: "Vəsiqə nömrəsi", required: false, format: "6–9 rəqəm", description: "Vəsiqənin nömrəsi." },
      { header: "Verən orqan", required: false, format: "Mətn", description: "Vəsiqəni verən orqan." },
      { header: "Verilmə tarixi", required: false, format: DATE, description: "Vəsiqənin verildiyi tarix." },
      { header: "Etibarlılıq müddəti", required: false, format: DATE, description: "Vəsiqənin bitmə tarixi; yaxınlaşanda xəbərdarlıq çıxır." },
      { header: "Doğum tarixi", required: false, format: DATE, description: "Doğum tarixi." },
      { header: "Doğum yeri", required: false, format: "Mətn", description: "Şəhər və ya rayon." },
      { header: "Cins", required: false, format: "Kişi / Qadın", description: "İşçinin cinsi.", values: "Kişi, Qadın" },
      { header: "Vətəndaşlıq", required: false, format: "Mətn", description: "Məsələn Azərbaycan." },
      { header: "Ailə vəziyyəti", required: false, format: "Mətn", description: "Ailə vəziyyəti.", values: "Subay, Evli, Boşanıb, Dul" },
      { header: "14 yaşınadək uşaq sayı", required: false, format: "Tam ədəd", description: "Əlavə məzuniyyət hüququ (Əmək Məcəlləsi 117) üçün." },
      { header: "Əlillik", required: false, format: "Mətn", description: "İşçinin özünün əlilliyi: orqanizmin funksiyalarının pozulma faizi. Xeyr üçün boş buraxın.", values: "60%-dək, 61-80%, 81-100%" },
      { header: "Əlillik dərəcəsi", required: false, format: "I, II və ya III", description: "Əlillik dərəcəsi (qrupu).", values: "I, II, III" },
      { header: "Müharibə ilə əlaqədar əlillik", required: false, format: "Bəli / Xeyr", description: "Əlillik müharibə və ya hərbi xidmətlə əlaqədardır." },
      { header: "Əlillik sənədi", required: false, format: "Mətn", description: "Əlillik arayışının nömrəsi." },
      { header: "Əlillik müddəti", required: false, format: DATE, description: "Əlilliyin müəyyən edildiyi son tarix." },
      { header: "Əlilliyi olan uşaq sayı", required: false, format: "Tam ədəd", description: "Əlilliyi olan uşaqların sayı (Əmək Məcəlləsi 117, 130, 78)." },
      { header: "Daimi qulluq", required: false, format: "Mətn", description: "Daimi qulluq tələb edən şəxsə baxır və onunla yaşayır (Vergi Məcəlləsi 102.3, 102.4.4).", values: "uşaq, 81-100%, I dərəcə" },
      { header: "Vergi güzəşti", required: false, format: "Mətn", description: "Gəlir vergisi güzəştinin əsası (Vergi Məcəlləsi 102): yalnız biri, ən böyüyü verilir. Aşağıdakı adlardan birini yazın.", values: TAX_BENEFITS.map((b) => `${b.short} (${b.amount} AZN)`).join("; ") },
      { header: "Güzəşt sənədi", required: false, format: "Mətn", description: "Güzəşti təsdiq edən sənədin nömrəsi və tarixi." },
      { header: "Güzəşt başlama tarixi", required: false, format: DATE, description: "Sənəd təqdim edildiyi tarix; güzəşt həmin andan tətbiq olunur (102.8)." },
      { header: "Himayəsində 3 nəfər", required: false, format: "Bəli / Xeyr", description: "Himayəsində azı üç nəfər var: aylıq gəlir 50 AZN azalır (102.5)." },
      { header: "Əsas iş yeri", required: false, format: "Bəli / Xeyr", description: "Əmək kitabçası bu işəgötürəndədir. “Xeyr” yazılsa vergi güzəştləri tətbiq edilmir (102.8). Boşdursa “Bəli” sayılır." },
      { header: "Uşağı təkbaşına böyüdür", required: false, format: "Bəli / Xeyr", description: "Təkvalideyn." },
      { header: "Qeydiyyat ünvanı", required: false, format: "Mətn", description: "Vəsiqədəki ünvan." },
      { header: "Faktiki ünvan", required: false, format: "Mətn", description: "Yaşadığı ünvan." },
      { header: "SSN", required: false, format: "Mətn", description: "Sosial sığorta nömrəsi." },
      { header: "VÖEN", required: false, format: "Mətn", description: "Varsa." },
      { header: "IBAN", required: false, format: "AZ + 26 simvol", description: "Maaşın köçürüləcəyi hesab; yoxlama rəqəmləri yoxlanılır." },
      { header: "Bank", required: false, format: "Mətn", description: "Maaşın köçürüləcəyi bankın adı." },
      { header: "Bank kodu", required: false, format: "Rəqəm", description: "Bankın kodu (varsa)." },
      { header: "Hesab nömrəsi", required: false, format: "Rəqəmlər", description: "Cari hesabın nömrəsi (IBAN-dan ayrıca, varsa)." },
      { header: "Kart nömrəsi", required: false, format: "16 rəqəm", description: "Əmək haqqı kartı; yoxlama rəqəmi yoxlanılır." },
      { header: "Kart sahibi", required: false, format: "Mətn", description: "Kartın üzərindəki ad." },
      { header: "Ödəniş üsulu", required: false, format: "Bank / Kart / Nağd", description: "Maaşın necə veriləcəyi." },
      { header: "Təhsil səviyyəsi", required: false, format: "Mətn", description: "Məsələn Ali, Orta ixtisas." },
      { header: "Hərbi uçot", required: false, format: "Mətn", description: "Hərbi qeydiyyat vəziyyəti." },
      { header: "Yaxın şəxs", required: false, format: "Mətn", description: "Təcili hal üçün əlaqə şəxsi." },
      { header: "Yaxın şəxs telefon", required: false, format: "Mətn", description: "Onun telefonu." },
    ],
    examples: [
      ["Aysel Məmmədova", "", "5ABC12X", "AZE", "12345678", "DİN", "2022-03-01", "2032-02-28", "1990-04-12", "Bakı", "Qadın", "Azərbaycan", "Evli", 2, "", "", "Xeyr", "", "", 0, "", "", "", "", "Bəli", "Bəli", "Xeyr", "Bakı, Nəsimi r.", "Bakı, Yasamal r.", "", "", "AZ21NABZ00000000137010001944", "Kapital Bank", "200004", "", "4169738812345670", "AYSEL MAMMADOVA", "Kart", "Ali", "Hərbi mükəlləfiyyətli deyil", "Elnur Məmmədov", "+994501112233"],
      ["Orxan Əliyev", "", "7XYZ98K", "AA", "7654321", "DİN", "2021-06-10", "2031-06-09", "1995-11-03", "Gəncə", "Kişi", "Azərbaycan", "Subay", 0, "61-80%", "II", "Xeyr", "ƏA-2024-118", "2028-05-01", 0, "", "Əlillik 61-100%", "TSEA qərarı 2024-05-02", "2024-05-02", "Xeyr", "Bəli", "Xeyr", "", "Bakı, Binəqədi r.", "", "", "", "ABB", "", "", "", "", "Nağd", "Ali", "Hərbi xidmət keçib", "", ""],
    ],
    rules: ["Yalnız doldurduğunuz xanalar yazılır: boş xana işçinin mövcud məlumatını silmir.", "Yalnız işçi siyahısındakı işçilər üçün işləyir; tapılmayan ad yüklənmir.", "Bu məlumatlar həssasdır: faylı yükləndikdən sonra silin.", "Şəxsi məlumat icazəsi tələb edir."],
  },
};

// The two sheets of the file to download: the sample first (the importer reads the first sheet), then the guide.
export function sheetsOf(template: SheetTemplate): XlsxSheet[] {
  const guide: XlsxCell[][] = template.columns.map((c) => [c.header, c.required ? "Bəli" : "Xeyr", c.format, c.description, c.values || ""]);
  guide.push([], ["Qaydalar", "", "", "", ""], ...template.rules.map((rule, i) => [`${i + 1}.`, "", "", rule, ""] as XlsxCell[]));
  guide.push([], ["", "", "", "Nümunə vərəqindəki sətirlərin üstünə yazın, sütun adlarını (birinci sətir) dəyişməyin.", ""]);
  return [
    { name: "Nümunə", headers: template.columns.map((c) => c.header), rows: template.examples },
    { name: "Təlimat", headers: ["Sütun", "Məcburi?", "Format", "İzah", "İcazə verilən dəyərlər"], rows: guide },
  ];
}
export const templateSheets = (kind: SheetKind): XlsxSheet[] => sheetsOf(SHEET_TEMPLATES[kind]);
