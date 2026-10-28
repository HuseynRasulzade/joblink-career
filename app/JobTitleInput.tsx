"use client";
import { useEffect, useState } from "react";
import { Check, Send, Sparkles } from "lucide-react";
import {
  canonicalJobTitle,
  searchJobTitles,
  searchWorldJobTitles,
  worldJobTitleKnown,
  type JobTitleDefinition,
  type WorldJobTitle,
} from "@/lib/job-title-catalog";
import { siteLanguage, translate } from "./i18n";

const t = (text: string) => translate(text, siteLanguage());
const display = (title: JobTitleDefinition) => (siteLanguage() === "en" ? title.labelEn : title.label);

// The international list is fetched once, only when someone starts typing.
let worldList: Promise<WorldJobTitle[]> | null = null;
function loadWorldList() {
  worldList ||= fetch("/data/world-job-titles.json")
    .then((response) => (response.ok ? (response.json() as Promise<WorldJobTitle[]>) : []))
    .catch(() => {
      worldList = null;
      return [] as WorldJobTitle[];
    });
  return worldList;
}

type Resolution =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "matched"; title: JobTitleDefinition; source: string }
  | { state: "suggested"; suggestions: JobTitleDefinition[] }
  | { state: "not_found" }
  | { state: "requested" }
  | { state: "error"; message: string };

// Job title input backed by the shared catalog: typo-tolerant suggestions,
// an AI check for unusual spellings and a request to add a missing title.
export default function JobTitleInput({
  id,
  label,
  value,
  onChange,
  required = false,
  placeholder = "Vəzifəni yazın və siyahıdan seçin",
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState<Resolution>({ state: "idle" });
  const [world, setWorld] = useState<WorldJobTitle[]>([]);
  useEffect(() => {
    if (open && value.trim().length >= 2 && !world.length) void loadWorldList().then(setWorld);
  }, [open, value, world.length]);
  const known = canonicalJobTitle(value);
  const worldKnown = !known && world.length ? worldJobTitleKnown(world, value) : null;
  const suggestions = open && value.trim() && !known ? searchJobTitles(value, 10) : [];
  const wider = open && value.trim() && !known && !worldKnown && suggestions.length < 10 ? searchWorldJobTitles(world, value, 10 - suggestions.length) : [];

  async function check() {
    setResolution({ state: "checking" });
    try {
      const response = await fetch("/api/joblink/job-titles/resolve", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: value }),
      });
      const data = (await response.json()) as {
        error?: string;
        status?: string;
        title?: JobTitleDefinition;
        suggestions?: JobTitleDefinition[];
        source?: string;
      };
      if (!response.ok) throw new Error(data.error || t("Sorğu tamamlanmadı."));
      if (data.status === "matched" && data.title)
        setResolution({ state: "matched", title: data.title, source: data.source || "catalog" });
      else if (data.suggestions?.length) setResolution({ state: "suggested", suggestions: data.suggestions });
      else setResolution({ state: "not_found" });
    } catch (error) {
      setResolution({ state: "error", message: (error as Error).message });
    }
  }

  async function request() {
    setResolution({ state: "checking" });
    try {
      const response = await fetch("/api/joblink/support/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "job-title",
          subject: value.trim(),
          body: `Kataloqda olmayan vəzifə adının əlavə edilməsini xahiş edirəm: “${value.trim()}”.`,
          meta: { label: value.trim() },
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || t("Sorğu tamamlanmadı."));
      setResolution({ state: "requested" });
    } catch (error) {
      setResolution({ state: "error", message: (error as Error).message });
    }
  }

  const pick = (title: JobTitleDefinition) => {
    onChange(display(title));
    setResolution({ state: "idle" });
    setOpen(false);
  };

  return (
    <div className="field job-title-input">
      <span>{t(label)}</span>
      <div className="skill-picker-control">
        <input
          id={id}
          required={required}
          value={value}
          autoComplete="off"
          placeholder={t(placeholder)}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(event) => {
            onChange(event.target.value);
            setResolution({ state: "idle" });
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (suggestions[0] || wider[0])) {
              event.preventDefault();
              if (suggestions[0]) pick(suggestions[0]);
              else {
                onChange(wider[0]);
                setOpen(false);
              }
            }
          }}
        />
        {(known || worldKnown) && (
          <span className="job-title-known" title={known?.labelEn || worldKnown || undefined}>
            <Check size={14} /> {t("Kataloqda")}
          </span>
        )}
        {suggestions.length + wider.length > 0 && (
          <div className="skill-suggestions" role="listbox">
            {suggestions.map((title) => (
              <button
                type="button"
                role="option"
                aria-selected="false"
                key={title.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(title)}
              >
                <strong>{display(title)}</strong>
                <small>{siteLanguage() === "en" ? title.label : title.labelEn}</small>
              </button>
            ))}
            {wider.map((name) => (
              <button
                type="button"
                role="option"
                aria-selected="false"
                key={name}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
              >
                <strong>{name}</strong>
                <small>{t("Beynəlxalq (ESCO)")}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {!known && !worldKnown && value.trim().length >= 2 && !open && (
        <div className="job-title-help">
          {resolution.state === "idle" && (
            <>
              <span>{t("Bu vəzifə siyahıda yoxdur.")}</span>
              <button type="button" className="text-button" onClick={check}>
                <Sparkles size={14} /> {t("AI ilə yoxla")}
              </button>
            </>
          )}
          {resolution.state === "checking" && <span>{t("Yoxlanılır…")}</span>}
          {resolution.state === "matched" && (
            <>
              <span>
                {t("Bunu nəzərdə tuturdunuz:")} <b>{display(resolution.title)}</b>
              </span>
              <button type="button" className="text-button" onClick={() => pick(resolution.title)}>
                {t("Seç")}
              </button>
            </>
          )}
          {resolution.state === "suggested" && (
            <>
              <span>{t("Oxşar vəzifələr:")}</span>
              {resolution.suggestions.slice(0, 4).map((title) => (
                <button type="button" className="text-button" key={title.id} onClick={() => pick(title)}>
                  {display(title)}
                </button>
              ))}
              <button type="button" className="text-button" onClick={request}>
                <Send size={14} /> {t("Heç biri deyil — müraciət et")}
              </button>
            </>
          )}
          {resolution.state === "not_found" && (
            <>
              <span>{t("AI da uyğun vəzifə tapmadı.")}</span>
              <button type="button" className="text-button" onClick={request}>
                <Send size={14} /> {t("Əlavə edilməsi üçün müraciət et")}
              </button>
            </>
          )}
          {resolution.state === "requested" && (
            <span className="job-title-requested">
              <Check size={14} /> {t("Sorğunuz adminə göndərildi. Statusunu “Sorğularım” bölməsində izləyə bilərsiniz.")}
            </span>
          )}
          {resolution.state === "error" && <span className="job-title-error">{resolution.message}</span>}
        </div>
      )}
    </div>
  );
}
