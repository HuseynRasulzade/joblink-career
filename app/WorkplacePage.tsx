"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { ORDER_KINDS, UNPAID_REASONS } from "@/lib/orders";
import { OTHER_REQUEST, requestProblems, requestWarnings, type RequestData } from "@/lib/requests";
import { Field } from "./components";
import { monthLabel, payslipHtml, type SlipData } from "@/lib/payslip-html";

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

type Workplace = {
  id: string;
  company: string;
  name: string;
  position: string;
  department: string;
  section: string;
  startDate: string;
  tenure: string;
  vacation: { entitlement: number; accrued: number; used: number; remaining: number };
};
type Application = {
  id: string;
  kind: string;
  label: string;
  data: RequestData;
  status: "new" | "ordered" | "rejected" | "answered" | "withdrawn";
  statusText: string;
  reply: string;
  source: "employee" | "hr";
  orderNumber: string;
  orderStatus: string;
  created: string;
};
type Kind = { id: string; label: string; hint: string };

const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");

// The employee's own page: the workplace, and the correspondence with the company (applications and the answers).
export default function WorkplacePage({ notify }: { notify: Notify }) {
  const [places, setPlaces] = useState<Workplace[] | null>(null);
  const [current, setCurrent] = useState("");
  const [tab, setTab] = useState<"info" | "letters" | "pay">("letters");
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<{ workplaces: Workplace[] }>("employee/workplaces")
      .then((r) => {
        setPlaces(r.workplaces);
        setCurrent((id) => (r.workplaces.some((w) => w.id === id) ? id : r.workplaces[0]?.id || ""));
      })
      .catch((error) => notifyRef.current((error as Error).message));
  }, []);
  useEffect(load, [load]);
  if (!places) return <p className="muted">Yüklənir…</p>;
  const place = places.find((w) => w.id === current);
  return (
    <div className="company-page workplace-page">
      <section className="panel">
        <h3>İş yerim</h3>
        {!place ? (
          <p className="muted">
            Hələ heç bir iş yeri profilinizə qoşulmayıb. Joblink vasitəsilə işə qəbul olunmusunuzsa, iş yeri avtomatik qoşulur. Başqa halda şirkətin HR-ı sizə qoşulma kodu verir — onu aşağıda daxil edin.
          </p>
        ) : (
          <>
            {places.length > 1 && (
              <Field label="İş yeri">
                <select value={current} onChange={(e) => setCurrent(e.target.value)}>
                  {places.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.company} — {w.position || "vəzifə"}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="calc-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "letters"} className={tab === "letters" ? "primary" : "ghost"} onClick={() => setTab("letters")}>
                Müəssisə ilə yazışmalar
              </button>
              <button type="button" role="tab" aria-selected={tab === "pay"} className={tab === "pay" ? "primary" : "ghost"} onClick={() => setTab("pay")}>
                Əmək haqqı
              </button>
              <button type="button" role="tab" aria-selected={tab === "info"} className={tab === "info" ? "primary" : "ghost"} onClick={() => setTab("info")}>
                Məlumatlarım
              </button>
            </div>
            {tab === "info" && (
              <dl className="workplace-info">
                <div><dt>Şirkət</dt><dd>{place.company}</dd></div>
                <div><dt>Vəzifə</dt><dd>{place.position || "—"}</dd></div>
                <div><dt>Departament / şöbə</dt><dd>{[place.department, place.section].filter(Boolean).join(" / ") || "—"}</dd></div>
                <div><dt>İşə başlama</dt><dd>{dmy(place.startDate) || "—"}</dd></div>
                <div><dt>İş stajı</dt><dd>{place.tenure || "—"}</dd></div>
                <div><dt>Məzuniyyət</dt><dd>{place.vacation.remaining} gün qalıb (qazanılıb {place.vacation.accrued}, istifadə {place.vacation.used})</dd></div>
              </dl>
            )}
            {tab === "pay" && <Payslips key={place.id} employeeId={place.id} notify={notify} />}
            {tab === "letters" && <Letters key={place.id} employeeId={place.id} company={place.company} notify={notify} />}
          </>
        )}
      </section>
      <LinkCode notify={notify} onLinked={load} />
    </div>
  );
}

type SlipMonth = { month: string; gross: number; net: number; toPay: number; advances: number; paid: number; outstanding: number; benefit: number };
const azn = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;

// The employee's pay slips: the months the company has approved, what was paid and what is still owed.
function Payslips({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [months, setMonths] = useState<SlipMonth[] | null>(null);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  useEffect(() => {
    request<{ months: SlipMonth[] }>(`employee/payslips?employeeId=${employeeId}`)
      .then((r) => setMonths(r.months))
      .catch((error) => notifyRef.current((error as Error).message));
  }, [employeeId]);
  async function print(month: string) {
    try {
      const data = await request<SlipData>(`employee/payslip?employeeId=${employeeId}&month=${month}`);
      const win = window.open("", "_blank");
      if (!win) return notify("Çap pəncərəsi bloklanıb.");
      win.document.write(payslipHtml(data));
      win.document.close();
      win.focus();
      win.print();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!months) return <p className="muted">Yüklənir…</p>;
  if (!months.length) return <p className="muted">Hələ təsdiqlənmiş ay yoxdur. Şirkət əmək haqqı cədvəlini təsdiqlədikdən sonra haqq-hesab vərəqəniz burada görünəcək.</p>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr><th>Ay</th><th>Hesablanıb (gross)</th><th>Vergi və sığortadan sonra</th><th>Avans</th><th>Ödənilib</th><th>Qalıq</th><th></th></tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <td><b>{monthLabel(m.month)}</b></td>
              <td>{azn(m.gross)}</td>
              <td>{azn(m.net)}{m.benefit > 0 && <small className="skill-description">müavinət {azn(m.benefit)} (ayrıca)</small>}</td>
              <td>{m.advances ? azn(m.advances) : "—"}</td>
              <td>{azn(m.paid)}</td>
              <td>{m.outstanding > 0 ? <b>{azn(m.outstanding)}</b> : "ödənilib"}</td>
              <td><button type="button" onClick={() => void print(m.month)}>Vərəqə / çap</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LinkCode({ notify, onLinked }: { notify: Notify; onLinked: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  async function link() {
    setBusy(true);
    try {
      await request("employee/link", { code });
      notify("İş yeri profilinizə qoşuldu.");
      setCode("");
      onLinked();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h3>İş yerini qoş</h3>
      <p className="muted">Şirkətin HR-ının verdiyi qoşulma kodunu yazın (məsələn: K7M2P-9XQ4W). Kod bir dəfə işləyir və bir həftə qüvvədədir.</p>
      <div className="org-add">
        <input className="search-input" value={code} placeholder="XXXXX-XXXXX" maxLength={14} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && code.trim() && void link()} />
        <button type="button" className="primary" disabled={busy || code.replace(/[^A-Z0-9]/gi, "").length < 10} onClick={() => void link()}>
          Qoş
        </button>
      </div>
    </section>
  );
}

function Letters({ employeeId, company, notify }: { employeeId: string; company: string; notify: Notify }) {
  const [list, setList] = useState<Application[] | null>(null);
  const [kinds, setKinds] = useState<Kind[]>([]);
  const [kind, setKind] = useState("vacation");
  const [data, setData] = useState<RequestData>({ from: "", to: "", quantity: 0, reason: "", basis: "" });
  const [busy, setBusy] = useState(false);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<{ applications: Application[]; kinds: Kind[] }>(`employee/applications?employeeId=${encodeURIComponent(employeeId)}`)
      .then((r) => {
        setList(r.applications);
        setKinds(r.kinds);
      })
      .catch((error) => notifyRef.current((error as Error).message));
  }, [employeeId]);
  useEffect(load, [load]);
  const today = new Date().toISOString().slice(0, 10);
  const meta = kinds.find((k) => k.id === kind);
  const fields = kind === OTHER_REQUEST.id ? [] : ORDER_KINDS.find((k) => k.id === kind)?.fields || [];
  const problems = requestProblems(kind, data);
  const warnings = requestWarnings(kind, data, today);
  async function send() {
    setBusy(true);
    try {
      const result = await request<{ warnings: string[] }>("employee/applications/save", { employeeId, kind, data });
      notify(`Ərizəniz ${company} şirkətinə göndərildi.${result.warnings?.length ? ` Diqqət: ${result.warnings[0]}` : ""}`);
      setData({ from: "", to: "", quantity: 0, reason: "", basis: "" });
      load();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function withdraw(item: Application) {
    if (!window.confirm("Ərizə geri götürülsün?")) return;
    try {
      await request("employee/applications/withdraw", { employeeId, id: item.id });
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <div className="letters">
      <p className="muted">
        Şirkətə yazılı ərizənizi buradan göndərin: HR onu “İşçi ərizələri” siyahısında görür, əmr ərizəniz əsasında hazırlanır. Bütün ərizələriniz və cavablar aşağıdakı reyestrdə qalır.
      </p>
      <div className="form-grid">
        <Field label="Ərizənin növü">
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
        {fields.includes("from") && (
          <Field label="Başlanğıc tarixi">
            <input type="date" value={data.from} onChange={(e) => setData({ ...data, from: e.target.value })} />
          </Field>
        )}
        {fields.includes("to") && kind !== "remote" && (
          <Field label="Bitmə tarixi">
            <input type="date" value={data.to} onChange={(e) => setData({ ...data, to: e.target.value })} />
          </Field>
        )}
        {kind === "unpaid" && (
          <Field label="Ödənişsiz məzuniyyətin əsası (Əmək Məcəlləsi, 130-cu maddə)">
            <select value={data.basis} onChange={(e) => setData({ ...data, basis: e.target.value })}>
              <option value="">— seçin —</option>
              {UNPAID_REASONS.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label}
                  {r.maxDays ? ` — ən çox ${r.maxDays} gün` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        {kind !== "unpaid" && kind !== OTHER_REQUEST.id && (
          <Field label="Əsas (arayış, sənəd nömrəsi — varsa)">
            <input value={data.basis} onChange={(e) => setData({ ...data, basis: e.target.value })} />
          </Field>
        )}
      </div>
      <Field label={kind === OTHER_REQUEST.id ? "Ərizənin mətni" : "Qeyd və ya səbəb"}>
        <textarea rows={kind === OTHER_REQUEST.id ? 5 : 3} value={data.reason} onChange={(e) => setData({ ...data, reason: e.target.value })} />
      </Field>
      {meta && <p className="muted">{meta.hint}</p>}
      {data.reason.length > 0 || data.from ? problems.map((p) => <small key={p} className="danger-text">{p}</small>) : null}
      {warnings.map((w) => (
        <small key={w} className="plan-state plan-pending">
          {w}
        </small>
      ))}
      <button type="button" className="primary" disabled={busy || problems.length > 0} onClick={() => void send()}>
        <Send size={14} /> Şirkətə göndər
      </button>
      <h4>Yazışmalar reyestri</h4>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Ərizə</th>
              <th>Müddət</th>
              <th>Status</th>
              <th>Şirkətin cavabı</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(list || []).map((a) => (
              <tr key={a.id}>
                <td>{dmy(a.created.slice(0, 10))}</td>
                <td>
                  <b>{a.label}</b>
                  {a.data.reason && <small className="skill-description">{a.data.reason.slice(0, 160)}</small>}
                  {a.source === "hr" && <small className="skill-description">HR tərəfindən qeyd edilib</small>}
                </td>
                <td>{a.data.from ? `${dmy(a.data.from)}${a.data.to ? ` – ${dmy(a.data.to)}` : ""}` : "—"}</td>
                <td>
                  {a.statusText}
                  {a.status === "ordered" && a.orderNumber && <small className="skill-description">Əmr № {a.orderNumber}</small>}
                </td>
                <td>{a.reply || "—"}</td>
                <td className="admin-actions">
                  {a.status === "new" && a.source === "employee" && (
                    <button type="button" aria-label="Geri götür" onClick={() => void withdraw(a)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {list && !list.length && (
              <tr>
                <td colSpan={6}>
                  <p className="admin-empty">Hələ ərizə yazmamısınız.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
