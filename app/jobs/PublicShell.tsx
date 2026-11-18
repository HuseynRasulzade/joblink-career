import type { ReactNode } from "react";

// The frame of the open vacancy pages: the same dark stage as the sign-in page (top menu, glass cards, dark footer).
export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="pj">
      <header className="gate-nav solid pj-nav">
        <a className="gate-nav-brand" href="/">jobmatch<span>✳</span></a>
        <nav aria-label="Bölmələr">
          <a href="/jobs">Vakansiyalar</a>
          <a href="/kalkulyatorlar">Kalkulyatorlar</a>
          <a href="/#qiymetler">Qiymətlər</a>
        </nav>
        <a className="gate-nav-btn" href="/">Daxil ol / Qeydiyyat</a>
      </header>
      {children}
      <footer className="pj-footer">
        <span className="gate-nav-brand">jobmatch<span>✳</span></span>
        <span><a href="/terms">İstifadə şərtləri</a> · <a href="/privacy">Məxfilik siyasəti</a></span>
      </footer>
    </div>
  );
}
