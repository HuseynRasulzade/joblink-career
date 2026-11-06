"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Notify = (message: string) => void;
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Sorğu tamamlanmadı.");
  return data;
}

// The picture is shrunk in the browser to at most 256 px and saved as JPEG, so only a small file is sent and kept.
async function shrink(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Şəkil JPEG, PNG və ya WebP olmalıdır.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Şəkil işlənmədi.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

// HR sets the photo of an employee from the card; the employee does the same from their own page (`mine`).
export default function EmployeePhoto({ employeeId, name, mine, notify }: { employeeId: string; name: string; mine?: boolean; notify: Notify }) {
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<{ image: string }>(mine ? `employee/photo?employeeId=${encodeURIComponent(employeeId)}` : `company/employees/photo?id=${encodeURIComponent(employeeId)}`)
      .then((r) => setImage(r.image || ""))
      .catch(() => setImage(""));
  }, [employeeId, mine]);
  useEffect(load, [load]);
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await shrink(file);
      await request(mine ? "employee/photo" : "company/employees/photo", mine ? { employeeId, image: dataUrl } : { id: employeeId, image: dataUrl });
      notifyRef.current("Şəkil saxlanıldı.");
      load();
    } catch (error) {
      notifyRef.current((error as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  async function remove() {
    if (!window.confirm("Şəkil silinsin?")) return;
    try {
      await request(mine ? "employee/photo/delete" : "company/employees/photo/delete", mine ? { employeeId } : { id: employeeId });
      load();
    } catch (error) {
      notifyRef.current((error as Error).message);
    }
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toLocaleUpperCase("az")).join("");
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "6px 0 12px" }}>
      {image ? (
        // The photo is a small data URL kept by the application itself.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={`${name} şəkli`} width={72} height={72} style={{ borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <div aria-hidden style={{ width: 72, height: 72, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--surface-2, #e6efed)", fontSize: 24, fontWeight: 700 }}>
          {initials || "?"}
        </div>
      )}
      <div>
        <div className="admin-actions">
          <button type="button" className="secondary" disabled={busy || image === null} onClick={() => input.current?.click()}>
            {image ? "Şəkli dəyiş" : "Şəkil yüklə"}
          </button>
          {image && (
            <button type="button" className="ghost" onClick={() => void remove()}>
              Sil
            </button>
          )}
        </div>
        <small className="skill-description">JPEG, PNG və ya WebP; avtomatik kiçildilir. {mine ? "Şəkil yalnız HR-a görünür." : "Şəkil yalnız şəxsi məlumat icazəsi olanlara görünür."}</small>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}

// A small round picture for a list row. It is fetched only when the row scrolls into view and kept for the visit,
// so a long list does not pull every picture at once.
const avatarCache = new Map<string, string>();
export function EmployeeAvatar({ employeeId, name, size = 34 }: { employeeId: string; name: string; size?: number }) {
  const [image, setImage] = useState<string | null>(avatarCache.get(employeeId) ?? null);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (image !== null) return;
    const node = box.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      request<{ image: string }>(`company/employees/photo?id=${encodeURIComponent(employeeId)}`)
        .then((r) => {
          avatarCache.set(employeeId, r.image || "");
          setImage(r.image || "");
        })
        .catch(() => setImage(""));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [employeeId, image]);
  return (
    <span ref={box} className="emp-avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {image ? <img src={image} alt="" width={size} height={size} /> : (name.trim()[0] || "?").toLocaleUpperCase("az")}
    </span>
  );
}
