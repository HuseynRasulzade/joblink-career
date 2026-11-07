"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Notify = (message: string) => void;
type Key = { id: string; name: string; system: string; prefix: string; created: string; lastUsed: string; revoked: string };
type LogRow = { at: string; direction: string; actor: string; action: string; ref: string; ok: boolean; message: string };
type Data = { keys: Key[]; ordersEnabled: boolean; webhookUrl: string; hasWebhookSecret: boolean; log: LogRow[]; canManage: boolean };

const SYSTEM: Record<string, string> = { "1c": "1C", sap: "SAP", other: "Digər ERP / mühasibat" };
const dt = (iso: string) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)} ${iso.slice(11, 16)}` : "—");

async function call<T = { ok: boolean }>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Əməliyyat alınmadı.");
  return data;
}

// Exchange with outside programs (1C, SAP, any ERP): the platform gives its orders and budget and takes back the payments and the costs born there.
export default function PlanFactIntegrations({ notify }: { notify: Notify }) {
  const [data, setData] = useState<Data | null>(null);
  const [name, setName] = useState("");
  const [system, setSystem] = useState("1c");
  const [fresh, setFresh] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    call<Data>("company/integrations").then(setData).catch((e) => notifyRef.current((e as Error).message));
  }, []);
  useEffect(load, [load]);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const base = `${typeof window === "undefined" ? "" : window.location.origin}/api/integration/v1`;

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      notify(done);
      load();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const locked = !data.canManage;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="panel">
        <b>Xarici proqramlarla mübadilə (1C, SAP, digər ERP)</b>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Platforma xərcləri xarici proqrama <b>sifariş</b> kimi verir, proqram ödənişi bildirəndən sonra xərc <b>ödənilib</b> sayılır və real xərcə keçir. Proqram həm də öz xərclərini platformaya yaza və büdcəni oxuya bilər. Mübadilə şirkətin öz açarı ilə, təhlükəsiz HTTPS sorğuları ilə gedir. {locked && "Ayarları yalnız direktor dəyişə bilər."}
        </p>
      </div>

      <div className="panel" style={{ display: "grid", gap: 10 }}>
        <b>Ayarlar</b>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={data.ordersEnabled} disabled={locked || busy} onChange={(e) => void run(() => call("company/integrations/settings", { ordersEnabled: e.target.checked }), e.target.checked ? "Təsdiqlənən xərc artıq avtomatik sifariş olacaq." : "Avtomatik sifariş söndürüldü.")} />
          Təsdiqlənən xərc avtomatik sifariş kimi xarici proqrama düşsün
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 2 }}>Bildiriş ünvanı (istəyə görə, https://…)
            <input value={url ?? data.webhookUrl} disabled={locked} onChange={(e) => setUrl(e.target.value)} placeholder="https://erp.sirket.az/joblink-hook" />
          </label>
          <label style={{ display: "grid", gap: 2 }}>İmza şifrəsi {data.hasWebhookSecret ? "(yazılıb; yenisini yazsanız dəyişir)" : "(istəyə görə)"}
            <input type="password" value={secret} disabled={locked} onChange={(e) => setSecret(e.target.value)} autoComplete="new-password" />
          </label>
        </div>
        <div className="admin-actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="primary" disabled={locked || busy || (url === null && !secret)} onClick={() => void run(async () => { await call("company/integrations/settings", { ...(url !== null ? { webhookUrl: url } : {}), ...(secret ? { webhookSecret: secret } : {}) }); setUrl(null); setSecret(""); }, "Ayarlar saxlanıldı.")}>Saxla</button>
          <button type="button" className="secondary" disabled={busy || !data.webhookUrl} onClick={() => void run(() => call("company/integrations/test", {}), "Sınaq bildirişi göndərildi; nəticə jurnalda görünür.")}>Sınaq bildirişi göndər</button>
        </div>
        <small className="muted">Ünvan yazılıbsa, hər sifariş dəyişəndə (yaradıldı, ödənildi, geri çəkildi, ləğv edildi) ora JSON göndərilir; imza şifrəsi varsa <code>x-joblink-signature: sha256=…</code> başlığı ilə (HMAC-SHA256). Ünvan yazılmasa da proqram sifarişləri açarla özü oxuya bilər.</small>
      </div>

      <div className="panel" style={{ display: "grid", gap: 10 }}>
        <b>Açarlar</b>
        {fresh && (
          <div className="panel" style={{ background: "#fff8e1" }}>
            <b>Yeni açar (bir dəfə göstərilir, kopyalayın):</b>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "6px 0" }}>
              <code style={{ wordBreak: "break-all" }}>{fresh}</code>
              <button type="button" className="secondary" onClick={() => { void navigator.clipboard?.writeText(fresh); notify("Açar kopyalandı."); }}>Kopyala</button>
              <button type="button" className="secondary" onClick={() => setFresh("")}>Bağla</button>
            </div>
            <small className="muted">Platforma açarı saxlamır, yalnız onun izini. İtirsəniz, yenisini yaradın və köhnəni ləğv edin.</small>
          </div>
        )}
        <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead><tr><th>Ad</th><th>Sistem</th><th>İz</th><th>Yaradılıb</th><th>Son istifadə</th><th /></tr></thead>
            <tbody>
              {data.keys.map((k) => (
                <tr key={k.id} className={k.revoked ? "muted" : undefined}>
                  <td>{k.name}</td>
                  <td>{SYSTEM[k.system] || k.system}</td>
                  <td><code>{k.prefix}…</code></td>
                  <td>{dt(k.created)}</td>
                  <td>{dt(k.lastUsed)}</td>
                  <td>{k.revoked ? <small>ləğv edilib {dt(k.revoked)}</small> : <button type="button" className="secondary" disabled={locked || busy} onClick={() => { if (window.confirm(`“${k.name}” açarı ləğv edilsin? Bu açarla işləyən proqram dayanacaq.`)) void run(() => call("company/integrations/key-revoke", { id: k.id }), "Açar ləğv edildi."); }}>Ləğv et</button>}</td>
                </tr>
              ))}
              {!data.keys.length && <tr><td colSpan={6}><p className="admin-empty">Hələ açar yoxdur.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="admin-actions" style={{ justifyContent: "flex-start", alignItems: "center" }}>
          <input value={name} disabled={locked} onChange={(e) => setName(e.target.value)} placeholder="Açarın adı, məs. 1C mühasibat" style={{ width: 240 }} aria-label="Açarın adı" />
          <select value={system} disabled={locked} onChange={(e) => setSystem(e.target.value)} aria-label="Sistem">{Object.entries(SYSTEM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button type="button" className="primary" disabled={locked || busy || !name.trim()} onClick={() => void run(async () => { const r = await call<{ key: string }>("company/integrations/key-create", { name, system }); setFresh(r.key); setName(""); }, "Açar yaradıldı.")}>Yeni açar yarat</button>
        </div>
      </div>

      <div className="panel">
        <b>Proqramçı üçün qısa təlimat</b>
        <p className="muted" style={{ margin: "4px 0" }}>Hər sorğuda <code>Authorization: Bearer jl_…</code> başlığı olur. Əsas ünvan: <code>{base}</code></p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f4f7f6", padding: 10, borderRadius: 8, margin: 0 }}>{`GET  /orders?status=ordered            ödənilməyi gözləyən sifarişlər
GET  /orders/JL-2026-000001            bir sifariş
POST /orders/JL-2026-000001/paid       {"paidOn":"2026-11-22","amount":400,"method":"bank","ref":"ÖT-15"}
POST /orders/JL-2026-000001/reject     {"reason":"büdcə kodu yoxdur"}
POST /expenses                         {"externalId":"1C-77","category":"gifts","title":"…","amount":120,"date":"2026-11-20","paidOn":"2026-11-21"}
GET  /budget?year=2026                 büdcə sətirləri və HR xərcləri (ordered / paid)`}</pre>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          1C: «HTTP-bağlantı» ilə bu ünvanlara sorğu göndərib JSON oxuyun. SAP: Integration Suite (CPI) və ya ABAP-da HTTP klient (SM59 təyinatı) ilə eyni sorğular. Bu ünvanlar hazırdır; proqramın öz tərəfində bu sorğuları göndərən qoşucunu həmin sistemin proqramçısı yazmalıdır.
        </p>
      </div>

      <div className="panel">
        <b>Mübadilə jurnalı (son 40)</b>
        <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead><tr><th>Vaxt</th><th>İstiqamət</th><th>Kim</th><th>Əməliyyat</th><th>Sifariş</th><th>Nəticə</th></tr></thead>
            <tbody>
              {data.log.map((l, i) => (
                <tr key={i}>
                  <td>{dt(l.at)}</td>
                  <td>{l.direction === "in" ? "içəri (proqramdan)" : "çölə (bildiriş)"}</td>
                  <td>{l.actor}</td>
                  <td>{l.action}</td>
                  <td>{l.ref || "—"}</td>
                  <td style={{ color: l.ok ? undefined : "#b42318" }}>{l.ok ? "uğurlu" : "xəta"}{l.message ? <small className="muted"> {l.message}</small> : null}</td>
                </tr>
              ))}
              {!data.log.length && <tr><td colSpan={6}><p className="admin-empty">Hələ mübadilə olmayıb.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
