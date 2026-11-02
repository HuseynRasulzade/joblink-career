"use client";
import { Modal } from "./components";

type Job = { id: string; title: string; company?: string; city?: string };

// Share links of a vacancy for the usual networks and messengers, the plain text to paste, and the XML feed for job boards.
export default function ShareVacancy({ job, notify, onClose }: { job: Job; notify: (message: string) => void; onClose: () => void }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/jobs/${job.id}`;
  const text = `${job.title}${job.company ? ` — ${job.company}` : ""}${job.city ? `, ${job.city}` : ""}\n${url}`;
  const enc = encodeURIComponent;
  const links: [string, string][] = [
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`],
    ["WhatsApp", `https://wa.me/?text=${enc(text)}`],
    ["Telegram", `https://t.me/share/url?url=${enc(url)}&text=${enc(job.title)}`],
    ["X", `https://twitter.com/intent/tweet?text=${enc(job.title)}&url=${enc(url)}`],
    ["E-poçt", `mailto:?subject=${enc(`Vakansiya: ${job.title}`)}&body=${enc(text)}`],
  ];
  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify(`${what} kopyalandı.`);
    } catch {
      notify("Kopyalamaq mümkün olmadı: mətni əl ilə seçin.");
    }
  }
  return (
    <Modal title={`Vakansiyanı paylaş: ${job.title}`} onClose={onClose}>
      <div className="offer-composer">
        <p className="muted">Ünvan: <a href={url} target="_blank" rel="noreferrer">{url}</a></p>
        <div className="admin-actions">
          {links.map(([name, href]) => <a key={name} className="secondary report-button" href={href} target="_blank" rel="noreferrer">{name}</a>)}
        </div>
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => void copy(url, "Link")}>Linki kopyala</button>
          <button type="button" className="secondary" onClick={() => void copy(text, "Mətn")}>Mətni kopyala</button>
        </div>
        <p className="muted">Vakansiya səhifəsi Google-un iş axtarışı üçün strukturlaşdırılmış məlumatla (JobPosting) yayımlanır. Başqa iş saytları və aqreqatorlar bütün açıq vakansiyaları bu XML lentindən oxuya bilər: <a href="/jobs/feed.xml" target="_blank" rel="noreferrer">/jobs/feed.xml</a>.</p>
      </div>
    </Modal>
  );
}
