"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

// Dark mode: the whole page is inverted in CSS (see polish.css), pictures are turned back. The panels open dark (like the public pages)
// until the person chooses the light theme; the choice is remembered in this browser. The mark is removed when the panels close,
// so the dark public pages are never inverted.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem("joblink-theme");
    } catch {
      // no storage: the default (dark) applies
    }
    if (saved !== "light") {
      setDark(true);
      document.documentElement.dataset.theme = "dark";
    }
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, []);
  function flip() {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      window.localStorage.setItem("joblink-theme", next ? "dark" : "light");
    } catch {
      // not saved
    }
  }
  return (
    <button type="button" className="theme-toggle" onClick={flip} aria-pressed={dark} aria-label={dark ? "Açıq rejim" : "Qaranlıq rejim"} title={dark ? "Açıq rejim" : "Qaranlıq rejim"}>
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
