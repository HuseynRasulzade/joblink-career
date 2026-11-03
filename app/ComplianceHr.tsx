"use client";
import { Field } from "./components";
import { useCallback, useEffect, useMemo, useState } from "react";
import { POLICY_TEMPLATES } from "@/lib/policy-templates";
import { RETENTION_CATEGORIES } from "@/lib/ohs";
import PeoplePicker, { type PickPerson } from "./PeoplePicker";
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
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : iso || "—");
const today = () => new Date().toISOString().slice(0, 10);

// ---------------- Occupational safety ----------------
type OhsRecord = { id: string; type: "briefing" | "medical" | "incident"; employeeId: string; employeeName: string; date: string; due: string; status: string; data: Record<string, string | number | boolean> };
type OhsData = { records: OhsRecord[]; due: (OhsRecord & { state: string })[]; labels: { briefing: Record<string, string>; medical: Record<string, string>; result: Record<string, string>; incident: Record<string, string>; status: Record<string, string> } };

export function OhsPanel({ notify }: { notify: Notify }) {
  const [data, setData] = useState<OhsData | null>(null);
  const [people, setPeople] = useState<PickPerson[]>([]);
  const [type, setType] = useState<"briefing" | "medical" | "incident">("briefing");
  const [form, setForm] = useState<Record<string, string | boolean>>({ date: today(), kind: "repeat", result: "fit", signed: false, reported: false });
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const load = useCallback(() => {
    request<OhsData>("company/ohs").then(setData).catch((e) => notify((e as Error).message));
  }, [notify]);
  useEffect(() => {
    load();
    request<{ employees: (PickPerson & { status: string })[] }>("company/employees").then((r) => setPeople(r.employees.filter((e) => e.status !== "left"))).catch(() => undefined);
  }, [load]);
  const set = (key: string, value: string | boolean) => setForm({ ...form, [key]: value });
  const kinds = type === "briefing" ? data?.labels.briefing : type === "medical" ? data?.labels.medical : data?.labels.incident;
  function switchType(next: typeof type) {
    setType(next);
    setForm({ ...form, kind: next === "briefing" ? "repeat" : next === "medical" ? "periodic" : "minor", due: "" });
  }
  async function save() {
    setBusy(true);
    try {
      const result = await request<{ warning?: string }>("company/ohs/save", { ...form, type, employeeId: type === "incident" ? "" : pick });
      notify(result.warning || "Qeyd edildi.");
      setForm({ ...form, topic: "", description: "", cause: "", measures: "", place: "", instructor: form.instructor || "" });
      load();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!window.confirm("Qeyd silinsin?")) return;
    try {
      await request("company/ohs/delete", { id });
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  const labelOf = (r: OhsRecord) => (r.type === "briefing" ? data.labels.briefing : r.type === "medical" ? data.labels.medical : data.labels.incident)[String(r.data.kind)] || String(r.data.kind);
  return (
    <div className="company-page">
      <p className="muted">Əməyin mühafizəsi üzrə təlimat jurnalı, tibbi baxış qrafiki və qəza qeydləri. Növbəti təlimat və baxış tarixləri keçəndə burada qırmızı görünür.</p>
      <div className="admin-actions">
        <button type="button" className="secondary" onClick={() => setImporting(true)}>Excel-dən yüklə</button>
      </div>
      {importing && <SheetImport kind="ohs" notify={notify} onClose={() => setImporting(false)} onDone={load} />}
      {!!data.due.length && (
        <div className="panel">
          <b>Vaxtı çatan və ya keçən ({data.due.length})</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {data.due.map((r) => (
              <li key={r.id} style={{ color: r.state === "overdue" ? "var(--danger, #b42318)" : undefined }}>
                {r.employeeName}: {r.type === "briefing" ? "təlimat" : "tibbi baxış"} ({labelOf(r)}) — {dmy(r.due)} {r.state === "overdue" ? "(vaxtı keçib)" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="panel">
        <div className="admin-actions" role="tablist">
          {(["briefing", "medical", "incident"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={type === t} className={type === t ? "primary" : "secondary"} onClick={() => switchType(t)}>
              {t === "briefing" ? "Təlimat" : t === "medical" ? "Tibbi baxış" : "Qəza / hadisə"}
            </button>
          ))}
        </div>
        {type !== "incident" && (
          <PeoplePicker people={people} selected={pick ? [pick] : []} onChange={(ids) => setPick(ids.filter((x) => x !== pick).pop() || "")} height={150} label="İşçi" />
        )}
        <div className="form-grid">
          <Field label="Tarix">
            <input type="date" value={String(form.date || "")} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="Növ">
            <select value={String(form.kind || "")} onChange={(e) => set("kind", e.target.value)}>
              {Object.entries(kinds || {}).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          {type === "briefing" && (
            <>
              <Field label="Təlimatı keçən şəxs">
                <input value={String(form.instructor || "")} onChange={(e) => set("instructor", e.target.value)} />
              </Field>
              <Field label="Mövzu">
                <input value={String(form.topic || "")} onChange={(e) => set("topic", e.target.value)} />
              </Field>
              <Field label="Növbəti təlimat (boşdursa 6 ay sonra)">
                <input type="date" value={String(form.due || "")} onChange={(e) => set("due", e.target.value)} />
              </Field>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={form.signed === true} onChange={(e) => set("signed", e.target.checked)} /> İşçi jurnalda imzalayıb
              </label>
            </>
          )}
          {type === "medical" && (
            <>
              <Field label="Nəticə">
                <select value={String(form.result || "fit")} onChange={(e) => set("result", e.target.value)}>
                  {Object.entries(data.labels.result).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tibb müəssisəsi">
                <input value={String(form.clinic || "")} onChange={(e) => set("clinic", e.target.value)} />
              </Field>
              <Field label="Növbəti baxış (boşdursa 1 il sonra)">
                <input type="date" value={String(form.due || "")} onChange={(e) => set("due", e.target.value)} />
              </Field>
              <Field label="Qeyd">
                <input value={String(form.note || "")} onChange={(e) => set("note", e.target.value)} />
              </Field>
            </>
          )}
          {type === "incident" && (
            <>
              <Field label="Yer">
                <input value={String(form.place || "")} onChange={(e) => set("place", e.target.value)} />
              </Field>
              <Field label="Status">
                <select value={String(form.status || "open")} onChange={(e) => set("status", e.target.value)}>
                  {Object.entries(data.labels.status).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <label style={{ gridColumn: "1 / -1" }}>
                Hadisənin təsviri
                <textarea rows={3} value={String(form.description || "")} onChange={(e) => set("description", e.target.value)} />
              </label>
              <Field label="Səbəb">
                <input value={String(form.cause || "")} onChange={(e) => set("cause", e.target.value)} />
              </Field>
              <Field label="Görülən tədbirlər">
                <input value={String(form.measures || "")} onChange={(e) => set("measures", e.target.value)} />
              </Field>
              <Field label="İtirilən iş günü">
                <input inputMode="numeric" value={String(form.daysLost || "")} onChange={(e) => set("daysLost", e.target.value)} />
              </Field>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={form.reported === true} onChange={(e) => set("reported", e.target.checked)} /> Dövlət əmək müfəttişliyinə / sığortaçıya bildirilib
              </label>
            </>
          )}
        </div>
        <div className="admin-actions">
          <button type="button" className="primary" disabled={busy} onClick={() => void save()}>
            Qeyd et
          </button>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Qeyd</th>
              <th>İşçi</th>
              <th>Növbəti</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((r) => (
              <tr key={r.id}>
                <td>{dmy(r.date)}</td>
                <td>
                  <b>{r.type === "briefing" ? "Təlimat" : r.type === "medical" ? "Tibbi baxış" : "Hadisə"}</b>: {labelOf(r)}
                  <small className="skill-description">
                    {r.type === "briefing" && `${r.data.instructor}${r.data.topic ? ` · ${r.data.topic}` : ""}${r.data.signed ? " · imzalanıb" : ""}`}
                    {r.type === "medical" && `${data.labels.result[String(r.data.result)] || ""}${r.data.clinic ? ` · ${r.data.clinic}` : ""}`}
                    {r.type === "incident" && `${data.labels.status[r.status] || r.status} · ${String(r.data.description).slice(0, 90)}${r.data.reported ? " · bildirilib" : r.data.mustReport ? " · BİLDİRMƏK LAZIMDIR" : ""}`}
                  </small>
                </td>
                <td>{r.employeeName || "—"}</td>
                <td>{r.due ? dmy(r.due) : "—"}</td>
                <td>
                  <button type="button" aria-label="Sil" onClick={() => void remove(r.id)}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {!data.records.length && (
              <tr>
                <td colSpan={5}>
                  <p className="admin-empty">Hələ qeyd yoxdur.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- Internal rules, policies and consents ----------------
type PolicyRow = { id: string; kind: string; title: string; requiresAck: boolean; version: number; retired: boolean; effectiveDate: string; acked: number; withdrawn: number };
type PolicyDetail = { doc: { id: string; kind: string; title: string; requiresAck: boolean; version: number; retired: boolean }; versions: { version: number; effectiveDate: string; body: string; changeNote: string; created: string }[]; acked: { employeeId: string; name: string; at: string; withdrawnAt: string }[]; pending: { employeeId: string; name: string; department: string }[] };
const KIND_LABEL: Record<string, string> = { rules: "Daxili qaydalar", policy: "Siyasət", consent: "Razılıq (rəzayət)", other: "Digər" };

export function PoliciesPanel({ notify }: { notify: Notify }) {
  const [list, setList] = useState<{ staff: number; docs: PolicyRow[] } | null>(null);
  const [open, setOpen] = useState<PolicyDetail | null>(null);
  const [edit, setEdit] = useState<{ id: string; kind: string; title: string; body: string; requiresAck: boolean; changeNote: string; effectiveDate: string } | null>(null);
  const load = useCallback(() => {
    request<{ staff: number; docs: PolicyRow[] }>("company/policies").then(setList).catch((e) => notify((e as Error).message));
  }, [notify]);
  useEffect(load, [load]);
  async function show(id: string) {
    try {
      setOpen(await request<PolicyDetail>(`company/policies/detail?id=${encodeURIComponent(id)}`));
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function save() {
    if (!edit) return;
    try {
      const r = await request<{ newVersion?: boolean; version: number }>("company/policies/save", { ...edit, id: edit.id || undefined });
      notify(edit.id ? (r.newVersion ? `Yeni versiya (v${r.version}) yaradıldı: işçilər yenidən təsdiq etməlidir.` : "Dəyişiklik saxlandı.") : "Sənəd yaradıldı.");
      setEdit(null);
      setOpen(null);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function retire(id: string, retired: boolean) {
    try {
      await request("company/policies/retire", { id, retired });
      setOpen(null);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const editing = !!edit;
  const current = open?.versions[0];
  if (!list) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="company-page">
      <p className="muted">Daxili əmək qaydaları, siyasətlər və şəxsi məlumatların işlənməsinə razılıq. Mətn dəyişəndə yeni versiya yaranır, köhnələri qalır; işçilər “İş yerim → Qaydalar” bölməsində təsdiq edir (təsdiq mətnin hash-i ilə saxlanır). Razılığı işçi özü geri götürə bilər.</p>
      <div className="admin-actions">
        <button type="button" className="primary" onClick={() => setEdit({ id: "", kind: "rules", title: "", body: "", requiresAck: true, changeNote: "", effectiveDate: today() })}>
          Yeni sənəd
        </button>
        {POLICY_TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="secondary" onClick={() => setEdit({ id: "", kind: t.kind, title: t.title, body: t.body, requiresAck: true, changeNote: "", effectiveDate: today() })}>
            Nümunə: {t.title}
          </button>
        ))}
      </div>
      <small className="muted">Nümunə mətnlər layihədir: istifadə etməzdən əvvəl hüquqşünasla yoxlayın.</small>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sənəd</th>
              <th>Versiya</th>
              <th>Təsdiq</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.docs.map((d) => (
              <tr key={d.id} style={d.retired ? { opacity: 0.55 } : undefined}>
                <td>
                  <b>{d.title}</b>
                  <small className="skill-description">
                    {KIND_LABEL[d.kind] || d.kind}
                    {d.retired ? " · ləğv edilib" : ""}
                  </small>
                </td>
                <td>
                  v{d.version} · {dmy(d.effectiveDate)}
                </td>
                <td>{d.requiresAck ? `${d.acked} / ${list.staff}${d.withdrawn ? ` (${d.withdrawn} geri götürüb)` : ""}` : "tələb olunmur"}</td>
                <td className="admin-actions">
                  <button type="button" onClick={() => void show(d.id)}>
                    Aç
                  </button>
                </td>
              </tr>
            ))}
            {!list.docs.length && (
              <tr>
                <td colSpan={4}>
                  <p className="admin-empty">Hələ sənəd yoxdur. Yuxarıdakı nümunələrdən birini seçin.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {open && current && !editing && (
        <div className="panel">
          <h3>
            {open.doc.title} · v{open.doc.version}
          </h3>
          <div className="admin-actions">
            <button type="button" className="primary" onClick={() => setEdit({ id: open.doc.id, kind: open.doc.kind, title: open.doc.title, body: current.body, requiresAck: open.doc.requiresAck, changeNote: "", effectiveDate: today() })}>
              Dəyişdir (yeni versiya)
            </button>
            <button type="button" className="secondary" onClick={() => void retire(open.doc.id, !open.doc.retired)}>
              {open.doc.retired ? "Bərpa et" : "Ləğv et"}
            </button>
            <button type="button" className="ghost" onClick={() => setOpen(null)}>
              Bağla
            </button>
          </div>
          <pre className="muted" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
            {current.body}
          </pre>
          {open.doc.requiresAck && (
            <>
              <h4>Təsdiq etməyənlər ({open.pending.length})</h4>
              <p className="muted">{open.pending.slice(0, 60).map((p) => p.name).join(", ") || "Hamı təsdiq edib."}{open.pending.length > 60 ? " …" : ""}</p>
              <h4>Təsdiq edənlər ({open.acked.length})</h4>
              <p className="muted">{open.acked.slice(0, 60).map((a) => `${a.name} (${dmy(a.at.slice(0, 10))}${a.withdrawnAt ? ", geri götürüb" : ""})`).join(", ") || "Hələ yoxdur."}</p>
            </>
          )}
          <h4>Versiyalar</h4>
          <ul style={{ paddingLeft: 18 }}>
            {open.versions.map((v) => (
              <li key={v.version}>
                v{v.version} · {dmy(v.effectiveDate)} {v.changeNote ? `— ${v.changeNote}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {edit && (
        <div className="panel">
          <h3>{edit.id ? "Sənədi dəyişdir" : "Yeni sənəd"}</h3>
          <div className="form-grid">
            <Field label="Ad">
              <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            </Field>
            <Field label="Növ">
              <select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>
                {Object.entries(KIND_LABEL).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Qüvvəyə minmə tarixi">
              <input type="date" value={edit.effectiveDate} onChange={(e) => setEdit({ ...edit, effectiveDate: e.target.value })} />
            </Field>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={edit.requiresAck} onChange={(e) => setEdit({ ...edit, requiresAck: e.target.checked })} /> İşçilər təsdiq etməlidir
            </label>
            {edit.id && (
              <label style={{ gridColumn: "1 / -1" }}>
                Nə dəyişdi (versiya qeydi)
                <input value={edit.changeNote} onChange={(e) => setEdit({ ...edit, changeNote: e.target.value })} />
              </label>
            )}
            <label style={{ gridColumn: "1 / -1" }}>
              Mətn
              <textarea rows={12} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
            </label>
          </div>
          <div className="admin-actions">
            <button type="button" className="primary" onClick={() => void save()}>
              Saxla
            </button>
            <button type="button" className="ghost" onClick={() => setEdit(null)}>
              Ləğv et
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Retention of HR papers ----------------
type Retention = { categories: { id: string; label: string; years: number; custom: boolean; defaultYears: number }[]; leavers: number; due: { employeeId: string; name: string; endDate: string; until: string }[]; soon: number };
export function RetentionPanel({ notify }: { notify: Notify }) {
  const [data, setData] = useState<Retention | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const load = useCallback(() => {
    request<Retention>("company/retention").then(setData).catch((e) => notify((e as Error).message));
  }, [notify]);
  useEffect(load, [load]);
  const known = useMemo(() => new Set(RETENTION_CATEGORIES.map((c) => c.id)), []);
  async function save(category: string, years: number | null) {
    if (!known.has(category)) return;
    try {
      await request("company/retention/save", { category, years });
      setDraft({ ...draft, [category]: "" });
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="company-page">
      <p className="muted">Hər sənəd qrupunun nə qədər saxlanacağı. İlkin illər orientirdir: şirkət özü hüquqşünas və arxiv qaydaları ilə yoxlayıb dəyişməlidir. Sistem heç nəyi öz-özünə silmir: müddəti bitmiş işçi işləri yalnız siyahıda göstərilir.</p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sənəd qrupu</th>
              <th>Saxlama müddəti</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map((c) => (
              <tr key={c.id}>
                <td>{c.label}</td>
                <td>
                  <b>{c.years} il</b> {c.custom && <small className="muted">(ilkin: {c.defaultYears})</small>}
                </td>
                <td className="admin-actions">
                  <input style={{ width: 70 }} inputMode="numeric" aria-label={`${c.label}: il`} placeholder="il" value={draft[c.id] || ""} onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })} />
                  <button type="button" disabled={!draft[c.id]} onClick={() => void save(c.id, Number(draft[c.id]))}>
                    Dəyiş
                  </button>
                  {c.custom && (
                    <button type="button" onClick={() => void save(c.id, null)}>
                      İlkinə qaytar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4>Şəxsi işlərin saxlama müddəti bitənlər ({data.due.length})</h4>
      <p className="muted">Gələn 12 ayda müddəti bitəcək: {data.soon} nəfər. İşdən çıxmış işçilər cəmi: {data.leavers}.</p>
      {!!data.due.length && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <tbody>
              {data.due.map((d) => (
                <tr key={d.employeeId}>
                  <td>{d.name}</td>
                  <td>son iş günü {dmy(d.endDate)}</td>
                  <td>müddət bitib: {dmy(d.until)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------- Birthdays and work anniversaries ----------------
type Celebrations = { enabled: boolean; items: { employeeId: string; name: string; kind: "birthday" | "anniversary"; date: string; days: number; years: number }[] };
export function CelebrationsPanel({ notify }: { notify: Notify }) {
  const [data, setData] = useState<Celebrations | null>(null);
  const load = useCallback(() => {
    request<Celebrations>("company/celebrations").then(setData).catch((e) => notify((e as Error).message));
  }, [notify]);
  useEffect(load, [load]);
  async function toggle(enabled: boolean) {
    try {
      await request("company/celebrations/setting", { enabled });
      notify(enabled ? "Təbriklər açıldı." : "Təbriklər bağlandı.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="company-page">
      <p className="muted">Növbəti 30 gündə işçilərin ad günləri və il dönümləri (doğum tarixi və işə başlama tarixi işçi kartından götürülür).</p>
      <div className="panel">
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={data.enabled} onChange={(e) => void toggle(e.target.checked)} /> İşçilərə göstər və həmin gün təbrik göndər
        </label>
        <small className="skill-description">Açıq olanda kolleqalar “İş yerim → İşçi təcrübəsi”ndə yalnız ad və gün/ayı (doğum ili yox) görür; ad günü və il dönümü sahibinə həmin gün bildiriş gedir. Bağlı olanda yalnız HR görür.</small>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <tbody>
            {data.items.map((c) => (
              <tr key={`${c.employeeId}-${c.kind}`}>
                <td>
                  <b>{c.name}</b>
                </td>
                <td>{c.kind === "birthday" ? "Ad günü" : `${c.years} illik il dönümü`}</td>
                <td>
                  {dmy(c.date)} {c.days === 0 ? "(bu gün)" : `(${c.days} gün sonra)`}
                </td>
              </tr>
            ))}
            {!data.items.length && (
              <tr>
                <td>
                  <p className="admin-empty">Növbəti 30 gündə ad günü və ya il dönümü yoxdur (doğum tarixi işçinin şəxsi məlumatlarında yazılmalıdır).</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
