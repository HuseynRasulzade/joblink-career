"use client";
import { useEffect, useState } from "react";
import type { LegalDoc, LegalLang } from "@/lib/legal-text";

type Props = { kind: "terms" | "privacy"; docs: Record<LegalLang, LegalDoc>; updated: Record<LegalLang, string> };

const UI: Record<LegalLang, { updated: string; contents: string; print: string; other: Record<"terms" | "privacy", [string, string]>; back: string }> = {
  az: { updated: "Son yenilənmə", contents: "Mündəricat", print: "Çap et / PDF", other: { terms: ["Məxfilik siyasəti", "/privacy"], privacy: ["İstifadə şərtləri", "/terms"] }, back: "JobMatch-ə keç" },
  en: { updated: "Last updated", contents: "Contents", print: "Print / PDF", other: { terms: ["Privacy policy", "/privacy"], privacy: ["Terms of use", "/terms"] }, back: "Go to JobMatch" },
  ru: { updated: "Последнее обновление", contents: "Содержание", print: "Печать / PDF", other: { terms: ["Политика конфиденциальности", "/privacy"], privacy: ["Условия использования", "/terms"] }, back: "Перейти в JobMatch" },
};

// One legal page in the three site languages: summary, contents with anchors, numbered sections, print.
export default function LegalPage({ kind, docs, updated }: Props) {
  const [lang, setLang] = useState<LegalLang>("az");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("joblink-language");
      if (saved === "en" || saved === "ru" || saved === "az") setLang(saved);
    } catch {
      /* the default language stays */
    }
  }, []);
  const choose = (next: LegalLang) => {
    setLang(next);
    try {
      localStorage.setItem("joblink-language", next);
    } catch {
      /* not saved */
    }
    document.documentElement.lang = next;
  };
  const doc = docs[lang];
  const ui = UI[lang];
  const [otherTitle, otherHref] = ui.other[kind];
  return (
    <main className="lg">
      <div className="lg-head">
        <div>
          <h1>{doc.title}</h1>
          <p className="lg-meta">{ui.updated}: {updated[lang]}</p>
        </div>
        <div className="lg-tools">
          <div className="lg-lang" role="group" aria-label="Language / Dil">
            {(["az", "en", "ru"] as LegalLang[]).map((code) => (
              <button key={code} type="button" className={lang === code ? "on" : ""} aria-pressed={lang === code} onClick={() => choose(code)}>{code.toUpperCase()}</button>
            ))}
          </div>
          <button type="button" className="lg-print" onClick={() => window.print()}>{ui.print}</button>
        </div>
      </div>
      <section className="lg-summary" aria-label={doc.summaryTitle}>
        <b>{doc.summaryTitle}</b>
        <ul>
          {doc.summary.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>
      <div className="lg-body">
        <nav className="lg-toc" aria-label={ui.contents}>
          <b>{ui.contents}</b>
          <ol>
            {doc.sections.map((section, i) => (
              <li key={section.title}><a href={`#s${i + 1}`}>{section.title}</a></li>
            ))}
          </ol>
          <p><a href={otherHref}>{otherTitle} →</a></p>
        </nav>
        <article className="lg-text">
          {doc.sections.map((section, i) => (
            <section key={section.title} id={`s${i + 1}`}>
              <h2><span>{i + 1}</span>{section.title}</h2>
              {section.body.map((text) => <p key={text}>{text}</p>)}
            </section>
          ))}
          <p className="lg-foot"><a href="/">{ui.back}</a> · <a href={otherHref}>{otherTitle}</a></p>
        </article>
      </div>
    </main>
  );
}
