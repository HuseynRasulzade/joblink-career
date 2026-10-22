"use client";
import { useState } from "react";
import { Check, Send } from "lucide-react";
import {
  COUNTRIES,
  canonicalUniversity,
  searchUniversities,
  type University,
} from "@/lib/university-catalog";
import { siteLanguage, translate } from "./i18n";

const t = (text: string) => translate(text, siteLanguage());
const display = (u: University) => (siteLanguage() === "en" ? u.labelEn : u.label);
const country = (u: University) => COUNTRIES[u.country]?.[siteLanguage() === "en" ? "en" : "az"] || u.country;

// Education institution input backed by the shared university list. A name
// that is not in the list stays valid as typed; the candidate can ask for it
// to be added.
export default function UniversityInput({
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
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<"idle" | "sending" | "sent" | { error: string }>("idle");
  const known = canonicalUniversity(value);
  const suggestions = open && value.trim().length >= 2 && !known ? searchUniversities(value, 8) : [];

  async function ask() {
    setRequest("sending");
    try {
      const response = await fetch("/api/joblink/support/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "university",
          subject: value.trim(),
          body: `Siyahıda olmayan təhsil müəssisəsinin əlavə edilməsini xahiş edirəm: “${value.trim()}”.`,
          meta: { label: value.trim() },
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
    <div className="field job-title-input">
      <span>{t(label)}</span>
      <div className="skill-picker-control">
        <input
          id={id}
          value={value}
          autoComplete="off"
          placeholder={t("Universitetin adını yazın və siyahıdan seçin")}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(event) => {
            onChange(event.target.value);
            setRequest("idle");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && suggestions[0]) {
              event.preventDefault();
              onChange(display(suggestions[0]));
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
            {suggestions.map((u) => (
              <button
                type="button"
                role="option"
                aria-selected="false"
                key={u.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(display(u));
                  setOpen(false);
                }}
              >
                <strong>{display(u)}</strong>
                <small>
                  {country(u)} · {siteLanguage() === "en" ? u.label : u.labelEn}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
      {!known && value.trim().length >= 3 && !open && (
        <div className="job-title-help">
          {request === "idle" && (
            <>
              <span>{t("Bu təhsil müəssisəsi siyahıda yoxdur, yazdığınız kimi saxlanılacaq.")}</span>
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
  );
}
