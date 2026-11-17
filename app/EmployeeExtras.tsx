"use client";
import { useEffect, useState } from "react";
import { Modal } from "./components";
import { OrgChart } from "./PeopleOpsPanels";

type Notify = (message: string) => void;
async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Sorğu tamamlanmadı.");
  return data;
}
const dateText = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split("-").reverse().join(".") : iso);
const KIND_LABEL: Record<string, string> = { hire: "İşə qəbul", exit: "Çıxış", event: "Kart", order: "Əmr", leave: "Məzuniyyət", training: "Təlim", perf: "Performans", change: "Sorğu", doc: "Sənəd" };

// One person: what happened, how the pay compares, the survey picture of the department, own fields.
export function EmployeeDetailModal({ employee, canSalary, canEdit, notify, onClose }: { employee: { id: string; name: string }; canSalary: boolean; canEdit: boolean; notify: Notify; onClose: () => void }) {
  const [tab, setTab] = useState<"timeline" | "pay" | "survey" | "fields">("timeline");
  const [timeline, setTimeline] = useState<{ date: string; kind: string; title: string; detail: string }[] | null>(null);
  const [bench, setBench] = useState<{ position: string; gross: number; peers: BenchSide; market: BenchSide } | null>(null);
  const [survey, setSurvey] = useState<{ department: string; items: { id: string; title: string; anonymous: boolean; took: boolean | null; department: { responses: number; headcount: number; enps: number | null; hidden: boolean } }[]; note: string } | null>(null);
  const [fields, setFields] = useState<{ fields: { id: string; label: string; kind: string }[]; values: Record<string, string> } | null>(null);
  const [error, setError] = useState("");
  const id = employee.id;
  useEffect(() => {
    setError("");
    const fail = (e: Error) => setError(e.message);
    if (tab === "timeline" && !timeline) call<{ items: { date: string; kind: string; title: string; detail: string }[] }>(`company/employees/timeline?employeeId=${id}`).then((r) => setTimeline(r.items)).catch(fail);
    if (tab === "pay" && !bench) call<NonNullable<typeof bench>>(`company/employees/benchmark?employeeId=${id}`).then(setBench).catch(fail);
    if (tab === "survey" && !survey) call<NonNullable<typeof survey>>(`company/employees/survey-profile?employeeId=${id}`).then(setSurvey).catch(fail);
    if (tab === "fields" && !fields) call<NonNullable<typeof fields>>(`company/custom-fields?employeeId=${id}`).then(setFields).catch(fail);
  }, [tab, id, timeline, bench, survey, fields]);
  const tabs: [typeof tab, string][] = [["timeline", "Xronologiya"], ...(canSalary ? [["pay", "Maaş müqayisəsi"] as [typeof tab, string]] : []), ["survey", "Sorğular"], ["fields", "Əlavə sahələr"]];
  return (
    <Modal title={employee.name} onClose={onClose} className="wide">
      <div className="admin-actions" role="tablist" style={{ justifyContent: "flex-start", marginBottom: 10 }}>
        {tabs.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "primary" : "secondary"} onClick={() => setTab(key)}>{label}</button>)}
        <a className="secondary button-link" href={`/api/joblink/company/employees/export-one?employeeId=${id}`} download>Məlumatlarını Excel-ə yüklə</a>
      </div>
      {error && <p className="danger-text" role="alert">{error}</p>}
      {tab === "timeline" && (timeline ? (timeline.length ? <ol className="timeline" style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 420, overflow: "auto" }}>{timeline.map((t, i) => (
        <li key={i} style={{ display: "grid", gridTemplateColumns: "90px 110px 1fr", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--line, #e5e7eb)" }}><span className="muted">{dateText(t.date)}</span><span className="pill">{KIND_LABEL[t.kind] || t.kind}</span><span><b>{t.title}</b>{t.detail && <small className="skill-description">{t.detail}</small>}</span></li>))}</ol> : <p className="admin-empty">Hələ qeyd yoxdur.</p>) : <p className="muted loading-line">Yüklənir…</p>)}
      {tab === "pay" && (bench ? (
        <div>
          <p>Vəzifə: <b>{bench.position || "—"}</b>. Bu işçinin gross maaşı: <b>{bench.gross ? `${bench.gross} AZN` : "—"}</b>.</p>
          <BenchRow title="Şirkətdə eyni vəzifədəkilər" side={bench.peers} />
          <BenchRow title="Platformada dərc olunmuş elanlar (bazar)" side={bench.market} />
          <p className="muted">Kiçik qruplar (peer ≥ 3, bazar ≥ 5) göstərilmir: fərdi maaşı başqasından təxmin etmək mümkün olmamalıdır.</p>
        </div>) : <p className="muted loading-line">Yüklənir…</p>)}
      {tab === "survey" && (survey ? (
        <div>
          {survey.items.length ? <table className="admin-table"><thead><tr><th>Sorğu</th><th>Departament ({survey.department || "—"})</th><th>Öz iştirakı</th></tr></thead><tbody>{survey.items.map((s) => (
            <tr key={s.id}><td>{s.title}</td><td>{s.department.hidden ? `Gizlədilib (cavab ${s.department.responses}/${s.department.headcount}; ən azı 5 lazımdır)` : `eNPS ${s.department.enps ?? "—"} · cavab ${s.department.responses}/${s.department.headcount}`}</td><td>{s.anonymous ? "Anonim sorğu: göstərilmir" : s.took ? "Cavab verib" : "Cavab verməyib"}</td></tr>))}</tbody></table> : <p className="admin-empty">eNPS sorğusu yoxdur.</p>}
          <p className="muted">{survey.note}</p>
        </div>) : <p className="muted loading-line">Yüklənir…</p>)}
      {tab === "fields" && (fields ? (fields.fields.length ? (
        <div className="admin-form" style={{ display: "grid", gap: 8 }}>
          {fields.fields.map((f) => (
            <label key={f.id}>{f.label}
              <input type={f.kind === "number" ? "text" : f.kind === "date" ? "date" : "text"} disabled={!canEdit} defaultValue={fields.values[f.id] || ""} onBlur={(e) => { if (e.target.value === (fields.values[f.id] || "")) return; call("company/custom-fields/value", { employeeId: id, fieldId: f.id, value: e.target.value }).then(() => { setFields({ ...fields, values: { ...fields.values, [f.id]: e.target.value } }); notify("Saxlanıldı."); }).catch((er: Error) => notify(er.message)); }} />
            </label>))}
        </div>) : <p className="admin-empty">Şirkət hələ əlavə sahə yaratmayıb. «Əlavə alətlər → Əlavə sahələr» bölməsindən yaradın.</p>) : <p className="muted loading-line">Yüklənir…</p>)}
    </Modal>
  );
}
type BenchSide = { count: number; median: number | null; p25: number | null; p75: number | null; diffPercent: number | null; note: string };
function BenchRow({ title, side }: { title: string; side: BenchSide }) {
  return (
    <div className="staff-kpi" style={{ marginBottom: 8 }}>
      <small>{title} ({side.count} nəfər/elan)</small>
      {side.median == null ? <span className="muted">{side.note}</span> : <strong>Median {side.median} AZN <small>({side.p25}–{side.p75})</small>{side.diffPercent != null && <small className={Math.abs(side.diffPercent) > 15 ? "danger-text" : ""}> · bu işçi {side.diffPercent > 0 ? "+" : ""}{side.diffPercent}%</small>}</strong>}
      {side.median != null && side.note && <small className="muted">{side.note}</small>}
    </div>
  );
}

type Dup = { reason: string; people: { id: string; name: string; email: string; startDate: string; department: string }[] };
// Panels under "Əlavə alətlər": duplicates, bulk change, custom fields, succession and the org chart.
export function EmployeeToolsPanel({ notify, selectedIds, departments, canEdit, canStaff, onChanged }: { notify: Notify; selectedIds: string[]; departments: string[]; canEdit: boolean; canStaff: boolean; onChanged: () => void }) {
  const [tool, setTool] = useState<"" | "dups" | "bulk" | "fields" | "succession" | "chart" | "onboarding">("");
  const [dups, setDups] = useState<{ groups: Dup[]; checkedFin: boolean } | null>(null);
  const [bulk, setBulk] = useState({ department: "", section: "", workMode: "", date: new Date().toISOString().slice(0, 10) });
  const [bulkResult, setBulkResult] = useState<{ done: number; dryRun: boolean; items: { id: string; name: string; status: string; reason: string }[] } | null>(null);
  const [fieldList, setFieldList] = useState<{ id: string; label: string; kind: string }[]>([]);
  const [newField, setNewField] = useState({ label: "", kind: "text" });
  type Succession = { items: { unitId: string; department: string; position: string; holders: { id: string; name: string }[]; successors: { id: string; name: string; readinessLabel: string; employeeId: string }[]; risk: string }[]; candidates: { unitId: string; label: string }[]; risks: number };
  const [succ, setSucc] = useState<Succession | null>(null);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [pick, setPick] = useState({ unitId: "", employeeId: "", readiness: "year" });
  type Task = { department: string; title: string; offsetDays: number };
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [tasksCustom, setTasksCustom] = useState(false);
  const fail = (e: Error) => notify(e.message);
  useEffect(() => {
    if (tool === "onboarding") call<{ items: Task[]; custom: boolean }>("company/onboarding-template").then((r) => { setTasks(r.items); setTasksCustom(r.custom); }).catch(fail);
    if (tool === "dups") call<NonNullable<typeof dups>>("company/employees/duplicates").then(setDups).catch(fail);
    if (tool === "fields") call<{ fields: typeof fieldList }>("company/custom-fields").then((r) => setFieldList(r.fields)).catch(fail);
    if (tool === "succession") { call<Succession>("company/succession").then(setSucc).catch(fail); call<{ employees: { id: string; name: string; status: string }[] }>("company/employees").then((r) => setPeople(r.employees.filter((e) => e.status === "active" || e.status === "leave"))).catch(fail); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);
  const runBulk = async (dryRun: boolean) => {
    try {
      const r = await call<NonNullable<typeof bulkResult>>("company/employees/bulk-update", { ids: selectedIds, ...bulk, dryRun });
      setBulkResult(r);
      if (!dryRun) { notify(`${r.done} işçi dəyişdirildi.`); onChanged(); }
    } catch (e) { fail(e as Error); }
  };
  const reloadSucc = () => call<Succession>("company/succession").then(setSucc).catch(fail);
  return (
    <section className="card" style={{ marginBottom: 10 }}>
      <div className="admin-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        <b>Əlavə alətlər:</b>
        {([["dups", "Dublikatlar"], ["bulk", "Kütləvi dəyişiklik"], ["fields", "Əlavə sahələr"], ["succession", "Əsas vəzifələr və varislik"], ["onboarding", "Qəbul siyahısı"], ["chart", "Təşkilat sxemi"]] as [typeof tool, string][]).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={tool === k} className={tool === k ? "primary" : "secondary"} onClick={() => setTool(tool === k ? "" : k)}>{label}</button>))}
      </div>
      {tool === "dups" && (dups ? (dups.groups.length ? dups.groups.map((g, i) => (
        <div key={i} className="staff-kpi" style={{ marginTop: 8 }}><small>{g.reason}</small>{g.people.map((p) => <span key={p.id}><b>{p.name}</b> · {p.department || "—"} · {p.email || "e-poçt yoxdur"} · {dateText(p.startDate)}</span>)}</div>
      )) : <p className="admin-empty">Dublikat tapılmadı{dups.checkedFin ? " (FİN, e-poçt, ad+başlama günü yoxlandı)." : " (e-poçt və ad+başlama günü yoxlandı; FİN yoxlaması şəxsi məlumat icazəsi tələb edir)."}</p>) : <p className="muted">Yoxlanılır…</p>)}
      {tool === "bulk" && (
        <div style={{ marginTop: 8 }}>
          {!canEdit ? <p className="muted">Bu əməliyyat üçün icazəniz yoxdur.</p> : !selectedIds.length ? <p className="muted">Əvvəl siyahıdan işçiləri seçin (sol sütundakı qutular).</p> : (
            <>
              <p><b>{selectedIds.length}</b> işçi seçilib. Boş buraxılan sahə dəyişmir. Departament/şöbə dəyişikliyi imzasız, dərhal qüvvədə olan köçürmə əmri kimi yazılır; ştat və maaş həddi yoxlanılır.</p>
              <div className="admin-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
                <select aria-label="Yeni departament" value={bulk.department} onChange={(e) => setBulk({ ...bulk, department: e.target.value })}><option value="">Departament dəyişmir</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select>
                <input aria-label="Yeni şöbə" placeholder="Yeni şöbə (istəyə görə)" value={bulk.section} onChange={(e) => setBulk({ ...bulk, section: e.target.value })} />
                <input aria-label="Yeni iş rejimi" placeholder="Yeni iş rejimi (məs. Hibrid)" value={bulk.workMode} onChange={(e) => setBulk({ ...bulk, workMode: e.target.value })} />
                <input type="date" aria-label="Qüvvəyə minmə tarixi" value={bulk.date} onChange={(e) => setBulk({ ...bulk, date: e.target.value })} />
                <button type="button" className="secondary" onClick={() => void runBulk(true)}>Əvvəlcə yoxla</button>
                <button type="button" className="primary" onClick={() => { if (window.confirm(`${selectedIds.length} işçi üçün dəyişiklik tətbiq edilsin?`)) void runBulk(false); }}>Tətbiq et</button>
              </div>
            </>)}
          {bulkResult && <div style={{ marginTop: 8 }}><b>{bulkResult.dryRun ? "Yoxlama nəticəsi (heç nə dəyişməyib)" : "Nəticə"}: {bulkResult.done} uyğun/dəyişdi.</b>{bulkResult.items.filter((i) => i.status === "skipped").map((i) => <p key={i.id} className="danger-text">{i.name || i.id}: {i.reason}</p>)}</div>}
        </div>)}
      {tool === "fields" && (
        <div style={{ marginTop: 8 }}>
          {fieldList.length ? <ul>{fieldList.map((f) => <li key={f.id}>{f.label} <small className="muted">({f.kind === "number" ? "rəqəm" : f.kind === "date" ? "tarix" : "mətn"})</small>{canStaff && <button type="button" className="text-button" onClick={() => { if (window.confirm(`«${f.label}» sahəsi bütün işçilərdən silinsin?`)) call("company/custom-fields/delete", { id: f.id }).then(() => setFieldList(fieldList.filter((x) => x.id !== f.id))).catch(fail); }}> Sil</button>}</li>)}</ul> : <p className="admin-empty">Əlavə sahə yoxdur.</p>}
          {canStaff && <div className="admin-actions" style={{ justifyContent: "flex-start" }}>
            <input aria-label="Sahənin adı" placeholder="Məs. Avtomobil nömrəsi" value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} />
            <select aria-label="Sahənin növü" value={newField.kind} onChange={(e) => setNewField({ ...newField, kind: e.target.value })}><option value="text">Mətn</option><option value="number">Rəqəm</option><option value="date">Tarix</option></select>
            <button type="button" className="primary" onClick={() => call("company/custom-fields", newField).then(() => { setNewField({ label: "", kind: "text" }); return call<{ fields: typeof fieldList }>("company/custom-fields").then((r) => setFieldList(r.fields)); }).catch(fail)}>Sahə əlavə et</button>
          </div>}
          <p className="muted">Dəyərləri işçinin kartında «Ətraflı» pəncərəsindəki «Əlavə sahələr» sekmesində yazın.</p>
        </div>)}
      {tool === "succession" && (succ ? (
        <div style={{ marginTop: 8 }}>
          <p className="muted">Əsas vəzifə: itirilməsi işə ciddi zərər verən vəzifə. Hər birinə varis (hazırlıq dərəcəsi ilə) təyin edilir. {succ.risks ? <b className="danger-text">{succ.risks} əsas vəzifədə risk var.</b> : ""}</p>
          {succ.items.length ? <table className="admin-table"><thead><tr><th>Vəzifə</th><th>Hazırkı işçi</th><th>Varislər</th><th>Risk</th>{canStaff && <th />}</tr></thead><tbody>{succ.items.map((i) => (
            <tr key={i.unitId}><td>{i.department} · {i.position || "—"}</td><td>{i.holders.map((h) => h.name).join(", ") || "—"}</td><td>{i.successors.map((s) => <span key={s.id}>{s.name} <small className="muted">({s.readinessLabel})</small>{canStaff && <button type="button" className="text-button" aria-label={`${s.name} varisliyini sil`} onClick={() => call("company/succession/remove", { id: s.id }).then(reloadSucc).catch(fail)}>×</button>} </span>)}{!i.successors.length && "—"}</td><td className={i.risk ? "danger-text" : ""}>{i.risk || "Yoxdur"}</td>{canStaff && <td><button type="button" className="text-button" onClick={() => call("company/succession/critical", { unitId: i.unitId, critical: false }).then(reloadSucc).catch(fail)}>Əsas vəzifədən çıxar</button></td>}</tr>))}</tbody></table> : <p className="admin-empty">Əsas vəzifə seçilməyib.</p>}
          {canStaff && <div className="admin-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap", marginTop: 8 }}>
            <select aria-label="Ştat sətri" value={pick.unitId} onChange={(e) => setPick({ ...pick, unitId: e.target.value })}><option value="">Əsas vəzifə kimi işarələ…</option>{succ.candidates.map((c) => <option key={c.unitId} value={c.unitId}>{c.label}</option>)}</select>
            <button type="button" className="secondary" disabled={!pick.unitId} onClick={() => call("company/succession/critical", { unitId: pick.unitId, critical: true }).then(() => { setPick({ ...pick, unitId: "" }); return reloadSucc(); }).catch(fail)}>İşarələ</button>
            <select aria-label="Varis işçi" value={pick.employeeId} onChange={(e) => setPick({ ...pick, employeeId: e.target.value })}><option value="">Varis seç…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select aria-label="Hazırlıq" value={pick.readiness} onChange={(e) => setPick({ ...pick, readiness: e.target.value })}><option value="now">Hazırdır</option><option value="year">1 ilə hazır olar</option><option value="later">Daha uzun inkişaf lazımdır</option></select>
            <select aria-label="Hansı vəzifəyə varis" value="" onChange={(e) => { if (e.target.value && pick.employeeId) call("company/succession/successor", { unitId: e.target.value, employeeId: pick.employeeId, readiness: pick.readiness }).then(reloadSucc).catch(fail); }}><option value="">Hansı əsas vəzifəyə varis?</option>{succ.items.map((i) => <option key={i.unitId} value={i.unitId}>{i.department} · {i.position}</option>)}</select>
          </div>}
        </div>) : <p className="muted loading-line">Yüklənir…</p>)}
      {tool === "onboarding" && (tasks ? (
        <div style={{ marginTop: 8 }}>
          <p className="muted">Yeni işçiyə verilən adaptasiya tapşırıqları (işçi JobMatch ilə işə qəbul ediləndə və ya kartda adaptasiya siyahısı yaradılanda). {tasksCustom ? "Şirkətin öz siyahısı işləyir." : "İndi hazır siyahı işləyir (9 tapşırıq); aşağıya yazsanız ona əlavə olunur: «Departament» boşdursa hamıya, doldurulubsa yalnız həmin departamentin yeni işçilərinə."} «Neçənci gün» işə başlama günündən sayılır. Mövcud işçilərin tapşırıqları dəyişmir.</p>
          {tasks.map((t, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 150px 90px auto", gap: 8, marginBottom: 6 }}>
              <input aria-label={`Tapşırıq ${i + 1}`} value={t.title} maxLength={160} onChange={(e) => setTasks(tasks.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} />
              <select aria-label="Departament" value={t.department} onChange={(e) => setTasks(tasks.map((x, k) => (k === i ? { ...x, department: e.target.value } : x)))}><option value="">Hamıya</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select>
              <input type="number" min={0} max={365} aria-label="Neçənci gün" value={t.offsetDays} onChange={(e) => setTasks(tasks.map((x, k) => (k === i ? { ...x, offsetDays: Number(e.target.value) } : x)))} />
              <button type="button" className="text-button" onClick={() => setTasks(tasks.filter((_, k) => k !== i))}>Sil</button>
            </div>
          ))}
          {canStaff && <div className="admin-actions" style={{ justifyContent: "flex-start" }}>
            <button type="button" className="secondary" onClick={() => setTasks([...tasks, { department: "", title: "", offsetDays: 0 }])}>Tapşırıq əlavə et</button>
            <button type="button" className="primary" onClick={() => call("company/onboarding-template", { items: tasks }).then(() => { notify("Qəbul siyahısı saxlanıldı."); return call<{ items: Task[]; custom: boolean }>("company/onboarding-template").then((r) => { setTasks(r.items); setTasksCustom(r.custom); }); }).catch(fail)}>Saxla</button>
            <button type="button" className="text-button" onClick={() => setTasks([])}>Hamısını sil (hazır siyahıya qayıt)</button>
          </div>}
        </div>) : <p className="muted loading-line">Yüklənir…</p>)}
      {tool === "chart" && <div style={{ marginTop: 8 }}><OrgChart notify={notify} /></div>}
    </section>
  );
}
