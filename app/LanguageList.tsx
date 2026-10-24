"use client";
import { Plus, X } from "lucide-react";
import {
  LANGUAGE_LEVELS,
  LANGUAGE_NAMES,
  parseLanguages,
  serializeLanguages,
  type LanguageEntry,
} from "@/lib/languages";
import { siteLanguage, translate } from "./i18n";

const t = (text: string) => translate(text, siteLanguage());

// Languages as a list of rows (language + level). The profile still stores
// one text value, so older profiles and CV imports keep working.
export function LanguageList({
  inputId,
  value,
  onChange,
}: {
  inputId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const rows = parseLanguages(value);
  const commit = (next: LanguageEntry[]) => onChange(serializeLanguages(next));
  const update = (index: number, patch: Partial<LanguageEntry>) =>
    commit(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const free = LANGUAGE_NAMES.filter(
    (name) =>
      !rows.some((row) => row.name.toLowerCase() === name.toLowerCase()),
  );
  return (
    <div className="field language-list" id={inputId}>
      <span>{t("Dillər və səviyyə")}</span>
      {rows.length === 0 && (
        <p className="field-hint">{t("Hələ dil əlavə edilməyib.")}</p>
      )}
      {rows.map((row, index) => {
        const knownLevel = LANGUAGE_LEVELS.includes(row.level) || !row.level;
        return (
          <div className="language-row" key={`${row.name}-${index}`}>
            <input
              list={`${inputId}-names`}
              aria-label={t("Dil")}
              value={row.name}
              placeholder={t("Dil")}
              onChange={(event) => update(index, { name: event.target.value })}
            />
            <select
              aria-label={t("Səviyyə")}
              value={row.level}
              onChange={(event) => update(index, { level: event.target.value })}
            >
              <option value="">{t("Səviyyə seçin")}</option>
              {!knownLevel && <option value={row.level}>{row.level}</option>}
              {LANGUAGE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level === "ana dili" ? t("Ana dili") : level}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-button"
              aria-label={`${row.name} ${t("sil")}`}
              onClick={() => commit(rows.filter((_, i) => i !== index))}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
      <datalist id={`${inputId}-names`}>
        {free.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <button
        type="button"
        className="ghost small"
        disabled={!free.length || rows.length >= 12}
        onClick={() =>
          free[0] &&
          commit([...rows, { name: free[0], level: "" }].slice(0, 12))
        }
      >
        <Plus size={14} /> {t("Dil əlavə et")}
      </button>
    </div>
  );
}
