"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Field, Modal } from "./components";
import { SheetImport } from "./StaffPages";

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
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—");
const azn = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
function useLoad<T>(path: string, notify: Notify) {
  const [data, setData] = useState<T | null>(null);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<T>(path)
      .then(setData)
      .catch((error) => notifyRef.current((error as Error).message));
  }, [path]);
  useEffect(load, [load]);
  return [data, load] as const;
}

// ---------- Document registry ----------
type Doc = { id: string; employeeId: string; employee: string; category: string; subtype: string; number: string; date: string; expires: string; name: string; type: string; size: number; created: string; daysLeft: number | null };
type Deadline = { key: string; employeeName: string; what: string; date: string; days: number };
const CATEGORY: Record<string, string> = { contract: "Müqavilə", order: "Əmr", id: "Şəxsiyyət sənədi", diploma: "Təhsil və sertifikat", medical: "Tibbi sənəd", other: "Digər" };

export function DocRegistry({ notify }: { notify: Notify }) {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [data, load] = useLoad<{ documents: Doc[]; deadlines: Deadline[] }>(`company/doc-registry?category=${category}&q=${encodeURIComponent(query)}`, notify);
  async function setExpiry(doc: Doc) {
    const value = window.prompt("Bitmə tarixi (GGGG-AA-GG, boş — müddətsiz):", doc.expires);
    if (value === null) return;
    try {
      await request("company/doc-registry/expires", { id: doc.id, expires: value.trim() });
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <div className="company-page">
      {data && data.deadlines.length > 0 && (
        <div className="panel">
          <h4>Müddəti bitən və ya bitməyə yaxın (90 gün)</h4>
          <ul className="payment-history">
            {data.deadlines.map((d) => (
              <li key={d.key}><b>{d.employeeName}</b> — {d.what}: {dmy(d.date)} <small className={d.days < 0 ? "danger-text" : "skill-description"}>{d.days < 0 ? `${-d.days} gün keçib` : `${d.days} gün qalıb`}</small></li>
            ))}
          </ul>
        </div>
      )}
      <div className="admin-actions">
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Növ">
          <option value="">Bütün növlər</option>
          {Object.entries(CATEGORY).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <input type="search" placeholder="İşçi, sənəd və ya nömrə" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {!data ? <p className="muted">Yüklənir…</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>İşçi</th><th>Sənəd</th><th>Nömrə / tarix</th><th>Bitmə tarixi</th><th></th></tr></thead>
            <tbody>
              {data.documents.map((d) => (
                <tr key={d.id}>
                  <td>{d.employee}</td>
                  <td><a href={`/api/joblink/company/employee-doc?id=${d.id}`} target="_blank" rel="noreferrer">{d.subtype || d.name}</a><small className="skill-description">{CATEGORY[d.category] || d.category}</small></td>
                  <td>{d.number ? `№ ${d.number}` : "—"} {d.date && <small className="skill-description">{dmy(d.date)}</small>}</td>
                  <td>{d.expires ? dmy(d.expires) : "—"}{d.daysLeft !== null && d.daysLeft <= 30 && <small className="danger-text">{d.daysLeft < 0 ? "müddəti bitib" : `${d.daysLeft} gün qalıb`}</small>}</td>
                  <td><button type="button" onClick={() => void setExpiry(d)}>Müddət</button></td>
                </tr>
              ))}
              {!data.documents.length && <tr><td colSpan={5}><p className="admin-empty">Sənəd tapılmadı. Sənədlər işçi kartındakı “Sənəd qovluğu”ndan və “Müqavilə və arayış”dan əlavə olunur.</p></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Offboarding ----------
type Item = { id: string; label: string; hint: string };
type Question = { id: string; label: string; kind: "choice" | "scale" | "yesno" | "text"; options?: string[] };
type Case = { id: string; employeeId: string; name: string; position: string; department: string; employeeStatus: string; endDate: string; exitType: string; exitReason: string; status: string; checklist: Record<string, { done: boolean; at?: string; by?: string }>; progress: { done: number; total: number; percent: number }; answers: Record<string, string>; note: string; heldAssets: number };
type OffData = { items: Item[]; questions: Question[]; cases: Case[]; withoutCase: { id: string; name: string; position: string; department: string; endDate: string }[]; active: { id: string; name: string; department: string }[] };

export function Offboarding({ notify }: { notify: Notify }) {
  const [data, load] = useLoad<OffData>("company/offboarding", notify);
  const [open, setOpen] = useState<string>("");
  const [pick, setPick] = useState("");
  async function act(path: string, body: Record<string, unknown>, done?: string) {
    try {
      await request(path, body);
      if (done) notify(done);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  const current = data.cases.find((c) => c.id === open);
  return (
    <div className="company-page">
      <div className="admin-actions">
        <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="İşçi">
          <option value="">Çıxış prosesi başlat: işçi seçin</option>
          {data.active.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.department || "departamentsiz"}</option>)}
        </select>
        <button type="button" className="primary" disabled={!pick} onClick={() => { void act("company/offboarding/start", { employeeId: pick }, "Çıxış prosesi başladı."); setPick(""); }}>Başlat</button>
      </div>
      {data.withoutCase.length > 0 && (
        <p className="muted">
          İşdən çıxıb, amma çıxış siyahısı yoxdur: {data.withoutCase.map((p) => (
            <button key={p.id} type="button" className="text-button" onClick={() => void act("company/offboarding/start", { employeeId: p.id, plannedEnd: p.endDate }, "Çıxış prosesi başladı.")}>{p.name}</button>
          ))}
        </p>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>İşçi</th><th>Çıxış</th><th>Siyahı</th><th>Əmlak</th><th></th></tr></thead>
          <tbody>
            {data.cases.map((c) => (
              <tr key={c.id} className={c.status === "closed" ? "payment-reversed" : ""}>
                <td><b>{c.name}</b><small className="skill-description">{[c.position, c.department].filter(Boolean).join(" · ")}</small></td>
                <td>{dmy(c.endDate)}<small className="skill-description">{[c.exitType, c.exitReason].filter(Boolean).join(" · ")}</small></td>
                <td>{c.progress.done}/{c.progress.total} <i className="pay-progress"><b style={{ width: `${c.progress.percent}%` }} /></i></td>
                <td>{c.heldAssets ? <span className="danger-text">{c.heldAssets} əmlak qaytarılmayıb</span> : "—"}</td>
                <td><button type="button" onClick={() => setOpen(c.id)}>{c.status === "closed" ? "Bax" : "Aç"}</button></td>
              </tr>
            ))}
            {!data.cases.length && <tr><td colSpan={5}><p className="admin-empty">Çıxış prosesi yoxdur. İşçi “İşdən çıxıb” statusu alanda siyahı özü yaranır.</p></td></tr>}
          </tbody>
        </table>
      </div>
      {current && <CaseModal c={current} data={data} notify={notify} onClose={() => setOpen("")} onChanged={load} />}
    </div>
  );
}

function CaseModal({ c, data, notify, onClose, onChanged }: { c: Case; data: OffData; notify: Notify; onClose: () => void; onChanged: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>(c.answers);
  const closed = c.status === "closed";
  async function toggle(item: Item, done: boolean) {
    try {
      await request("company/offboarding/check", { id: c.id, item: item.id, done });
      onChanged();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function saveInterview() {
    try {
      await request("company/offboarding/interview", { id: c.id, answers });
      notify("Çıxış müsahibəsi saxlanıldı.");
      onChanged();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function close(force = false) {
    try {
      await request("company/offboarding/close", { id: c.id, force });
      notify("Proses bağlandı.");
      onChanged();
      onClose();
    } catch (error) {
      if (!force && window.confirm(`${(error as Error).message}\n\nYenə də bağlansın?`)) await close(true);
      else if (force) notify((error as Error).message);
    }
  }
  return (
    <Modal title={`Çıxış prosesi: ${c.name}`} onClose={onClose}>
      <div className="offer-composer">
        <h4>Siyahı ({c.progress.done}/{c.progress.total})</h4>
        {data.items.map((i) => (
          <label key={i.id} className="check-row">
            <input type="checkbox" disabled={closed} checked={!!c.checklist[i.id]?.done} onChange={(e) => void toggle(i, e.target.checked)} />
            <span>{i.label} <small className="skill-description">{i.hint}{c.checklist[i.id]?.done && c.checklist[i.id].at ? ` · ${dmy(c.checklist[i.id].at || "")} ${c.checklist[i.id].by || ""}` : ""}</small></span>
          </label>
        ))}
        {c.heldAssets > 0 && <p className="danger-text">İşçidə {c.heldAssets} şirkət əmlakı qalıb: “Aktivlər” bölməsində qaytarma qeyd edin.</p>}
        <h4>Çıxış müsahibəsi</h4>
        <p className="muted">İşçi cavabları “İş yerim” bölməsindən özü də doldura bilər.</p>
        {data.questions.map((q) => (
          <Field key={q.id} label={q.label}>
            {q.kind === "choice" ? (
              <select disabled={closed} value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
                <option value="">—</option>
                {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : q.kind === "scale" ? (
              <select disabled={closed} value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={String(n)}>{n}</option>)}
              </select>
            ) : q.kind === "yesno" ? (
              <select disabled={closed} value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
                <option value="">—</option>
                <option value="yes">Bəli</option>
                <option value="no">Xeyr</option>
              </select>
            ) : (
              <input disabled={closed} value={answers[q.id] || ""} maxLength={1000} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
            )}
          </Field>
        ))}
        {!closed && (
          <div className="admin-actions">
            <button type="button" className="secondary" onClick={() => void saveInterview()}>Müsahibəni saxla</button>
            <button type="button" className="primary" onClick={() => void close()}>Prosesi bağla</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------- Assets ----------
type Asset = { id: string; name: string; category: string; serial: string; inventoryNo: string; value: number; status: string; statusText: string; note: string; holderId: string; holder: string; assignmentId: string; issuedOn: string };
type AssetData = { categories: string[]; assets: Asset[]; employees: { id: string; name: string; department: string }[]; total: { count: number; assigned: number; value: number } };

export function Assets({ notify }: { notify: Notify }) {
  const [data, load] = useLoad<AssetData>("company/assets", notify);
  const [edit, setEdit] = useState<Partial<Asset> | null>(null);
  const [assign, setAssign] = useState<Asset | null>(null);
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  async function act(path: string, body: Record<string, unknown>, done: string) {
    try {
      await request(path, body);
      notify(done);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function printAct(assignmentId: string, kind: "issue" | "return") {
    try {
      const r = await request<{ html: string }>(`company/assets/act?id=${assignmentId}&kind=${kind}`);
      const win = window.open("", "_blank");
      if (!win) return notify("Çap pəncərəsi bloklanıb.");
      win.document.write(r.html);
      win.document.close();
      win.focus();
      win.print();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  const list = data.assets.filter((a) => `${a.name} ${a.serial} ${a.inventoryNo} ${a.holder} ${a.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="company-page">
      <div className="staff-kpis">
        <div className="staff-kpi"><small>Əmlak</small><strong>{data.total.count}</strong><span>ümumi dəyər {azn(data.total.value)}</span></div>
        <div className="staff-kpi"><small>İşçilərdə</small><strong>{data.total.assigned}</strong><span>təhvil-təslim aktı ilə</span></div>
        <div className="staff-kpi"><small>Anbarda / təmirdə</small><strong>{data.assets.filter((a) => a.status === "stock").length} / {data.assets.filter((a) => a.status === "repair").length}</strong></div>
      </div>
      <div className="section-heading">
        <input type="search" placeholder="Ad, seriya, inventar nömrəsi və ya işçi" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => setImporting(true)}>Excel-dən yüklə</button>
          <button type="button" className="primary" onClick={() => setEdit({ name: "", category: data.categories[0] || "" })}>+ Əmlak əlavə et</button>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Əmlak</th><th>Nömrələr</th><th>Dəyər</th><th>Vəziyyət</th><th></th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td><b>{a.name}</b><small className="skill-description">{a.category}</small></td>
                <td>{a.serial || "—"}<small className="skill-description">{a.inventoryNo}</small></td>
                <td>{a.value ? azn(a.value) : "—"}</td>
                <td>{a.statusText}{a.holder && <small className="skill-description">{a.holder} · {dmy(a.issuedOn)}</small>}</td>
                <td className="admin-actions">
                  {a.status === "stock" && <button type="button" className="primary" onClick={() => setAssign(a)}>İşçiyə ver</button>}
                  {a.status === "assigned" && (
                    <>
                      <button type="button" onClick={() => void printAct(a.assignmentId, "issue")}>Akt (verilmə)</button>
                      <button type="button" onClick={() => { const damaged = window.confirm("Əmlak zədəlidir (təmirə göndərilsin)? Zədəli deyilsə “Ləğv et” seçin."); void act("company/assets/return", { assignmentId: a.assignmentId, damaged, condition: damaged ? "zədəli" : "yaxşı" }, "Əmlak qaytarıldı."); }}>Qaytarıldı</button>
                    </>
                  )}
                  <button type="button" onClick={() => setEdit(a)}>Dəyiş</button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5}><p className="admin-empty">Əmlak yoxdur. “Əmlak əlavə et” və ya Excel-dən yükləyin.</p></td></tr>}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal title={edit.id ? "Əmlakı dəyiş" : "Yeni əmlak"} onClose={() => setEdit(null)}>
          <div className="offer-composer">
            <div className="form-grid">
              <Field label="Ad"><input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Kateqoriya">
                <select value={edit.category || ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                  {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Seriya nömrəsi"><input value={edit.serial || ""} onChange={(e) => setEdit({ ...edit, serial: e.target.value })} /></Field>
              <Field label="İnventar nömrəsi"><input value={edit.inventoryNo || ""} onChange={(e) => setEdit({ ...edit, inventoryNo: e.target.value })} /></Field>
              <Field label="Dəyər (AZN)"><input type="number" min={0} value={edit.value ?? ""} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value) })} /></Field>
              {edit.id && edit.status !== "assigned" && (
                <Field label="Vəziyyət">
                  <select value={edit.status || "stock"} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                    <option value="stock">Anbarda</option>
                    <option value="repair">Təmirdə</option>
                    <option value="written-off">Silinib</option>
                  </select>
                </Field>
              )}
              <Field label="Qeyd"><input value={edit.note || ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
            </div>
            <button type="button" className="primary" disabled={(edit.name || "").trim().length < 2} onClick={async () => { await act("company/assets/save", { ...edit }, "Saxlanıldı."); setEdit(null); }}>Saxla</button>
          </div>
        </Modal>
      )}
      {assign && (
        <AssignModal asset={assign} employees={data.employees} onClose={() => setAssign(null)} onDone={async (body) => { await act("company/assets/assign", body, "Əmlak işçiyə verildi."); setAssign(null); }} />
      )}
      {importing && <SheetImport kind="assets" notify={notify} onClose={() => setImporting(false)} onDone={load} />}
    </div>
  );
}

function AssignModal({ asset, employees, onClose, onDone }: { asset: Asset; employees: { id: string; name: string; department: string }[]; onClose: () => void; onDone: (body: Record<string, unknown>) => Promise<void> }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [issuedOn, setIssuedOn] = useState(new Date().toISOString().slice(0, 10));
  const [condition, setCondition] = useState("yaxşı");
  return (
    <Modal title={`İşçiyə ver: ${asset.name}`} onClose={onClose}>
      <div className="offer-composer">
        <div className="form-grid">
          <Field label="İşçi"><select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{employees.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.department || "departamentsiz"}</option>)}</select></Field>
          <Field label="Tarix"><input type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} /></Field>
          <Field label="Vəziyyət"><input value={condition} onChange={(e) => setCondition(e.target.value)} /></Field>
        </div>
        <button type="button" className="primary" disabled={!employeeId} onClick={() => void onDone({ assetId: asset.id, employeeId, issuedOn, condition })}>Ver</button>
      </div>
    </Modal>
  );
}

export function LeaveExport({ year }: { year: number }) {
  return <a className="secondary report-button" href={`/api/joblink/company/leave-schedule/export?year=${year}`} download><Download size={14} /> Excel</a>;
}
