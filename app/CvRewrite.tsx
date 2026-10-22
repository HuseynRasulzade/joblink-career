"use client";
import { useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { type Profile } from "@/lib/model";
import { Modal } from "./components";
import BrandedCv from "./BrandedCv";
import { siteLanguage } from "./i18n";

type Rewrite = { summary: string; experiences: { index: number; description: string }[]; notes: string[] };

// Rebuilds the CV from the analysis suggestions. The candidate reviews each
// section, keeps what they accept, saves, and downloads a branded PDF.
export default function CvRewrite({
  profile,
  suggestions,
  onSave,
  onClose,
  notify,
}: {
  profile: Profile;
  suggestions: string[];
  onSave: (profile: Profile) => Promise<void>;
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Rewrite | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Profile | null>(null);
  const [attempt, setAttempt] = useState(0);

  async function generate() {
    setBusy(true);
    try {
      const response = await fetch("/api/joblink/cv/rewrite", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, suggestions, language: siteLanguage(), attempt }),
      });
      const data = (await response.json()) as Rewrite & { error?: string };
      if (!response.ok) throw new Error(data.error || "CV yenidən hazırlanmadı.");
      setDraft(data);
      setAttempt((value) => value + 1);
      setAccepted(
        Object.fromEntries([
          ["summary", !!data.summary],
          ...data.experiences.map((e) => [`experience-${e.index}`, true]),
        ]),
      );
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const merged = (): Profile =>
    draft
      ? {
          ...profile,
          summary: accepted.summary && draft.summary ? draft.summary : profile.summary,
          experiences: profile.experiences.map((e, index) => {
            const next = draft.experiences.find((x) => x.index === index);
            return next && accepted[`experience-${index}`] ? { ...e, description: next.description } : e;
          }),
        }
      : profile;

  async function save() {
    setBusy(true);
    try {
      const next = merged();
      await onSave(next);
      setSaved(next);
      notify("Yenilənmiş CV profilinizdə yadda saxlandı.");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="CV-ni təkliflərə əsasən yenidən hazırla" onClose={onClose} className="cv-rewrite-modal">
      {saved ? (
        <div className="cv-rewrite-done">
          <p className="notice">CV yadda saxlandı. Brendli PDF üçün “PDF kimi yüklə” düyməsini seçin və çap pəncərəsində “PDF kimi saxla”nı seçin.</p>
          <div className="cv-print-area">
            <BrandedCv profile={saved} />
          </div>
          <button className="primary" onClick={() => window.print()}>
            <Download size={16} /> PDF kimi yüklə
          </button>
        </div>
      ) : !draft ? (
        <div className="cv-rewrite-intro">
          <p>
            AI analizdəki {suggestions.length} təklif əsasında xülasəni və iş təcrübəsi təsvirlərini yenidən yazacaq. Faktlar dəyişdirilmir; çatışmayan rəqəmlər üçün [nəticə] kimi yer saxlanılır, onları özünüz doldurmalısınız.
          </p>
          <button className="primary" disabled={busy} onClick={generate}>
            <Sparkles size={16} /> {busy ? "Hazırlanır…" : "Yeni variantı hazırla"}
          </button>
        </div>
      ) : (
        <div className="cv-rewrite-review">
          {draft.notes.length > 0 && (
            <ul className="cv-rewrite-notes">{draft.notes.map((note, i) => <li key={i}>{note}</li>)}</ul>
          )}
          {draft.summary && (
            <div className="cv-rewrite-row">
              <input type="checkbox" aria-label="Yeni xülasəni qəbul et" checked={!!accepted.summary} onChange={(e) => setAccepted({ ...accepted, summary: e.target.checked })} />
              <div>
                <strong>Peşəkar xülasə</strong>
                <div className="cv-rewrite-compare">
                  <div><span>İNDİ</span><p>{profile.summary || "—"}</p></div>
                  <div><span>YENİ</span><p>{draft.summary}</p></div>
                </div>
              </div>
            </div>
          )}
          {draft.experiences.map((item) => {
            const experience = profile.experiences[item.index];
            return (
              <div className="cv-rewrite-row" key={item.index}>
                <input
                  type="checkbox"
                  aria-label={`${experience?.title || "Təcrübə"} üçün yeni təsviri qəbul et`}
                  checked={!!accepted[`experience-${item.index}`]}
                  onChange={(e) => setAccepted({ ...accepted, [`experience-${item.index}`]: e.target.checked })}
                />
                <div>
                  <strong>{experience?.title} · {experience?.company}</strong>
                  <div className="cv-rewrite-compare">
                    <div><span>İNDİ</span><p className="branded-cv-pre">{experience?.description || "—"}</p></div>
                    <div><span>YENİ</span><p className="branded-cv-pre">{item.description}</p></div>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="cv-rewrite-actions">
            <button className="secondary" disabled={busy} onClick={generate}>Başqa variant</button>
            <button className="primary" disabled={busy || !Object.values(accepted).some(Boolean)} onClick={save}>
              Seçilənləri tətbiq et və yadda saxla
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
