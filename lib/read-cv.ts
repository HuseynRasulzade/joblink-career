import { cleanCvText, layoutPdfText, rtfToText } from "./cv-text";
import {
  formatCvFileLimit,
  MAX_CV_FILE_BYTES,
  MAX_CV_PAGES,
  MAX_CV_TEXT_CHARS,
} from "./cv-limits";

type ReadCvOptions = { ocr?: boolean; consent?: boolean };

async function ocrImage(blob: Blob, name: string, consent: boolean) {
  if (!consent)
    throw new Error("Şəkil və skan CV-ni oxumaq üçün AI/OCR razılığını aktivləşdirin.");
  const data = new FormData();
  data.append("file", blob, name);
  data.append("consent", "true");
  const response = await fetch("/api/joblink/ocr-cv", { method: "POST", body: data });
  const body = (await response.json()) as { text?: string; error?: string };
  if (!response.ok || !body.text)
    throw new Error(body.error || "CV şəkli OCR ilə oxunmadı.");
  return cleanCvText(body.text);
}

async function renderPdfPage(page: any) {
  const natural = page.getViewport({ scale: 1 });
  const scale = Math.min(2, 2600 / Math.max(natural.width, natural.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const canvasContext = canvas.getContext("2d", { alpha: false });
  if (!canvasContext) throw new Error("CV səhifəsi şəkilə çevrilmədi.");
  await page.render({ canvas, canvasContext, viewport }).promise;
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("CV səhifəsi şəkilə çevrilmədi."))),
      "image/jpeg",
      0.92,
    ),
  );
}

export async function readCv(file: File, options: ReadCvOptions = {}) {
  if (file.size > MAX_CV_FILE_BYTES)
    throw new Error(`Fayl ${formatCvFileLimit()}-dan kiçik olmalıdır.`);
  const ext = file.name.split(".").pop()?.toLowerCase();
  const imageExtensions = ["png", "jpg", "jpeg", "webp"];
  if (!["pdf", "docx", "txt", "rtf", ...imageExtensions].includes(ext || ""))
    throw new Error("PDF, DOCX, RTF, TXT, PNG, JPG və ya WEBP faylı seçin.");

  if (imageExtensions.includes(ext || "")) {
    if (!options.ocr) throw new Error("Şəkil CV-ni oxumaq üçün AI/OCR aktiv olmalıdır.");
    const text = await ocrImage(file, file.name, options.consent === true);
    return { name: file.name, text: text.slice(0, MAX_CV_TEXT_CHARS), ocrUsed: true };
  }

  const bytes = await file.arrayBuffer();
  let text = "";
  let ocrUsed = false;
  if (ext === "pdf") {
    const { extractTextItems, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    try {
      if (pdf.numPages > MAX_CV_PAGES)
        throw new Error(`CV maksimum ${MAX_CV_PAGES} səhifə olmalıdır.`);
      const extracted = await extractTextItems(pdf);
      const pages: string[] = [];
      for (let i = 0; i < extracted.items.length; i++) {
        let pageText = cleanCvText(layoutPdfText([extracted.items[i]]));
        if (pageText.length < 30 && options.ocr) {
          const page = await pdf.getPage(i + 1);
          pageText = await ocrImage(
            await renderPdfPage(page),
            `${file.name.replace(/\.pdf$/i, "")}-page-${i + 1}.jpg`,
            options.consent === true,
          );
          ocrUsed = true;
        }
        if (pageText) pages.push(`[SƏHİFƏ ${i + 1}]\n${pageText}`);
      }
      text = pages.join("\n\n");
    } finally {
      await pdf.loadingTask.destroy();
    }
  } else if (ext === "docx") {
    const mammoth = await import("mammoth");
    text = cleanCvText((await mammoth.extractRawText({ arrayBuffer: bytes })).value);
    if (text.length < 30 && options.ocr) {
      const imageTexts: string[] = [];
      await mammoth.convertToHtml(
        { arrayBuffer: bytes },
        {
          convertImage: mammoth.images.imgElement(async (image) => {
            if (["image/jpeg", "image/png", "image/webp"].includes(image.contentType)) {
              const imageBytes = await image.readAsArrayBuffer();
              if (imageBytes.byteLength <= 10 * 1024 * 1024)
                imageTexts.push(
                  await ocrImage(
                    new Blob([imageBytes], { type: image.contentType }),
                    `${file.name}-embedded-${imageTexts.length + 1}`,
                    options.consent === true,
                  ),
                );
            }
            return { src: "" };
          }),
        },
      );
      if (imageTexts.length) {
        text = imageTexts.map((value, index) => `[ŞƏKİL ${index + 1}]\n${value}`).join("\n\n");
        ocrUsed = true;
      }
    }
  } else if (ext === "rtf") {
    text = rtfToText(new TextDecoder().decode(bytes));
  } else text = cleanCvText(new TextDecoder().decode(bytes));
  if (text.trim().length < 30)
    throw new Error(
      options.ocr
        ? "Oxuna bilən mətn tapılmadı. Daha aydın CV faylı seçin."
        : "Oxuna bilən mətn tapılmadı. Skan CV üçün AI/OCR razılığını aktivləşdirin.",
    );
  return { name: file.name, text: text.slice(0, MAX_CV_TEXT_CHARS), ocrUsed };
}
