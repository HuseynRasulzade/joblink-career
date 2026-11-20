"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

// The public pages open in the dark ember look. This button switches them to the white look (html[data-pub="light"]);
// the choice is kept in this browser under the key the app panels use too, so both look the same.
export default function PublicTheme() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    setLight(document.documentElement.dataset.pub === "light");
  }, []);
  const flip = () => {
    const next = !light;
    setLight(next);
    if (next) document.documentElement.dataset.pub = "light";
    else delete document.documentElement.dataset.pub;
    try {
      window.localStorage.setItem("joblink-theme", next ? "light" : "dark");
    } catch {
      /* not saved */
    }
  };
  const label = light ? "Qaranlıq rejim" : "Açıq (ağ) rejim";
  return (
    <button type="button" className="gate-nav-theme" onClick={flip} aria-pressed={light} aria-label={label} title={label}>
      {light ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}
