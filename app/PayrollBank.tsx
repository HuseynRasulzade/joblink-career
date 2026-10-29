"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Field, Modal } from "./components";

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

type Account = { id: string; label: string; bankName: string; bankCode: string; swift: string; iban: string; accountNumber: string; voen: string; holder: string; currency: string; auto: string; isDefault: boolean };
type Item = { employeeId: string; name: string; iban: string; card: string; method: "bank" | "card"; amountCents: number };
type Batch = {
  id: string; month: string; kind: "advance" | "salary"; accountId: string; status: string; statusText: string; source: string; total: number; count: number; note: string;
  createdBy: string; approvedBy: string; firstApprovedBy: string; approvedAt: string; sentAt: string; paidAt: string; created: string; items: Item[]; skipped: { name: string; reason: string }[];
};
type Data = { month: string; accounts: Account[]; batches: Batch[]; canManage: boolean };
const EMPTY: Account = { id: "", label: "", bankName: "", bankCode: "", swift: "", iban: "", accountNumber: "", voen: "", holder: "", currency: "AZN", auto: "off", isDefault: false };
const azn = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—");

export default function PayrollBank({ month, notify, onClose, onChanged }: { month: string; notify: Notify; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState<Account | null>(null);
  const [open, setOpen] = useState("");
  const [accountId, setAccountId] = useState("");
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<Data>(`company/payroll/bank?month=${month}`)
      .then((d) => {
        setData(d);
        setAccountId((current) => current || d.accounts.find((a) => a.isDefault)?.id || d.accounts[0]?.id || "");
      })
      .catch((error) => notifyRef.current((error as Error).message));
  }, [month]);
  useEffect(load, [load]);
  async function act(path: string, body: Record<string, unknown>, done: string) {
    try {
      await request(path, { month, ...body });
      notify(done);
      load();
      onChanged();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <Modal title="Bank və ödəniş sənədləri" onClose={onClose}><p className="muted">Yüklənir…</p></Modal>;
  const set = (key: keyof Account, value: string | boolean) => setForm(form ? { ...form, [key]: value } : form);
  const input = (key: keyof Account, label: string, props: Record<string, unknown> = {}) => (
    <Field label={label}>
      <input value={String(form?.[key] ?? "")} onChange={(e) => set(key, e.target.value)} {...props} />
    </Field>
  );
  return (
    <Modal title="Bank və ödəniş sənədləri" onClose={onClose}>
      <div className="offer-composer payroll-bank">
        <h4>Şirkətin bank hesabları</h4>
        {!data.accounts.length && <p className="muted">Hələ bank hesabı yoxdur. Əmək haqqı bu hesabdan köçürüləcək.</p>}
        {data.accounts.map((a) => (
          <div key={a.id} className="bank-account">
            <div>
              <b>{a.label || a.bankName}</b> {a.isDefault && <span className="week-badge">əsas</span>} {a.auto === "prepare" && <span className="week-badge">avtomatik hazırlanır</span>}
              <small className="skill-description">{a.bankName}{a.bankCode ? ` (${a.bankCode})` : ""} · {a.iban}{a.voen ? ` · VÖEN ${a.voen}` : ""}</small>
            </div>
            {data.canManage && (
              <div className="admin-actions">
                <button type="button" onClick={() => setForm(a)}>Dəyiş</button>
                <button type="button" className="danger" onClick={() => window.confirm("Bu bank hesabı silinsin?") && void act("company/payroll/bank/account/delete", { id: a.id }, "Hesab silindi.")}>Sil</button>
              </div>
            )}
          </div>
        ))}
        {data.canManage && !form && <button type="button" className="secondary" onClick={() => setForm({ ...EMPTY })}>+ Bank hesabı əlavə et</button>}
        {!data.canManage && <small className="muted">Bank hesabını yalnız direktor və ya hesab sahibi dəyişə bilər.</small>}
        {form && (
          <div className="offer-composer">
            <div className="form-grid">
              {input("label", "Ad (məsələn Əsas hesab)")}
              {input("bankName", "Bank")}
              {input("bankCode", "Bank kodu", { inputMode: "numeric" })}
              {input("swift", "SWIFT/BIC")}
              {input("iban", "Şirkətin IBAN-ı", { placeholder: "AZ00 XXXX ..." })}
              {input("accountNumber", "Cari hesab nömrəsi", { inputMode: "numeric" })}
              {input("voen", "VÖEN", { inputMode: "numeric", maxLength: 10 })}
              {input("holder", "Hesab sahibi (hüquqi ad)")}
            </div>
            <label className="check"><input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} /> Əsas hesab</label>
            <label className="check"><input type="checkbox" checked={form.auto === "prepare"} onChange={(e) => set("auto", e.target.checked ? "prepare" : "off")} /> Avans və ödəniş günü ödəniş sənədini avtomatik hazırla (direktor təsdiqləyənə qədər pul köçürülmür)</label>
            <div className="admin-actions">
              <button type="button" className="primary" onClick={async () => { await act("company/payroll/bank/account", { ...form }, "Hesab saxlanıldı."); setForm(null); }}>Saxla</button>
              <button type="button" onClick={() => setForm(null)}>Ləğv et</button>
            </div>
          </div>
        )}
        <h4>Ödəniş sənədləri — {month}</h4>
        <p className="muted">
          Sənəd hazırlanır → direktor təsdiqləyir → bank faylı yüklənir və internet-bankinqə verilir → bank ödəyəndən sonra “Ödənildi” basılır və hər işçiyə ödəniş avtomatik qeyd olunur.
          Proqram birbaşa bankdan pul köçürmür: bunun üçün bankla korporativ API müqaviləsi lazımdır.
        </p>
        {data.accounts.length > 0 && (
          <div className="admin-actions">
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Göndərən hesab">
              {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.label || a.bankName} · {a.iban.slice(-6)}</option>)}
            </select>
            <button type="button" className="secondary" onClick={() => void act("company/payroll/bank/batch", { kind: "advance", accountId }, "Avans sənədi hazırlandı.")}>Avans sənədi hazırla</button>
            <button type="button" className="primary" onClick={() => void act("company/payroll/bank/batch", { kind: "salary", accountId }, "Əmək haqqı sənədi hazırlandı.")}>Əmək haqqı sənədi hazırla</button>
          </div>
        )}
        {!data.batches.length && <p className="muted">Bu ay üçün ödəniş sənədi yoxdur.</p>}
        {data.batches.map((b) => (
          <div key={b.id} className={`bank-batch bank-${b.status}`}>
            <div className="bank-batch-head">
              <div>
                <b>{b.kind === "advance" ? "Avans" : "Əmək haqqı"}: {azn(b.total)}</b> · {b.count} işçi
                {b.source === "auto" && <span className="week-badge">avtomatik</span>}
                <small className="skill-description">{b.statusText}{b.status === "draft" && b.firstApprovedBy ? ` · 1-ci təsdiq: ${b.firstApprovedBy}, ikinci təsdiq gözlənilir` : ""}{b.approvedBy ? ` · təsdiq: ${b.approvedBy}` : ""}{b.paidAt ? ` · ${dmy(b.paidAt.slice(0, 10))}` : ""}</small>
              </div>
              <div className="admin-actions">
                <button type="button" onClick={() => setOpen(open === b.id ? "" : b.id)}>{open === b.id ? "Gizlət" : "Siyahı"}</button>
                {b.status === "draft" && data.canManage && <button type="button" className="primary" onClick={() => void act("company/payroll/bank/batch/approve", { id: b.id }, b.firstApprovedBy ? "Sənəd təsdiqləndi." : "Təsdiq qeyd edildi (ikinci təsdiq lazımdırsa başqa şəxs verməlidir).")}>{b.firstApprovedBy ? "İkinci təsdiq (direktor)" : "Təsdiqlə (direktor)"}</button>}
                {(b.status === "approved" || b.status === "sent") && (
                  <a className="secondary report-button" href={`/api/joblink/company/payroll/bank/batch/file?id=${b.id}`} download><Download size={14} /> Bank faylı</a>
                )}
                {b.status === "approved" && <button type="button" onClick={() => void act("company/payroll/bank/batch/sent", { id: b.id }, "Banka göndərildi kimi qeyd edildi.")}>Banka verdim</button>}
                {(b.status === "approved" || b.status === "sent") && <button type="button" className="primary" onClick={() => window.confirm(`${azn(b.total)} bank tərəfindən ödənilib? Hər işçiyə ödəniş qeyd olunacaq.`) && void act("company/payroll/bank/batch/paid", { id: b.id }, "Ödəniş qeyd edildi.")}>Ödənildi</button>}
                {(b.status === "draft" || b.status === "approved" || b.status === "sent") && <button type="button" className="danger" onClick={() => window.confirm("Sənəd ləğv edilsin?") && void act("company/payroll/bank/batch/cancel", { id: b.id }, "Sənəd ləğv edildi.")}>Ləğv et</button>}
              </div>
            </div>
            {b.skipped.length > 0 && <small className="danger-text">Sənədə düşməyənlər: {b.skipped.map((s) => `${s.name} (${s.reason})`).join(", ")}. İşçi kartında hesab və ya kart rekvizitlərini doldurun.</small>}
            {open === b.id && (
              <table className="admin-table">
                <tbody>
                  {b.items.map((it) => (
                    <tr key={it.employeeId}><td>{it.name}</td><td>{it.method === "card" ? it.card : it.iban}</td><td>{azn(it.amountCents / 100)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
