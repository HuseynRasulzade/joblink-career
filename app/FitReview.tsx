"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { FitReview } from "@/lib/fit-review";
import { recommendationForScore } from "@/lib/ai-eval";
import { AiFeedback } from "./AiFeedback";

const VERDICT: Record<FitReview["verdict"], string> = {
  strong: "Güclü uyğunluq",
  good: "Yaxşı uyğunluq",
  partial: "Qismən uyğunluq",
  weak: "Zəif uyğunluq",
};
const SEVERITY = { critical: "Kritik", important: "Vacib", minor: "Kiçik" } as const;

// AI review of one candidate against one vacancy. The server checks every
// quote against the candidate's data and keeps the score near the rule-based
// result, so only a validated review ever reaches this panel.
export function FitReviewPanel({
  api,
  jobId,
  candidateId,
  language,
  audience,
}: {
  api: (path: string, body?: unknown) => Promise<any>;
  jobId: string;
  candidateId?: string;
  language: "az" | "en" | "ru";
  audience: "candidate" | "employer";
}) {
  const [review, setReview] = useState<FitReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      setReview(((await api("fit-review", { jobId, candidateId, language })) as { review: FitReview }).review);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fit-review">
      {!review && (
        <button className="secondary" onClick={run} disabled={busy}>
          <Sparkles size={16} /> {busy ? "AI qiymətləndirir…" : "AI qiymətləndirməsi"}
        </button>
      )}
      {error && <p className="fit-review-error" role="alert">{error}</p>}
      {review && (
        <div className={`fit-review-card ${review.verdict}`}>
          <h4>
            {VERDICT[review.verdict]} · {review.score}%
          </h4>
          <p><b>{review.headline}</b></p>
          <p>{review.summary}</p>
          {review.adjustment.points !== 0 && (
            <p className="muted">
              Qayda əsaslı skor {review.ruleScore}%, AI düzəlişi {review.adjustment.points > 0 ? "+" : ""}
              {review.adjustment.points}: {review.adjustment.reason}
            </p>
          )}
          {!!review.strengths.length && (
            <>
              <h5>Güclü tərəflər</h5>
              <ul>
                {review.strengths.map((s) => (
                  <li key={s.point}>
                    ✓ {s.point} <q className="muted">{s.evidence}</q>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!!review.gaps.length && (
            <>
              <h5>Boşluqlar</h5>
              <ul>
                {review.gaps.map((g) => (
                  <li key={g.point}>
                    <b>{SEVERITY[g.severity]}:</b> {g.point}
                    {g.howToClose && <span className="muted"> — {g.howToClose}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {audience === "employer" && !!review.questions.length && (
            <>
              <h5>Müsahibə sualları</h5>
              <ul>
                {review.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </>
          )}
          {audience === "employer" && candidateId && (
            <AiFeedback
              api={api}
              kind="fit-review"
              jobId={jobId}
              candidateId={candidateId}
              aiScore={review.score}
              ruleScore={review.ruleScore}
              aiRecommendation={recommendationForScore(review.score)}
            />
          )}
          <small className="muted">
            AI şərhi kömək məqsədi daşıyır, yekun qərar deyil. Hər güclü tərəf profildən sitatla təsdiqlənir.
          </small>
        </div>
      )}
    </div>
  );
}
