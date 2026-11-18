// Texts of the two public legal pages. They are a working draft written from how the platform actually behaves; the operator's
// lawyer must review them before launch. The operator's details come from the PLATFORM_* variables.
export type Operator = { name: string; voen: string; address: string; email: string };

export type LegalSection = { title: string; body: string[] };

// Shown at the top of both pages; change it whenever the text changes.
export const LEGAL_UPDATED = "18 noyabr 2026";

const operatorName = (op: Operator) => op.name || "[operatorun adı daxil edilməlidir]";
const contact = (op: Operator) => op.email || "[e-poçt daxil edilməlidir]";

export function privacySections(op: Operator): LegalSection[] {
  const who = operatorName(op);
  return [
    { title: "1. Bu siyasət nə haqqındadır", body: [
      "Bu siyasət JobMatch platformasının (sayt və onun bütün bölmələri) şəxsi məlumatları necə topladığını, nə üçün işlətdiyini, kimlərlə paylaşdığını və necə qoruduğunu izah edir. Siyasət hesab yaratmamış ziyarətçilərə, iş axtaranlara, işəgötürənlərə və işəgötürənin platformada qeydə aldığı işçilərə şamil olunur.",
      "Mətni sadə saxlamağa çalışmışıq: hər bölmədə «nə», «niyə» və «sizin seçiminiz» göstərilir.",
    ] },
    { title: "2. Operator (məlumatlara cavabdeh tərəf)", body: [
      `Platformanın operatoru: ${who}${op.voen ? `, VÖEN ${op.voen}` : ""}${op.address ? `, ünvan: ${op.address}` : ""}. Əlaqə: ${contact(op)}.`,
      "İş axtaranın və platformanın öz hesab məlumatları üçün operator məlumatları idarə edən tərəfdir. İşəgötürənin öz işçiləri və namizədləri haqqında platformaya daxil etdiyi məlumatlar üçün isə işəgötürən məlumatları idarə edən, operator isə onun tapşırığı ilə məlumatı emal edən tərəfdir (bax: bölmə 6).",
    ] },
    { title: "3. Hansı məlumatları toplayırıq", body: [
      "Hesab məlumatları: ad (və ya şirkət adı), e-poçt ünvanı, şifrənin geri qaytarılması mümkün olmayan təhlükəsiz forması (açıq şifrə saxlanmır), hesab növü, e-poçtun təsdiq vəziyyəti, iki mərhələli giriş qurulubsa onun ayarları.",
      "İş axtaranlar: CV və profil məlumatları (təcrübə, təhsil, bacarıqlar, dillər, sertifikatlar, əlaqə məlumatları, istəyə bağlı şəkil), saxlanmış vakansiyalar, müraciətlər, müsahibələr, test və qiymətləndirmə nəticələri, mesajlar, iş bildirişi ayarları.",
      "İşəgötürənlər: şirkət məlumatları, vakansiyalar, namizəd qeydləri və qiymətləndirmələri, paket və ödəniş qeydləri, komanda üzvləri və onların rolları.",
      "İşəgötürənin qeydə aldığı işçilər: işçi kartı (ad, vəzifə, struktur, əlaqə), əmək müqaviləsi və əmrlər, məzuniyyət, davamiyyət və iş saatları, əmək haqqı və ödəniş qeydləri, sənədlər, istəyə bağlı olaraq sağlamlıq və güzəşt məlumatları (məsələn, əlillik və vergi güzəşti). Bu məlumatlar həssas ola bilər və yalnız işəgötürənin və onun səlahiyyət verdiyi şəxslərin görməsi üçündür.",
      "Texniki məlumatlar: giriş vaxtı, IP ünvanı, cihaz və brauzer məlumatı, təhlükəsizlik və xəta jurnalları, sessiya məlumatları.",
      "Siz bizə birbaşa yazdıqda: dəstək müraciətləri və yazışmalar.",
    ] },
    { title: "4. Nə üçün və hansı əsasla işləyirik", body: [
      "Xidməti göstərmək üçün (müqaviləni yerinə yetirmək): hesab yaratmaq, CV və profili saxlamaq, vakansiyaları göstərmək, müraciətləri və müsahibələri idarə etmək, kadr və əmək haqqı alətlərini işlətmək.",
      "Təhlükəsizlik və sui-istifadənin qarşısını almaq üçün (qanuni maraq): girişlərin qeydi, robot yoxlaması, cəhd limitləri, saxta və spam hesabların aşkarlanması.",
      "Qanunvericiliyin tələbi: kadr və maliyyə sənədlərinin saxlanması, səlahiyyətli dövlət orqanlarının qanuni sorğularına cavab.",
      "Razılığınızla: istəyə bağlı funksiyalar (məsələn, profilin istedad bazasında görünməsi, CV şəklinin vizual analizi, xəbər və bildiriş məktubları). Razılığı istədiyiniz vaxt geri götürə bilərsiniz; bu, əvvəlki emalın qanuniliyinə təsir etmir.",
    ] },
    { title: "5. E-poçtun təsdiqi və bildirişlər", body: [
      "Yeni hesab yaradılanda e-poçt ünvanınıza 6 rəqəmli təsdiq kodu göndərilir; kod 15 dəqiqə qüvvədədir və yalnız ünvanın sizə aid olduğunu yoxlamaq üçündür. Kodu heç kimlə bölüşməyin.",
      "Şifrə bərpası, təhlükəsizlik xəbərdarlıqları və hesabınızla bağlı vacib məlumatlar həmin ünvana göndərilir. Məktubların göndərilməsi üçün e-poçt xidməti təminatçısından istifadə olunur.",
    ] },
    { title: "6. İşəgötürənlərin yüklədiyi işçi və namizəd məlumatları", body: [
      "İşəgötürən işçilərinin və namizədlərin məlumatlarını platformaya daxil edərkən bunun üçün hüquqi əsasa (məsələn, əmək müqaviləsi, qanuni vəzifə və ya razılıq) malik olduğunu və işçiləri məlumatlandırdığını təsdiq edir. Bu məlumatlar yalnız işəgötürənin tapşırığı ilə, onun kadr və işə qəbul məqsədləri üçün emal olunur.",
      "Platformada işçi məlumatları digər şirkətlərə görünmür. Şəxsi məlumatların şifrələnməsi ayarı işəgötürən tərəfindən aktivləşdirilə bilər.",
      "İşçi və ya namizəd olaraq məlumatlarınıza baxmaq, düzəltdirmək və ya silinməsini istəmək üçün öncə işəgötürənə müraciət edin; operatora yazsanız, sorğunu işəgötürənə yönləndirə bilərik.",
    ] },
    { title: "7. Süni intellekt ilə emal", body: [
      "CV analizi, CV-nin yenidən yazılması, vakansiyaya uyğunluq izahı, AI köməkçi və digər AI funksiyaları işlədildikdə həmin əməliyyata aid mətn xarici AI xidmət təminatçısına (OpenAI və ya DeepSeek) göndərilə bilər. Yalnız həmin əməliyyat üçün lazım olan məlumat göndərilir; digər hesabların məlumatı göndərilmir.",
      "CV şəklinin OCR və ya vizual analizi ayrıca razılıq tələb edir. Sorğu mətnləri platformada AI xərcinin uçotu üçün saxlanmır, yalnız say və ölçü qeyd olunur.",
      "AI nəticəsi yardımçı rəydir və yanlış ola bilər. İşə qəbul və kadr qərarlarını insan verir; AI yalnız avtomatik qərar vermir.",
    ] },
    { title: "8. Məlumatlar kimlərlə paylaşılır", body: [
      "İş axtaran müraciət etdikdə profili və CV-si yalnız müraciət etdiyi şirkətə görünür. Profil «aktiv» olduqda şirkətlərin istedad bazasında görünə bilər; bunu profilinizdən istənilən vaxt söndürə bilərsiniz.",
      "Texniki xidmət təminatçıları məlumatı yalnız xidməti göstərmək üçün işlədir: hostinq və verilənlər bazası (Cloudflare), e-poçt göndərilməsi, ödəniş xidməti, AI təminatçıları, robot yoxlaması (Cloudflare Turnstile). Onlar məlumatı öz məqsədləri üçün işlədə bilməz.",
      "Qanunun tələb etdiyi hallarda məlumat səlahiyyətli dövlət orqanlarına verilə bilər.",
      "Məlumatlarınız satılmır və reklam məqsədilə üçüncü tərəflərə ötürülmür.",
    ] },
    { title: "9. Başqa ölkələrə ötürülmə", body: [
      "Hostinq və AI təminatçılarının serverləri Azərbaycandan kənarda yerləşə bilər. Bu halda məlumat yalnız xidməti göstərmək üçün və təminatçılarla bağlanmış məxfilik şərtləri çərçivəsində ötürülür.",
    ] },
    { title: "10. Saxlama müddəti", body: [
      "Məlumatlar hesabınız aktiv olduğu müddətdə saxlanır. Hesabı sildikdə şəxsi məlumatlarınız silinir.",
      "Qanunla saxlanması tələb olunan qeydlər (məsələn, kadr və maliyyə sənədləri) müvafiq müddət ərzində saxlanılır. Texniki ehtiyat nüsxələr məhdud müddətdən (təxminən 30 gün) sonra avtomatik köhnəlir.",
      "Təsdiqlənməmiş e-poçt kodları və bərpa linkləri qısa müddətdən sonra etibarsız olur.",
    ] },
    { title: "11. Sizin hüquqlarınız", body: [
      "Azərbaycan Respublikasının «Fərdi məlumatlar haqqında» Qanununa uyğun olaraq: məlumatlarınıza baxmaq, düzəltdirmək, silinməsini və ya emalın məhdudlaşdırılmasını tələb etmək, razılığı geri götürmək və emala etiraz etmək hüququnuz var.",
      "Hesab ayarlarından məlumatlarınızı yükləyə və hesabı silə bilərsiniz. Digər sorğular üçün " + contact(op) + " ünvanına yazın; sorğuya qanunla müəyyən müddətdə cavab veririk.",
      "Hüquqlarınızın pozulduğunu düşünsəniz, səlahiyyətli dövlət orqanına və ya məhkəməyə müraciət edə bilərsiniz.",
    ] },
    { title: "12. Təhlükəsizlik", body: [
      "Şifrələr yalnız təhlükəsiz hash şəklində saxlanır; giriş cəhdləri və təsdiq kodu cəhdləri məhdudlaşdırılır; robot yoxlaması və iki mərhələli giriş (autentifikator tətbiqi və ehtiyat kodlar) mövcuddur; rabitə HTTPS ilə qorunur; aktiv sessiyalara hesab ayarlarından baxıb bağlaya bilərsiniz.",
      "Heç bir sistem tam risksiz deyil. Məlumatlarınıza icazəsiz çıxış aşkar olunarsa, qanunun tələb etdiyi qaydada təsirə məruz qalan şəxsləri və lazım gələrsə səlahiyyətli orqanı məlumatlandırırıq. Şübhəli hal görsəniz bizə dərhal yazın.",
    ] },
    { title: "13. Çərəzlər", body: [
      "Platforma yalnız girişi saxlamaq üçün zəruri sessiya çərəzindən (7 gün) və seçdiyiniz dili yadda saxlayan brauzer yaddaşından istifadə edir. Reklam və izləmə çərəzləri yoxdur. Robot yoxlaması işə salınıbdırsa, Cloudflare öz təhlükəsizlik məqsədləri üçün texniki məlumat oxuya bilər.",
    ] },
    { title: "14. Uşaqlar", body: ["Platforma 16 yaşdan kiçik şəxslər üçün nəzərdə tutulmayıb. Uşağın məlumatının bizə verildiyini bilsəniz, yazın, silək."] },
    { title: "15. Dəyişikliklər və əlaqə", body: [
      `Bu siyasət dəyişdikdə yeni versiya bu səhifədə dərc olunur və yuxarıdakı «son yenilənmə» tarixi dəyişir. Əhəmiyyətli dəyişikliklər barədə hesab e-poçtuna məlumat göndərilə bilər. Suallar üçün: ${contact(op)}.`,
    ] },
  ];
}

export function termsSections(op: Operator): LegalSection[] {
  const who = operatorName(op);
  return [
    { title: "1. Ümumi müddəalar", body: [
      `Bu şərtlər ${who} (bundan sonra «Operator») tərəfindən idarə olunan JobMatch platformasından (sayt, onun işəgötürən, iş axtaran və admin bölmələri, hesablama alətləri) istifadəni tənzimləyir. Qeydiyyatdan keçməklə və ya platformadan istifadə etməklə bu şərtləri və Məxfilik siyasətini qəbul etmiş olursunuz. Razı deyilsinizsə, platformadan istifadə etməyin.`,
      "Platformanın açıq hissələrindən (vakansiyalara baxış, kalkulyatorlar) hesab yaratmadan istifadə etmək olar; hesab tələb edən əməliyyatlar üçün qeydiyyat lazımdır.",
    ] },
    { title: "2. Hesab və e-poçt təsdiqi", body: [
      "Qeydiyyat üçün düzgün ad və sizə məxsus e-poçt ünvanı göstərməlisiniz. Yeni hesabın e-poçt ünvanına 6 rəqəmli təsdiq kodu göndərilir; kod daxil olunana qədər hesab aktivləşmir. Kod 15 dəqiqə qüvvədədir, yeni kod istəyə bilərsiniz.",
      "Hesab yalnız qeydiyyatda seçilən növ (iş axtaran və ya işəgötürən) üçün işləyir. Bir şəxs və ya şirkət üçün bir hesab kifayətdir; saxta və ya başqasının adı ilə hesab açmaq qadağandır.",
      "Şifrənin və giriş vasitələrinin qorunmasına istifadəçi cavabdehdir. Hesabınızı başqasına verməyin; icazəsiz girişdən şübhələnsəniz, şifrəni dəyişin, aktiv sessiyaları bağlayın və bizə yazın. Hesabınız altındakı əməliyyatlara görə siz cavabdehsiniz. İki mərhələli girişi aktivləşdirməyi tövsiyə edirik.",
    ] },
    { title: "3. İş axtaranlar", body: [
      "CV və profildə doğru məlumat yazmalısınız. Başqasının adından müraciət etmək, saxta sənəd və ya yalan təcrübə göstərmək, kütləvi və ya təkrarlanan spam müraciətlər göndərmək qadağandır.",
      "Müraciət etdikdə profiliniz və CV-niz həmin şirkətə görünür. Profili istedad bazasında göstərmək seçimi sizdədir və istənilən vaxt dəyişdirilə bilər.",
      "Platforma iş tapmağı və ya müsahibə dəvəti almağı zəmanət etmir. İş təklifi və şərtləri işəgötürənlə sizin aranızdadır.",
    ] },
    { title: "4. İşəgötürənlər", body: [
      "Vakansiyalar real olmalı, şirkət və iş şərtləri barədə məlumat doğru göstərilməlidir. Ayrı-seçkilik edən, aldadıcı, pulla iş vəd edən və ya qanuna zidd elanlar dərc olunmur; qaydanı pozan elan və hesablar xəbərdarlıqsız dayandırıla bilər.",
      "Namizəd məlumatları yalnız işə qəbul məqsədilə işlədilməli, üçüncü şəxslərə satılmamalı və ya başqa məqsədlə köçürülməməlidir. Namizədlə əlaqə qaydaları və məxfilik qanunvericiliyinə riayət etmək işəgötürənin öhdəliyidir.",
      "İşçilərin və namizədlərin məlumatlarını platformaya daxil edərkən bunun üçün hüquqi əsasınız olduğunu və işçiləri məlumatlandırdığınızı təsdiq edirsiniz. Bu məlumatlara görə məlumatları idarə edən tərəf sizsiniz, Operator isə sizin tapşırığınızla emal edir.",
      "Kadr və əmək haqqı qeydlərinin, əmrlərin, hesablamaların və hesabatların düzgünlüyünə şirkət özü cavabdehdir. Platformadakı hesablamalar (vergi, sığorta, məzuniyyət, müavinət, ezamiyyət və s.) kömək məqsədi daşıyır, qüvvədə olan qanunvericiliyə əsaslanır, lakin rəsmi mühasibat və kadr uçotunu əvəz etmir. Rəsmi bəyannamə və ödənişdən əvvəl nəticəni mühasibiniz və ya səlahiyyətli orqan yoxlamalıdır.",
    ] },
    { title: "5. Paketlər, ödənişlər və AI kreditləri", body: [
      "Pulsuz və ödənişli paketlər «Paketlər» bölməsində göstərilir. Ödənişli paket ödəniş təsdiqləndikdən sonra aktivləşir; müqavilə və ödəniş qeydi hesabınızda saxlanır.",
      "Paketin müddəti, limitləri, yenilənmə və ləğv qaydaları ödənişdən əvvəl göstərilir. Geri qaytarma qaydası müqavilədə göstərildiyi kimidir; istifadə olunmuş xidmətə görə ödəniş geri qaytarılmaya bilər.",
      "AI funksiyaları paketə daxil limit və ya əlavə kreditlə işləyir. Limit bitdikdə funksiya yenilənmə və ya əlavə kredit alınana qədər dayanır.",
      "Qiymətlər və paket tərkibi əvvəlcədən xəbər verilməklə dəyişdirilə bilər; dəyişiklik artıq ödənilmiş dövrə təsir etmir.",
    ] },
    { title: "6. Süni intellekt", body: [
      "AI funksiyaları (CV analizi, CV yenidən yazma, uyğunluq izahı, tövsiyələr, AI köməkçi) yardımçıdır; nəticənin düzgünlüyünə, tamlığına və konkret məqsədə uyğunluğuna zəmanət verilmir. Qərarı istifadəçi verir və nəticəni yoxlamaq onun məsuliyyətidir.",
      "AI nəticələri əsasında insan nəzarəti olmadan namizədə rədd cavabı vermək və ya kadr qərarı qəbul etmək tövsiyə olunmur.",
    ] },
    { title: "7. Məzmun və intellektual mülkiyyət", body: [
      "Yüklədiyiniz məzmun (CV, şəkil, vakansiya mətni, sənədlər) sizin qalır. Platformada göstərmək, saxlamaq, AI analiz etmək və seçdiyiniz şəxslərə (müraciət etdiyiniz şirkət, işəgötürən) göstərmək üçün Operatora məhdud, qeyri-müstəsna icazə verirsiniz; bu icazə məzmunu sildikdə və ya hesabı bağlayanda sona çatır.",
      "Yalnız yükləməyə haqqınız olan məzmunu yükləyin. Platformanın dizaynı, proqram kodu, kataloqları və marka adı Operatora və ya lisenziya verənlərə məxsusdur; icazəsiz kopyalamaq və yenidən satmaq qadağandır.",
    ] },
    { title: "8. Qadağan olunanlar", body: [
      "Sistemə icazəsiz müdaxilə, təhlükəsizlik yoxlamalarını (robot yoxlaması, limitlər) yan keçmək, avtomatlaşdırılmış vasitələrlə kütləvi məlumat çıxarmaq, başqalarının hesabına giriş, zərərli fayl və ya qanunsuz, təhqiramiz, aldadıcı məzmun yerləşdirmək, platformanın işini pozmaq və ya digər istifadəçilərə zərər vermək qadağandır.",
      "Bu qaydaların pozulması hesabın xəbərdarlıqla və ya xəbərdarlıqsız dayandırılmasına və hüquqi tədbirlərə səbəb ola bilər.",
    ] },
    { title: "9. Əlçatanlıq və dəyişikliklər", body: [
      "Platformanın fasiləsiz və xətasız işləməsinə çalışırıq, amma bunu zəmanət vermirik: texniki xidmət, yeniləmə və üçüncü tərəf xidmətlərinin (hostinq, e-poçt, ödəniş, AI) nasazlığı müvəqqəti fasilə yarada bilər.",
      "Funksiyaları inkişaf etdirir, dəyişir və ya ləğv edə bilərik. Əhəmiyyətli dəyişikliklər barədə əvvəlcədən xəbər verməyə çalışırıq.",
    ] },
    { title: "10. Məsuliyyətin həddi", body: [
      "Platforma «olduğu kimi» təqdim olunur. Operator qanunun icazə verdiyi həddə dolayı və nəticə zərərinə, itirilmiş gəlir və ya fürsətə, üçüncü tərəflərin (işəgötürən, namizəd, xidmət təminatçıları) hərəkətlərinə və AI nəticələrinə əsaslanan qərarlara görə məsuliyyət daşımır.",
      "Operatorun məsuliyyəti, qanunla başqa cür tələb olunmayan hallarda, zərərin yarandığı dövrdə sizin ödədiyiniz məbləğlə məhdudlaşır. Bu müddəa qanunla ləğv edilə bilməyən hüquqlarınıza toxunmur.",
    ] },
    { title: "11. Hesabın bağlanması", body: [
      "Hesabı istənilən vaxt hesab ayarlarından silə bilərsiniz; bu halda şəxsi məlumatlar Məxfilik siyasətinə uyğun silinir, qanunla saxlanması tələb olunan qeydlər istisna olmaqla.",
      "Şərtləri pozan, aldadıcı və ya təhlükə yaradan hesab Operator tərəfindən dayandırıla və ya silinə bilər. Ödənişli paketlə bağlı qalıq məbləğ qaydası müqavilədə göstərildiyi kimidir.",
    ] },
    { title: "12. Şərtlərin dəyişməsi", body: [
      "Şərtlər dəyişdikdə yeni versiya bu səhifədə dərc olunur və «son yenilənmə» tarixi dəyişir. Əhəmiyyətli dəyişikliklərdə hesab e-poçtuna məlumat göndərilə bilər. Dəyişiklikdən sonra platformadan istifadəni davam etmək yeni şərtləri qəbul etmək deməkdir.",
    ] },
    { title: "13. Tətbiq olunan hüquq və mübahisələr", body: [
      `Bu şərtlər Azərbaycan Respublikasının qanunvericiliyinə tabedir. Mübahisələr əvvəlcə danışıqlarla, razılıq olmadıqda səlahiyyətli Azərbaycan məhkəməsində həll olunur. Əlaqə: ${contact(op)}.`,
    ] },
  ];
}
