"use client";
import { useEffect, useMemo, useState } from "react";
import GateHero from "./GateHero";
import GateNav from "./GateNav";
import Landing from "./Landing";
import { LocalizeContext, type Localize } from "./localize-context";

type Language = "az" | "en" | "ru";
// The anchors of this page; any other address part (an e-mail link, a shared vacancy, a panel page) belongs to the app.
const ANCHORS = new Set(["", "top", "kecidler", "kimler", "vakansiyalar", "qiymetler", "suallar", "elaqe", "kalkulyatorlar"]);

// The public home page: its own page, apart from the signed-in app. It brings no app code and no translation tables
// (English and Russian load them only when chosen); «Daxil ol» and «Qeydiyyat» continue on the app page.
export default function PublicHome() {
  const [language, setLanguage] = useState<Language>("az");
  const [i18n, setI18n] = useState<typeof import("./i18n") | null>(null);

  useEffect(() => {
    const anchor = window.location.hash.slice(1).split("=")[0];
    if (new URLSearchParams(window.location.search).get("job") || !ANCHORS.has(anchor)) {
      window.location.replace(`/panel${window.location.search}${window.location.hash}`);
      return;
    }
    try {
      const saved = window.localStorage.getItem("joblink-language");
      if (saved === "en" || saved === "ru") setLanguage(saved);
    } catch {
      /* the default language stays */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    if (language === "az") {
      setI18n(null);
      return;
    }
    let alive = true;
    let stop = () => {};
    import("./i18n").then((module) => {
      if (!alive) return;
      module.setSiteLanguage(language);
      setI18n(module);
      const root = document.getElementById("pub-root");
      if (root) stop = module.observeTranslations(root, language);
    });
    return () => {
      alive = false;
      stop();
    };
  }, [language]);

  const localize = useMemo<Localize>(() => (language === "az" || !i18n ? (node) => node : (node) => i18n.localizeTree(node, language)), [language, i18n]);
  const choose = (next: Language) => {
    setLanguage(next);
    try {
      window.localStorage.setItem("joblink-language", next);
    } catch {
      /* not saved */
    }
  };
  const go = (want: "login" | "register") => window.location.assign(`/panel?auth=${want}`);

  return (
    <LocalizeContext.Provider value={localize}>
      <div id="pub-root">
        <GateNav onAuth={go} language={language} onLanguage={choose} />
        <main className="auth-gate" id="top">
          <GateHero />
        </main>
        <Landing onAuth={go} />
      </div>
    </LocalizeContext.Provider>
  );
}
