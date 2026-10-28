import type { Metadata } from "next";
import { HrCalculators } from "../HrCalculators";

export const metadata: Metadata = {
  title: "HR kalkulyatorları | Joblink",
  description:
    "Azərbaycan Əmək və Vergi Məcəlləsi əsasında maaş (gross/net), məzuniyyət pulu, istifadə edilməmiş məzuniyyət, orta əmək haqqı, ixtisar müavinəti, artıq iş və ƏDV kalkulyatorları.",
};

export default function CalculatorsPage() {
  return (
    <main className="seo-page seo-wide">
      <h1>HR kalkulyatorları</h1>
      <p>
        Hesablamalar Azərbaycan Respublikasının Əmək Məcəlləsi və Vergi Məcəlləsinin maddələrinə əsaslanır, hər nəticənin
        altında maddə nömrəsi göstərilir. <a href="/">Joblink-ə keç</a>
      </p>
      <HrCalculators />
    </main>
  );
}
