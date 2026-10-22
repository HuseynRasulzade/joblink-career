"use client";
import { useEffect, useState } from "react";
import { Check, Send } from "lucide-react";
import {
  COUNTRIES,
  canonicalUniversity,
  searchUniversities,
  searchWorldUniversities,
  worldUniversityKnown,
  type University,
  type WorldUniversity,
} from "@/lib/university-catalog";
import { siteLanguage, translate } from "./i18n";

const t = (text: string) => translate(text, siteLanguage());
const display = (u: University) => (siteLanguage() === "en" ? u.labelEn : u.label);
const country = (u: University) => COUNTRIES[u.country]?.[siteLanguage() === "en" ? "en" : "az"] || u.country;

// The wider list is fetched once, only when a candidate starts typing.
let worldList: Promise<WorldUniversity[]> | null = null;
function loadWorldList() {
  worldList ||= fetch("/data/world-universities.json")
    .then((response) => (response.ok ? (response.json() as Promise<WorldUniversity[]>) : []))
    .catch(() => {
      worldList = null;
      return [] as WorldUniversity[];
    });
  return worldList;
}
function countryName(code: string) {
  const known = COUNTRIES[code];
  if (known) return known[siteLanguage() === "en" ? "en" : "az"];
  try {
    return new Intl.DisplayNames([siteLanguage() === "en" ? "en" : "az"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

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
  const [world, setWorld] = useState<WorldUniversity[]>([]);
  useEffect(() => {
    if (open && !world.length) void loadWorldList().then(setWorld);
  }, [open, world.length]);
  const known = canonicalUniversity(value);
  const worldKnown = !known && world.length ? worldUniversityKnown(world, value) : null;
  const searching = open && value.trim().length >= 2 && !known && !worldKnown;
  const curated = searching ? searchUniversities(value, 8) : [];
  const wider = searching && curated.length < 8 ? searchWorldUniversities(world, value, 8 - curated.length) : [];

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
            const first = curated[0] ? display(curated[0]) : wider[0]?.[0];
            if (event.key === "Enter" && first) {
              event.preventDefault();
              onChange(first);
              setOpen(false);
            }
          }}
        />
        {(known || worldKnown) && (
          <span className="job-title-known" title={known?.labelEn || worldKnown?.[0]}>
            <Check size={14} /> {t("Siyahıda")}
          </span>
        )}
        {curated.length + wider.length > 0 && (
          <div className="skill-suggestions" role="listbox">
            {curated.map((u) => (
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
            {wider.map(([name, code]) => (
              <button
                type="button"
                role="option"
                aria-selected="false"
                key={`${code}-${name}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
              >
                <strong>{name}</strong>
                <small>{countryName(code)}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {!known && !worldKnown && value.trim().length >= 3 && !open && (
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
