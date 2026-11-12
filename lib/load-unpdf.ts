// The PDF reader is a large separate file that the browser fetches when a PDF is chosen. A weak connection (or a page that stayed open
// while the site was updated) can make that fetch fail once, so it is tried again before the person is told what to do.
export async function loadUnpdf() {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await import("unpdf");
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  const detail = last instanceof Error ? last.message : "";
  throw new Error(`PDF oxuyucu yüklənmədi${/dynamically imported|PDF\.js/i.test(detail) ? " (şəbəkə kəsildi və ya sayt yenilənib)" : ""}. Səhifəni tam yeniləyin (Ctrl+F5) və faylı yenidən seçin; olmasa DOCX və ya TXT formatında yükləyin.`);
}
