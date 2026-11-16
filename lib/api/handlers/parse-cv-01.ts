// parse-cv: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, aiText, jsonBody, str } from "@/lib/server";
import type { Loose } from "@/lib/loose";
import { MAX_CV_TEXT_CHARS } from "@/lib/cv-limits";
import { UNIVERSAL_CV_PARSER_PROMPT, profileFieldsFromUniversalCv } from "@/lib/cv-parser";
import { needsEmploymentAudit, numberedCvLines, textBetweenCvLineBoundaries, textFromCvLineSpan, verifiedCvQuote } from "@/lib/cv-experience";
import { quiet } from "@/lib/quiet";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_parse_cv_01(c: Pick<RouteCtx, "id" | "path" | "request">): Promise<Response | undefined> {
  const { id, path, request } = c;
  if (request.method === "POST" && path === "parse-cv") {
    const b = await jsonBody(request);
    if (b.consent !== true)
      throw new HttpError(
        400,
        "CV mətnini AI provayderi ilə paylaşmaq üçün razılıq tələb olunur.",
      );
    const text = str(b.text, MAX_CV_TEXT_CHARS);
    if (text.length < 30) throw new HttpError(400, "CV mətni çox qısadır.");
    const output = await aiText(UNIVERSAL_CV_PARSER_PROMPT, text, true, {
      maxInputChars: MAX_CV_TEXT_CHARS,
      maxOutputTokens: 14000,
      timeoutMs: 120000,
      feature: "cv-parse",
      user: id,
    });
    if (!output)
      throw new HttpError(
        503,
        "AI bağlantısı aktiv deyil. İlkin doldurma funksiyasından istifadə edin.",
      );
    let parsed: Loose;
    try {
      parsed = JSON.parse(
        output
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim(),
      );
    } catch {
      throw new HttpError(502, "AI məlumatları oxunmadı. Yenidən sınayın.");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new HttpError(502, "AI cavabı düzgün deyil.");
    const summaryGenerated = !str(parsed.professional_summary, 5000);
    const normalized = profileFieldsFromUniversalCv(parsed);
    if (b.ocrUsed === true) {
      const reason =
        "CV şəkil və ya skan üzərindən OCR ilə oxunub; ad, tarix və sütun əlaqələrini orijinal faylla vizual yoxlayın.";
      normalized.metadata.needsManualReview = true;
      normalized.metadata.reviewReasons = Array.from(
        new Set([...normalized.metadata.reviewReasons, reason]),
      );
      if (normalized.fields.cvParserMetadata) {
        normalized.fields.cvParserMetadata.ocrUsed = true;
        normalized.fields.cvParserMetadata.needsManualReview = true;
        normalized.fields.cvParserMetadata.reviewReasons =
          normalized.metadata.reviewReasons;
      }
    }
    const fields = normalized.fields;
    if (
      Array.isArray(fields.experiences) &&
      needsEmploymentAudit(text, fields.experiences)
    ) {
      const cvLines = numberedCvLines(text);
      const auditedOutput = await aiText(
        'You are the employment-history verification stage of a CV parser. The CV is supplied as numbered visual lines. Return one JSON object only, no markdown: {"experiences":[{"title":"","company":"","start":"YYYY-MM-DD, YYYY-MM, YYYY or empty","end":"YYYY-MM-DD, YYYY-MM, YYYY or empty","current":false,"roleHeadingLine":1,"nextHeadingLine":1,"dutyStartLine":1,"dutyEndLine":1,"dutyQuotes":["exact CV substring"]}]}. Re-read the numbered lines as a human recruiter would. A company heading can contain overall company tenure; it is not a job title and must not become an extra record. Create a separate record for every distinct role at the same company. Role-specific dates override company-level tenure dates. Preserve the exact date precision in the CV: never invent a month or day. If one role ends in the same month another begins, preserve both dates as a normal promotion boundary. roleHeadingLine is the line containing this exact role title. nextHeadingLine is the first company, role, education or other section heading after this role; use one past the final CV line only when there is no later heading. The server will retain EVERY non-empty line strictly between those boundaries, so choose boundaries from visual structure and never move them merely because a duty sounds more appropriate for another profession. Also provide dutyStartLine and dutyEndLine as the inclusive continuous range containing ALL responsibility bullets and wrapped continuation lines. Do not cherry-pick, summarize, deduplicate, shorten or omit a duty because it looks repetitive or unimportant. A five-bullet visual block must remain five bullets. Never include a company, role or date heading inside the duty range. Never merge the responsibilities of two roles, even when they are at the same company. Also return dutyQuotes as a fallback, with every responsibility copied exactly from the CV. Do not invent or move a duty based only on what normally belongs to a profession. Preserve dates, titles and company names supported by the numbered lines. Use currentExtraction only as a draft to audit, not as authority.',
        JSON.stringify({
          cvLines: cvLines.map(({ number, text: line }) => [number, line]),
          currentExtraction: fields.experiences,
        }),
        true,
        {
          maxInputChars: 120000,
          maxOutputTokens: 5000,
          feature: "cv-audit",
          user: id,
        },
      );
      if (auditedOutput) {
        try {
          const audited = JSON.parse(
            auditedOutput
              .replace(/^```(?:json)?\s*/i, "")
              .replace(/\s*```$/, "")
              .trim(),
          );
          const date =
            /^\d{4}(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/;
          const experiences = (
            Array.isArray(audited?.experiences) ? audited.experiences : []
          )
            .slice(0, 20)
            .map((experience: Loose) => {
              const firstPass = fields.experiences?.find(
                (item) =>
                  item.title.toLocaleLowerCase("az") ===
                    str(experience?.title, 150).toLocaleLowerCase("az") &&
                  item.company.toLocaleLowerCase("az") ===
                    str(experience?.company, 150).toLocaleLowerCase("az"),
              );
              const completeDutyBlock =
                textBetweenCvLineBoundaries(
                  cvLines,
                  experience?.roleHeadingLine,
                  experience?.nextHeadingLine,
                ) ||
                textFromCvLineSpan(
                  cvLines,
                  experience?.dutyStartLine,
                  experience?.dutyEndLine,
                );
              const dutyQuotes = (
                Array.isArray(experience?.dutyQuotes)
                  ? experience.dutyQuotes
                  : []
              )
                .map((quote: unknown) => verifiedCvQuote(text, quote))
                .filter(Boolean)
                .slice(0, 20);
              return {
                title: str(experience?.title, 150),
                company: str(experience?.company, 150),
                employmentType: firstPass?.employmentType || "",
                start: date.test(experience?.start) ? experience.start : "",
                end: date.test(experience?.end) ? experience.end : "",
                current: experience?.current === true,
                // The line span is authoritative: copy the complete visual
                // block instead of relying on the model to repeat each bullet.
                description: completeDutyBlock || dutyQuotes.join("\n"),
              };
            })
            .filter(
              (experience: Loose) =>
                experience.title &&
                experience.company &&
                experience.start &&
                (experience.current || experience.end),
            );
          // The audit may only refine the first pass. A role listed without
          // bullets is still a role, and a shorter audit must never drop
          // positions the first pass found.
          if (
            experiences.length >= 2 &&
            experiences.length >= (fields.experiences?.length || 0)
          ) {
            fields.experiences = experiences;
            if (fields.structuredCv) {
              const original = Array.isArray(
                fields.structuredCv.work_experience,
              )
                ? fields.structuredCv.work_experience
                : [];
              fields.structuredCv.work_experience = experiences.map(
                (experience: Loose) => {
                  const detail =
                    original.find(
                      (item: Loose) =>
                        str(item?.position, 150).toLocaleLowerCase("az") ===
                          experience.title.toLocaleLowerCase("az") &&
                        str(item?.company_name, 150).toLocaleLowerCase("az") ===
                          experience.company.toLocaleLowerCase("az"),
                    ) || {};
                  const duties = experience.description
                    .split(/\n+/)
                    .map((line: string) =>
                      line.replace(/^[•\-–—*]\s*/, "").trim(),
                    )
                    .filter(Boolean);
                  return {
                    ...detail,
                    company_name: experience.company,
                    position: experience.title,
                    start_date: experience.start || null,
                    end_date: experience.current
                      ? null
                      : experience.end || null,
                    is_current: experience.current,
                    responsibilities: duties,
                  };
                },
              );
            }
          }
        } catch (error) {
          // Keep the first-pass extraction if the audit response is malformed.
          quiet("route-catch", error);
        }
      }
    }
    return ok({
      fields,
      summaryGenerated,
      parserMetadata: normalized.metadata,
    });
  }
  return undefined;
}
