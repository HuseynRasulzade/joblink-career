"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = { keySet: boolean; employees: number; sealed: number; open: number };

// The state of the sealing of personal data (FİN, card and account numbers) and the button that seals what is still open.
export default function EncryptionPanel({ notify }: { notify: (message: string) => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [hidden, setHidden] = useState(false);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    fetch("/api/joblink/company/security/encryption", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          setHidden(true);
          return;
        }
        setStatus((await r.json()) as Status);
      })
      .catch(() => setHidden(true));
  }, []);
  useEffect(load, [load]);
  async function seal() {
    try {
      const r = await fetch("/api/joblink/company/security/encrypt", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = (await r.json().catch(() => ({}))) as { error?: string; sealed?: number; skipped?: number };
      if (!r.ok) throw new Error(data.error || "Şifrələnmədi.");
      notifyRef.current(`${data.sealed} işçinin məlumatı şifrələndi${data.skipped ? `, ${data.skipped} atlandı` : ""}.`);
      load();
    } catch (error) {
      notifyRef.current((error as Error).message);
    }
  }
  if (hidden || !status) return null;
  return (
    <section className="panel">
      <h3>Şəxsi məlumatların şifrələnməsi</h3>
      <p className="muted">FİN, SSN, VÖEN, vəsiqə nömrəsi, IBAN, hesab və kart nömrələri bazada şifrələnmiş saxlana bilər. Şifrələmə açarı serverdə gizli dəyər (DATA_KEY) kimi qoyulur; açar itirilərsə şifrələnmiş məlumat bərpa olunmur, ona görə açarın ehtiyat nüsxəsini ayrıca saxlayın.</p>
      <p>
        Açar: <b>{status.keySet ? "qoyulub" : "qoyulmayıb"}</b> · şifrələnmiş profil: <b>{status.sealed}</b> / {status.employees}{status.open > 0 && status.keySet ? ` · hələ açıq: ${status.open}` : ""}
      </p>
      {status.keySet && status.open > 0 && <button type="button" className="primary" onClick={() => window.confirm("Hələ açıq saxlanılan şəxsi məlumatlar şifrələnsin?") && void seal()}>Açıq məlumatları indi şifrələ</button>}
    </section>
  );
}
