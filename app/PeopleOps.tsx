"use client";
import { useState } from "react";
import LeaveSchedulePanel from "./LeaveSchedulePanel";
import { Assets, DocRegistry, Offboarding } from "./PeopleOpsPanels";

type Notify = (message: string) => void;
const TABS = [
  { id: "leave", label: "Məzuniyyət qrafiki" },
  { id: "docs", label: "Sənəd reyestri" },
  { id: "offboarding", label: "İşdən çıxma" },
  { id: "assets", label: "Aktivlər (əmlak)" },
] as const;

// The everyday personnel work that is not pay: leave plan, documents and their dates, leavers, company property.
export default function PeopleOps({ notify }: { notify: Notify }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("leave");
  return (
    <div>
      <div className="admin-actions" role="tablist" style={{ marginBottom: 12 }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "primary" : "secondary"} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "leave" && <LeaveSchedulePanel notify={notify} />}
      {tab === "docs" && <DocRegistry notify={notify} />}
      {tab === "offboarding" && <Offboarding notify={notify} />}
      {tab === "assets" && <Assets notify={notify} />}
    </div>
  );
}
