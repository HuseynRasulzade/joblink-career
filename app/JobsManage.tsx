"use client";
import { useState } from "react";
import type { Job } from "@/lib/model";
import { CLOSE_REASONS } from "@/lib/job-edit";
import { Field, JobForm, Modal } from "./components";

type Api = (path: string, body?: unknown) => Promise<any>;
type Notify = (message: string) => void;

const FIELD_LABELS: Record<string, string> = {
  title: "vəzifə", company: "şirkət", city: "şəhər", mode: "iş rejimi", type: "məşğulluq növü", category: "kateqoriya",
  minSalary: "minimum maaş", maxSalary: "maksimum maaş", minYears: "minimum təcrübə", maxYears: "maksimum təcrübə", skills: "bacarıqlar",
  description: "təsvir", requirements: "tələblər", workSchedule: "iş qrafiki", address: "ünvan", benefits: "üstünlüklər",
  certifications: "sertifikatlar", stages: "mərhələlər", deadline: "son tarix", reason: "yaranma səbəbi", reasonNote: "səbəb qeydi",
};

// Edit a published or paused vacancy in place.
export function EditJobModal({ job, api, onClose, onSaved, notify }: { job: Job; api: Api; onClose: () => void; onSaved: () => void; notify: Notify }) {
  const [draft, setDraft] = useState<Job>(job);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const result = (await api("hr/job-update", { jobId: job.id, changes: draft })) as { changed: string[] };
      notify(result.changed.length ? `Yadda saxlanıldı: ${result.changed.map((k) => FIELD_LABELS[k] || k).join(", ")}.` : "Dəyişiklik yoxdur.");
      onSaved();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Redaktə: ${job.title}`} onClose={onClose}>
      <div className="offer-composer">
        <JobForm job={draft} onChange={setDraft} />
        <p className="muted fine-print">Dəyişiklik elanda dərhal görünür və fəaliyyət jurnalına yazılır. Artıq müraciət etmiş namizədlərə bildiriş getmir.</p>
        <button className="primary" disabled={busy || !draft.title.trim() || !draft.company.trim()} onClick={save}>Yadda saxla</button>
      </div>
    </Modal>
  );
}

// Close (archive) a vacancy and say why.
export function CloseJobModal({ job, api, onClose, onClosed, notify }: { job: Job; api: Api; onClose: () => void; onClosed: () => void; notify: Notify }) {
  const [reason, setReason] = useState("filled");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function close() {
    setBusy(true);
    try {
      await api("job-status", { jobId: job.id, action: "archive", closeReason: reason, closeNote: note });
      notify("Vakansiya bağlandı.");
      onClosed();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`“${job.title}” bağlansın?`} onClose={onClose}>
      <div className="offer-composer">
        <Field label="Bağlama səbəbi">
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {CLOSE_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Qeyd (istəyə bağlı, daxilidir)"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <p className="muted fine-print">Bağlanmış elan yenidən açılmır. Lazım olsa “Kopyala” ilə yenisini yarada bilərsiniz.</p>
        <button className="primary" disabled={busy} onClick={close}>Vakansiyanı bağla</button>
      </div>
    </Modal>
  );
}
