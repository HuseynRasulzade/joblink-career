// An employee photo arrives as a small data URL (the browser shrinks it first). Only real JPEG, PNG and WebP of a limited size are kept.
export const PHOTO_MAX_BYTES = 150_000;

const isBase64 = (v: string) => /^[A-Za-z0-9+/]+={0,2}$/.test(v);
function decode(b64: string, count: number): number[] {
  const chunk = b64.slice(0, Math.ceil((count * 4) / 3) + 4);
  const text = typeof atob === "function" ? atob(chunk.slice(0, chunk.length - (chunk.length % 4))) : "";
  return [...text].slice(0, count).map((c) => c.charCodeAt(0));
}

export function parsePhotoDataUrl(input: unknown): { ok: true; mime: string; base64: string; bytes: number } | { ok: false; error: string } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/.exec(String(input ?? ""));
  if (!match) return { ok: false, error: "Şəkil JPEG, PNG və ya WebP olmalıdır." };
  const [, mime, base64] = match;
  if (!isBase64(base64)) return { ok: false, error: "Şəkil faylı oxunmadı." };
  const bytes = Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if (bytes > PHOTO_MAX_BYTES) return { ok: false, error: `Şəkil çox böyükdür (${Math.round(bytes / 1000)} KB; ən çox ${Math.round(PHOTO_MAX_BYTES / 1000)} KB).` };
  const head = decode(base64, 12);
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const png = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const webp = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
  const real = mime === "image/jpeg" ? jpeg : mime === "image/png" ? png : webp;
  if (!real) return { ok: false, error: "Faylın məzmunu şəkil formatına uyğun gəlmir." };
  return { ok: true, mime, base64, bytes };
}
