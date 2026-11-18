import type { Metadata } from "next";
import PublicCalculators from "../PublicCalculators";
import { PUBLIC_FAQ } from "@/lib/public-faq";

const TITLE = "Maaş kalkulyatoru 2026: gross net, super-gross, məzuniyyət pulu | JobMatch";
const DESCRIPTION =
  "Pulsuz və qeydiyyatsız: Azərbaycanda gross/net maaş, super-gross (işəgötürənin xərci), məzuniyyət pulu, orta əmək haqqı, ixtisar müavinəti, artıq iş və tutulmalar. Hər nəticədə Əmək və Vergi Məcəlləsinin maddəsi göstərilir.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/kalkulyatorlar" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: "/kalkulyatorlar", siteName: "JobMatch" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function CalculatorsPage() {
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "WebApplication", name: "JobMatch HR kalkulyatorları", applicationCategory: "BusinessApplication", operatingSystem: "Web", inLanguage: "az", description: DESCRIPTION, offers: { "@type": "Offer", price: "0", priceCurrency: "AZN" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: PUBLIC_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];
  return (
    <>
      <PublicCalculators />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
