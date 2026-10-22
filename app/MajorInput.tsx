"use client";
import { useEffect, useState } from "react";
import { Check, Send } from "lucide-react";
import {
  DEGREE_LEVELS,
  MAJOR_FIELDS,
  canonicalMajor,
  composeDegree,
  degreeLevelLabel,
  majorLabel,
  parseDegree,
  searchMajors,
  type DegreeLevel,
} from "@/lib/major-catalog";
import { siteLanguage, translate } from "./i18n";

const t = (text: string) => translate(text, siteLanguage());
const language = () => (siteLanguage() === "en" ? "en" : "az");

// The profile keeps one "degree" string; this input edits it as a programme
// from the shared list plus a degree level ("programme · level").
export default function MajorInput({
  id,
  label,
  value,
  onChange,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const initial = parseDegree(value);
  const [major, setMajor] = useState(initial.major);
  const [level, setLevel] = useState<DegreeLevel | null>(initial.level);
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<"idle" | "sending" | "sent" | { error: string }>("idle");

  // Follow outside changes (for example a CV import) but not our own edits.
  useEffect(() => {
    if (composeDegree(major, level, language()) !== value) {
      const parsed = parseDegree(value);
      setMajor(parsed.major);
      setLevel(parsed.level);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const known = canonicalMajor(major);
  const suggestions = open && major.trim().length >= 2 && !known ? searchMajors(major, 8) : [];
  const emit = (nextMajor: string, nextLevel: DegreeLevel | null) => onChange(composeDegree(nextMajor, nextLevel, language()));

  async function ask() {
    setRequest("sending");
    try {
      const response = await fetch("/api/joblink/support/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "major",
          subject: major.trim(),
          body: `Siyahıda olmayan ixtisasın əlavə edilməsini xahiş edirəm: “${major.trim()}”.`,
          meta: { label: major.trim() },
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || t("Sorğu tamamlanmadı."));
      setRequest("sent");
    } catch (error) {
      setRequest({ error: (error as Error).message });
    }
  }

  return (
    <>
      <div className="field">
        <span>{t("Təhsil dərəcəsi")}</span>
        <select
          value={level?.id || ""}
          onChange={(event) => {
            const next = DEGREE_LEVELS.find((l) => l.id === event.target.value) || null;
            setLevel(next);
            emit(major, next);
          }}
        >
          <option value="">{t("Dərəcəni seçin")}</option>
          {DEGREE_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {degreeLevelLabel(l, language())}
            </option>
          ))}
        </select>
      </div>
      <div className="field job-title-input">
        <span>{t(label)}</span>
        <div className="skill-picker-control">
          <input
            id={id}
            value={major}
            autoComplete="off"
            placeholder={t("İxtisası yazın və siyahıdan seçin")}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onChange={(event) => {
              setMajor(event.target.value);
              emit(event.target.value, level);
              setRequest("idle");
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && suggestions[0]) {
                event.preventDefault();
                const name = majorLabel(suggestions[0], language());
                setMajor(name);
                emit(name, level);
                setOpen(false);
              }
            }}
          />
          {known && (
            <span className="job-title-known" title={known.labelEn}>
              <Check size={14} /> {t("Siyahıda")}
            </span>
          )}
          {suggestions.length > 0 && (
            <div className="skill-suggestions" role="listbox">
              {suggestions.map((m) => (
                <button
                  type="button"
                  role="option"
                  aria-selected="false"
                  key={m.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const name = majorLabel(m, language());
                    setMajor(name);
                    emit(name, level);
                    setOpen(false);
                  }}
                >
                  <strong>{majorLabel(m, language())}</strong>
                  <small>
                    {MAJOR_FIELDS[m.field]?.[language()]} · {language() === "en" ? m.label : m.labelEn}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>
        {!known && major.trim().length >= 3 && !open && (
          <div className="job-title-help">
            {request === "idle" && (
              <>
                <span>{t("Bu ixtisas siyahıda yoxdur, yazdığınız kimi saxlanılacaq.")}</span>
                <button type="button" className="text-button" onClick={ask}>
                  <Send size={14} /> {t("Siyahıya əlavə edilməsini xahiş et")}
                </button>
              </>
            )}
            {request === "sending" && <span>{t("Göndərilir…")}</span>}
            {request === "sent" && (
              <span className="job-title-requested">
                <Check size={14} /> {t("Sorğunuz adminə göndərildi. Statusunu “Sorğularım” bölməsində izləyə bilərsiniz.")}
              </span>
            )}
            {typeof request === "object" && <span className="job-title-error">{request.error}</span>}
          </div>
        )}
      </div>
    </>
  );
}
