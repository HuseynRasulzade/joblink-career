"use client";
import { useCallback, useEffect, useState } from "react";
import { CreditCard, FileText, Trash2 } from "lucide-react";
import { Field, Modal } from "./components";
import { formatDate } from "@/lib/dates";
import { siteLanguage } from "./i18n";
import type { Plan } from "@/lib/plans";

type Method = { id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean };
type Usage = { used: number; limit: number };
type PlanMe = {
  enforced: boolean;
  provider: string;
  plans: Plan[];
  plan: string;
  subscription: { planId: string; status: string; periodEnd: string; autoRenew: boolean; methodId: string } | null;
  usage: { cvAnalyses: Usage; cvFixes: Usage; aiApply: Usage };
  methods: Method[];
  payments: { plan_id: string; amount_cents: number; status: string; method_label: string; period_start: string; period_end: string; error: string; created: string }[];
  contracts: { id: string; number: string; title: string; created: string }[];
};
const day = (value: string) => (value ? formatDate(value, siteLanguage()) : "—");
const azn = (value: number) => `${value.toLocaleString("az-AZ", { maximumFractionDigits: 2 })} AZN`;

async function call<T>(path: string, body?: unknown): Promise<T> {
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

export default function PackagesPage({ notify }: { notify: (message: string) => void }) {
  const [data, setData] = useState<PlanMe | null>(null);
  const [choosing, setChoosing] = useState<Plan | null>(null);
  const [methodId, setMethodId] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState({ number: "", expMonth: "", expYear: "", holder: "" });
  const [adding, setAdding] = useState(false);
  const [contract, setContract] = useState<{ number: string; title: string; body: string } | null>(null);

  const load = useCallback(() => {
    call<PlanMe>("plan/me").then(setData).catch((error) => notify((error as Error).message));
  }, [notify]);
  useEffect(load, [load]);

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

  if (!data) return <p className="muted">Yüklənir…</p>;
  const current = data.plans.find((p) => p.id === data.plan) || data.plans[0];
  const sub = data.subscription;
  const defaultMethod = data.methods.find((m) => m.isDefault) || data.methods[0];

  return (
    <div className="company-page packages-page">
      <p className="plan-banner">
        {data.enforced
          ? "Paket limitləri aktivdir."
          : "Paket limitləri hələ aktiv deyil: hazırda bütün funksiyalardan limitsiz istifadə edə bilərsiniz. Aktivləşəndə aşağıdakı paketlər tətbiq olunacaq."}{" "}
        {data.provider === "mock" && "Ödəniş test rejimindədir, real vəsait tutulmur və real kart nömrəsi yazmamalısınız."}
      </p>

      <section className="panel">
        <h3>Cari paket: {current.name}</h3>
        {sub ? (
          <>
            <p>
              {sub.status === "cancelled" ? "Ləğv edilib, " : ""}
              {day(sub.periodEnd)} tarixinədək qüvvədədir.{" "}
              {sub.autoRenew ? "Avtomatik ödəniş açıqdır." : "Avtomatik ödəniş söndürülüb, müddət bitəndə paket paketsiz rejimə keçəcək."}
            </p>
            <div className="admin-actions">
              {sub.status === "active" && (
                <button className="secondary" disabled={busy || (!sub.autoRenew && !defaultMethod)} onClick={() => run(() => call("plan/auto-renew", { on: !sub.autoRenew }), sub.autoRenew ? "Avtomatik ödəniş söndürüldü." : "Avtomatik ödəniş açıldı.")}>
                  {sub.autoRenew ? "Avtomatik ödənişi söndür" : "Avtomatik ödənişi aç"}
                </button>
              )}
              {sub.status === "active" && (
                <button className="secondary" disabled={busy} onClick={() => window.confirm("Paketi ləğv edirsiniz? Cari müddət bitənədək istifadə davam edəcək.") && run(() => call("plan/cancel", {}), "Paket ləğv edildi.")}>
                  Paketi ləğv et
                </button>
              )}
            </div>
          </>
        ) : (
          <p>Paketsiz rejimdəsiniz: profil yaradır və hər şeyi özünüz edirsiniz.</p>
        )}
        <div className="usage-grid">
          {([
            ["AI ilə müraciət", data.usage.aiApply],
            ["AI CV analizi", data.usage.cvAnalyses],
            ["ATS ilə CV düzəlişi", data.usage.cvFixes],
          ] as [string, Usage][]).map(([label, u]) => (
            <div key={label} className="usage">
              <small>{label} (bu gün)</small>
              <strong>{u.used}/{u.limit}</strong>
              <div className="usage-bar"><i style={{ width: `${u.limit ? Math.min(100, (u.used / u.limit) * 100) : 0}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="plan-grid">
        {data.plans.map((p) => {
          const active = p.id === data.plan;
          return (
            <article key={p.id} className={`panel plan-card${active ? " active" : ""}`}>
              <h3>{p.name}</h3>
              <strong className="plan-price">{p.priceAzn ? `${p.priceAzn} AZN` : "0 AZN"}<small>{p.priceAzn ? " / 30 gün" : ""}</small></strong>
              <p className="muted">{p.summary}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              {active ? (
                <span className="plan-current">Aktiv paket</span>
              ) : p.priceAzn === 0 ? (
                sub ? <button className="secondary" disabled={busy} onClick={() => run(() => call("plan/subscribe", { planId: p.id }), "Cari müddət bitəndən sonra paketsiz rejimə keçəcəksiniz.")}>Paketsiz rejimə keç</button> : null
              ) : (
                <button className="primary" disabled={busy} onClick={() => { setChoosing(p); setMethodId(defaultMethod?.id || ""); setAutoRenew(true); }}>Seç</button>
              )}
            </article>
          );
        })}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h3>Ödəniş vasitələri</h3>
          <button className="secondary" onClick={() => setAdding(true)}><CreditCard size={14} /> Kart əlavə et</button>
        </div>
        {data.methods.length ? (
          <ul className="method-list">
            {data.methods.map((m) => (
              <li key={m.id}>
                <span><b>{m.brand} •••• {m.last4}</b> <small className="skill-description">{String(m.expMonth).padStart(2, "0")}/{m.expYear}{m.isDefault ? " · əsas" : ""}</small></span>
                <span className="admin-actions">
                  {!m.isDefault && <button disabled={busy} onClick={() => run(() => call("plan/methods/default", { id: m.id }), "Əsas kart dəyişdirildi.")}>Əsas et</button>}
                  <button aria-label="Kartı sil" disabled={busy} onClick={() => window.confirm("Kart silinsin?") && run(() => call("plan/methods/remove", { id: m.id }), "Kart silindi.")}><Trash2 size={14} /></button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Hələ kart yoxdur. Yalnız kartın növü, son dörd rəqəmi və bitmə tarixi saxlanılır.</p>
        )}
      </section>

      <section className="panel">
        <h3>Ödənişlər</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Tarix</th><th>Paket</th><th>Məbləğ</th><th>Kart</th><th>Müddət</th><th>Status</th></tr></thead>
            <tbody>
              {data.payments.map((p, i) => (
                <tr key={i}>
                  <td>{day(p.created)}</td>
                  <td>{data.plans.find((x) => x.id === p.plan_id)?.name || p.plan_id}</td>
                  <td>{azn(p.amount_cents / 100)}</td>
                  <td>{p.method_label || "—"}</td>
                  <td>{day(p.period_start)} – {day(p.period_end)}</td>
                  <td>{p.status === "paid" ? "Ödənilib" : `Uğursuz${p.error ? `: ${p.error}` : ""}`}</td>
                </tr>
              ))}
              {!data.payments.length && <tr><td colSpan={6}><p className="admin-empty">Hələ ödəniş yoxdur.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {!!data.contracts.length && (
        <section className="panel">
          <h3>Müqavilələr</h3>
          <ul className="method-list">
            {data.contracts.map((c) => (
              <li key={c.id}>
                <span><FileText size={14} /> <b>№ {c.number}</b> <small className="skill-description">{c.title} · {day(c.created)}</small></span>
                <button onClick={() => call<{ contract: { number: string; title: string; body: string } }>(`plan/contract?id=${c.id}`).then((r) => setContract(r.contract)).catch((error) => notify((error as Error).message))}>Bax</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {choosing && (
        <Modal title={`${choosing.name} paketini aktivləşdir`} onClose={() => setChoosing(null)}>
          <div className="offer-composer">
            <p>Qiymət: <b>{choosing.priceAzn} AZN</b> / 30 gün. Paket ödənişdən dərhal sonra aktiv olur; qüvvədə olan başqa paket varsa, onun qalan günləri geri qaytarılmır.</p>
            {data.methods.length ? (
              <Field label="Ödəniş kartı">
                <select value={methodId} onChange={(e) => setMethodId(e.target.value)}>
                  {data.methods.map((m) => <option key={m.id} value={m.id}>{m.brand} •••• {m.last4}</option>)}
                </select>
              </Field>
            ) : (
              <p className="muted">Əvvəlcə “Kart əlavə et” düyməsi ilə kart əlavə edin.</p>
            )}
            <label className="checkline">
              <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />{" "}
              Avtomatik ödəniş: hər 30 gündə bu kartdan eyni məbləğ tutulsun
            </label>
            <p className="muted fine-print">Təsdiq etməklə avtomatik hazırlanmış xidmət müqaviləsinin şərtlərinə razılıq verirsiniz. Müqavilə ödənişdən sonra “Müqavilələr” bölməsində görünür.</p>
            <button className="primary" disabled={busy || !methodId} onClick={() => run(async () => { await call("plan/subscribe", { planId: choosing.id, methodId, autoRenew }); setChoosing(null); }, "Paket aktivləşdirildi.")}>
              {busy ? "Ödəniş edilir…" : `${choosing.priceAzn} AZN ödə və aktivləşdir`}
            </button>
          </div>
        </Modal>
      )}

      {adding && (
        <Modal title="Kart əlavə et" onClose={() => setAdding(false)}>
          <div className="offer-composer">
            {data.provider === "mock" && <p className="muted">Test rejimi: real kart nömrəsi yazmayın. Test kartı: 4242 4242 4242 4242 (istənilən gələcək tarix). 0002 ilə bitən kart rədd edilir.</p>}
            <div className="form-grid">
              <Field label="Kart nömrəsi"><input inputMode="numeric" autoComplete="off" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} /></Field>
              <Field label="Kart sahibi"><input value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} /></Field>
              <Field label="Bitmə ayı (AA)"><input inputMode="numeric" maxLength={2} value={card.expMonth} onChange={(e) => setCard({ ...card, expMonth: e.target.value })} /></Field>
              <Field label="Bitmə ili (İİ)"><input inputMode="numeric" maxLength={4} value={card.expYear} onChange={(e) => setCard({ ...card, expYear: e.target.value })} /></Field>
            </div>
            <button className="primary" disabled={busy} onClick={() => run(async () => { await call("plan/methods/add", { number: card.number, holder: card.holder, expMonth: Number(card.expMonth), expYear: Number(card.expYear) }); setCard({ number: "", expMonth: "", expYear: "", holder: "" }); setAdding(false); }, "Kart əlavə edildi.")}>Yadda saxla</button>
          </div>
        </Modal>
      )}

      {contract && (
        <Modal title={`Müqavilə № ${contract.number}`} onClose={() => setContract(null)}>
          <div className="contract-view">
            <p className="muted fine-print">Bu sənəd avtomatik hazırlanıb və hüquqşünas tərəfindən yoxlanılmalıdır.</p>
            <pre>{contract.body}</pre>
            <button className="secondary" onClick={() => window.print()}>Çap et</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
