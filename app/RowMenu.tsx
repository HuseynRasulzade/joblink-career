"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export type RowMenuItem = { label: string; icon?: ReactNode; run: () => void; danger?: boolean };

// The «⋮» menu of a table row. It is drawn at a fixed place next to its button (not inside the table's own scroll box),
// so opening it moves nothing: neither the table nor the page scrolls; it closes on scroll, click outside and Esc.
export default function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const outside = (e: Event) => {
      if (!(e.target as HTMLElement)?.closest?.(".row-menu, .apt-more")) close();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [at]);
  function toggle() {
    if (at) return setAt(null);
    const r = button.current!.getBoundingClientRect();
    const height = items.length * 38 + 16;
    // Opens downwards; upwards when there is no room below.
    const top = r.bottom + height > window.innerHeight ? Math.max(8, r.top - height) : r.bottom + 4;
    setAt({ top, left: Math.max(8, Math.min(r.right - 220, window.innerWidth - 228)) });
  }
  return (
    <>
      <button ref={button} type="button" className="apt-more" aria-label={label} aria-haspopup="menu" aria-expanded={!!at} onClick={toggle}>
        <MoreVertical size={17} />
      </button>
      {at && createPortal(
        <div className="row-menu" role="menu" style={{ top: at.top, left: at.left }}>
          {items.map((x) => (
            <button
              key={x.label}
              type="button"
              role="menuitem"
              className={x.danger ? "danger" : ""}
              onClick={() => {
                setAt(null);
                x.run();
              }}
            >
              {x.icon}
              {x.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
