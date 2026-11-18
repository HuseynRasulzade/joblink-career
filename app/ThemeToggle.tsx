"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

// Dark mode: the whole page is inverted in CSS (see polish.css), pictures are turned back. The choice is remembered in this browser.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("joblink-theme");
      if (saved === "dark") {
        setDark(true);
        document.documentElement.dataset.theme = "dark";
      }
    } catch {
      // no storage: light theme
    }
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
