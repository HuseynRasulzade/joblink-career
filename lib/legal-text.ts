// Texts of the two public legal pages. They are a working draft written from how the platform actually behaves; the operator's
// lawyer must review them before launch. The operator's details come from the PLATFORM_* variables.
export type Operator = { name: string; voen: string; address: string; email: string };

export type LegalSection = { title: string; body: string[] };

export function privacySections(op: Operator): LegalSection[] {
  const who = op.name || "[operatorun adı daxil edilməlidir]";
  return [
    { title: "1. Operator", body: [`Platformanın operatoru: ${who}${op.voen ? `, VÖEN ${op.voen}` : ""}${op.address ? `, ${op.address}` : ""}. Əlaqə: ${op.email || "[e-poçt daxil edilməlidir]"}.`] },
    { title: "2. Hansı məlumatları toplayırıq", body: [
      "Hesab məlumatları: ad, e-poçt, şifrənin təhlükəsiz (açıq olmayan) forması, hesab növü.",
      "İş axtaranlar: CV və profil məlumatları (təcrübə, təhsil, bacarıqlar, əlaqə məlumatları), müraciətlər, müsahibələr, test nəticələri, mesajlar.",
      "İşəgötürənlər və işçilər: şirkət məlumatları, vakansiyalar, kadr və əmək haqqı qeydləri (işçi kartı, əmrlər, məzuniyyət, davamiyyət), sənədlər və ödəniş qeydləri.",
      "Texniki məlumatlar: giriş vaxtı, cihaz və brauzer məlumatı, təhlükəsizlik jurnalları, xəta qeydləri.",
    ] },
    { title: "3. Məqsəd və əsas", body: [
      "Məlumatlar platformanın xidmətini göstərmək (qeydiyyat, vakansiyalara müraciət, işə qəbul və kadr idarəetməsi), təhlükəsizliyi təmin etmək və qanunvericilik tələblərini yerinə yetirmək üçün, həmçinin sizin razılığınızla işlənir.",
    ] },
    { title: "4. Süni intellekt ilə emal", body: [
      "CV analizi, vakansiyaya uyğunluq izahı və digər AI funksiyaları işlədildikdə həmin sorğuya aid mətn xarici AI xidmət təminatçısına (OpenAI) göndərilə bilər. Yalnız sizin əməliyyatınız üçün lazım olan məlumat göndərilir; CV şəklinin OCR və ya vizual analizi ayrıca razılıq tələb edir.",
      "AI nəticəsi yardımçı rəydir; işə qəbul qərarını insan verir.",
    ] },
    { title: "5. Kimlərlə paylaşılır", body: [
      "İş axtaran müraciət etdikdə profili və CV-si yalnız müraciət etdiyi şirkətə görünür. Profil «aktiv» olduqda şirkətlərin istedad bazasında görünə bilər; bunu profilinizdən söndürə bilərsiniz.",
      "Texniki xidmət təminatçıları (hostinq, e-poçt, ödəniş, AI) məlumatı yalnız xidməti göstərmək üçün işlədir. Məlumatlar satılmır.",
    ] },
    { title: "6. Saxlama müddəti", body: ["Məlumatlar hesabınız aktiv olduğu müddətdə saxlanır. Hesabı sildikdə şəxsi məlumatlar silinir; qanunla saxlanması tələb olunan qeydlər (məsələn, kadr və maliyyə sənədləri) müvafiq müddət ərzində saxlanılır."] },
    { title: "7. Sizin hüquqlarınız", body: ["Azərbaycan Respublikasının «Fərdi məlumatlar haqqında» Qanununa uyğun olaraq məlumatlarınıza baxmaq, düzəltdirmək, silinməsini və ya emalın məhdudlaşdırılmasını tələb etmək, razılığı geri götürmək hüququnuz var. Hesab ayarlarından məlumatlarınızı yükləyə və hesabı silə bilərsiniz; digər sorğular üçün yuxarıdakı e-poçta yazın."] },
    { title: "8. Təhlükəsizlik", body: ["Şifrələr təhlükəsiz formada saxlanır, giriş cəhdləri məhdudlaşdırılır, iki mərhələli giriş mövcuddur, rabitə HTTPS ilə qorunur. Heç bir sistem tam risksiz deyil; şübhəli hal görsəniz bizə yazın."] },
    { title: "9. Çərəzlər", body: ["Platforma yalnız girişi saxlamaq üçün zəruri sessiya çərəzindən istifadə edir; reklam izləyiciləri yoxdur."] },
    { title: "10. Dəyişikliklər", body: ["Bu siyasət dəyişdikdə yeni versiya bu səhifədə dərc olunur."] },
  ];
}

export function termsSections(op: Operator): LegalSection[] {
  const who = op.name || "[operatorun adı daxil edilməlidir]";
  return [
    { title: "1. Ümumi", body: [`Bu şərtlər ${who} tərəfindən idarə olunan JobMatch platformasından istifadəyə şamil olunur. Qeydiyyatdan keçməklə şərtləri qəbul etmiş olursunuz.`] },
    { title: "2. Hesab", body: ["Hesab yalnız qeydiyyatda seçilən növ (iş axtaran və ya işəgötürən) üçün işləyir. Məlumatların doğruluğuna və şifrənin qorunmasına istifadəçi cavabdehdir. Hesabınızı başqasına verməyin."] },
    { title: "3. İş axtaranlar", body: ["CV və profildə doğru məlumat yazmalısınız. Başqasının adından müraciət etmək, saxta sənəd və ya spam göndərmək qadağandır."] },
    { title: "4. İşəgötürənlər", body: ["Vakansiyalar real olmalı, namizəd məlumatları yalnız işə qəbul məqsədi ilə işlədilməlidir. Ayrı-seçkilik edən və ya aldadıcı elanlar dərc olunmur; qaydanı pozan elan və hesablar dayandırıla bilər. Kadr və əmək haqqı qeydlərinin düzgünlüyünə şirkət özü cavabdehdir; platformadakı hesablamalar kömək məqsədi daşıyır və rəsmi mühasibat uçotunu əvəz etmir."] },
    { title: "5. Paketlər və ödənişlər", body: ["Pulsuz və ödənişli paketlər «Paketlər» bölməsində göstərilir. Ödənişli paket ödəniş təsdiqləndikdən sonra aktivləşir; müqavilə və ödəniş qeydi hesabınızda saxlanır. Paketin müddəti, avtomatik yenilənmə və ləğv qaydaları ödənişdən əvvəl göstərilir. Geri qaytarma qaydası müqavilədə göstərildiyi kimidir."] },
    { title: "6. Süni intellekt", body: ["AI funksiyaları (CV analizi, uyğunluq izahı, tövsiyələr) yardımçıdır, düzgünlüyünə zəmanət verilmir. Qərarı istifadəçi verir."] },
    { title: "7. Qadağan olunanlar", body: ["Sistemə icazəsiz müdaxilə, məlumatın kütləvi çıxarılması, başqalarının hesabına giriş, qanunsuz məzmun yerləşdirmək qadağandır."] },
    { title: "8. Məsuliyyətin həddi", body: ["Platforma «olduğu kimi» təqdim olunur. Operator qanunun icazə verdiyi həddə dolayı zərərə və üçüncü tərəflərin (işəgötürən, namizəd) hərəkətlərinə görə məsuliyyət daşımır; bu, qanunla ləğv edilə bilməyən hüquqlarınıza toxunmur."] },
    { title: "9. Hesabın bağlanması", body: ["Hesabı istənilən vaxt silə bilərsiniz. Şərtləri pozan hesab operator tərəfindən dayandırıla və ya silinə bilər."] },
    { title: "10. Tətbiq olunan hüquq", body: ["Mübahisələr Azərbaycan Respublikasının qanunvericiliyinə uyğun həll olunur. Əlaqə: " + (op.email || "[e-poçt daxil edilməlidir]") + "."] },
  ];
}
