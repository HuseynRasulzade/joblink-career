"use client";
import { ChevronDown, Headset, LogIn, UserPlus } from "lucide-react";
import { CONTACT } from "@/lib/contact";
import { useEffect, useRef, useState } from "react";
import { localizeTree } from "./i18n";

const LINKS = [
  { href: "#kimler", label: "Kimlər üçün" },
  { href: "#vakansiyalar", label: "Vakansiyalar" },
  { href: "#qiymetler", label: "Qiymətlər" },
  { href: "/kalkulyatorlar", label: "Kalkulyatorlar" },
  { href: "#suallar", label: "Suallar" },
  { href: "#elaqe", label: "Əlaqə" },
];

// The top menu of the public page: sections of the page and one «Daxil ol» button that offers sign-in or registration.
export default function GateNav({ onAuth, language, onLanguage }: { onAuth: (want: "login" | "register") => void; language: "az" | "en" | "ru"; onLanguage: (next: "az" | "en" | "ru") => void }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 30);
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("scroll", onScroll); document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, []);
  const choose = (want: "login" | "register") => { setOpen(false); onAuth(want); };
  return localizeTree(
    <header className={`gate-nav${solid ? " solid" : ""}`}>
      <a className="gate-nav-brand" href="#top" aria-label="JobMatch">jobmatch<span>✳</span></a>
      <nav aria-label="Bölmələr">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
      </nav>
      <div className="gate-nav-right">
      <a className="gate-nav-phone" href={`tel:${CONTACT.phoneHref}`} aria-label={`Zəng et: ${CONTACT.phone}`}><Headset size={17} /><span>{CONTACT.phone}</span></a>
      <select className="gate-nav-lang" aria-label="Language / Dil" value={language} onChange={(e) => onLanguage(e.target.value as "az" | "en" | "ru")}>
        <option value="az">AZ</option>
        <option value="en">EN</option>
        <option value="ru">RU</option>
      </select>
      <div className="gate-nav-auth" ref={box}>
        <button type="button" className="gate-nav-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <LogIn size={16} /> Daxil ol <ChevronDown size={15} />
        </button>
        {open && (
          <div className="gate-nav-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => choose("login")}><LogIn size={16} /><span><b>Daxil ol</b><small>Mövcud hesabla</small></span></button>
            <button type="button" role="menuitem" onClick={() => choose("register")}><UserPlus size={16} /><span><b>Qeydiyyatdan keç</b><small>Pulsuz yeni hesab</small></span></button>
          </div>
        )}
      </div>
      </div>
    </header>,
  );
}
