type ExperienceLike = {
  company?: unknown;
};

const comparable = (value: unknown) =>
  typeof value === "string"
    ? value
        .toLocaleLowerCase("az")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";

export function needsEmploymentAudit(
  cvText: string,
  experiences: ExperienceLike[],
) {
  if (!experiences.length) return false;
  const companies = experiences
    .map((experience) => comparable(experience.company))
    .filter((company) => company.length >= 5);
  const duplicateCompany = companies.some(
    (company, index) => companies.indexOf(company) !== index,
  );
  if (duplicateCompany) return true;

  const document = comparable(cvText);
  return companies.some((company) => {
    const first = document.indexOf(company);
    return first >= 0 && document.indexOf(company, first + company.length) >= 0;
  });
}

export function verifiedCvQuote(cvText: string, value: unknown, max = 1200) {
  const quote = typeof value === "string" ? value.trim().slice(0, max) : "";
  if (quote.length < 3) return "";
  return comparable(cvText).includes(comparable(quote)) ? quote : "";
}

export type CvLine = { number: number; text: string };

// Give the verifier stable references to visual lines. Asking an LLM to copy
// every bullet is lossy because it may omit a responsibility it finds
// repetitive. A verified inclusive span lets the server retain the full block.
export function numberedCvLines(cvText: string): CvLine[] {
  return cvText.split("\n").map((text, index) => ({
    number: index + 1,
    text: text.trim(),
  }));
}

export function textFromCvLineSpan(
  lines: CvLine[],
  startValue: unknown,
  endValue: unknown,
  maxLines = 40,
) {
  const start = Number(startValue);
  const end = Number(endValue);
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end < start ||
    end > lines.length ||
    end - start + 1 > maxLines
  )
    return "";

  return lines
    .slice(start - 1, end)
    .map((line) => line.text)
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function textBetweenCvLineBoundaries(
  lines: CvLine[],
  roleHeadingValue: unknown,
  nextHeadingValue: unknown,
) {
  const roleHeading = Number(roleHeadingValue);
  const nextHeading = Number(nextHeadingValue);
  if (
    !Number.isInteger(roleHeading) ||
    !Number.isInteger(nextHeading) ||
    roleHeading < 1 ||
    nextHeading <= roleHeading + 1 ||
    nextHeading > lines.length + 1
  )
    return "";
  return textFromCvLineSpan(lines, roleHeading + 1, nextHeading - 1);
}
