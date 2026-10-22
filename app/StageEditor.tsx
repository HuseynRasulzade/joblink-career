"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { DEFAULT_STAGES } from "@/lib/recruitment";
import { siteLanguage, translate } from "./i18n";

const t = (text: string) => translate(text, siteLanguage());

// Ordered selection stages of a vacancy (e.g. CV review → interview → test).
export default function StageEditor({ value, onChange }: { value: string[] | undefined; onChange: (stages: string[]) => void }) {
  const stages = value || [];
  const [draft, setDraft] = useState("");
  const add = (name: string) => {
    const clean = name.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!clean || stages.includes(clean) || stages.length >= 8) return;
    onChange([...stages, clean]);
    setDraft("");
  };
  const move = (index: number, delta: number) => {
    const next = [...stages];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  return (
    <div className="field stage-editor">
      <span>{t("Müsabiqə mərhələləri")}</span>
      <ol>
        {stages.map((stage, index) => (
          <li key={stage}>
            <b>{index + 1}</b>
            <span>{stage}</span>
            <button type="button" aria-label={t("Yuxarı")} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
            <button type="button" aria-label={t("Aşağı")} disabled={index === stages.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
            <button type="button" aria-label={t("Sil")} onClick={() => onChange(stages.filter((s) => s !== stage))}><X size={14} /></button>
          </li>
        ))}
      </ol>
      <div className="stage-add">
        <input
          value={draft}
          maxLength={60}
          placeholder={t("Məsələn: Texniki tapşırıq")}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            }
          }}
        />
        <button type="button" className="secondary" onClick={() => add(draft)} disabled={!draft.trim()}>
          <Plus size={14} /> {t("Əlavə et")}
        </button>
        {!stages.length && (
          <button type="button" className="text-button" onClick={() => onChange(DEFAULT_STAGES)}>
            {t("Standart mərhələlər")}
          </button>
        )}
      </div>
      <small className="skill-picker-help">
        {t("Mərhələləri yalnız müraciəti qəbul edilən (baxışa götürülən) namizədlər görür.")}
      </small>
    </div>
  );
}
