"use client";
import { REJECTION_NOTE_TEMPLATES, waitingLabel } from "@/lib/review-queue";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, FileText, ShieldCheck, Upload } from "lucide-react";
import { type Profile, candidateCertifications } from "@/lib/model";
import { certificationById } from "@/lib/certification-catalog";
import { VERIFICATION_LABELS, type AiDocumentCheck } from "@/lib/verification";
import { formatDate } from "@/lib/dates";
import { siteLanguage } from "./i18n";

type Verification = {
  id: string;
  kind: "experience" | "certification";
  item_key: string;
  item_label: string;
  doc_name: string;
  status: string;
  ai_result: AiDocumentCheck | null;
  admin_note: string;
  updated: string;
  user_name?: string;
};
type Notify = (message: string) => void;
const when = (value: string) => formatDate(value, siteLanguage(), { time: true });

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
function readFile(file: File): Promise<{ name: string; type: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, data: String(reader.result).split(",")[1] || "" });
    reader.onerror = () => reject(new Error("Fayl oxunmadı."));
    reader.readAsDataURL(file);
  });
}
function AiSummary({ check }: { check: AiDocumentCheck | null }) {
  if (!check) return null;
  const marks: [string, boolean | null][] = [["Ad", check.matches.name], ["Təşkilat", check.matches.organization], ["Vəzifə / ad", check.matches.title], ["Tarixlər", check.matches.dates]];
  return (
    <div className="ai-check">
      <p>{check.summary}</p>
      <div className="ai-check-marks">
        {marks.map(([label, value]) => (
          <span key={label} className={value === true ? "ok" : value === false ? "bad" : "unknown"}>{label}: {value === true ? "uyğundur" : value === false ? "uyğun deyil" : "görünmür"}</span>
        ))}
        <span>{check.hasSignatureOrStamp ? "İmza/möhür var" : "İmza/möhür görünmür"}</span>
        <span>Etibar: {check.confidence}%</span>
      </div>
      {!!check.issues.length && <ul>{check.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
    </div>
  );
}

// Candidate: prove workplaces and certificates with a document.
export function VerificationPanel({ profile, notify }: { profile: Profile; notify: Notify }) {
  const [list, setList] = useState<Verification[]>([]);
  const [busy, setBusy] = useState("");
  const load = useCallback(() => {
    request<{ verifications: Verification[] }>("verifications").then((d) => setList(d.verifications)).catch(() => {});
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [load]);
  const items = [
    ...profile.experiences.filter((e) => e.company && e.title).map((e) => ({ kind: "experience" as const, key: e.id, label: `${e.title} · ${e.company}`, hint: "Əmək kitabçası səhifəsi, iş yerindən arayış və ya əmək müqaviləsi" })),
    ...candidateCertifications(profile).filter((c) => c.status === "active").map((c) => ({ kind: "certification" as const, key: c.id, label: `${certificationById(c.id)?.name || c.id}${c.level ? ` (${c.level})` : ""}`, hint: "Sertifikatın PDF-i və ya nəticə vərəqəsi" })),
  ];
  async function upload(item: (typeof items)[number], file: File) {
    if (file.size > 1024 * 1024) return notify("Fayl 1 MB-dan böyük olmamalıdır.");
    setBusy(`${item.kind}:${item.key}`);
    try {
      const document = await readFile(file);
      const result = await request<{ status: string; label: string }>("verifications/submit", { kind: item.kind, itemKey: item.key, document });
      notify(result.status === "ai_consistent" ? "AI sənədi uyğun gördü. Administrator təsdiqindən sonra işəgötürənlər “təsdiqlənib” nişanını görəcək." : result.status === "ai_issue" ? "AI sənəddə uyğunsuzluq tapdı; administrator yoxlayacaq. Lazım olsa, daha aydın sənəd yükləyin." : "Sənəd yükləndi, yoxlanılır.");
      load();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (!items.length) return null;
  return (
    <section className="panel verification-panel">
      <h3><ShieldCheck size={18} /> Sənədlə təsdiq</h3>
      <p className="muted">İş yerlərinizi və sertifikatlarınızı sənədlə təsdiqləyin. AI sənədi profilinizlə tutuşdurur, administrator yekun qərar verir. Təsdiqlənmiş məlumatlar işəgötürənə nişanla göstərilir. Sənədin özünü işəgötürən görmür.</p>
      {items.map((item) => {
        const v = list.find((x) => x.kind === item.kind && x.item_key === item.key);
        const id = `${item.kind}:${item.key}`;
        return (
          <article key={id} className="verification-row">
            <div>
              <strong>{item.label}</strong>
              <small>{item.kind === "experience" ? "İş yeri" : "Sertifikat"} · {item.hint}</small>
              {v && (
                <>
                  <span className={`verification-status ${v.status}`}>{v.status === "verified" && <BadgeCheck size={13} />} {VERIFICATION_LABELS[v.status] || v.status}</span>
                  {v.admin_note && <small>Admin qeydi: {v.admin_note}</small>}
                  <small><a href={`/api/joblink/verifications/doc?id=${encodeURIComponent(v.id)}`} target="_blank" rel="noreferrer"><FileText size={12} /> {v.doc_name}</a> · {when(v.updated)}</small>
                  {v.status !== "verified" && <AiSummary check={v.ai_result} />}
                </>
              )}
            </div>
            {v?.status !== "verified" && (
              <label className={`secondary upload-button ${busy === id ? "busy" : ""}`}>
                <Upload size={14} /> {busy === id ? "AI yoxlayır…" : v ? "Yenidən yüklə" : "Sənəd yüklə"}
                <input type="file" hidden disabled={!!busy} accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(item, f); }} />
              </label>
            )}
          </article>
        );
      })}
    </section>
  );
}

// Admin: final decision on uploaded proof documents.
export function AdminVerifications({ notify }: { notify: Notify }) {
  const [list, setList] = useState<Verification[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(() => {
    request<{ verifications: Verification[] }>("admin/verifications").then((d) => setList(d.verifications)).catch((e) => notify((e as Error).message));
  }, [notify]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [load]);
  async function decide(id: string, decision: "verified" | "rejected") {
    try {
      await request("admin/verification-decide", { id, decision, note: notes[id] || "" });
      notify(decision === "verified" ? "Təsdiqləndi." : "Rədd edildi.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!list) return <p className="muted">Yüklənir…</p>;
  return (
    <section className="panel admin-table-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>İstifadəçi</th><th>İddia</th><th>Sənəd</th><th>AI rəyi</th><th>Qərar</th></tr></thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id}>
                <td><strong>{v.user_name}</strong><small className="skill-description">{when(v.updated)}{["pending", "ai_consistent", "ai_issue"].includes(v.status) ? ` · ${waitingLabel(v.updated)}` : ""}</small></td>
                <td>{v.kind === "experience" ? "İş yeri" : "Sertifikat"}<small className="skill-description">{v.item_label}</small></td>
                <td><a href={`/api/joblink/admin/verification-doc?id=${encodeURIComponent(v.id)}`} target="_blank" rel="noreferrer"><FileText size={13} /> {v.doc_name}</a></td>
                <td><span className={`verification-status ${v.status}`}>{VERIFICATION_LABELS[v.status] || v.status}</span><AiSummary check={v.ai_result} /></td>
                <td>
                  {["pending", "ai_consistent", "ai_issue"].includes(v.status) ? (
                    <div className="approval-actions">
                      <select aria-label="Rədd səbəbi şablonu" value="" onChange={(e) => { const tpl = REJECTION_NOTE_TEMPLATES.find((x) => x.id === e.target.value); if (tpl) setNotes({ ...notes, [v.id]: tpl.text }); }}>
                        <option value="">Hazır səbəb…</option>
                        {REJECTION_NOTE_TEMPLATES.map((x) => <option key={x.id} value={x.id}>{x.text.slice(0, 40)}…</option>)}
                      </select>
                      <input placeholder="Qeyd (rədd üçün məcburi)" value={notes[v.id] || ""} onChange={(e) => setNotes({ ...notes, [v.id]: e.target.value })} />
                      <button onClick={() => decide(v.id, "rejected")}>Rədd et</button>
                      <button className="primary" onClick={() => decide(v.id, "verified")}>Təsdiqlə</button>
                    </div>
                  ) : v.admin_note || "—"}
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5}><p className="admin-empty">Yoxlanacaq sənəd yoxdur.</p></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
