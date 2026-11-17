"use client";
import { COMPANY_AI_PACKAGES } from "@/lib/ai-packages";
import { PLANS } from "@/lib/plans";

// The public page under the sign-in: what the platform is, for whom, how it starts, what it costs.
const ROLES = [
  { tag: "İŞ AXTARANLAR", title: "İş tapın", text: "CV analizi, uyğunluq balı, bir kliklə müraciət və hər mərhələnin izlənməsi.", points: ["AI ilə CV təhlili və tövsiyələr", "Vakansiyaya uyğunluq faizi", "13 kalkulyator: maaş, məzuniyyət, müavinət"] },
  { tag: "İŞƏ QƏBUL", title: "Namizəd seçin", text: "Elandan təklifə qədər bütün proses bir yerdə.", points: ["AI ilə vakansiya hazırlamaq", "Namizəd qıfı və müsahibə skorkartı", "Test, təklif məktubu, analitika"] },
  { tag: "KADR (HR)", title: "Komandanı idarə edin", text: "İşçi kartından əmək haqqına qədər, qanuna uyğun.", points: ["Əmr və imza axını", "Əmək haqqı, davamiyyət, məzuniyyət", "Ştat planı: say və maaş həddi"] },
];
const STEPS = [
  { n: "1", title: "Qeydiyyatdan keçin", text: "E-poçtla hesab açın və «İş axtaran» və ya «Şirkət» seçin." },
  { n: "2", title: "Profilinizi qurun", text: "CV-ni yükləyin və ya şirkət məlumatlarını və komandanı əlavə edin." },
  { n: "3", title: "İlk nəticəni alın", text: "İlk müraciəti göndərin və ya ilk vakansiyanı AI köməkçi ilə yaradın." },
];
const FEATURES = [
  "Uyğunluq balı və AI sıralama", "Müsahibə vaxtı seçimi və təqvim", "Test və qiymətləndirmə kriteriyaları", "Əmək haqqı və haqq-hesab vərəqəsi",
  "Davamiyyət, məzuniyyət və ezamiyyət", "Hesabatlar, Excel və Power BI", "Rol və icazələr, baxış jurnalı", "Azərbaycan, ingilis və rus dilləri",
];
const FAQ = [
  { q: "Platforma pulsuzdurmu?", a: "Başlamaq pulsuzdur: iş axtaran paketsiz, şirkət pulsuz paketlə istifadə edə bilər. Daha çox AI təhlili lazımdırsa, aylıq paket seçilir." },
  { q: "Məlumatlarım təhlükəsizdirmi?", a: "Hər istifadəçi yalnız rolunun icazəsi çatan məlumatı görür; FİN, IBAN və maaşlar ayrıca icazə tələb edir; baxış və dəyişikliklər jurnala yazılır." },
  { q: "Hesablamalar qanuna uyğundurmu?", a: "Əmək haqqı, vergi, sığorta, məzuniyyət və ezamiyyət hesabları Azərbaycan Əmək və Vergi Məcəlləsinə əsaslanır. Hesablamalar məlumat xarakterlidir; rəsmi sənədləşmədən əvvəl mühasib yoxlamalıdır." },
  { q: "Mövcud məlumatı necə köçürürəm?", a: "İşçilər, ştat, davamiyyət və digər bölmələrdə Excel idxalı var: nümunə faylı yükləyin, doldurun, geri yükləyin." },
];
const azn = (n: number) => `${n.toLocaleString("az-AZ")} ₼`;

export default function Landing() {
  const candidatePlans = PLANS.filter((p) => p.priceAzn > 0);
  const top = (id: string) => { const el = document.querySelector(".auth-gate-panel"); el?.scrollIntoView({ behavior: "smooth", block: "center" }); void id; };
  return (
    <div className="landing">
      <section className="landing-block">
        <p className="landing-eyebrow">KİMLƏR ÜÇÜN</p>
        <h2>Bir hesab, üç istifadəçi növü</h2>
        <div className="landing-grid three">
          {ROLES.map((r) => (
            <article key={r.tag} className="landing-card">
              <span className="landing-tag">{r.tag}</span>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
              <ul>{r.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-block tint">
        <p className="landing-eyebrow">NECƏ BAŞLAMAQ</p>
        <h2>Üç addımda işə başlayın</h2>
        <div className="landing-grid three">
          {STEPS.map((s) => (
            <article key={s.n} className="landing-step"><span className="landing-num">{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></article>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 28 }}><button type="button" className="primary" onClick={() => top("signup")}>Qeydiyyatdan keç</button></p>
      </section>

      <section className="landing-block">
        <p className="landing-eyebrow">İMKANLAR</p>
        <h2>Gündəlik iş üçün lazım olan hər şey</h2>
        <ul className="landing-features">{FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
      </section>

      <section className="landing-block tint">
        <p className="landing-eyebrow">QİYMƏTLƏR</p>
        <h2>Pulsuz başlayın, ehtiyac artdıqca paket seçin</h2>
        <div className="landing-grid two">
          <article className="landing-card">
            <span className="landing-tag">İŞ AXTARANLAR · AYLIQ</span>
            <p className="landing-price">0–{Math.max(...candidatePlans.map((p) => p.priceAzn))} ₼</p>
            <p>Paketsiz istifadə pulsuzdur.</p>
            <ul>{candidatePlans.map((p) => <li key={p.id}>{p.name}: {azn(p.priceAzn)}</li>)}</ul>
          </article>
          <article className="landing-card">
            <span className="landing-tag">ŞİRKƏTLƏR · AYLIQ, ƏDV DAXİL</span>
            <p className="landing-price">0–{Math.max(...COMPANY_AI_PACKAGES.map((p) => p.priceAzn))} ₼</p>
            <p>AI paketi aylıq təhlil və sıralama sayını müəyyən edir.</p>
            <ul>{COMPANY_AI_PACKAGES.map((p) => <li key={p.id}>{p.name}: {p.priceAzn ? azn(p.priceAzn) : "pulsuz"}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className="landing-block">
        <p className="landing-eyebrow">SUALLAR</p>
        <h2>Tez-tez verilən suallar</h2>
        <div className="landing-faq">
          {FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </div>
      </section>

      <footer className="landing-footer">
        <span>jobmatch<span className="star">✳</span></span>
        <span><a href="/terms" target="_blank" rel="noreferrer">İstifadə şərtləri</a> · <a href="/privacy" target="_blank" rel="noreferrer">Məxfilik siyasəti</a></span>
      </footer>
    </div>
  );
}
