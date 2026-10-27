// Position level and day-to-day duties, used next to skills when a CV is
// matched with a vacancy: a finance manager is not a fit for an operator job
// just because both mention finance.
const fold = (value: string) =>
  value
    .toLocaleLowerCase("az")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[əƏ]/g, "e")
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export const LEVEL_NAMES = [
  "təcrübəçi",
  "köməkçi / operator",
  "mütəxəssis",
  "aparıcı / böyük mütəxəssis",
  "menecer",
  "şöbə rəhbəri",
  "direktor",
];

// Highest level first, so "baş mühasib" is read before the plain "mühasib".
// Words take Azerbaijani suffixes ("meneceri"), so they match by their start;
// short acronyms must be whole words.
const word = (stems: string, whole = "") =>
  new RegExp(`\\b(?:${stems})${whole ? `|\\b(?:${whole})\\b` : ""}`);
const LEVEL_PATTERNS: Array<[number, RegExp]> = [
  [
    6,
    word(
      "direktor|director|prezident|president|vice president|icraci direktor|general manager|chief executive|chief financial",
      "cfo|ceo|coo|cto|vp",
    ),
  ],
  [
    5,
    word(
      "sobe mudir|sobe rehber|head of|department head|mudir|reis",
      "head",
    ),
  ],
  [
    // "Maliyyə şöbəsinin rəhbəri", "Mühasibatlıq şöbəsi müdiri"
    5,
    /\bsobe\w*\s+(?:mudir|rehber)/,
  ],
  [
    4,
    word(
      "menecer|manager|team lead|tim lider|tech lead|qrup rehber|rehber|supervisor|nezaretci|bas muhasib|chief accountant|controller|kontroller",
    ),
  ],
  [
    3,
    word(
      "senior|aparici|boyuk|bas mutexessis|ekspert|expert|principal|lider",
      "lead",
    ),
  ],
  [
    0,
    word(
      "intern|stajyor|stajor|tecrubeci|sagird|trainee|apprentice|praktikant",
    ),
  ],
  [
    1,
    word(
      "assistant|komekci|operator|kassir|katib|clerk|junior|kicik|resepsionist|receptionist|sekretar|secretary|asistent",
    ),
  ],
];

// null when the title says nothing about the level.
export function titleLevel(title: string): number | null {
  const text = fold(title);
  if (!text) return null;
  // A deputy is one step below the post he deputizes for.
  const deputy = /\b(?:muavin\w*|deputy|vice)\b/.exec(text);
  if (deputy && !/vice president/.test(text)) {
    const base = titleLevel(text.replace(deputy[0], " "));
    return base === null ? null : Math.max(0, base - 1);
  }
  for (const [level, pattern] of LEVEL_PATTERNS)
    if (pattern.test(text)) return level;
  return 2;
}

export type LevelRole = {
  title: string;
  current: boolean;
  end: string;
  start?: string;
};

// The level a person works at now: current roles, or those that ended in the
// last three years when there is none; failing that, the latest role.
export function candidateLevel(
  roles: LevelRole[],
  profileTitle: string,
  now = new Date(),
): number | null {
  const cutoff = `${now.getFullYear() - 3}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // A person works at the level of the position held now; earlier posts only
  // count when no current position is given.
  const present = roles.filter((role) => role.current || !role.end);
  const levels = (
    present.length
      ? present
      : roles.filter((role) => role.end >= cutoff)
  )
    .map((role) => titleLevel(role.title))
    .filter((level): level is number => level !== null);
  const own = titleLevel(profileTitle);
  if (own !== null) levels.push(own);
  if (levels.length) return Math.max(...levels);
  const latest = [...roles].sort((a, b) =>
    (b.end || "9999").localeCompare(a.end || "9999"),
  )[0];
  return latest ? titleLevel(latest.title) : null;
}

// How well a person's level fits the vacancy's level (1 = same or one step apart).
export function levelFit(candidate: number | null, vacancy: number | null) {
  if (candidate === null || vacancy === null) return { fit: 1, gap: 0 };
  const gap = candidate - vacancy;
  const fit =
    gap >= 3
      ? 0.45
      : gap === 2
        ? 0.7
        : gap === 1
          ? 0.92
          : gap >= -1
            ? 1
            : gap === -2
              ? 0.7
              : 0.4;
  return { fit, gap };
}

const DUTY_STOP = new Set(
  "ucun olaraq uzre zamani ile ilə daha bunun lazim olan tələb tələblər teleb teleblər namized namized sirket sirketin isci isin isler isleri islerin iscisi vezife vezifeleri vezifesi təcrübə tecrube bilik bilikler bacariq bacariqlar yaxsi yuksek yaxsi sahe sahesi sahede mutexessis menecer rehber kicik boyuk senior junior the and for with have your will work team ability experience skills knowledge strong good must should required requirements responsibilities duties".split(
    " ",
  ),
);
// First five letters stand in for the word, so "hesabatlarin" and "hesabat" match.
function dutyStems(text: string) {
  const stems = new Map<string, number>();
  for (const word of fold(text).split(" ")) {
    if (word.length < 5 || DUTY_STOP.has(word) || /^\d+$/.test(word)) continue;
    const stem = word.slice(0, 5);
    stems.set(stem, (stems.get(stem) || 0) + 1);
  }
  return stems;
}

// Share of the vacancy's duties that appear in what the person has actually done.
// null when either side has too little text to compare.
export function dutyFit(vacancyText: string, doneText: string): number | null {
  const wanted = dutyStems(vacancyText);
  const done = dutyStems(doneText);
  if (wanted.size < 5 || done.size < 5) return null;
  const top = [...wanted.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const hits = top.filter(([stem]) => done.has(stem)).length;
  return Math.min(1, (hits / top.length) * 2.5);
}
