"use client";
import { Search, UserRound } from "lucide-react";
import BrandMark from "./BrandMark";
import GateCharts from "./GateCharts";
import { useLocalize } from "./localize-context";

// The first screen of the public page (stage, sample cards, headline and the vacancy search): used by the public home page and by the sign-in screen of the app.
export default function GateHero() {
  const localize = useLocalize();
  return localize(
    <section className="auth-gate-intro">
      <div className="auth-gate-brand">
        <BrandMark />jobmatch
      </div>
      <div className="gate-stage" aria-hidden="true">
        <div className="gate-glow" />
        <div className="gate-orbit one" />
        <div className="gate-orbit two" />
        <div className="gate-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-figure.webp?v=2" alt="" width={560} height={792} decoding="async" fetchPriority="high" />
          <span className="gate-ring" />
          <span className="gate-badge">✳</span>
        </div>
        <div className="gate-card gate-card-match">
          <small>Nümunə: uyğunluq balı</small>
          <strong>87%</strong>
          <div className="gate-bar"><i style={{ width: "87%" }} /></div>
          <div className="gate-tags"><span>Bacarıq 92%</span><span>Təcrübə 85%</span></div>
        </div>
        <div className="gate-card gate-card-flow">
          <small>Müraciətin yolu</small>
          <ol>
            <li className="done">Müraciət</li>
            <li className="done">Müsahibə</li>
            <li>Təklif</li>
          </ol>
        </div>
        <GateCharts />
        <div className="gate-card gate-card-facts">
          <div><strong>3</strong><small>istifadəçi növü</small></div>
          <div><strong>13</strong><small>kalkulyator</small></div>
          <div><strong>3</strong><small>dil</small></div>
        </div>
      </div>
      <div className="gate-copy">
        <span className="gate-pill">AI ilə işləyir</span>
        <h1>
          DOĞRU İNSAN
          <br />
          DOĞRU İMKAN
        </h1>
        <p className="gate-sub">
          İş axtaran kimi CV-nizi inkişaf etdirin və uyğun vakansiyaları
          tapın. Şirkət kimi vakansiyalar yaradın və uyğun namizədləri idarə
          edin.
        </p>
        <form className="gate-search" action="/jobs" method="get" role="search">
          <Search size={18} aria-hidden="true" />
          <input name="q" type="search" placeholder="Vəzifə, şirkət və ya bacarıq" aria-label="Vakansiya axtarışı" maxLength={80} />
          <select name="city" aria-label="Şəhər" defaultValue="">
            <option value="">Bütün şəhərlər</option>
            <option value="Bakı">Bakı</option>
            <option value="Sumqayıt">Sumqayıt</option>
            <option value="Gəncə">Gəncə</option>
            <option value="Uzaqdan">Uzaqdan</option>
          </select>
          <button type="submit" className="gate-search-go">Axtar</button>
        </form>
        <div className="gate-chips" aria-label="Sürətli axtarış">
          <a href="/jobs?q=Uzaqdan">Uzaqdan</a>
          <a href="/jobs?q=Tam+ştat">Tam ştat</a>
          <a href="/jobs?q=Mühasib">Mühasib</a>
          <a href="/jobs?q=Satış">Satış</a>
          <a href="/kalkulyatorlar">Maaş kalkulyatoru</a>
        </div>
        <div className="auth-gate-role-note">
          <UserRound size={20} />
          <span>
            Hər hesab yalnız qeydiyyatda seçilən panelə giriş əldə edir.
          </span>
        </div>
      </div>
    </section>
  );
}
