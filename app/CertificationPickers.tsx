"use client";
import { useMemo, useState } from "react";
import { Award, BadgeCheck, Plus, ScanSearch, X } from "lucide-react";
import {
  certificationById,
  certificationLevelRank,
  detectCertifications,
  moduleSummary,
  normalizeCertificationLevel,
  searchCertifications,
  type CandidateCertification,
  type CertificationDefinition,
  type CertificationStatus,
  type JobCertification,
} from "@/lib/certification-catalog";
import { siteLanguage, translate } from "./i18n";

const STATUS_LABELS: Record<CertificationStatus, string> = {
  active: "Alınıb",
  in_progress: "Davam edir",
  expired: "Müddəti bitib",
};
const t = (text: string) => translate(text, siteLanguage());

function categoryLabel(definition: CertificationDefinition) {
  return siteLanguage() === "en" ? definition.categoryEn : definition.category;
}

function CertificationSearch({
  selected,
  onPick,
  placeholder,
  inputId,
}: {
  selected: string[];
  onPick: (definition: CertificationDefinition) => void;
  placeholder: string;
  inputId?: string;
}) {
  const [query, setQuery] = useState("");
  const suggestions = query.trim()
    ? searchCertifications(query, selected, 8)
    : [];
  return (
    <div className="skill-picker-control">
      <input
        id={inputId}
        value={query}
        autoComplete="off"
        placeholder={t(placeholder)}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && suggestions[0]) {
            event.preventDefault();
            onPick(suggestions[0]);
            setQuery("");
          }
        }}
      />
      {query.trim() && (
        <div className="skill-suggestions" role="listbox">
          {suggestions.map((definition) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              key={definition.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onPick(definition);
                setQuery("");
              }}
            >
              <strong>{definition.name}</strong>
              <small>
                {definition.issuer} · {categoryLabel(definition)}
              </small>
            </button>
          ))}
          {!suggestions.length && (
            <p className="skill-suggestions-empty">
              {t("Kataloqda uyğun sertifikat tapılmadı.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function LevelInput({
  definition,
  value,
  onChange,
  label,
}: {
  definition: CertificationDefinition;
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
}) {
  if (definition.scale)
    return (
      <label className="cert-mini-field">
        <span>{t(label)}</span>
        <input
          type="number"
          min={definition.scale.min}
          max={definition.scale.max}
          step={definition.scale.step}
          value={value || ""}
          placeholder={`${definition.scale.min}–${definition.scale.max}`}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  if (!definition.levels?.length) return null;
  return (
    <label className="cert-mini-field">
      <span>{t(label)}</span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{t("Göstərilməyib")}</option>
        {definition.levels.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CandidateCertificationEditor({
  value,
  onChange,
  detectFrom,
  onDismiss,
  inputId,
}: {
  value: CandidateCertification[] | undefined;
  onChange: (value: CandidateCertification[]) => void;
  detectFrom: string;
  onDismiss?: (id: string) => void;
  inputId?: string;
}) {
  const list = value || [];
  // Dismissed certifications stay available here as a manual suggestion.
  const detected = useMemo(
    () =>
      detectCertifications(detectFrom).filter(
        (item) => !(value || []).some((own) => own.id === item.id),
      ),
    [detectFrom, value],
  );
  const update = (id: string, patch: Partial<CandidateCertification>) =>
    onChange(
      list.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  // Exams the CV lists per certification, used when the card has none yet.
  const fromCv = useMemo(() => detectCertifications(detectFrom), [detectFrom]);
  const add = (items: CandidateCertification[]) =>
    onChange(
      [
        ...list,
        ...items.map((item) => ({
          ...item,
          ...(fromCv.find((c) => c.id === item.id && c.passed?.length) || {}),
          source: "profile" as const,
        })),
      ].slice(0, 40),
    );
  const setModules = (
    item: CandidateCertification,
    passed: string[],
    preparing: string[],
  ) => {
    const definition = certificationById(item.id);
    if (!definition) return;
    const summary = moduleSummary(definition, passed, preparing);
    update(item.id, {
      passed,
      preparing,
      ...(summary || { detail: undefined }),
    });
  };
  return (
    <div className="field cert-editor">
      <span>{t("Beynəlxalq sertifikatlar və lisenziyalar")}</span>
      <CertificationSearch
        inputId={inputId}
        selected={list.map((item) => item.id)}
        placeholder="Məsələn: ACCA, CIPS, PMP, IELTS, NEBOSH"
        onPick={(definition) => add([{ id: definition.id, status: "active" }])}
      />
      {detected.length > 0 && (
        <div className="cert-detected">
          <p>
            <ScanSearch size={16} /> {t("CV-nizdə tapılan sertifikatlar")}
          </p>
          <div className="cert-detected-list">
            {detected.map((item) => (
              <button type="button" key={item.id} onClick={() => add([item])}>
                <Plus size={14} /> {certificationById(item.id)?.name}
                <small>
                  {t(STATUS_LABELS[item.status])}
                  {item.level ? ` · ${item.level}` : ""}
                </small>
              </button>
            ))}
            {detected.length > 1 && (
              <button
                type="button"
                className="cert-add-all"
                onClick={() => add(detected)}
              >
                {t("Hamısını əlavə et")}
              </button>
            )}
          </div>
        </div>
      )}
      {list.length > 0 && (
        <div className="cert-cards">
          {list.map((item) => {
            const definition = certificationById(item.id);
            if (!definition) return null;
            return (
              <article className="cert-card" key={item.id}>
                <div className="cert-card-head">
                  <span className="cert-icon">
                    <Award size={17} />
                  </span>
                  <div>
                    <strong>{definition.name}</strong>
                    <small>{definition.issuer}</small>
                  </div>
                  <button
                    type="button"
                    aria-label={`${definition.name} ${t("sil")}`}
                    onClick={() => {
                      onChange(list.filter((own) => own.id !== item.id));
                      onDismiss?.(item.id);
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
                {item.detail && <p className="cert-detail">{item.detail}</p>}
                <div className="cert-card-fields">
                  <label className="cert-mini-field">
                    <span>{t("Status")}</span>
                    <select
                      value={item.status}
                      onChange={(event) =>
                        update(item.id, {
                          status: event.target.value as CertificationStatus,
                        })
                      }
                    >
                      {(
                        Object.keys(STATUS_LABELS) as CertificationStatus[]
                      ).map((status) => (
                        <option key={status} value={status}>
                          {t(STATUS_LABELS[status])}
                        </option>
                      ))}
                    </select>
                  </label>
                  <LevelInput
                    definition={definition}
                    label={definition.scale ? "Bal" : "Səviyyə"}
                    value={item.level}
                    onChange={(level) => {
                      const cv = fromCv.find((c) => c.id === item.id);
                      // Choosing a level brings in the exams the CV lists.
                      if (!item.passed?.length && cv?.passed?.length)
                        update(item.id, {
                          level:
                            normalizeCertificationLevel(definition, level) ||
                            level,
                          passed: cv.passed,
                          preparing: cv.preparing,
                          detail: cv.detail,
                          status: cv.status,
                        });
                      else
                        update(item.id, {
                          level:
                            normalizeCertificationLevel(definition, level) ||
                            level,
                        });
                    }}
                  />
                  <label className="cert-mini-field">
                    <span>{t("İl")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      value={item.year || ""}
                      placeholder="2024"
                      onChange={(event) =>
                        update(item.id, {
                          year: event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4),
                        })
                      }
                    />
                  </label>
                  {definition.modules && (
                    <ModulePicker
                      definition={definition}
                      item={item}
                      onChange={(passed, preparing) =>
                        setModules(item, passed, preparing)
                      }
                    />
                  )}
                  <label className="cert-mini-field wide">
                    <span>{t("Yoxlama linki")}</span>
                    <input
                      type="url"
                      value={item.credentialUrl || ""}
                      placeholder="https://"
                      onChange={(event) =>
                        update(item.id, { credentialUrl: event.target.value })
                      }
                    />
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <small className="skill-picker-help">
        {t(
          "Sertifikatlar uyğunluq balına təsir edir: alınmış sertifikat əlaqəli bacarıqları təsdiqləyir, davam edən isə qismən sayılır.",
        )}
      </small>
    </div>
  );
}

// Exams grouped by level. Up to the selected level only, so choosing
// "Applied Knowledge" shows the Knowledge papers and their status.
function ModulePicker({
  definition,
  item,
  onChange,
}: {
  definition: CertificationDefinition;
  item: CandidateCertification;
  onChange: (passed: string[], preparing: string[]) => void;
}) {
  const modules = definition.modules || [];
  const moduleLevels = [...new Set(modules.map((mod) => mod.level))];
  const selectedRank = certificationLevelRank(definition, item.level);
  const lastModuleRank = Math.max(
    ...moduleLevels.map((level) => certificationLevelRank(definition, level)),
  );
  const visible = moduleLevels.filter(
    (level) =>
      selectedRank < 0 ||
      selectedRank > lastModuleRank ||
      certificationLevelRank(definition, level) <= selectedRank,
  );
  const passed = item.passed || [];
  const preparing = item.preparing || [];
  const cycle = (code: string) => {
    if (passed.includes(code))
      onChange(
        passed.filter((c) => c !== code),
        [...preparing, code],
      );
    else if (preparing.includes(code))
      onChange(
        passed,
        preparing.filter((c) => c !== code),
      );
    else onChange([...passed, code], preparing);
  };
  return (
    <div className="cert-modules">
      <span>
        {t("İmtahanlar")}
        <small>{t("Toxunun: verilib → hazırlaşır → yoxdur")}</small>
      </span>
      {visible.map((level) => (
        <div className="cert-module-group" key={level}>
          <b>{level}</b>
          <div>
            {modules
              .filter((mod) => mod.level === level)
              .map((mod) => {
                const state = passed.includes(mod.code)
                  ? "passed"
                  : preparing.includes(mod.code)
                    ? "preparing"
                    : "none";
                return (
                  <button
                    type="button"
                    key={mod.code}
                    className={`cert-module ${state}`}
                    aria-pressed={state !== "none"}
                    title={mod.name}
                    onClick={() => cycle(mod.code)}
                  >
                    {state === "passed"
                      ? "✓ "
                      : state === "preparing"
                        ? "◷ "
                        : ""}
                    {mod.code === mod.name
                      ? mod.code
                      : `${mod.name} (${mod.code})`}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function JobCertificationPicker({
  value,
  onChange,
}: {
  value: JobCertification[] | undefined;
  onChange: (value: JobCertification[]) => void;
}) {
  const list = value || [];
  const update = (id: string, patch: Partial<JobCertification>) =>
    onChange(
      list.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  return (
    <div className="field cert-editor">
      <span>{t("Sertifikat tələbləri")}</span>
      <CertificationSearch
        selected={list.map((item) => item.id)}
        placeholder="Tələb olunan və ya üstünlük verilən sertifikat axtarın"
        onPick={(definition) =>
          onChange(
            [...list, { id: definition.id, required: false }].slice(0, 12),
          )
        }
      />
      {list.length > 0 && (
        <div className="cert-cards">
          {list.map((item) => {
            const definition = certificationById(item.id);
            if (!definition) return null;
            return (
              <article className="cert-card compact" key={item.id}>
                <div className="cert-card-head">
                  <span className="cert-icon">
                    <Award size={17} />
                  </span>
                  <div>
                    <strong>{definition.name}</strong>
                    <small>{definition.issuer}</small>
                  </div>
                  <button
                    type="button"
                    aria-label={`${definition.name} ${t("sil")}`}
                    onClick={() =>
                      onChange(list.filter((own) => own.id !== item.id))
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="cert-card-fields">
                  <div
                    className="cert-toggle"
                    role="radiogroup"
                    aria-label={t("Tələb növü")}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={item.required}
                      className={item.required ? "selected" : ""}
                      onClick={() => update(item.id, { required: true })}
                    >
                      {t("Məcburi")}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!item.required}
                      className={!item.required ? "selected" : ""}
                      onClick={() =>
                        update(item.id, {
                          required: false,
                          modules: [
                            ...new Set([
                              ...(item.modules || []),
                              ...(item.preferredModules || []),
                            ]),
                          ],
                          preferredModules: undefined,
                        })
                      }
                    >
                      {t("Üstünlükdür")}
                    </button>
                  </div>
                  <LevelInput
                    definition={definition}
                    label={definition.scale ? "Minimum bal" : "Minimum səviyyə"}
                    value={item.minLevel}
                    onChange={(minLevel) =>
                      update(item.id, {
                        minLevel:
                          normalizeCertificationLevel(definition, minLevel) ||
                          undefined,
                      })
                    }
                  />
                  {definition.modules && (
                    <div className="cert-modules">
                      <span>
                        {t("Tələb olunan imtahanlar")}
                        <small>
                          {item.required
                            ? t(
                                "Hər imtahana basın: məcburi → üstünlük → seçilməyib",
                              )
                            : t(
                                "İstəyə bağlı: namizəd bu imtahanları veribsə tələb ödənmiş sayılır",
                              )}
                        </small>
                      </span>
                      {[
                        ...new Set(definition.modules.map((mod) => mod.level)),
                      ].map((level) => (
                        <div className="cert-module-group" key={level}>
                          <b>{level}</b>
                          <div>
                            {definition
                              .modules!.filter((mod) => mod.level === level)
                              .map((mod) => {
                                const isMain = (item.modules || []).includes(
                                  mod.code,
                                );
                                const isBonus = (
                                  item.preferredModules || []
                                ).includes(mod.code);
                                const rest = (list: string[] | undefined) =>
                                  (list || []).filter(
                                    (code) => code !== mod.code,
                                  );
                                // Required certification: none -> required -> preferred -> none.
                                // Preferred certification: every chosen exam is preferred.
                                const cycle = () => {
                                  if (!item.required)
                                    return update(item.id, {
                                      modules: isMain
                                        ? rest(item.modules)
                                        : [...(item.modules || []), mod.code],
                                    });
                                  if (!isMain && !isBonus)
                                    return update(item.id, {
                                      modules: [
                                        ...(item.modules || []),
                                        mod.code,
                                      ],
                                    });
                                  if (isMain)
                                    return update(item.id, {
                                      modules: rest(item.modules),
                                      preferredModules: [
                                        ...(item.preferredModules || []),
                                        mod.code,
                                      ],
                                    });
                                  update(item.id, {
                                    preferredModules: rest(
                                      item.preferredModules,
                                    ),
                                  });
                                };
                                const state = isBonus
                                  ? "bonus"
                                  : isMain
                                    ? item.required
                                      ? "required"
                                      : "passed"
                                    : "none";
                                return (
                                  <button
                                    type="button"
                                    key={mod.code}
                                    className={`cert-module ${state === "none" ? "none" : state === "bonus" ? "preparing" : "passed"}`}
                                    aria-pressed={state !== "none"}
                                    title={`${mod.name}${state === "required" ? ` — ${t("Məcburi")}` : state === "bonus" ? ` — ${t("Üstünlükdür")}` : ""}`}
                                    onClick={cycle}
                                  >
                                    {state === "bonus"
                                      ? "★ "
                                      : state === "none"
                                        ? ""
                                        : "✓ "}
                                    {mod.code === mod.name
                                      ? mod.code
                                      : `${mod.name} (${mod.code})`}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <small className="skill-picker-help">
        {t(
          "Məcburi sertifikatı olmayan namizədin balı 70-dən yuxarı olmur; üstünlük verilən sertifikat əlavə bal verir.",
        )}
      </small>
    </div>
  );
}

const EVIDENCE_LABELS: Record<string, string> = {
  held: "Var",
  below_level: "Səviyyə aşağıdır",
  equivalent: "Ekvivalent sertifikat",
  in_progress: "Davam edir",
  expired: "Müddəti bitib",
  none: "Yoxdur",
};

export function CertificationBadges({
  items,
  limit = 6,
}: {
  items: CandidateCertification[] | undefined;
  limit?: number;
}) {
  const list = (items || []).filter((item) => certificationById(item.id));
  if (!list.length) return null;
  return (
    <div className="cert-badges">
      {list.slice(0, limit).map((item) => (
        <span
          key={item.id}
          className={`cert-badge ${item.status}`}
          title={[t(STATUS_LABELS[item.status]), item.detail]
            .filter(Boolean)
            .join(" · ")}
        >
          {item.status === "active" && item.credentialUrl ? (
            <BadgeCheck size={13} />
          ) : (
            <Award size={13} />
          )}
          {certificationById(item.id)?.name}
          {item.level ? ` · ${item.level}` : ""}
          {item.status !== "active"
            ? ` (${t(STATUS_LABELS[item.status])})`
            : ""}
        </span>
      ))}
      {list.length > limit && <small>+{list.length - limit}</small>}
    </div>
  );
}

export function JobCertificationList({
  items,
  evidence,
}: {
  items: JobCertification[] | undefined;
  evidence?: {
    id: string;
    level: string;
    preferredPassed?: number;
    preferredTotal?: number;
  }[];
}) {
  const list = (items || []).filter((item) => certificationById(item.id));
  if (!list.length) return null;
  return (
    <ul className="job-cert-list">
      {list.map((item) => {
        const definition = certificationById(item.id)!;
        const entry = evidence?.find((own) => own.id === item.id);
        const state = entry?.level;
        return (
          <li key={item.id} className={state ? `evidence-${state}` : ""}>
            <Award size={15} />
            <span>
              <strong>{definition.name}</strong>
              {item.minLevel ? ` · ${item.minLevel}+` : ""}
              <small>
                {t(item.required ? "Məcburi" : "Üstünlükdür")}
                {item.modules?.length
                  ? ` · ${item.required && item.preferredModules?.length ? t("Məcburi imtahanlar") : t("imtahanlar")}: ${item.modules.join(", ")}`
                  : ""}
                {item.preferredModules?.length
                  ? ` · ${t("Üstünlük verilən imtahanlar")}: ${item.preferredModules.join(", ")}${
                      entry?.preferredTotal
                        ? ` (${entry.preferredPassed ?? 0}/${entry.preferredTotal})`
                        : ""
                    }`
                  : ""}
              </small>
            </span>
            {state && <b>{t(EVIDENCE_LABELS[state] || state)}</b>}
          </li>
        );
      })}
    </ul>
  );
}
