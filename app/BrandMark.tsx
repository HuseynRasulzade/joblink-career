import { useId } from "react";

// The JobMatch mark: two overlapping rings (a job and a person) whose overlap is filled — the "match" — on an ember tile.
// The same drawing is public/joblink.svg (favicon) and the app icons.
export default function BrandMark({ className = "brand-mark" }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg className={className} viewBox="0 0 32 32" width="1em" height="1em" role="img" aria-label="JobMatch" focusable="false">
      <defs>
        <linearGradient id={`g${id}`} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff9a5c" />
          <stop offset="1" stopColor="#e5501f" />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <circle cx="12.4" cy="16" r="7.4" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#g${id})`} />
      <circle cx="12.4" cy="16" r="7.4" fill="none" stroke="#fff" strokeOpacity="0.92" strokeWidth="2.2" />
      <circle cx="19.6" cy="16" r="7.4" fill="none" stroke="#fff" strokeWidth="2.2" />
      <circle cx="19.6" cy="16" r="7.4" fill="#fff" clipPath={`url(#c${id})`} />
    </svg>
  );
}
