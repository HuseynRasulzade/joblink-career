"use client";
import { useCallback, useEffect, useState } from "react";
import type { Job } from "@/lib/model";
import { Field, Modal } from "./components";

type Notify = (message: string) => void;
type Template = { id: string; name: string; title: string; city: string; updated: string; author: string; canDelete: boolean };

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

// Copy a published vacancy into a new draft.
export async function duplicateJob(jobId: string): Promise<Job> {
  return (await request<{ draft: Job }>("hr/job-duplicate", { jobId })).draft;
}

// The company's saved templates: start a new draft from one or delete it.
export function TemplatesModal({ onClose, onUse, notify }: { onClose: () => void; onUse: (draft: Job) => void; notify: Notify }) {
  const [list, setList] = useState<Template[] | null>(null);
  const load = useCallback(() => {
    request<{ templates: Template[] }>("hr/job-templates").then((d) => setList(d.templates)).catch((error) => notify((error as Error).message));
  }, [notify]);
  useEffect(load, [load]);
  async function use(t: Template) {
    try {
      const data = await request<{ draft: Job }>("hr/job-templates/use", { id: t.id });
      onUse(data.draft);
      onClose();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function remove(t: Template) {
    if (!window.confirm(`“${t.name}” şablonu silinsin?`)) return;
    try {
      await request("hr/job-templates/delete", { id: t.id });
      notify("Şablon silindi.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <Modal title="Vakansiya şablonları" onClose={onClose}>
      {list === null ? (
        <p className="muted">Yüklənir…</p>
      ) : list.length ? (
        <div className="offer-composer">
          {list.map((t) => (
            <div key={t.id} className="exam-row">
              <div>
                <strong>{t.name}</strong>
                <small>{[t.title, t.city, t.author].filter(Boolean).join(" · ")}</small>
              </div>
              <div className="admin-actions">
                <button className="primary" onClick={() => use(t)}>İstifadə et</button>
                {t.canDelete && <button onClick={() => remove(t)}>Sil</button>}
              </div>
            </div>
          ))}
          <p className="muted fine-print">Şablondan yeni layihə yaranır. Son tarix və vakansiyanın yaranma səbəbi hər dəfə yenidən daxil edilir.</p>
        </div>
      ) : (
        <p className="muted">Hələ şablon yoxdur. Vakansiyalarım siyahısında “Şablon kimi saxla” düyməsi ilə və ya layihə səhifəsində əlavə edin.</p>
      )}
    </Modal>
  );
}

// Save a published vacancy (jobId) or the draft on screen (job) as a template.
export function SaveTemplateModal({ jobId, job, defaultName, onClose, notify }: { jobId?: string; job?: Job; defaultName: string; onClose: () => void; notify: Notify }) {
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  async function save(replace = false) {
    setBusy(true);
    try {
      await request("hr/job-templates/save", { name, jobId, job, replace });
      notify("Şablon yadda saxlanıldı.");
      onClose();
    } catch (error) {
      const message = (error as Error).message;
      if (message.startsWith("Bu adla şablon var") && window.confirm("Bu adla şablon var. Üzərinə yazılsın?")) await save(true);
      else notify(message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Şablon kimi saxla" onClose={onClose}>
      <div className="offer-composer">
        <Field label="Şablonun adı"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <p className="muted fine-print">Vəzifə, təsvir, tələblər, bacarıqlar, maaş aralığı və mərhələlər saxlanılır. Son tarix və yaranma səbəbi saxlanılmır.</p>
        <button className="primary" disabled={busy || name.trim().length < 3} onClick={() => save()}>Saxla</button>
      </div>
    </Modal>
  );
}
