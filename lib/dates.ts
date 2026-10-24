// Browsers often lack Azerbaijani month names ("M10"), so dates are
// formatted with explicit month names in both languages.
const MONTHS = {
  az: {
    short: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"],
    long: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"],
  },
  en: {
    short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    long: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  },
  // Genitive forms, as used after a day number ("5 января").
  ru: {
    short: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
    long: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  },
};

export function formatDate(
  value: string | Date,
  language: "az" | "en" | "ru" = "az",
  options: { month?: "short" | "long"; year?: boolean; time?: boolean } = {},
) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  const month = MONTHS[language][options.month || "short"][date.getMonth()];
  const parts = [`${date.getDate()} ${month}`];
  if (options.year !== false) parts.push(String(date.getFullYear()));
  const text = parts.join(" ");
  if (!options.time) return text;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${text}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
