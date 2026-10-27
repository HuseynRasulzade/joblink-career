"use client";
import { useEffect, useState } from "react";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";

type Saved = { kind: string; candidate_id: string; verdict: "right" | "wrong"; hr_decision: string; hr_score: number | null; note: string };
type Api = (path: string, body?: unknown) => Promise<any>;
const DECISIONS = [
  ["interview", "Müsahibəyə dəvət et"],
  ["consider", "Nəzərə al"],
  ["reject", "Uyğun deyil"],
] as const;

// One request per vacancy, shared by all the cards that ask for the same list.
const cache = new Map<string, Promise<Saved[]>>();
const load = (api: Api, jobId: string) => {
  if (!cache.has(jobId)) {
    cache.set(
      jobId,
      api(`hr/ai-feedback?jobId=${encodeURIComponent(jobId)}`)
        .then((r) => (r.feedback || []) as Saved[])
        .catch(() => []),
    );
  }
  return cache.get(jobId)!;
};

// "Did the AI get this right?" under an AI evaluation. A "wrong" can say what
// the result should have been; the answers measure the AI (see lib/ai-eval.ts).
export function AiFeedback({
  api,
  kind,
  jobId,
  candidateId,
  aiScore,
  ruleScore,
  aiRecommendation,
}: {
  api: Api;
  kind: "rank" | "fit-review";
  jobId: string;
  candidateId: string;
  aiScore: number;
  ruleScore: number;
  aiRecommendation: string;
}) {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [form, setForm] = useState<{ decision: string; score: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    load(api, jobId).then((list) => {
      if (live) setSaved(list.find((x) => x.kind === kind && x.candidate_id === candidateId) || null);
    });
    return () => {
      live = false;
    };
  }, [api, jobId, kind, candidateId]);

  async function send(verdict: "right" | "wrong") {
    setBusy(true);
    setError("");
    try {
      const body = {
        kind,
        jobId,
        candidateId,
        verdict,
        aiScore,
        ruleScore,
        aiRecommendation,
        ...(verdict === "wrong" && form ? { hrDecision: form.decision, hrScore: form.score, note: form.note } : {}),
      };
      await api("hr/ai-feedback", body);
      const next: Saved = {
        kind,
        candidate_id: candidateId,
        verdict,
        hr_decision: verdict === "wrong" ? form?.decision || "" : "",
        hr_score: verdict === "wrong" && form?.score ? Number(form.score) : null,
        note: verdict === "wrong" ? form?.note || "" : "",
      };
      const list = (await load(api, jobId)).filter((x) => !(x.kind === kind && x.candidate_id === candidateId));
      cache.set(jobId, Promise.resolve([...list, next]));
      setSaved(next);
      setForm(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (form)
    return (
      <div className="ai-feedback">
        <b>Sizcə nəticə nə olmalıdır?</b>
        <select value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })} aria-label="Düzgün qərar">
          <option value="">Qərar seçin (könüllü)</option>
          {DECISIONS.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <input type="number" min={0} max={100} placeholder="Bal 0–100 (könüllü)" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} aria-label="Düzgün bal" />
        <textarea rows={2} maxLength={400} placeholder="Nə yanlışdır? (könüllü)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} aria-label="Qeyd" />
        {error && <small role="alert">{error}</small>}
        <div className="ai-feedback-actions">
          <button className="secondary" disabled={busy} onClick={() => send("wrong")}>Göndər</button>
          <button className="text-button" onClick={() => setForm(null)}>Ləğv et</button>
        </div>
      </div>
    );
  if (saved)
    return (
      <div className="ai-feedback done">
        <Check size={13} /> {saved.verdict === "right" ? "“AI düz dedi” kimi qeyd olundu." : "“AI yanlış dedi” kimi qeyd olundu."} Təşəkkür edirik.{" "}
        <button className="text-button" onClick={() => setSaved(null)}>Dəyiş</button>
      </div>
    );
  return (
    <div className="ai-feedback">
      <span>AI düz dedi?</span>
      <button className="text-button" disabled={busy} onClick={() => send("right")}><ThumbsUp size={13} /> Düz</button>
      <button className="text-button" disabled={busy} onClick={() => setForm({ decision: "", score: "", note: "" })}><ThumbsDown size={13} /> Yanlış</button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
