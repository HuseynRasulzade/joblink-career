import type { Metadata } from "next";
import { runtime } from "@/lib/server";
import { COMPANY, operatorOf } from "@/lib/platform-company";
import { CONTACT } from "@/lib/contact";
import PublicShell from "../jobs/PublicShell";

export const dynamic = "force-dynamic";
const DESCRIPTION = "JobMatch haqqında: iş axtaranlar və işəgötürənlər üçün platforma. Operator şirkət, VÖEN, hüquqi ünvan və əlaqə məlumatları.";
export const metadata: Metadata = {
  title: "Haqqımızda | JobMatch",
  description: DESCRIPTION,
  alternates: { canonical: "/haqqimizda" },
  openGraph: { title: "Haqqımızda | JobMatch", description: DESCRIPTION, type: "website", url: "/haqqimizda", siteName: "JobMatch" },
};

export default function Page() {
  const op = operatorOf(runtime());
  const rows: [string, string][] = [
    ["Hüquqi ad", op.name],
    ["VÖEN", op.voen],
    ["Hüquqi ünvan", op.address],
    ["Dövlət qeydiyyatı", `${COMPANY.registry}, ${COMPANY.registeredAt}`],
    ["Əlaqə nömrəsi", CONTACT.phone],
    ["E-poçt", op.email],
    ["İş saatları", CONTACT.hours],
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY.brand,
    legalName: op.name,
    taxID: op.voen,
    telephone: CONTACT.phone,
    email: op.email,
    address: { "@type": "PostalAddress", streetAddress: op.address, addressLocality: "Bakı", addressCountry: "AZ" },
  };
  return (
    <PublicShell>
      <main className="lg">
        <div className="lg-head">
          <div>
            <h1>Haqqımızda</h1>
            <p className="lg-meta">JobMatch {COMPANY.brand} şirkətinin məhsuludur</p>
          </div>
        </div>
        <div className="lg-text">
          <section>
            <h2>JobMatch nədir?</h2>
            <p>JobMatch iş axtaranları və işəgötürənləri bir yerə gətirən Azərbaycan platformasıdır. İş axtaranlar CV-ni yükləyib süni intellektlə analiz edə, vakansiyalara uyğunluğunu görə və müraciət edə bilər. İşəgötürənlər vakansiya yerləşdirir, namizədləri müqayisə edir və kadr əməliyyatlarını bir yerdən idarə edir. Platformada Azərbaycan Əmək və Vergi Məcəlləsinə əsaslanan pulsuz maaş və məzuniyyət kalkulyatorları da var.</p>
          </section>
          <section>
            <h2>Şirkət məlumatları</h2>
            <p>JobMatch platformasını {COMPANY.name} idarə edir.</p>
            <dl className="about-grid">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{label === "E-poçt" ? <a href={`mailto:${value}`}>{value}</a> : label === "Əlaqə nömrəsi" ? <a href={`tel:${CONTACT.phoneHref}`}>{value}</a> : value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h2>Əlaqə</h2>
            <p>Sual, təklif və ya hüquqi sorğular üçün <a href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phone}</a> nömrəsinə zəng edin və ya <a href={`mailto:${op.email}`}>{op.email}</a> ünvanına yazın. Platformadan istifadə qaydaları üçün <a href="/terms">İstifadə şərtləri</a>, şəxsi məlumatlar üçün <a href="/privacy">Məxfilik siyasəti</a> səhifələrinə baxın.</p>
          </section>
        </div>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </PublicShell>
  );
}
