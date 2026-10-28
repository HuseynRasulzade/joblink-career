// Usual sections of a department, offered when its sections are made. Matched by words in the department name.
const SUGGESTIONS: { words: string[]; sections: string[] }[] = [
  { words: ["maliyye", "mühasib", "muhasib", "finance", "büdce", "budce"], sections: ["Mühasibat", "Büdcə və planlaşdırma", "Xəzinə", "Vergi uçotu", "Daxili audit"] },
  { words: ["hr", "kadr", "insan resurs", "human"], sections: ["İşə qəbul", "Kadr uçotu", "Əmək haqqı və müavinətlər", "Təlim və inkişaf"] },
  { words: ["it", "texnolog", "informasiya", "proqram", "technology"], sections: ["Proqram təminatı", "İnfrastruktur", "Texniki dəstək", "İnformasiya təhlükəsizliyi", "Data və analitika"] },
  { words: ["satis", "satış", "sales", "ticaret"], sections: ["Daxili satış", "Xarici satış", "Korporativ satış", "Müştəri xidmətləri"] },
  { words: ["marketing", "marketinq", "reklam"], sections: ["Rəqəmsal marketinq", "Brend", "Kontent", "İctimaiyyətlə əlaqələr"] },
  { words: ["huquq", "hüquq", "legal"], sections: ["Müqavilələr", "Məhkəmə işləri", "Uyğunluq (compliance)"] },
  { words: ["techizat", "təchizat", "satinalma", "satınalma", "logistika", "supply"], sections: ["Satınalma", "Anbar", "Logistika", "Nəqliyyat"] },
  { words: ["istehsal", "production", "zavod", "emal"], sections: ["İstehsalat planlaması", "Keyfiyyətə nəzarət", "Texniki xidmət", "Anbar"] },
  { words: ["inzibati", "teserrufat", "təsərrüfat", "administrat"], sections: ["Katiblik", "Təsərrüfat", "Təhlükəsizlik", "Nəqliyyat"] },
  { words: ["musteri", "müştəri", "customer", "destek", "dəstək"], sections: ["Çağrı mərkəzi", "Şikayətlər", "Müştəri uğuru"] },
  { words: ["layihe", "layihə", "project", "idare"], sections: ["Layihə idarəetməsi", "Planlaşdırma", "Hesabatlılıq"] },
];

const fold = (value: string) =>
  String(value || "")
    .toLocaleLowerCase("az")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g");

// Suggested sections for a department, without the ones it already has.
export function suggestSections(department: string, existing: string[]) {
  const name = ` ${fold(department)} `;
  const words = name.split(/[^a-z0-9]+/).filter(Boolean);
  const have = new Set(existing.map(fold));
  const out: string[] = [];
  for (const group of SUGGESTIONS) {
    const hit = group.words.some((word) => {
      const w = fold(word);
      // short words (hr, it) must be a whole word; longer ones may start a word
      return w.length <= 3 ? words.includes(w) : words.some((x) => x.startsWith(w));
    });
    if (!hit) continue;
    for (const section of group.sections) if (!have.has(fold(section)) && !out.includes(section)) out.push(section);
  }
  return out;
}

// Names typed one per line, or separated by commas and semicolons.
export function splitNames(text: string, limit = 100) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(text || "").split(/[\n;,]+/)) {
    const name = part.trim().replace(/\s+/g, " ").slice(0, 120);
    if (name.length < 2 || seen.has(fold(name))) continue;
    seen.add(fold(name));
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}
