"use client";
import { ArrowRight, BadgeCheck, FileCheck2, Gift } from "lucide-react";
import { HrCalculators } from "./HrCalculators";
import { PUBLIC_FAQ as FAQ } from "@/lib/public-faq";


// The open page of the calculators: free for everyone, and the way new visitors meet the platform.
export default function PublicCalculators() {
  return (
    <div className="pc">
      <header className="gate-nav solid pj-nav">
        <a className="gate-nav-brand" href="/">jobmatch<span>✳</span></a>
        <nav aria-label="Bölmələr">
          <a href="/jobs">Vakansiyalar</a>
          <a href="/kalkulyatorlar">Kalkulyatorlar</a>
          <a href="/#qiymetler">Qiymətlər</a>
        </nav>
        <a className="gate-nav-btn" href="/">Daxil ol / Qeydiyyat</a>
      </header>
      <section className="pc-hero">
        <p className="pc-eyebrow">PULSUZ · QEYDİYYATSIZ</p>
        <h1>Azərbaycan əmək hesablamaları: maaş, məzuniyyət, ixtisar və daha çoxu</h1>
        <p className="pc-lead">Gross və net maaşı, super-gross xərci, məzuniyyət pulunu, işdənçıxarma müavinətini saniyələr ərzində hesablayın. Hər nəticənin altında Əmək və Vergi Məcəlləsinin maddə nömrəsi göstərilir.</p>
        <ul className="pc-chips">
          <li><BadgeCheck size={16} /> 2026-cı il dərəcələri</li>
          <li><FileCheck2 size={16} /> Maddə nömrəsi ilə</li>
          <li><Gift size={16} /> Tam pulsuz</li>
        </ul>
      </section>
      <main className="pc-main">
        <HrCalculators publicMode />
      </main>
      <section className="pc-promo">
        <div>
          <h2>Bu hesabları komandanız üçün avtomatlaşdırın</h2>
          <p>JobMatch-də kalkulyator işçi kartına bağlıdır: nəticəni saxlayın, əmr hazırlayın, imza axınına göndərin, maaşı hesablayıb bank reyestri çıxarın. Vakansiya, namizəd, davamiyyət və ştat planı da eyni yerdədir.</p>
          <ul>
            <li>İşçi kartı, əmrlər və imza axını</li>
            <li>Əmək haqqı, avans, haqq-hesab vərəqəsi</li>
            <li>Davamiyyət, məzuniyyət qrafiki, ezamiyyət</li>
            <li>AI ilə vakansiya və namizəd seçimi</li>
          </ul>
        </div>
        <a className="pc-promo-btn" href="/">Pulsuz hesab aç <ArrowRight size={18} /></a>
      </section>
      <section className="pc-faq">
        <h2>Tez-tez verilən suallar</h2>
        {FAQ.map((f) => (
          <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
        ))}
      </section>
      <footer className="pc-footer">
        <span className="pc-logo">jobmatch<span>✳</span></span>
        <span><a href="/terms">İstifadə şərtləri</a> · <a href="/privacy">Məxfilik siyasəti</a></span>
      </footer>
    </div>
  );
}
