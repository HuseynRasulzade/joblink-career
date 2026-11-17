"use client";
import { Check } from "lucide-react";

export type FirstStep = { label: string; hint: string; done: boolean; page: string };
// A short "first steps" card for a new account: it disappears once every step is done.
export default function FirstSteps({ steps, go, title = "İlk addımlar" }: { steps: FirstStep[]; go: (page: string) => void; title?: string }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const percent = Math.round((done / steps.length) * 100);
  return (
    <section className="first-steps" aria-label={title}>
      <div className="first-steps-head">
        <div>
          <h3>{title}</h3>
          <p className="muted">{done} / {steps.length} tamamlanıb</p>
        </div>
        <div className="first-steps-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${percent}% tamamlanıb`}><span style={{ width: `${percent}%` }} /></div>
      </div>
      <ol>
        {steps.map((s) => (
          <li key={s.label} className={s.done ? "done" : ""}>
            <span className="first-steps-mark" aria-hidden="true">{s.done ? <Check size={14} /> : null}</span>
            <span className="first-steps-text"><b>{s.label}</b><small>{s.hint}</small></span>
            {!s.done && <button type="button" className="secondary" onClick={() => go(s.page)}>Başla</button>}
            {s.done && <span className="first-steps-ok">Hazırdır</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
