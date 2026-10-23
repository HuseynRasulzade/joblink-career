// Frequently asked questions shown on the support page before a request is written.
export type Faq = { q: string; a: string };
export const FAQ: Record<"candidate" | "company", Faq[]> = {
  candidate: [
    { q: "CV-ni necə yükləyim və profil necə doldurulur?", a: "“Mənim profilim” bölməsində CV faylını (PDF, DOCX, TXT) yükləyin; məlumatlar avtomatik oxunur. Sonra təcrübə, təhsil və bacarıqları yoxlayıb yadda saxlayın." },
    { q: "Vakansiyaya necə müraciət edirəm?", a: "Vakansiyanı açın və “Müraciət et” düyməsini basın. Müraciət statusunu “Müraciətlərim” bölməsində izləyin." },
    { q: "Yeni uyğun vakansiyalardan necə xəbərdar olum?", a: "“Vakansiyalar” bölməsində axtarış sözü və ya filtr seçib “Bu axtarış üçün xəbərdarlıq yarat” düyməsini basın. Yeni uyğun vakansiya çıxanda bildiriş (və e-poçt qurulubsa məktub) alacaqsınız." },
    { q: "Şifrəni unutdum, nə edim?", a: "Giriş pəncərəsində “Şifrəni unutmusunuz?” seçin və e-poçtunuzu yazın; yeniləmə linki göndəriləcək." },
    { q: "Profilimi işəgötürənlər görür?", a: "Profilinizdə “İş təkliflərinə açığam” seçilməyibsə, yalnız müraciət etdiyiniz şirkət görür. Əlaqə məlumatlarınız yalnız müraciət etdiyiniz işəgötürənlə paylaşılır." },
    { q: "Məlumatlarımı necə yükləyə və ya silə bilərəm?", a: "Hesab → Təhlükəsizlik bölməsində “Məlumatlarımı yüklə” faylı və “Hesabı sil” seçimi var." },
    { q: "Test zamanı bağlantı kəsilsə nə olur?", a: "Cavablarınız hər 20 saniyədən bir saxlanılır. Vaxt serverdə hesablanır; yenidən daxil olub davam edə bilərsiniz." },
  ],
  company: [
    { q: "Vakansiyanı necə yaradım?", a: "“Vakansiyalarım” bölməsində yeni vakansiya yaradın; sistem sizin təsvirinizə görə qaralama hazırlayır, yoxlayıb dərc edirsiniz." },
    { q: "Komandaya üzvü necə dəvət edim?", a: "“Komanda və rollar” bölməsində e-poçt, rol və ya hazır şablon seçin. İstifadəçi həmin e-poçtla şirkət hesabı kimi daxil olub dəvəti qəbul edir." },
    { q: "Namizədə testi necə göndərim?", a: "“Testlər” bölməsində test yaradın (və ya Word/Excel/PDF faylından yükləyin), sonra namizəd kartından və ya toplu seçimlə göndərin." },
    { q: "İş təklifi nə vaxt göndərilə bilər?", a: "Müraciət vakansiyanın son seçim mərhələsinə çatdıqdan sonra. Təklif şablonlarını saxlaya bilərsiniz." },
    { q: "Şirkətim niyə “Təsdiqlənməyib”?", a: "“Şirkət məlumatları” bölməsində VÖEN və qeydiyyat sənədini yükləyin; administrator yoxladıqdan sonra nişan görünəcək." },
    { q: "Hesab silinəndə nə olur?", a: "Vakansiyalar, müraciətlər, testlər, işçi sənədləri və şablonlar birdəfəlik silinir; maliyyə uçotu üçün hesab-fakturalar saxlanılır." },
  ],
};
