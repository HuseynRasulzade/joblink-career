"use client";
import { useState } from "react";
import { History } from "lucide-react";
import { formatDate } from "@/lib/dates";
import type { Profile } from "@/lib/model";
import { Modal } from "./components";
import { siteLanguage } from "./i18n";

type Version = { id: string; created: string; title: string; skills: number; experiences: number; cvName: string };

// Earlier states of the profile; one click returns to any of them (the current state is kept as a version too).
export default function ProfileVersions({ onRestored, notify }: { onRestored: (profile: Profile) => void; notify: (message: string) => void }) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [open, setOpen] = useState(false);
  async function load() {
    try {
      const response = await fetch("/api/joblink/profile/versions", { credentials: "same-origin", cache: "no-store" });
      const data = (await response.json()) as { versions?: Version[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Versiyalar yüklənmədi.");
      setVersions(data.versions || []);
      setOpen(true);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function restore(id: string) {
    if (!window.confirm("Profil bu versiyaya qaytarılsın? Hazırkı vəziyyət də versiya kimi saxlanılacaq.")) return;
    try {
      const response = await fetch("/api/joblink/profile/restore", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = (await response.json()) as { profile?: Profile; error?: string };
      if (!response.ok || !data.profile) throw new Error(data.error || "Qaytarılmadı.");
      onRestored(data.profile);
      setOpen(false);
      notify("Profil əvvəlki versiyaya qaytarıldı.");
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <>
      <button type="button" className="secondary" onClick={load}><History size={15} /> Profil versiyaları</button>
      {open && (
        <Modal title="Profil versiyaları" onClose={() => setOpen(false)}>
          <p className="muted fine-print">Profili yadda saxlayanda əvvəlki vəziyyət (ən çoxu 10 versiya, 10 dəqiqədə bir) saxlanılır.</p>
          {(versions || []).map((v) => (
            <div key={v.id} className="exam-row">
              <div>
                <strong>{formatDate(v.created, siteLanguage(), { time: true })}</strong>
                <small>{v.title || "Vəzifə yazılmayıb"} · {v.skills} bacarıq · {v.experiences} iş yeri{v.cvName ? ` · ${v.cvName}` : ""}</small>
              </div>
              <button type="button" onClick={() => restore(v.id)}>Bu versiyaya qayıt</button>
            </div>
          ))}
          {versions && !versions.length && <p className="admin-empty">Hələ əvvəlki versiya yoxdur.</p>}
        </Modal>
      )}
    </>
  );
}
