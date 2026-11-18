"use client";
import { superGrossParts, type Sector } from "@/lib/salary";

const azn = (v: number) => `${v.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;
const COLORS = ["#147b70", "#2aa595", "#e2a93b", "#6b8f8a"];

// Shows what the super-gross (the employer's total cost of one employee) consists of: the gross pay plus three employer contributions.
export default function SuperGross({ gross, sector }: { gross: number; sector: Sector }) {
  const p = superGrossParts(gross, sector);
  if (!p.total) return null;
  const parts = [{ label: "Gross maaş (işçiyə hesablanan)", amount: p.gross, rule: "İşçinin maaşı vergi və işçi ayırmalarından əvvəl.", tiers: [] as { text: string; amount: number }[] }, ...p.lines];
  return (
    <section className="super-gross" aria-label="Super-gross necə yaranır">
      <h4>Super-gross necə yaranır?</h4>
      <p className="muted fine-print">
        Super-gross işəgötürənin bir işçiyə ayda ödədiyi <b>ümumi xərcdir</b>: işçinin gross maaşı və üstünə işəgötürənin öz hesabına ödədiyi üç sığorta payı. Bu paylar işçinin maaşından tutulmur, ayrıca ödənilir.
      </p>
      <div className="sg-bar" role="img" aria-label={`Super-gross ${azn(p.total)}`}>
        {parts.map((x, i) => (
          <span key={x.label} style={{ width: `${Math.max(1.5, (x.amount / p.total) * 100)}%`, background: COLORS[i % COLORS.length] }} title={`${x.label}: ${azn(x.amount)}`} />
        ))}
      </div>
      <ul className="sg-list">
        {parts.map((x, i) => (
          <li key={x.label}>
            <span className="sg-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <div>
              <div className="sg-row"><span>{i > 0 ? "+ " : ""}{x.label}</span><b>{azn(x.amount)}</b></div>
              <small className="muted">{x.rule}</small>
              {x.tiers.length > 1 && <small className="sg-tiers">{x.tiers.map((t) => `${t.text} = ${azn(t.amount)}`).join("  ·  ")}</small>}
            </div>
          </li>
        ))}
        <li className="sg-total">
          <span className="sg-dot" style={{ background: "#14262a" }} />
          <div className="sg-row"><span>= Super-gross (işəgötürənin ümumi xərci)</span><b>{azn(p.total)}</b></div>
        </li>
      </ul>
      <p className="muted fine-print">İşəgötürən paylarının cəmi gross maaşın {String(p.shareOfGross).replace(".", ",")}%-i qədərdir.</p>
    </section>
  );
}
