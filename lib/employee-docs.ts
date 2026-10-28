// The employee document folder: each kind of document says which one it is (which contract,
// which order, which certificate), so the folder can be read at a glance.
export const DOC_KINDS: Record<string, { label: string; types: string[] }> = {
  contract: {
    label: "Müqavilə",
    types: [
      "Əmək müqaviləsi",
      "Əmək müqaviləsinə əlavə razılaşma",
      "Sınaq müddəti razılaşması",
      "Tam maddi məsuliyyət müqaviləsi",
      "Konfidensiallıq (NDA) müqaviləsi",
      "Mülki-hüquqi (podrat) müqaviləsi",
      "Təlim və ya təhsil müqaviləsi",
      "Rəqabət qadağası müqaviləsi",
    ],
  },
  order: {
    label: "Əmr",
    types: [
      "İşə qəbul əmri",
      "Məzuniyyət əmri",
      "Əmək haqqı dəyişikliyi əmri",
      "Köçürmə əmri",
      "Əmək müqaviləsinə xitam əmri",
      "Ezamiyyət əmri",
      "Mükafatlandırma əmri",
      "İntizam tənbehi əmri",
    ],
  },
  id: {
    label: "Şəxsiyyət sənədi",
    types: ["Şəxsiyyət vəsiqəsi", "Pasport", "Hərbi qeydiyyat sənədi", "DSMF şəhadətnaməsi (SSN)", "Ailə tərkibi haqqında arayış", "Şəkil (3x4)", "Qeydiyyat ünvanı (arayış)"],
  },
  diploma: {
    label: "Təhsil və sertifikat",
    types: ["Ali təhsil diplomu", "Magistr diplomu", "Orta təhsil attestatı", "Peşə sertifikatı", "Kurs şəhadətnaməsi", "Dil sertifikatı", "Akademik arayış"],
  },
  medical: {
    label: "Tibbi sənəd",
    types: ["Tibbi arayış (086)", "İlkin tibbi müayinə", "İllik tibbi müayinə", "Sığorta polisi", "Əlillik və ya şikəstlik arayışı", "Vaksinasiya şəhadətnaməsi"],
  },
  other: { label: "Digər", types: [] },
};
// Every kind also has "Digər": the person writes which document it is.
export const OTHER_TYPE = "Digər";

export const docKindOf = (category: string) => DOC_KINDS[category] || DOC_KINDS.other;

// "Əmək müqaviləsi · № 12 · 2026-01-15"
export function docLabel(doc: { category: string; subtype: string; docNumber?: string; docDate?: string }) {
  const kind = docKindOf(doc.category).label;
  return [doc.subtype || kind, doc.docNumber ? `№ ${doc.docNumber}` : "", doc.docDate || ""].filter(Boolean).join(" · ");
}

// A document must say which one it is: a listed type, or free text for "Digər".
export function normalizeDocType(category: string, subtype: string) {
  const kind = DOC_KINDS[category] ? category : "other";
  const text = (subtype || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!text) return { ok: false as const, category: kind, subtype: "" };
  return { ok: true as const, category: kind, subtype: text };
}
