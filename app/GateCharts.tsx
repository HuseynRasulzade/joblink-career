// Decorative sample charts around the hero figure of the public page. They are illustrations (labelled «Nümunə»), not live data.
const BARS = [34, 48, 41, 58, 52, 66, 61, 74, 69, 82, 78, 92];
const AREA = [78, 74, 70, 71, 62, 58, 55, 47, 44, 36, 32, 26];
const SEGMENTS = [
  { label: "Müraciət", value: 46, color: "#ffb48a" },
  { label: "Müsahibə", value: 34, color: "#ff8a4c" },
  { label: "Təklif", value: 20, color: "#d94c18" },
];

function linePath(values: number[], w: number, h: number) {
  const step = w / (values.length - 1);
  return values.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)} ${((v / 100) * h).toFixed(1)}`).join(" ");
}

export default function GateCharts() {
  const R = 30;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const line = linePath(AREA, 200, 70);
  return (
    <>
      <div className="gate-card gate-card-bars">
        <small>Nümunə: müraciət dinamikası</small>
        <svg viewBox="0 0 200 80" role="img" aria-label="Sütun qrafiki" className="gc-bars">
          {BARS.map((v, i) => (
            <rect key={i} x={i * 16.6 + 2} y={80 - v * 0.8} width={11} height={v * 0.8} rx={3} style={{ animationDelay: `${0.5 + i * 0.07}s` }} />
          ))}
        </svg>
        <div className="gc-foot"><span>son 12 həftə</span><b>↗</b></div>
      </div>
      <div className="gate-card gate-card-donut">
        <small>Nümunə: namizəd mərhələləri</small>
        <div className="gc-donut-row">
          <svg viewBox="0 0 80 80" role="img" aria-label="Dairəvi qrafik" className="gc-donut">
            <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="11" />
            {SEGMENTS.map((s, i) => {
              const len = (s.value / 100) * C;
              const el = (
                <circle key={s.label} cx="40" cy="40" r={R} fill="none" stroke={s.color} strokeWidth="11" strokeDasharray={`${len - 2} ${C - len + 2}`} strokeDashoffset={-offset} transform="rotate(-90 40 40)" strokeLinecap="butt" className="gc-seg" style={{ animationDelay: `${0.6 + i * 0.25}s` }} />
              );
              offset += len;
              return el;
            })}
          </svg>
          <ul className="gc-legend">
            {SEGMENTS.map((s) => (
              <li key={s.label}><i style={{ background: s.color }} />{s.label}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="gate-card gate-card-line">
        <small>Nümunə: işə qəbul sürəti</small>
        <svg viewBox="0 0 200 80" role="img" aria-label="Xətt qrafiki" className="gc-line">
          <defs>
            <linearGradient id="gcFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff8a4c" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ff8a4c" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g transform="translate(0 4)">
            <path d={`${line} L200 76 L0 76 Z`} fill="url(#gcFill)" className="gc-area" />
            <path d={line} fill="none" stroke="#ffd2b0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="gc-stroke" />
            <circle cx="200" cy={(AREA[AREA.length - 1] / 100) * 70} r="4.5" fill="#fff" className="gc-dot" />
          </g>
        </svg>
        <div className="gc-foot"><span>gündən-günə sürətlənir</span><b>↗</b></div>
      </div>
    </>
  );
}
