"use client";
import { useState } from "react";
import { Engage, Performance, Shifts, Training, Trips } from "./GrowthPanels";

type Notify = (message: string) => void;
const TABS = [
  { id: "performance", label: "Performans" },
  { id: "training", label: "Təlim" },
  { id: "shifts", label: "Növbə qrafiki" },
  { id: "trips", label: "Ezamiyyət" },
  { id: "engage", label: "Elanlar və sorğular" },
] as const;

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
      {tab === "performance" && <Performance notify={notify} />}
      {tab === "training" && <Training notify={notify} />}
      {tab === "shifts" && <Shifts notify={notify} />}
      {tab === "trips" && <Trips notify={notify} />}
      {tab === "engage" && <Engage notify={notify} />}
    </div>
  );
}
