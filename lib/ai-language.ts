// The language the AI writes its answers in: what the person uses on the site.
export type AiLanguage = "az" | "en" | "ru";
export const aiLanguage = (value: unknown): AiLanguage =>
  value === "en" ? "en" : value === "ru" ? "ru" : "az";
export const aiLanguageName = (language: AiLanguage) =>
  language === "en"
    ? "English"
    : language === "ru"
      ? "natural, grammatically correct Russian"
      : "natural, grammatically correct Azerbaijani";
