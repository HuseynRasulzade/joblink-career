"use client";
import { useEffect, useRef, useState, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cvFields, mergeCvFields } from "@/lib/cv-fields";
import { MAX_CV_TEXT_CHARS } from "@/lib/cv-limits";
import { localizeTree, siteLanguage, translate } from "./i18n";
import {
  localizedSkillCategory,
  localizedSkillLabel,
  normalizeSkillKey,
  normalizeSkills,
  searchSkills,
  skillId,
  type SkillDefinition,
  SKILL_CATALOG,
} from "@/lib/skill-catalog";
import {
  X,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  Save,
  ArrowUpRight,
  FileText,
  BriefcaseBusiness,
  GraduationCap,
  UserRound,
  Languages,
  Link as LinkIcon,
  Sparkles,
  MapPin,
  ExternalLink,
} from "lucide-react";
import {
  CandidateCertificationEditor,
  JobCertificationPicker,
} from "./CertificationPickers";
import { detectCertifications } from "@/lib/certification-catalog";
import { LanguageList } from "./LanguageList";
import JobTitleInput from "./JobTitleInput";
import UniversityInput from "./UniversityInput";
import MajorInput from "./MajorInput";
import BrandedCv from "./BrandedCv";
import StageEditor from "./StageEditor";
import { VACANCY_REASONS } from "@/lib/recruitment";
import {
  googleMapsEmbedUrl,
  googleMapsSearchUrl,
  normalizeJobAddress,
} from "@/lib/maps";
import {
  type Profile,
  type Job,
  blankProfile,
  analyze,
  years,
  JOB_CATEGORIES,
  EMPLOYMENT_TYPES,
  certificationSourceText,
  OFFICE_PROGRAMS,
  OFFICE_SUITE,
} from "@/lib/model";
export function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    localizeTree(
      <dialog
        ref={ref}
        className={`modal ${className}`.trim()}
        aria-labelledby={headingId}
        onCancel={onClose}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-heading">
          <h2 id={headingId}>{title}</h2>
          <button aria-label="Bağla" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        {children}
      </dialog>,
    ) as React.ReactElement,
    document.body,
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return localizeTree(
    <label className="field">
      <span>{label}</span>
      {children}
    </label>,
  );
}

type RuntimeSkill = SkillDefinition & {
  source: "admin" | "esco";
  uri?: string;
};
const runtimeSkillsPromises = new Map<string, Promise<RuntimeSkill[]>>();
function loadRuntimeSkills(query = "") {
  const key = normalizeSkillKey(query);
  const existing = runtimeSkillsPromises.get(key);
  if (existing) return existing;
  const request = fetch(
    `/api/joblink/skills${key ? `?q=${encodeURIComponent(query)}` : ""}`,
    { credentials: "same-origin" },
  )
    .then((response) => (response.ok ? response.json() : { skills: [] }))
    .then((data: unknown) => {
      const payload = data as { skills?: RuntimeSkill[] };
      return Array.isArray(payload.skills) ? payload.skills : [];
    })
    .catch(() => []);
  runtimeSkillsPromises.set(key, request);
  return request;
}
export function invalidateRuntimeSkills() {
  runtimeSkillsPromises.clear();
  window.dispatchEvent(new Event("joblink-skills-updated"));
}

export function SkillPicker({
  label,
  value,
  onChange,
  placeholder = "Bacarıq axtarın və seçin",
  inputId,
}: {
  label: string;
  value: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
  inputId?: string;
}) {
  const [query, setQuery] = useState("");
  const [runtimeSkills, setRuntimeSkills] = useState<RuntimeSkill[]>([]);
  const [escoResults, setEscoResults] = useState<RuntimeSkill[]>([]);
  const [proposalBusy, setProposalBusy] = useState(false);
  const [proposalMessage, setProposalMessage] = useState("");
  useEffect(() => {
    const refresh = () => {
      void loadRuntimeSkills().then(setRuntimeSkills);
    };
    refresh();
    window.addEventListener("joblink-skills-updated", refresh);
    return () => window.removeEventListener("joblink-skills-updated", refresh);
  }, []);
  useEffect(() => {
    if (normalizeSkillKey(query).length < 2) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void loadRuntimeSkills(query).then((items) => {
        if (active)
          setEscoResults(items.filter((item) => item.source === "esco"));
      });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);
  const language = siteLanguage();
  const visibleEscoResults =
    normalizeSkillKey(query).length >= 2 ? escoResults : [];
  const allRuntimeSkills = [...runtimeSkills, ...visibleEscoResults].filter(
    (item, index, list) =>
      list.findIndex((candidate) => candidate.id === item.id) === index,
  );
  const selected = normalizeSkills(value, { allowCustom: true, max: 50 });
  const needle = normalizeSkillKey(query);
  const selectedKeys = new Set(selected.map(normalizeSkillKey));
  const runtimeSuggestions = allRuntimeSkills.filter(
    (item) =>
      !selectedKeys.has(normalizeSkillKey(item.label)) &&
      (!needle ||
        [
          item.label,
          item.labelEn,
          item.category,
          item.categoryEn,
          ...item.aliases,
        ].some((part) => normalizeSkillKey(part).includes(needle))),
  );
  const suggestions: SkillDefinition[] = [
    ...runtimeSuggestions,
    ...searchSkills(query, selected, 8),
  ]
    .filter(
      (item, index, list) =>
        list.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .slice(0, 8);
  const runtimeByLabel = new Map(
    allRuntimeSkills.map((item) => [normalizeSkillKey(item.label), item]),
  );
  const add = (candidate: string) => {
    const next = normalizeSkills([...selected, candidate], {
      allowCustom: true,
      max: 50,
    });
    if (next.length !== selected.length) onChange(next);
    setQuery("");
  };
  const remove = (candidate: string) =>
    onChange(selected.filter((item) => skillId(item) !== skillId(candidate)));
  const propose = async () => {
    const label = query.trim();
    if (label.length < 2 || proposalBusy) return;
    setProposalBusy(true);
    setProposalMessage(
      translate("AI bacarığı kataloqla müqayisə edir…", language),
    );
    try {
      const response = await fetch("/api/joblink/skills/propose", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        skill?: RuntimeSkill;
      };
      if (!response.ok || !payload.skill)
        throw new Error(
          payload.error || translate("Sorğu tamamlanmadı.", language),
        );
      invalidateRuntimeSkills();
      setRuntimeSkills((items) =>
        [payload.skill!, ...items].filter(
          (item, index, list) =>
            list.findIndex((candidate) => candidate.id === item.id) === index,
        ),
      );
      add(payload.skill.label);
      setProposalMessage(
        payload.message || translate("Bacarıq seçildi.", language),
      );
    } catch (error) {
      setProposalMessage(
        error instanceof Error
          ? error.message
          : translate("Sorğu tamamlanmadı.", language),
      );
    } finally {
      setProposalBusy(false);
    }
  };
  return (
    <div className="field skill-picker">
      <span>{label}</span>
      <div className="skill-picker-control">
        <div className="skill-picker-chips">
          {selected.map((item) => (
            <span className="skill-chip" key={skillId(item)}>
              {runtimeByLabel.get(normalizeSkillKey(item))
                ? language === "en"
                  ? runtimeByLabel.get(normalizeSkillKey(item))!.labelEn
                  : item
                : localizedSkillLabel(item, language)}
              <button
                type="button"
                aria-label={
                  language === "en"
                    ? `Remove ${localizedSkillLabel(item, language)}`
                    : `${item} sil`
                }
                onClick={() => remove(item)}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <input
          id={inputId}
          value={query}
          placeholder={translate(placeholder, language)}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              if (suggestions[0]) add(suggestions[0].label);
            }
          }}
        />
        {query.trim() && (
          <div className="skill-suggestions" role="listbox">
            {suggestions.map((item) => (
              <button
                type="button"
                role="option"
                aria-selected="false"
                key={item.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => add(item.label)}
              >
                <strong>
                  {item.id.startsWith("admin:") || item.id.startsWith("esco:")
                    ? language === "en"
                      ? item.labelEn
                      : item.label
                    : localizedSkillLabel(item.label, language)}
                </strong>
                <small>{localizedSkillCategory(item, language)}</small>
              </button>
            ))}
            {!suggestions.length && (
              <p className="skill-suggestions-empty">
                {translate("Siyahıda uyğun bacarıq tapılmadı.", language)}
              </p>
            )}
            {needle.length >= 2 && (
              <button
                type="button"
                className="skill-propose-button"
                disabled={proposalBusy}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void propose()}
              >
                <span>
                  <Plus size={16} />{" "}
                  {proposalBusy
                    ? translate("AI yoxlayır…", language)
                    : translate(
                        "Yeni bacarıq kimi yoxla və əlavə et",
                        language,
                      )}
                </span>
                <small>
                  {translate(
                    "Əvvəlcə yazılış və məna üzrə mövcud kataloq yoxlanacaq",
                    language,
                  )}
                </small>
              </button>
            )}
          </div>
        )}
      </div>
      {proposalMessage && (
        <small className="skill-proposal-message" role="status">
          {proposalMessage}
        </small>
      )}
      <small className="skill-picker-help">
        {translate(
          "Siyahıda yoxdursa, AI ilə yoxladıb yeni bacarıq kimi əlavə edə bilərsiniz.",
          language,
        )}
      </small>
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return localizeTree(
    <div className="empty">
      <FileText size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>,
  );
}

const structuredLabels: Record<string, string> = {
  personal_information: "Şəxsi məlumatlar",
  professional_summary: "Peşəkar xülasə",
  current_employment: "Cari iş yeri",
  work_experience: "İş təcrübəsi",
  education: "Təhsil",
  skills: "Bacarıqlar",
  languages: "Dil bilikləri",
  certifications: "Sertifikatlar",
  courses_and_training: "Kurs və təlimlər",
  projects: "Layihələr",
  references: "Referanslar",
  additional_information: "Əlavə məlumat",
  unclassified_information: "Təsnif edilməmiş məlumat",
  full_name: "Ad və soyad",
  first_name: "Ad",
  middle_name: "Ata adı",
  last_name: "Soyad",
  phone_numbers: "Telefon",
  email: "E-poçt",
  linkedin: "LinkedIn",
  github: "GitHub",
  portfolio: "Portfolio",
  website: "Veb-sayt",
  address: "Ünvan",
  city: "Şəhər",
  country: "Ölkə",
  company_name: "Şirkət",
  position: "Vəzifə",
  department: "Şöbə",
  employment_type: "Məşğulluq növü",
  location: "İş yeri",
  start_date: "Başlama tarixi",
  end_date: "Bitmə tarixi",
  is_current: "Hazırda işləyir",
  responsibilities: "Vəzifə öhdəlikləri",
  achievements: "Nailiyyətlər",
  technologies: "Texnologiyalar",
  skills_used: "İstifadə olunan bacarıqlar",
  institution: "Təhsil müəssisəsi",
  degree: "Dərəcə",
  education_level: "Təhsil səviyyəsi",
  faculty: "Fakültə",
  specialization: "İxtisas",
  graduation_year: "Məzuniyyət ili",
  GPA: "Ortalama bal",
  language: "Dil",
  level: "Səviyyə",
  raw_level: "CV-də göstərilən səviyyə",
  certificate_name: "Sertifikat",
  issuing_organization: "Təşkilat",
  issue_date: "Verilmə tarixi",
  expiration_date: "Bitmə tarixi",
  credential_id: "Sertifikat ID-si",
  credential_url: "Sertifikat linki",
  status: "Status",
  course_name: "Kurs",
  provider: "Təlim təşkilatçısı",
  completion_date: "Tamamlama tarixi",
  project_name: "Layihə",
  role: "Rol",
  description: "Təsvir",
  software: "Proqramlar",
  ERP: "ERP sistemləri",
  accounting: "Mühasibatlıq",
  finance: "Maliyyə",
  tax: "Vergi",
  reporting: "Hesabatlılıq",
  data_analysis: "Məlumat analitikası",
  programming: "Proqramlaşdırma",
  project_management: "Layihə idarəetməsi",
  management: "İdarəetmə",
  HR: "İnsan resursları",
  sales: "Satış",
  marketing: "Marketinq",
  design: "Dizayn",
  procurement: "Satınalma",
  logistics: "Logistika",
  engineering: "Mühəndislik",
  legal: "Hüquq",
  industry_specific: "Sahəvi bacarıqlar",
  soft_skills: "Yumşaq bacarıqlar",
  other: "Digər",
};

const structuredLabel = (key: string) =>
  structuredLabels[key] ||
  key
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toLocaleUpperCase("az"));

function hasStructuredValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.some(hasStructuredValue);
  if (typeof value === "object")
    return Object.values(value as Record<string, unknown>).some(
      hasStructuredValue,
    );
  return true;
}

function StructuredValue({
  value,
  fieldKey = "",
}: {
  value: unknown;
  fieldKey?: string;
}) {
  if (!hasStructuredValue(value)) return null;
  if (typeof value === "boolean") return <span>{value ? "Bəli" : "Xeyr"}</span>;
  if (typeof value === "string" || typeof value === "number")
    return <span>{String(value)}</span>;
  if (Array.isArray(value)) {
    const meaningful = value.filter(hasStructuredValue);
    if (meaningful.every((item) => typeof item !== "object")) {
      const listClass = [
        "responsibilities",
        "achievements",
        "references",
        "additional_information",
      ].includes(fieldKey)
        ? "structured-bullets"
        : "structured-tags";
      return (
        <ul className={listClass}>
          {meaningful.map((item, index) => (
            <li key={`${String(item)}-${index}`}>{String(item)}</li>
          ))}
        </ul>
      );
    }
    return (
      <div className="structured-records">
        {meaningful.map((item, index) => (
          <div className="structured-record" key={index}>
            <StructuredValue value={item} fieldKey={fieldKey} />
          </div>
        ))}
      </div>
    );
  }
  const source = value as Record<string, unknown>;
  const heading = String(
    source.position ||
      source.project_name ||
      source.course_name ||
      source.certificate_name ||
      "",
  );
  const subheading = String(
    source.company_name ||
      source.institution ||
      source.provider ||
      source.issuing_organization ||
      "",
  );
  const headerKeys = new Set([
    source.position ? "position" : "",
    source.project_name ? "project_name" : "",
    source.course_name ? "course_name" : "",
    source.certificate_name ? "certificate_name" : "",
    source.company_name ? "company_name" : "",
    source.institution ? "institution" : "",
    source.provider ? "provider" : "",
    source.issuing_organization ? "issuing_organization" : "",
  ]);
  const entries = Object.entries(source).filter(
    ([key, item]) =>
      key !== "parser_metadata" &&
      !headerKeys.has(key) &&
      hasStructuredValue(item),
  );
  return (
    <div className="structured-object">
      {(heading || subheading) && (
        <header>
          {heading && <h5>{heading}</h5>}
          {subheading && <p>{subheading}</p>}
        </header>
      )}
      <dl>
        {entries.map(([key, item]) => (
          <div
            className={
              ["responsibilities", "achievements", "description"].includes(key)
                ? "structured-field wide"
                : "structured-field"
            }
            key={key}
          >
            <dt>{structuredLabel(key)}</dt>
            <dd>
              <StructuredValue value={item} fieldKey={key} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function confidencePathLabel(path: string) {
  return path
    .replace(/\[(\d+)\]/g, (_, index) => ` · ${Number(index) + 1}-ci qeyd`)
    .split(".")
    .map((part) =>
      part.includes("-ci qeyd")
        ? `${structuredLabel(part.split(" · ")[0])}${part.slice(part.indexOf(" · "))}`
        : structuredLabel(part),
    )
    .join(" · ");
}

function StructuredCvSection({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (value: Record<string, unknown> | null) => void;
}) {
  const [draft, setDraft] = useState(
    profile.structuredCv ? JSON.stringify(profile.structuredCv, null, 2) : "",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(
      profile.structuredCv ? JSON.stringify(profile.structuredCv, null, 2) : "",
    );
  }, [profile.structuredCv]);
  const flagged = profile.cvFieldConfidence.filter(
    (item) => item.needsReview || item.confidence < 0.8,
  );
  const download = () => {
    const data = {
      ...(profile.structuredCv || {}),
      _field_confidence: profile.cvFieldConfidence,
      _parser_metadata: profile.cvParserMetadata,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${profile.cvName || "joblink-cv"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return localizeTree(
    <section className="form-section structured-cv">
      <div className="section-heading">
        <h3>
          <FileText size={18} /> Tam strukturlaşdırılmış CV
        </h3>
        <button
          type="button"
          className="secondary"
          onClick={download}
          disabled={!profile.structuredCv}
        >
          <Download size={16} /> JSON-u endir
        </button>
      </div>
      {!profile.structuredCv ? (
        <p className="muted">
          CV-ni AI ilə analiz etdikdən sonra kurslar, layihələr, referanslar,
          detallı iş təcrübəsi və digər bütün bölmələr burada görünəcək.
        </p>
      ) : (
        <>
          {profile.cvParserMetadata && (
            <div className="parser-summary">
              <b>Dil:</b>{" "}
              {profile.cvParserMetadata.detectedCvLanguage
                .map((language) =>
                  language === "Azerbaijani" ? "Azərbaycan dili" : language,
                )
                .join(", ") || "Naməlum"}{" "}
              · <b>Format:</b>{" "}
              {(
                {
                  plain_text: "Sadə mətn",
                  two_column: "İki sütunlu",
                  table: "Cədvəl",
                } as Record<string, string>
              )[profile.cvParserMetadata.detectedFormat] ||
                profile.cvParserMetadata.detectedFormat ||
                "Naməlum"}{" "}
              · <b>OCR:</b> {profile.cvParserMetadata.ocrUsed ? "Bəli" : "Xeyr"}
            </div>
          )}
          {(profile.cvParserMetadata?.needsManualReview ||
            flagged.length > 0) && (
            <div className="review-panel">
              <h4>Manual yoxlanmalı məlumatlar</h4>
              {profile.cvParserMetadata?.reviewReasons.map((reason, index) => (
                <p key={`reason-${index}`}>{reason}</p>
              ))}
              {flagged.slice(0, 50).map((item) => (
                <div
                  className="confidence-row"
                  key={`${item.path}-${item.evidence}`}
                >
                  <b>{confidencePathLabel(item.path)}</b>
                  <span>{Math.round(item.confidence * 100)}%</span>
                  <small>
                    {item.evidence || "Dəqiq mətn sübutu göstərilməyib."}
                  </small>
                </div>
              ))}
            </div>
          )}
          <div className="structured-groups">
            {Object.entries(profile.structuredCv)
              .filter(
                ([key, value]) =>
                  key !== "parser_metadata" && hasStructuredValue(value),
              )
              .map(([key, value]) => (
                <section
                  className={`structured-section ${key === "professional_summary" ? "structured-summary" : ""}`}
                  key={key}
                >
                  <h4>{structuredLabel(key)}</h4>
                  <StructuredValue value={value} fieldKey={key} />
                </section>
              ))}
          </div>
          <details className="json-editor">
            <summary>Qabaqcıl redaktə — tam JSON</summary>
            <p className="muted">
              Burada bütün strukturlaşdırılmış sahələri düzəldə bilərsiniz.
              Düzgün JSON formatını qoruyun.
            </p>
            <textarea
              rows={22}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
            />
            {error && <p className="form-error">{error}</p>}
            <button
              type="button"
              className="secondary"
              onClick={() => {
                try {
                  const value = JSON.parse(draft);
                  if (
                    !value ||
                    typeof value !== "object" ||
                    Array.isArray(value)
                  )
                    throw new Error();
                  onChange(value);
                  setError("");
                } catch {
                  setError(
                    "JSON formatı düzgün deyil. Vergül və mötərizələri yoxlayın.",
                  );
                }
              }}
            >
              Struktur dəyişikliklərini tətbiq et
            </button>
          </details>
        </>
      )}
    </section>,
  ) as React.ReactElement;
}

export function ProfileEditor({
  profile,
  isSample,
  onSave,
  busy,
  onNotice,
  localCv = false,
  aiEnabled = false,
  aiProvider = "DeepSeek",
  focusTarget,
}: {
  profile: Profile;
  isSample: boolean;
  onSave: (p: Profile) => Promise<void>;
  busy: boolean;
  onNotice: (s: string) => void;
  localCv?: boolean;
  aiEnabled?: boolean;
  aiProvider?: string;
  focusTarget?: { tab: string; elementId: string; token: number } | null;
}) {
  const [p, setP] = useState<Profile>(profile);
  const [tab, setTab] = useState("Şəxsi məlumatlar");
  // New profiles start by choosing how to fill: from a CV or by hand.
  const [fillMode, setFillMode] = useState<"choose" | "cv" | "manual">(
    !isSample &&
      !profile.cvText.trim() &&
      !profile.experiences.length &&
      !profile.summary.trim()
      ? "choose"
      : "manual",
  );
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [importDraft, setImportDraft] = useState<Profile | null>(null);
  // Defaults to on: AI-assisted fill is the default experience when
  // available, not an extra opt-in step the candidate has to remember to
  // trigger separately. They can still uncheck it to stay rule-based only.
  const [importConsent, setImportConsent] = useState(true);
  // Fields the AI supplied that were empty beforehand — surfaced in the
  // review modal so the candidate always knows which parts came from their
  // own CV text versus an AI-completed guess, and can double-check them.
  const [aiFilled, setAiFilled] = useState<Set<string>>(new Set());
  const [parserReview, setParserReview] = useState<{
    detectedCvLanguage: string[];
    detectedFormat: string;
    needsManualReview: boolean;
    reviewReasons: string[];
    fieldConfidence: Profile["cvFieldConfidence"];
  } | null>(null);
  useEffect(() => {
    if (!focusTarget) return;
    setTab(focusTarget.tab);
    const timer = window.setTimeout(() => {
      const element = document.getElementById(focusTarget.elementId);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusTarget]);
  async function extractFields(
    text: string,
    name: string,
    useAI = false,
    ocrUsed = false,
    sourceFile?: File,
  ) {
    setUploading(true);
    try {
      let fields: Partial<Profile> = cvFields(text);
      if (useAI) {
        const visualFile =
          sourceFile &&
          ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
            sourceFile.type,
          );
        let r: Response;
        if (visualFile) {
          const form = new FormData();
          form.append("file", sourceFile);
          form.append("consent", importConsent ? "true" : "false");
          r = await fetch("/api/joblink/parse-cv-file", {
            method: "POST",
            body: form,
          });
          if (!r.ok) {
            r = await fetch("/api/joblink/parse-cv", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text, consent: importConsent, ocrUsed }),
            });
          }
        } else {
          r = await fetch("/api/joblink/parse-cv", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, consent: importConsent, ocrUsed }),
          });
        }
        const b = (await r.json()) as {
          error?: string;
          fields?: Partial<Profile>;
          parserMetadata?: {
            detectedCvLanguage: string[];
            detectedFormat: string;
            needsManualReview: boolean;
            reviewReasons: string[];
            fieldConfidence: Profile["cvFieldConfidence"];
          };
        };
        if (!r.ok) throw new Error(b.error || "CV oxunmadı");
        fields = b.fields || {};
        setParserReview(b.parserMetadata || null);
      } else {
        setParserReview(null);
      }
      const base = isSample ? blankProfile : p;
      const filled = new Set<string>();
      if (useAI) {
        for (const k of [
          "name",
          "title",
          "email",
          "phone",
          "city",
          "summary",
          "languages",
          "certificates",
          "links",
        ] as const) {
          const before = base[k] || "";
          const after = fields[k];
          if (!before.trim() && typeof after === "string" && after.trim())
            filled.add(k);
        }
        for (const k of ["skills", "experiences", "education"] as const) {
          const before = base[k];
          const after = fields[k];
          if (!before.length && Array.isArray(after) && after.length)
            filled.add(k);
        }
      }
      setAiFilled(filled);
      setImportDraft({
        ...mergeCvFields(p, fields, isSample),
        cvText: text,
        cvName: name,
      });
    } catch (e) {
      onNotice((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  const score = analyze(p);
  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setDirty(true);
    setP((prev) => ({ ...prev, [k]: v }));
  }
  // Certifications found in the CV fill the structured list automatically:
  // when the profile opens and whenever a new CV brings new ones. Entries the
  // candidate removed earlier are not added back.
  const certSource = certificationSourceText(p);
  const lastCertSource = useRef<string | null>(null);
  useEffect(() => {
    if (isSample || lastCertSource.current === certSource) return;
    lastCertSource.current = certSource;
    const own = p.certifications || [];
    const dismissed = new Set(p.certificationsDismissed || []);
    const detected = detectCertifications(certSource);
    const found = detected.filter(
      (c) => !own.some((o) => o.id === c.id) && !dismissed.has(c.id),
    );
    // A certification added by hand gets the exams the CV lists for it.
    let enriched = 0;
    const updated = own.map((item) => {
      const fromCv = detected.find((c) => c.id === item.id);
      if (!fromCv?.passed?.length || item.passed?.length) return item;
      enriched++;
      return {
        ...item,
        passed: fromCv.passed,
        preparing: fromCv.preparing,
        status: fromCv.status,
        level: fromCv.level,
        detail: fromCv.detail,
      };
    });
    const nextOwn = [
      ...updated,
      ...found.map((c) => ({ ...c, source: "profile" as const })),
    ];
    // Course lines that are now a certification card leave the free-text field.
    const remaining = (p.certificates || "")
      .split("\n")
      .filter((line) => {
        const hits = detectCertifications(line);
        return (
          !hits.length ||
          !hits.every((hit) => nextOwn.some((o) => o.id === hit.id))
        );
      })
      .join("\n");
    if (remaining !== (p.certificates || "")) set("certificates", remaining);
    if (!found.length && !enriched) return;
    set("certifications", nextOwn);
    onNotice(
      found.length
        ? `CV-dən ${found.length} sertifikat avtomatik əlavə edildi. Yoxlayıb profili yadda saxlayın.`
        : "CV-dəki imtahanlar sertifikat kartına əlavə edildi. Yoxlayıb profili yadda saxlayın.",
    );
    // Runs only when the CV-derived text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certSource, isSample]);
  // "Microsoft Office" in the skills or CV adds its programs once. They are
  // remembered in inferredSkills so matching counts them partly, and a program
  // the candidate removes is not added back.
  useEffect(() => {
    if (isSample) return;
    const stated =
      normalizeSkills(p.skills, { max: 50 }).some(
        (skill) => skillId(skill) === "microsoft-office",
      ) || OFFICE_SUITE.test(`${p.summary}\n${p.cvText}`);
    if (!stated) return;
    const have = new Set(normalizeSkills(p.skills, { max: 50 }).map(skillId));
    const tried = new Set(p.inferredSkills || []);
    const add = [...OFFICE_PROGRAMS].filter(
      (id) => !have.has(id) && !tried.has(id),
    );
    if (!add.length) return;
    const labels = add
      .map(
        (id) => SKILL_CATALOG.find((item) => skillId(item.label) === id)?.label,
      )
      .filter((x): x is string => !!x);
    if (!labels.length) return;
    setDirty(true);
    setP((prev) => ({
      ...prev,
      skills: [...prev.skills, ...labels],
      inferredSkills: [...new Set([...(prev.inferredSkills || []), ...add])],
    }));
    onNotice(
      `Microsoft Office əsasında ${labels.join(", ")} bacarıqları əlavə edildi (qismən sayılır). Yoxlayıb profili yadda saxlayın.`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.skills, p.summary, p.cvText, isSample]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      if (localCv) {
        const { readCv } = await import("@/lib/read-cv");
        const b = await readCv(file, {
          ocr: aiEnabled && importConsent,
          consent: importConsent,
        });
        setP((v) => ({ ...v, cvText: b.text, cvName: b.name }));
        setDirty(true);
        await extractFields(
          b.text,
          b.name,
          aiEnabled && importConsent,
          b.ocrUsed,
          file,
        );
        onNotice(
          ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
            file.type,
          ) &&
            aiEnabled &&
            importConsent
            ? "CV mətn və vizual quruluş birlikdə analiz edildi. Məlumatları yoxlayın və profili yadda saxlayın."
            : "CV cihazınızda oxundu. Mətni yoxlayın və profili yadda saxlayın.",
        );
        return;
      }
      const data = new FormData();
      data.append("file", file);
      const r = await fetch("/api/joblink/upload", {
        method: "POST",
        body: data,
      });
      const b = (await r.json()) as {
        error?: string;
        text: string;
        name: string;
      };
      if (!r.ok) throw new Error(b.error);
      setP((v) => ({ ...v, cvText: b.text, cvName: b.name }));
      setDirty(true);
      await extractFields(b.text, b.name, aiEnabled && importConsent);
      onNotice("CV oxundu. Məlumatları yoxlayın və profili yadda saxlayın.");
    } catch (e) {
      onNotice((e as Error).message);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }
  return localizeTree(
    <>
      {importDraft && (
        <Modal
          title="CV-dən profilə köçür"
          onClose={() => setImportDraft(null)}
        >
          <p>
            Aşağıdakı məlumatları yoxlayın. Tətbiq etdikdən sonra bütün sahələri
            redaktə edə bilərsiniz. Profil avtomatik yadda saxlanmır.
          </p>
          {aiFilled.size > 0 && (
            <p className="ai-fill-note">
              <span className="ai-badge">AI</span> nişanı olan sahələr AI
              tərəfindən CV-dəki faktlardan strukturlaşdırılıb. CV-də olmayan
              məlumat əlavə edilməyib; nəticələri yenə də yoxlayın.
            </p>
          )}
          {parserReview?.needsManualReview && (
            <p className="ai-fill-note">
              <b>Manual yoxlama lazımdır:</b>{" "}
              {parserReview.reviewReasons.join("; ") ||
                "Bəzi məlumatların əlaqəsi dəqiq müəyyən edilməyib."}
            </p>
          )}
          <dl>
            {(
              [
                "name",
                "title",
                "email",
                "phone",
                "city",
                "summary",
                "languages",
              ] as const
            ).map((k) => (
              <div key={k}>
                <dt>
                  {
                    {
                      name: "Ad və soyad",
                      title: "İxtisas",
                      email: "E-poçt",
                      phone: "Telefon",
                      city: "Şəhər",
                      summary: "Haqqımda",
                      languages: "Dillər",
                    }[k]
                  }
                </dt>
                <dd>
                  {importDraft[k] || "Tapılmadı"}{" "}
                  {aiFilled.has(k) && (
                    <span className="ai-badge" title="AI tərəfindən tamamlanıb">
                      AI
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            Bacarıqlar: {importDraft.skills.join(", ") || "Tapılmadı"}{" "}
            {aiFilled.has("skills") && (
              <span className="ai-badge" title="AI tərəfindən tamamlanıb">
                AI
              </span>
            )}
          </p>
          <p>
            {importDraft.experiences.length} iş təcrübəsi{" "}
            {aiFilled.has("experiences") && (
              <span className="ai-badge" title="AI tərəfindən tamamlanıb">
                AI
              </span>
            )}{" "}
            · {importDraft.education.length} təhsil qeydi{" "}
            {aiFilled.has("education") && (
              <span className="ai-badge" title="AI tərəfindən tamamlanıb">
                AI
              </span>
            )}
          </p>
          <p>
            Boş və ya qeyri-dəqiq tarixləri profil bölməsində tamamlayın. Mövcud
            sahələr CV-də tapılan məlumatlarla əvəzlənəcək.
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setP(importDraft);
              setDirty(true);
              setImportDraft(null);
              setTab("Şəxsi məlumatlar");
              onNotice(
                "Məlumatlar dolduruldu. Yoxlayın və dəyişiklikləri yadda saxlayın.",
              );
            }}
          >
            Profilə tətbiq et
          </button>
        </Modal>
      )}
      <div className="profile-cover">
        <div className="profile-cover-pattern" />
        <span className="pill dark">KARYERA PROFİLİ</span>
        <h2>Hekayənizi bacarıqlarınız danışsın.</h2>
      </div>
      <div className="profile-identity panel">
        <div className="profile-avatar">
          {p.name.charAt(0) || <UserRound />}
        </div>
        <div>
          <h2>{p.name || "Yeni profil"}</h2>
          <p>{p.title || "İxtisasınızı əlavə edin"}</p>
          <div className="job-meta">
            <span>{p.city}</span>
            <span>{years(p)} il təcrübə</span>
            {isSample && <span className="sample-label">Nümunə profil</span>}
          </div>
        </div>
        <button className="secondary" onClick={() => setPreview(true)}>
          <Download size={16} /> CV önizləmə
        </button>
      </div>
      {isSample && (
        <div className="info-bar">
          Nümunə məlumatlarını öz məlumatlarınızla əvəz edin.
          <button
            onClick={() => {
              setP(blankProfile);
              setDirty(true);
            }}
          >
            Boş profillə başla <ArrowUpRight size={14} />
          </button>
        </div>
      )}
      {fillMode === "choose" && (
        <section className="panel fill-mode-chooser">
          <h2>Profilinizi necə doldurmaq istəyirsiniz?</h2>
          <div className="fill-mode-options">
            <button
              type="button"
              onClick={() => {
                setFillMode("cv");
                setTab("CV faylı");
              }}
            >
              <Upload size={22} />
              <strong>Hazır CV-dən doldur</strong>
              <span>
                PDF, DOCX və ya şəkil yükləyin, sahələri AI avtomatik doldursun.
                Sonra yoxlayıb düzəldə bilərsiniz.
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFillMode("manual");
                setTab("Şəxsi məlumatlar");
              }}
            >
              <FileText size={22} />
              <strong>Əl ilə doldur</strong>
              <span>
                CV-niz yoxdursa, məlumatları özünüz yazın. Peşəkar xülasəni AI
                sizin yazdıqlarınız əsasında hazırlayacaq.
              </span>
            </button>
          </div>
        </section>
      )}
      <div className="profile-layout">
        <div className="panel profile-editor">
          <div className="tabs" role="tablist" aria-label="CV bölmələri">
            {[
              "Şəxsi məlumatlar",
              "Təcrübə və təhsil",
              "Bacarıqlar",
              "Tam CV məlumatları",
              "CV faylı",
            ].map((t) => (
              <button
                role="tab"
                aria-selected={tab === t}
                key={t}
                onClick={() => setTab(t)}
                className={tab === t ? "selected" : ""}
              >
                {t}
              </button>
            ))}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await onSave(p);
                setDirty(false);
              } catch {}
            }}
          >
            {tab === "Şəxsi məlumatlar" && (
              <section className="form-section">
                <h3>
                  <UserRound size={18} /> Şəxsi məlumatlar
                </h3>
                <div className="form-grid">
                  <Field label="Ad və soyad *">
                    <input
                      id="profile-name"
                      required
                      value={p.name}
                      onChange={(e) => set("name", e.target.value)}
                    />
                  </Field>
                  <JobTitleInput
                    id="profile-title"
                    label="Peşə / ixtisas *"
                    required
                    value={p.title}
                    onChange={(value) => set("title", value)}
                  />
                  <Field label="E-poçt *">
                    <input
                      id="profile-email"
                      type="email"
                      required
                      value={p.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </Field>
                  <Field label="Telefon">
                    <input
                      id="profile-phone"
                      type="tel"
                      value={p.phone}
                      placeholder="+994"
                      onChange={(e) => set("phone", e.target.value)}
                    />
                  </Field>
                  <Field label="Şəhər">
                    <input
                      id="profile-city"
                      value={p.city}
                      onChange={(e) => set("city", e.target.value)}
                    />
                  </Field>
                  <Field label="Gözlənilən minimum maaş (AZN)">
                    <input
                      type="number"
                      min={0}
                      value={p.salary}
                      onChange={(e) => set("salary", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Maksimum maaş (AZN, könüllü)">
                    <input
                      type="number"
                      min={0}
                      value={p.salaryMax || 0}
                      onChange={(e) => set("salaryMax", Number(e.target.value))}
                    />
                    <select
                      aria-label="Maaş növü"
                      value={p.salaryKind || ""}
                      onChange={(e) =>
                        set(
                          "salaryKind",
                          e.target.value as "net" | "gross" | "",
                        )
                      }
                    >
                      <option value="">Gross/net göstərilməyib</option>
                      <option value="net">Net (əlimə)</option>
                      <option value="gross">Gross (vergilər daxil)</option>
                    </select>
                    <small>
                      İş təklifləri və avtomatik müraciət bu maaş aralığına
                      uyğun vakansiyalarla məhdudlaşır. 0 — yuxarı hədd yoxdur.
                    </small>
                  </Field>
                  <Field label="İş formatı">
                    <select
                      value={p.mode}
                      onChange={(e) => set("mode", e.target.value)}
                    >
                      {["Hibrid", "Ofisdə", "Uzaqdan"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Peşəkar xülasə">
                  <textarea
                    id="profile-summary"
                    rows={5}
                    value={p.summary}
                    placeholder="Təcrübəniz, güclü tərəfləriniz və növbəti karyera hədəfiniz..."
                    onChange={(e) => set("summary", e.target.value)}
                  />
                </Field>
                {aiEnabled && (
                  <div className="summary-ai">
                    <button
                      type="button"
                      className="secondary"
                      disabled={
                        summaryBusy ||
                        !p.title.trim() ||
                        (!p.experiences.length && !p.skills.length)
                      }
                      onClick={async () => {
                        setSummaryBusy(true);
                        try {
                          const response = await fetch(
                            "/api/joblink/profile/summary",
                            {
                              method: "POST",
                              credentials: "same-origin",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                profile: p,
                                language: siteLanguage(),
                              }),
                            },
                          );
                          const data = (await response.json()) as {
                            summary?: string;
                            error?: string;
                          };
                          if (!response.ok || !data.summary)
                            throw new Error(
                              data.error || "AI xülasə yaza bilmədi.",
                            );
                          set("summary", data.summary);
                          onNotice(
                            "Peşəkar xülasə AI ilə hazırlandı. Yoxlayıb profili yadda saxlayın.",
                          );
                        } catch (error) {
                          onNotice((error as Error).message);
                        } finally {
                          setSummaryBusy(false);
                        }
                      }}
                    >
                      <Sparkles size={15} />{" "}
                      {summaryBusy
                        ? "Yazılır…"
                        : p.summary.trim()
                          ? "AI ilə yenidən yaz"
                          : "AI ilə yaz"}
                    </button>
                    <small>
                      {!p.title.trim() ||
                      (!p.experiences.length && !p.skills.length)
                        ? "Əvvəlcə peşənizi və ən azı bir iş təcrübəsi və ya bacarıq əlavə edin."
                        : `Vəzifə, iş təcrübəsi, təhsil, bacarıq və sertifikatlarınız əsasında yazılır; olmayan fakt əlavə edilmir. Bu məlumatlar ${aiProvider} ilə emal olunur.`}
                    </small>
                  </div>
                )}
                <Field label="Portfolio / LinkedIn">
                  <input
                    value={p.links}
                    id="profile-links"
                    placeholder="https://linkedin.com/in/..."
                    onChange={(e) => set("links", e.target.value)}
                  />
                </Field>
                <fieldset className="field">
                  <legend>
                    İstinad şəxsləri (ən çoxu 3, yalnız müraciət etdiyiniz
                    işəgötürənlərə görünür)
                  </legend>
                  {(p.references || []).map((ref, index) => (
                    <div className="form-grid" key={index}>
                      {(
                        [
                          ["name", "Ad Soyad"],
                          ["position", "Vəzifə"],
                          ["company", "Şirkət"],
                          ["contact", "Telefon və ya e-poçt"],
                        ] as const
                      ).map(([key, label]) => (
                        <input
                          key={key}
                          aria-label={`${label} (${index + 1}-ci istinad)`}
                          placeholder={label}
                          value={ref[key]}
                          maxLength={160}
                          onChange={(e) =>
                            set(
                              "references",
                              (p.references || []).map((r, i) =>
                                i === index
                                  ? { ...r, [key]: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                      ))}
                      <button
                        type="button"
                        className="text-button"
                        onClick={() =>
                          set(
                            "references",
                            (p.references || []).filter((_, i) => i !== index),
                          )
                        }
                      >
                        Sil
                      </button>
                    </div>
                  ))}
                  {(p.references || []).length < 3 && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        set("references", [
                          ...(p.references || []),
                          { name: "", position: "", company: "", contact: "" },
                        ])
                      }
                    >
                      + İstinad şəxsi əlavə et
                    </button>
                  )}
                </fieldset>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={p.active}
                    onChange={(e) => set("active", e.target.checked)}
                  />
                  <span>
                    <b>İş təkliflərinə açığam</b>
                    <small>
                      Peşəkar profilim HR axtarışında görünsün. Əlaqə
                      məlumatlarım yalnız müraciət etdiyim işəgötürənlə
                      paylaşılır.
                    </small>
                  </span>
                </label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={p.autoApply}
                    onChange={(e) => set("autoApply", e.target.checked)}
                  />
                  <span>
                    <b>AI mənim əvəzimdən avtomatik müraciət etsin</b>
                    <small>
                      Sistem yalnız əvvəlki vəzifələrinizə uyğun,
                      bacarıqlarınızın çoxu iş təcrübənizdə və ya bacarıq
                      siyahınızda təsdiqlənən, təcrübə tələbini qarşılayan və
                      aşağıdakı həddi keçən vakansiyalara sizin əvəzinizə
                      müraciət göndərir. Gündəlik ən çoxu 10 avtomatik müraciət
                      göndərilir; hər birini “Müraciətlərim” bölməsində görəcək
                      və geri götürə biləcəksiniz.
                    </small>
                  </span>
                </label>
                {p.autoApply && (
                  <Field label="Hansı şirkətlərə göndərilsin">
                    <select
                      value={p.autoApplyScope || "all"}
                      onChange={(e) =>
                        set(
                          "autoApplyScope",
                          e.target.value as "all" | "followed",
                        )
                      }
                    >
                      <option value="all">
                        Bütün şirkətlərin uyğun vakansiyalarına
                      </option>
                      <option value="followed">
                        Yalnız izlədiyim şirkətlərə
                      </option>
                    </select>
                  </Field>
                )}
                {p.autoApply && (
                  <Field
                    label={`Minimum uyğunluq balı — ${p.autoApplyMinScore}`}
                  >
                    <input
                      type="range"
                      min={80}
                      max={100}
                      step={5}
                      value={p.autoApplyMinScore}
                      onChange={(e) =>
                        set("autoApplyMinScore", Number(e.target.value))
                      }
                    />
                  </Field>
                )}
              </section>
            )}
            {tab === "Təcrübə və təhsil" && (
              <>
                <section className="form-section">
                  <h3>
                    <BriefcaseBusiness size={18} /> İş təcrübəsi
                  </h3>
                  {p.experiences.map((e, i) => (
                    <div className="repeat-card" key={e.id}>
                      <div className="section-heading">
                        <h4>Təcrübə {i + 1}</h4>
                        <button
                          type="button"
                          aria-label={`Təcrübə ${i + 1} sil`}
                          onClick={() =>
                            set(
                              "experiences",
                              p.experiences.filter((x) => x.id !== e.id),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="form-grid">
                        <JobTitleInput
                          id={`profile-experience-${e.id}-title`}
                          label="Vəzifə"
                          value={e.title}
                          onChange={(value) =>
                            set(
                              "experiences",
                              p.experiences.map((x) =>
                                x.id === e.id ? { ...x, title: value } : x,
                              ),
                            )
                          }
                        />
                        {(
                          [
                            ["company", "Şirkət"],
                            ["start", "Başlama tarixi"],
                            ["end", "Bitmə tarixi"],
                          ] as const
                        ).map(([key, label]) => (
                          <Field key={key} label={label}>
                            <input
                              type="text"
                              placeholder={
                                key === "start" || key === "end"
                                  ? "YYYY, YYYY-MM və ya YYYY-MM-DD"
                                  : undefined
                              }
                              disabled={key === "end" && e.current}
                              value={e[key]}
                              onChange={(v) =>
                                set(
                                  "experiences",
                                  p.experiences.map((x) =>
                                    x.id === e.id
                                      ? { ...x, [key]: v.target.value }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </Field>
                        ))}
                        <Field label="Məşğulluq növü">
                          <select
                            value={e.employmentType || ""}
                            onChange={(event) =>
                              set(
                                "experiences",
                                p.experiences.map((item) =>
                                  item.id === e.id
                                    ? {
                                        ...item,
                                        employmentType: event.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <option value="">Göstərilməyib</option>
                            {EMPLOYMENT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <label className="checkline">
                        <input
                          type="checkbox"
                          checked={e.current}
                          onChange={(v) =>
                            set(
                              "experiences",
                              p.experiences.map((x) =>
                                x.id === e.id
                                  ? { ...x, current: v.target.checked }
                                  : x,
                              ),
                            )
                          }
                        />{" "}
                        Hazırda burada işləyirəm
                      </label>
                      <Field label="Vəzifələr və ölçülə bilən nailiyyətlər">
                        <textarea
                          id={`profile-experience-${e.id}-description`}
                          rows={4}
                          value={e.description}
                          onChange={(v) =>
                            set(
                              "experiences",
                              p.experiences.map((x) =>
                                x.id === e.id
                                  ? { ...x, description: v.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      </Field>
                    </div>
                  ))}
                  <button
                    id="profile-add-experience"
                    type="button"
                    className="add-button"
                    onClick={() =>
                      set("experiences", [
                        ...p.experiences,
                        {
                          id: crypto.randomUUID(),
                          title: "",
                          company: "",
                          employmentType: "",
                          start: "",
                          end: "",
                          current: false,
                          description: "",
                        },
                      ])
                    }
                  >
                    <Plus size={16} /> Təcrübə əlavə et
                  </button>
                </section>
                <section className="form-section">
                  <h3>
                    <GraduationCap size={18} /> Təhsil
                  </h3>
                  {p.education.map((e, i) => (
                    <div
                      className="repeat-card"
                      id={`profile-education-${e.id}`}
                      tabIndex={-1}
                      key={e.id}
                    >
                      <div className="section-heading">
                        <h4>Təhsil {i + 1}</h4>
                        <button
                          type="button"
                          aria-label={`Təhsil ${i + 1} sil`}
                          onClick={() =>
                            set(
                              "education",
                              p.education.filter((x) => x.id !== e.id),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <UniversityInput
                        id={`profile-education-school-${e.id}`}
                        label="Təhsil müəssisəsi"
                        value={e.school}
                        onChange={(school) =>
                          set(
                            "education",
                            p.education.map((x) =>
                              x.id === e.id ? { ...x, school } : x,
                            ),
                          )
                        }
                      />
                      <MajorInput
                        id={`profile-education-degree-${e.id}`}
                        label="İxtisas"
                        value={e.degree}
                        onChange={(degree) =>
                          set(
                            "education",
                            p.education.map((x) =>
                              x.id === e.id ? { ...x, degree } : x,
                            ),
                          )
                        }
                      />
                      <Field label="Məzuniyyət ili">
                        <input
                          value={e.year}
                          onChange={(v) =>
                            set(
                              "education",
                              p.education.map((x) =>
                                x.id === e.id
                                  ? { ...x, year: v.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      </Field>
                    </div>
                  ))}
                  <button
                    id="profile-add-education"
                    type="button"
                    className="add-button"
                    onClick={() =>
                      set("education", [
                        ...p.education,
                        {
                          id: crypto.randomUUID(),
                          school: "",
                          degree: "",
                          year: "",
                        },
                      ])
                    }
                  >
                    <Plus size={16} /> Təhsil əlavə et
                  </button>
                </section>
              </>
            )}
            {tab === "Bacarıqlar" && (
              <section className="form-section">
                <h3>
                  <Sparkles size={18} /> Bacarıqlar və nailiyyətlər
                </h3>
                <SkillPicker
                  inputId="profile-skills"
                  label="Peşəkar bacarıqlar"
                  value={p.skills}
                  onChange={(skills) => set("skills", skills)}
                  placeholder="Məsələn: Excel, 1C, Maliyyə hesabatlılığı"
                />
                <LanguageList
                  inputId="profile-languages"
                  value={p.languages}
                  onChange={(value) => set("languages", value)}
                />
                <CandidateCertificationEditor
                  inputId="profile-certifications"
                  value={p.certifications}
                  onChange={(value) => set("certifications", value)}
                  detectFrom={certSource}
                  onDismiss={(id) =>
                    set("certificationsDismissed", [
                      ...new Set([...(p.certificationsDismissed || []), id]),
                    ])
                  }
                />
                <Field label="Digər kurslar və təlimlər">
                  <textarea
                    id="profile-certificates"
                    rows={4}
                    value={p.certificates}
                    placeholder="Kataloqda olmayan kurs və təlimlər: adı, təşkilat, il"
                    onChange={(e) => set("certificates", e.target.value)}
                  />
                </Field>
              </section>
            )}
            {tab === "Tam CV məlumatları" && (
              <StructuredCvSection
                profile={p}
                onChange={(value) => set("structuredCv", value)}
              />
            )}
            {tab === "CV faylı" && (
              <section className="form-section">
                <h3>
                  <FileText size={18} /> CV yüklə
                </h3>
                <div className="upload-box">
                  <Upload size={30} />
                  <h3>{p.cvName || "CV faylınızı əlavə edin"}</h3>
                  <p>
                    PDF, DOCX, RTF, TXT, PNG, JPG və ya WEBP · Maksimum 20 MB,
                    40 səhifə
                  </p>
                  <input
                    ref={input}
                    type="file"
                    accept=".pdf,.docx,.rtf,.txt,.png,.jpg,.jpeg,.webp"
                    className="sr-only"
                    onChange={(e) => upload(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    className="secondary"
                    disabled={uploading}
                    onClick={() => input.current?.click()}
                  >
                    {uploading ? "CV oxunur..." : "Fayl seç"}
                  </button>
                </div>
                <Field label="CV mətni — oxunan mətni yoxlayın və ya bura yapışdırın">
                  <textarea
                    id="profile-cv-text"
                    rows={12}
                    maxLength={MAX_CV_TEXT_CHARS}
                    value={p.cvText}
                    onChange={(e) => set("cvText", e.target.value)}
                  />
                </Field>
                {aiEnabled && (
                  <label className="checkline">
                    <input
                      type="checkbox"
                      checked={importConsent}
                      onChange={(e) => setImportConsent(e.target.checked)}
                    />{" "}
                    CV mətnini və skan/şəkil səhifələrini, o cümlədən şəxsi
                    əlaqə məlumatlarını, profil sahələrini avtomatik doldurmaq
                    üçün {aiProvider} ilə paylaşmağa razıyam. Defolt olaraq
                    aktivdir — istəsəniz söndürüb yalnız cihazınızda doldurmağa
                    keçə bilərsiniz.
                  </label>
                )}
                <p className="muted">
                  {aiEnabled && importConsent
                    ? `Fayl yükləyəndə və ya "${aiProvider} ilə doldur" düyməsini basanda boş qalan sahələr (ixtisas, xülasə, bacarıqlar və s.) avtomatik doldurulur. Doldurulan sahələr "AI" nişanı ilə göstərilir — tətbiq etməzdən əvvəl yoxlayın.`
                    : "Ad, əlaqə və aydın başlıqlı məlumatlar cihazınızda tapılır. Qalanını əl ilə doldurun və ya yuxarıdakı razılıq xanasını aktivləşdirib AI-dan istifadə edin."}
                </p>
                <button
                  type="button"
                  className="primary"
                  disabled={uploading || p.cvText.trim().length < 30}
                  onClick={() =>
                    extractFields(
                      p.cvText,
                      p.cvName,
                      aiEnabled && importConsent,
                    )
                  }
                >
                  {uploading
                    ? "Məlumatlar çıxarılır..."
                    : aiEnabled && importConsent
                      ? `${aiProvider} ilə doldur`
                      : "Mətndən doldur"}
                </button>
              </section>
            )}
            <div className="form-actions">
              <span>
                {dirty
                  ? "Yadda saxlanmamış dəyişikliklər"
                  : "Profil məlumatları"}
              </span>
              <button className="primary" disabled={busy || uploading}>
                <Save size={16} />
                {busy ? "Saxlanılır..." : "Dəyişiklikləri saxla"}
              </button>
            </div>
          </form>
        </div>
        <aside>
          <section className="panel">
            <h3>Profilinizin gücü</h3>
            <div
              className="score-ring"
              style={{
                background: `conic-gradient(from 220deg,#73ac92 ${score.completeness * 3.6}deg,#edf2ef 0)`,
              }}
            >
              <div>
                <strong>
                  {score.completeness}
                  <span>%</span>
                </strong>
                <p>tamamlanıb</p>
              </div>
            </div>
            <div className="checklist">
              {[
                ["Şəxsi məlumatlar", !!p.name && !!p.email],
                ["İş təcrübəsi", p.experiences.length > 0],
                ["Təhsil", p.education.length > 0],
                ["Peşə bacarıqları", p.skills.filter(Boolean).length >= 5],
                ["Dillər", !!p.languages],
              ].map(([label, done]) => (
                <div key={String(label)} className={done ? "done" : ""}>
                  <Check size={15} />
                  {label}
                </div>
              ))}
            </div>
          </section>
          <section className="panel next-step">
            <div className="tip-icon">
              <Sparkles size={20} />
            </div>
            <h3>Yaxşı CV konkret danışır</h3>
            <p>
              Vəzifələri sadalamaqla yanaşı, hansı nəticəni əldə etdiyinizi
              göstərin. Rəqəmlər, layihələr və real nümunələr profilinizi
              gücləndirir.
            </p>
          </section>
        </aside>
      </div>
      {preview && (
        <Modal
          title="CV önizləmə"
          onClose={() => setPreview(false)}
          className="cv-preview-modal"
        >
          <div className="cv-print-area">
            <BrandedCv profile={p} />
          </div>
          <button className="primary" onClick={() => window.print()}>
            <Download size={16} /> Çap et / PDF kimi saxla
          </button>
        </Modal>
      )}
    </>,
  );
}
export function JobForm({
  job,
  onChange,
}: {
  job: Job;
  onChange: (j: Job) => void;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const [mapQuery, setMapQuery] = useState(job.address || job.city || "Bakı");
  function set<K extends keyof Job>(k: K, v: Job[K]) {
    onChange({ ...job, [k]: v });
  }
  function openMapPicker() {
    setMapQuery(job.address || job.city || "Bakı");
    setMapOpen(true);
  }
  return localizeTree(
    <div className="job-form">
      <div className="form-grid">
        <JobTitleInput
          label="Vəzifə *"
          value={job.title}
          onChange={(value) => set("title", value)}
        />
        <Field label="Şirkət *">
          <input
            required
            value={job.company}
            placeholder="Şirkətinizin adı"
            onChange={(e) => set("company", e.target.value)}
          />
        </Field>
        <Field label="Şəhər">
          <input
            value={job.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </Field>
        <Field label="Kateqoriya">
          <select
            value={job.category}
            onChange={(e) => set("category", e.target.value)}
          >
            <option value="">Kateqoriya seçin</option>
            {job.category &&
              !JOB_CATEGORIES.some((category) => category === job.category) && (
                <option value={job.category}>{job.category}</option>
              )}
            {JOB_CATEGORIES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="İş formatı">
          <select
            value={job.mode}
            onChange={(e) => set("mode", e.target.value)}
          >
            <option value="">İş formatını seçin</option>
            {["Ofisdə", "Hibrid", "Uzaqdan"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Minimum maaş (AZN)">
          <input
            type="number"
            min={0}
            value={job.minSalary}
            onChange={(e) => set("minSalary", Number(e.target.value))}
          />
        </Field>
        <Field label="Maksimum maaş (AZN)">
          <input
            type="number"
            min={job.minSalary}
            value={job.maxSalary}
            onChange={(e) => set("maxSalary", Number(e.target.value))}
          />
        </Field>
        <Field label="Maaş növü">
          <select
            value={job.salaryKind || ""}
            onChange={(e) =>
              set("salaryKind", e.target.value as "net" | "gross" | "")
            }
          >
            <option value="">Göstərilməyib</option>
            <option value="net">Net (əlinə)</option>
            <option value="gross">Gross (vergilər daxil)</option>
          </select>
          <small>
            Namizədlərə təxmini net/gross qarşılığı və gözləntiylə müqayisə
            göstərilir.
          </small>
        </Field>
        <Field label="Minimum təcrübə (il)">
          <input
            type="number"
            min={0}
            max={50}
            value={job.minYears}
            onChange={(e) => set("minYears", Number(e.target.value))}
          />
        </Field>
        <Field label="Maksimum təcrübə (il)">
          <input
            type="number"
            min={job.minYears}
            max={50}
            value={job.maxYears}
            onChange={(e) => set("maxYears", Number(e.target.value))}
          />
        </Field>
        <Field label="Məşğulluq növü">
          <select
            value={job.type}
            onChange={(e) => set("type", e.target.value)}
          >
            <option value="">Məşğulluq növünü seçin</option>
            {["Tam ştat", "Yarımştat", "Müqavilə"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <SkillPicker
        label="Tələb olunan bacarıqlar"
        value={job.skills}
        onChange={(skills) => set("skills", skills)}
        placeholder="Vakansiyaya uyğun bacarıq axtarın"
      />
      <JobCertificationPicker
        value={job.certifications}
        onChange={(value) => set("certifications", value)}
      />
      <StageEditor
        value={job.stages}
        onChange={(stages) => set("stages", stages)}
      />
      <div className="internal-fields">
        <p className="internal-note">
          Yalnız şirkət daxili məlumat — namizədlər görmür, hesabatlarda
          istifadə olunur.
        </p>
        <div className="form-grid">
          <Field label="Vakansiyanın yaradılma səbəbi *">
            <select
              value={job.reason || ""}
              onChange={(e) => set("reason", e.target.value)}
            >
              <option value="">Səbəbi seçin</option>
              {VACANCY_REASONS.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qeyd (istəyə bağlı)">
            <input
              maxLength={300}
              value={job.reasonNote || ""}
              placeholder="Məsələn: satış şöbəsindən A.M. işdən çıxıb"
              onChange={(e) => set("reasonNote", e.target.value)}
            />
          </Field>
        </div>
      </div>
      <Field label="Vəzifə öhdəlikləri">
        <textarea
          rows={6}
          value={job.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      <Field label="Namizədə tələblər">
        <textarea
          rows={5}
          value={job.requirements}
          onChange={(e) => set("requirements", e.target.value)}
        />
      </Field>
      <div className="form-grid">
        <Field label="Müraciət üçün son tarix">
          <input
            type="date"
            value={job.deadline || ""}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </Field>
        <Field label="İş qrafiki">
          <input
            value={job.workSchedule || ""}
            placeholder="Məsələn: B.e.–Cümə, 09:00–18:00"
            onChange={(e) => set("workSchedule", e.target.value)}
          />
        </Field>
      </div>
      <div className="job-address-field">
        <Field label="İş ünvanı">
          <input
            value={job.address || ""}
            placeholder="Tam ünvan və ya ərazi"
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>
        <button
          type="button"
          className="secondary map-picker-trigger"
          onClick={openMapPicker}
        >
          <MapPin size={17} /> Google Maps-dən seç
        </button>
        {job.address && (
          <a
            className="map-address-link"
            href={googleMapsSearchUrl(job.address)}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} /> Ünvanı Google Maps-də aç
          </a>
        )}
      </div>
      <Field label="İş şəraiti və üstünlüklər">
        <textarea
          rows={4}
          value={job.benefits || ""}
          placeholder="Məsələn: peşəkar inkişaf, tibbi sığorta, nahar"
          onChange={(e) => set("benefits", e.target.value)}
        />
      </Field>
      {mapOpen && (
        <Modal
          title="İş ünvanını Google Maps-dən seçin"
          onClose={() => setMapOpen(false)}
          className="map-picker-modal"
        >
          <p className="map-picker-help">
            Tam ünvanı və ya obyektin adını yazın, xəritədə yoxlayın və sonra
            seçimi təsdiqləyin.
          </p>
          <Field label="Ünvan axtarışı">
            <input
              value={mapQuery}
              placeholder="Məsələn: Bakı, Xətai rayonu, Babək prospekti 10"
              onChange={(event) => setMapQuery(event.target.value)}
            />
          </Field>
          <div className="map-preview">
            {normalizeJobAddress(mapQuery) ? (
              <iframe
                title="Google Maps ünvan önizləməsi"
                src={googleMapsEmbedUrl(mapQuery)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="map-preview-empty">
                <MapPin size={25} /> Ünvan yazın
              </div>
            )}
          </div>
          <div className="map-picker-actions">
            <a
              className="secondary"
              href={googleMapsSearchUrl(mapQuery)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} /> Google Maps-də yoxla
            </a>
            <button
              type="button"
              className="primary"
              disabled={!normalizeJobAddress(mapQuery)}
              onClick={() => {
                set("address", normalizeJobAddress(mapQuery));
                setMapOpen(false);
              }}
            >
              <Check size={17} /> Bu ünvanı seç
            </button>
          </div>
        </Modal>
      )}
    </div>,
  );
}
