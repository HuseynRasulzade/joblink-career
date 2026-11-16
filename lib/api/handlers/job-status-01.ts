// job-status: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { CLOSE_REASONS } from "@/lib/job-edit";
import { HttpError, jsonBody, runtime, str } from "@/lib/server";
import { type Job } from "@/lib/model";
import { MAX_CV_FILE_BYTES, MAX_CV_PAGES, MAX_CV_TEXT_CHARS, formatCvFileLimit } from "@/lib/cv-limits";
import { can } from "@/lib/company";
import { cleanCvText, layoutPdfText, rtfToText } from "@/lib/cv-text";
import { Row, assertVacancyPlan, normalizedJobRecord, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_job_status_01(c: Pick<RouteCtx, "customSkillLabels" | "db" | "id" | "memberRole" | "path" | "request">): Promise<Response | undefined> {
  const { customSkillLabels, db, id, memberRole, path, request } = c;
  if (request.method === "POST" && path === "job-status") {
    const b = await jsonBody(request);
    const action = str(b.action, 20);
    if (!["pause", "publish", "archive"].includes(action))
      throw new HttpError(400, "Vakansiya əməliyyatı yanlışdır.");
    const job = await db
      .prepare("SELECT id,data,status FROM jobs WHERE id=? AND owner=?")
      .bind(str(b.jobId, 100), id)
      .first<Row>();
    if (!job) throw new HttpError(404, "Vakansiya tapılmadı.");
    const current = normalizedJobRecord(
      JSON.parse(job.data),
      customSkillLabels,
    ) as Job & { moderated?: boolean };
    if (job.status === "archived")
      throw new HttpError(
        409,
        "Arxivlənmiş vakansiya yenidən açıla bilməz. Yeni elan yaradın.",
      );
    if (job.status === "pending_approval" || job.status === "rejected")
      throw new HttpError(
        409,
        job.status === "rejected"
          ? "Vakansiya təsdiqdən keçməyib. Yeni elan yaradın."
          : "Vakansiya təsdiq gözləyir.",
      );
    if (action !== "pause" && !can(memberRole, "publish"))
      throw new HttpError(
        403,
        "Vakansiyanı yayımlamaq və arxivləmək üçün HR və ya direktor icazəsi lazımdır.",
      );
    if (action === "publish" && current.moderated)
      throw new HttpError(
        403,
        "Bu vakansiya administrator tərəfindən dayandırılıb. Dəstək ilə əlaqə saxlayın.",
      );
    if (
      action === "publish" &&
      current.deadline &&
      current.deadline < new Date().toISOString().slice(0, 10)
    )
      throw new HttpError(
        400,
        "Müraciət müddəti bitib. Yeni son tarixlə yeni elan yaradın.",
      );
    // A paused vacancy that opens again takes its place of the plan again.
    if (action === "publish" && job.status === "paused") await assertVacancyPlan(db, id, { ...current, id: String(job.id) });
    const status =
      action === "publish"
        ? "published"
        : action === "pause"
          ? "paused"
          : "archived";
    // Why a vacancy was closed is kept for the company's own records.
    const closing =
      action === "archive"
        ? {
            closeReason: CLOSE_REASONS.some(
              (r) => r.id === str(b.closeReason, 20),
            )
              ? str(b.closeReason, 20)
              : "other",
            closeNote: str(b.closeNote, 300),
            closedAt: new Date().toISOString(),
          }
        : {};
    await db
      .prepare("UPDATE jobs SET status=?,data=? WHERE id=? AND owner=?")
      .bind(
        status,
        JSON.stringify({ ...current, ...closing, status }),
        job.id,
        id,
      )
      .run();
    return ok({ ok: true, status });
  }
  if (request.method === "POST" && path === "upload") {
    if (runtime().CV_STORAGE === "profile_text")
      throw new HttpError(
        400,
        "Faylı profil bölməsində seçin. Mətn cihazınızda oxunur və profilinizlə saxlanılır.",
      );
    if (
      Number(request.headers.get("content-length")) >
      MAX_CV_FILE_BYTES + 1024 * 1024
    )
      throw new HttpError(
        413,
        `Fayl ${formatCvFileLimit()}-dan kiçik olmalıdır.`,
      );
    const form = await request.formData().catch(() => { throw new HttpError(400, "Sorğu forması düzgün deyil."); });
    const file = form.get("file");
    if (!(file instanceof File) || file.size > MAX_CV_FILE_BYTES)
      throw new HttpError(
        400,
        `Maksimum ${formatCvFileLimit()} ölçüdə PDF, DOCX, RTF və ya TXT seçin.`,
      );
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt", "rtf"].includes(ext || ""))
      throw new HttpError(
        400,
        "Yalnız PDF, DOCX, RTF və TXT qəbul edilir. Köhnə .doc formatını PDF və ya DOCX-ə çevirib yenidən yükləyin.",
      );
    const bytes = await file.arrayBuffer();
    let text = "";
    try {
      if (ext === "pdf") {
        const { extractTextItems, getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(bytes));
        if (pdf.numPages > MAX_CV_PAGES) {
          await pdf.loadingTask.destroy();
          throw new HttpError(
            400,
            `CV maksimum ${MAX_CV_PAGES} səhifə olmalıdır.`,
          );
        }
        try {
          text = layoutPdfText((await extractTextItems(pdf)).items);
        } finally {
          await pdf.loadingTask.destroy();
        }
      } else if (ext === "docx") {
        const mammoth = await import("mammoth");
        text = cleanCvText(
          (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value,
        );
      } else if (ext === "rtf") {
        text = rtfToText(new TextDecoder().decode(bytes));
      } else text = cleanCvText(new TextDecoder().decode(bytes));
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(
        400,
        "Fayl oxunmadı. Mətnli PDF/DOCX seçin və ya CV mətnini yapışdırın.",
      );
    }
    if (text.trim().length < 30)
      throw new HttpError(
        400,
        "Oxuna bilən mətn tapılmadı. Skan edilmiş CV üçün mətni əl ilə daxil edin.",
      );
    const uploadId = crypto.randomUUID(),
      key = `cv/${id}/${uploadId}`;
    await runtime().FILES.put(key, bytes, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });
    await db
      .prepare(
        "INSERT INTO uploads(id,owner,name,key,created) VALUES(?,?,?,?,?)",
      )
      .bind(uploadId, id, str(file.name, 150), key, new Date().toISOString())
      .run();
    return ok({
      id: uploadId,
      name: file.name,
      text: text.slice(0, MAX_CV_TEXT_CHARS),
    });
  }
  return undefined;
}
