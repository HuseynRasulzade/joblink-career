"use client";
import { useState } from "react";
import { Engage, Performance, Shifts, SkillMatrix, Training, Trips } from "./GrowthPanels";

type Notify = (message: string) => void;
const TABS = [
  { id: "performance", label: "Performans" },
  { id: "skills", label: "Bacarıq matrisi" },
  { id: "training", label: "Təlim" },
  { id: "shifts", label: "Növbə qrafiki" },
  { id: "trips", label: "Ezamiyyət" },
  { id: "engage", label: "Elanlar və sorğular" },
] as const;

const ABOUT: Record<(typeof TABS)[number]["id"], string> = {
  performance: "Dövr açın, hər işçiyə məqsəd yazın. İşçi icranı və özünüqiyməti doldurur, rəhbər və kolleqalar rəy verir, sonda işçi nəticə ilə tanış olub təsdiq edir. Rəhbər öz komandasını «İş yerim → Komandam»dan qiymətləndirə bilər.",
  skills: "Şirkət üçün vacib bacarıqları əlavə edin, hər işçinin səviyyəsini (0–4) və vəzifənin tələb etdiyi hədəfi yazın. Hədəfdən aşağı xanalar qırmızı görünür: təlim planının əsasıdır. Rəhbər öz komandası üçün də yaza bilər, işçi öz səviyyəsini «İş yerim → Performans»da görür.",
  training: "Təlimləri planlayın, büdcəni izləyin, iştirakçıları seçin. Sertifikatın müddəti və vəzifə üzrə məcburi təlimlər izlənir, müddət bitəndə xəbərdarlıq gəlir.",
  shifts: "Növbə ilə işləyən işçilər üçün kimin hansı gün hansı saatda işlədiyini planlayın. Qrafik məzuniyyət, istirahət və minimum işçi sayı qaydalarına görə yoxlanılır; saatlar əmək haqqına keçir.",
  trips: "İşçi və ya HR ezamiyyət sorğusu yaradır, rəhbər və HR təsdiqləyir, işçi xərc hesabatı verir, hesablaşma əmək haqqında «digər ödəniş» kimi qeyd olunur.",
  engage: "Şirkət elanları (oxu təsdiqi ilə) və anonim sorğular (eNPS və öz sualları, təkrarlanan ola bilər). İşçilər onları «İş yerim»də görür.",
};

// Growth and communication: appraisal, training, shifts, business trips, announcements and surveys.
export default function GrowthHub({ notify }: { notify: Notify }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("performance");
  return (
    <div>
      <div className="admin-actions" role="tablist" style={{ marginBottom: 12 }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "primary" : "secondary"} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted">{ABOUT[tab]}</p>
      {tab === "performance" && <Performance notify={notify} />}
      {tab === "skills" && <SkillMatrix notify={notify} />}
      {tab === "training" && <Training notify={notify} />}
      {tab === "shifts" && <Shifts notify={notify} />}
      {tab === "trips" && <Trips notify={notify} />}
      {tab === "engage" && <Engage notify={notify} />}
    </div>
  );
}
