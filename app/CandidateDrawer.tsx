"use client";
import type { Loose } from "@/lib/loose";
import { useEffect, useState, type ReactNode } from "react";
import { match, years, type Application, type Job, type Profile } from "@/lib/model";
import { formatDate } from "@/lib/dates";
import { Modal } from "./components";
import BrandedCv from "./BrandedCv";
import { CertificationBadges } from "./CertificationPickers";
import { candidateCertifications } from "@/lib/model";

type Note = { id: string; author_id: string; author_name: string; text: string; created: string };
type Ev = { type: string; from_value: string; to_value: string; note?: string; created: string };

const LEVEL: Record<string, string> = { strong: "güclü", good: "yaxşı", partial: "qismən", weak: "zəif", none: "bilinmir" };
const digits = (phone: string) => phone.replace(/[^\d]/g, "");
// Azerbaijani numbers are often written without the country code; WhatsApp needs it.
const waNumber = (phone: string) => {
  const d = digits(phone);
  if (d.startsWith("994")) return d;
  if (d.startsWith("0")) return `994${d.slice(1)}`;
  return d.length === 9 ? `994${d}` : d;
};

// The "Ətraflı" side panel of a candidate: how to reach them, shortcuts to the CV, why they fit (by the platform's rules),
// the whole profile, the company's private notes and the history of the application. The same body is used for the
// applicants and for the suitable candidates; AI is not part of it.
export default function CandidateDrawer({
  profile,
  candidateId,
  application,
  job,
  api,
  notify,
  canNote,
  onFullProfile,
  children,
}: {
  profile: Profile;
  candidateId?: string;
  application?: Application;
  job?: Job | null;
  api: (path: string, body?: unknown) => Promise<Loose>;
  notify: (message: string) => void;
  canNote: boolean;
  onFullProfile: () => void;
  children?: ReactNode;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [cvOpen, setCvOpen] = useState(false);
  const [cvText, setCvText] = useState(false);
  const fit = job ? match(profile, job) : null;

  useEffect(() => {
    if (!candidateId || !canNote) return;
    let live = true;
    api(`hr/candidate-notes?candidateId=${encodeURIComponent(candidateId)}`)
      .then((d) => live && setNotes(d.notes || []))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [candidateId, canNote]);
  useEffect(() => {
    if (!application?.id) return;
    let live = true;
    api(`hr/application-events?id=${encodeURIComponent(application.id)}`)
      .then((d) => live && setEvents(d.events || []))
      .catch(() => live && setEvents([]));
    return () => {
      live = false;
    };
  }, [application?.id]);

  async function addNote() {
    if (!candidateId || !draft.trim()) return;
    try {
      await api("hr/candidate-notes/save", { candidateId, text: draft.trim() });
      setDraft("");
      const d = await api(`hr/candidate-notes?candidateId=${encodeURIComponent(candidateId)}`);
      setNotes(d.notes || []);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function removeNote(id: string) {
    if (!window.confirm("Qeyd silinsin?")) return;
    try {
      await api("hr/candidate-notes/delete", { id });
      setNotes((n) => n.filter((x) => x.id !== id));
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${what} kopyalandı.`);
    } catch {
      notify(text);
    }
  }
  const salary = profile.salary
    ? `${profile.salary}${profile.salaryMax ? `–${profile.salaryMax}` : ""} AZN${profile.salaryKind === "net" ? " (net)" : profile.salaryKind === "gross" ? " (gross)" : ""}`
    : "göstərilməyib";
  const vacancySalary = job && (job.minSalary || job.maxSalary) ? `${job.minSalary || 0}–${job.maxSalary || job.minSalary} AZN` : "";
  const over = !!(job && profile.salary && job.maxSalary && profile.salary > job.maxSalary);
  const certs = candidateCertifications(profile);
  const lines = (t: string) => t.split(/\n+/).map((x) => x.trim()).filter(Boolean);

  return (
    <div className="cand-drawer">
      <header className="cand-head">
        <p className="muted">
          {profile.title || "Vəzifə göstərilməyib"} · {profile.city || "—"} · {years(profile)} il təcrübə
        </p>
        {profile.code && (
          <p className="cand-meta">
            <span className="cand-chip">Kod: {profile.code}</span>
            <button type="button" className="text-button" onClick={() => copy(profile.code!, "Kod")}>Kopyala</button>
          </p>
        )}
        {application && (
          <p className="cand-meta">
            <span className="cand-chip">{application.status}</span>
            <span className="muted">Müraciət: {formatDate(application.created)}</span>
          </p>
        )}
        {!!fit && (
          <p className="cand-meta">
            <span className="cand-chip strong">{fit.score}% uyğunluq</span>
            <span className="muted">{fit.fit.bandLabel}</span>
          </p>
        )}
      </header>

      <section className="cand-block">
        <h4>Əlaqə</h4>
        {profile.phone || profile.email ? (
          <ul className="cand-contact">
            {profile.phone && (
              <li>
                <span>📞 {profile.phone}</span>
                <span className="cand-actions">
                  <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>Zəng et</a>
                  <a href={`https://wa.me/${waNumber(profile.phone)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                  <button type="button" onClick={() => copy(profile.phone, "Nömrə")}>Kopyala</button>
                </span>
              </li>
            )}
            {profile.email && (
              <li>
                <span>✉ {profile.email}</span>
                <span className="cand-actions">
                  <a href={`mailto:${profile.email}`}>E-poçt</a>
                  <button type="button" onClick={() => copy(profile.email, "E-poçt")}>Kopyala</button>
                </span>
              </li>
            )}
          </ul>
        ) : (
          <p className="muted">Namizəd əlaqə məlumatı göstərməyib. Platformadan “Mesaj yaz” ilə yaza bilərsiniz.</p>
        )}
        {profile.links && <p className="cand-links">{profile.links}</p>}
      </section>

      <section className="cand-block">
        <h4>CV-yə qısa yollar</h4>
        <div className="cand-shortcuts">
          <button type="button" className="secondary" onClick={() => setCvOpen(true)}>CV-ni aç / PDF</button>
          <button type="button" className="secondary" onClick={onFullProfile}>Tam profil</button>
          {!!profile.cvText && (
            <button type="button" className="secondary" onClick={() => setCvText((v) => !v)}>
              {cvText ? "CV mətnini gizlət" : "CV mətni"}
            </button>
          )}
        </div>
        {profile.cvName && <p className="muted">Yüklənmiş fayl: {profile.cvName}</p>}
        {cvText && <pre className="cand-cvtext">{profile.cvText}</pre>}
      </section>

      {fit && job && (
        <section className="cand-block">
          <h4>Vakansiyaya uyğunluq — {job.title}</h4>
          <ul className="cand-parts">
            {fit.fit.parts.map((p) => (
              <li key={p.key} className={`lvl-${p.level}`}>
                <b>{p.label}</b> <span className="cand-chip">{LEVEL[p.level] || p.level}</span>
                <small>{p.note}</small>
              </li>
            ))}
          </ul>
          {!!fit.matched.length && (
            <p>
              <span className="muted">Uyğun bacarıqlar: </span>
              {fit.matched.map((s) => <span className="matched skill-pill" key={s}>{s}</span>)}
            </p>
          )}
          {!!fit.missing.length && (
            <p>
              <span className="muted">Çatışmayan: </span>
              {fit.missing.map((s) => <span className="missing skill-pill" key={s}>{s}</span>)}
            </p>
          )}
          <p className={over ? "cand-warn" : "muted"}>
            Gözlənti: {salary}{vacancySalary ? ` · Vakansiya: ${vacancySalary}` : ""}
            {over ? " — gözlənti vakansiyanın yuxarı həddindən çoxdur" : ""}
          </p>
        </section>
      )}
      {!fit && (
        <section className="cand-block">
          <h4>Şərtlər</h4>
          <p className="muted">Maaş gözləntisi: {salary} · İş rejimi: {profile.mode || "—"}</p>
        </section>
      )}

      {!!profile.summary && (
        <section className="cand-block">
          <h4>Xülasə</h4>
          <p>{profile.summary}</p>
        </section>
      )}
      {!!profile.skills.length && (
        <section className="cand-block">
          <h4>Bacarıqlar</h4>
          <div className="skill-tags">{profile.skills.map((s) => <span key={s}>{s}</span>)}</div>
        </section>
      )}
      {!!profile.experiences.length && (
        <section className="cand-block">
          <h4>İş təcrübəsi</h4>
          <ul className="cand-list">
            {profile.experiences.map((x) => (
              <li key={x.id}>
                <b>{x.title}</b> · {x.company}
                <small>{x.start || "?"} – {x.current ? "indi" : x.end || "?"}</small>
                {!!x.description && <small className="cand-desc">{lines(x.description).slice(0, 4).join(" • ")}</small>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {!!profile.education.length && (
        <section className="cand-block">
          <h4>Təhsil</h4>
          <ul className="cand-list">
            {profile.education.map((x) => <li key={x.id}><b>{x.school}</b> · {x.degree}<small>{x.year}</small></li>)}
          </ul>
        </section>
      )}
      {(!!certs.length || !!profile.certificates || !!profile.languages) && (
        <section className="cand-block">
          <h4>Sertifikat və dillər</h4>
          <CertificationBadges items={certs} limit={6} />
          {!!profile.languages && <p><span className="muted">Dillər: </span>{profile.languages}</p>}
        </section>
      )}
      {!!profile.references?.length && (
        <section className="cand-block">
          <h4>Tövsiyəçilər</h4>
          <ul className="cand-list">
            {profile.references.map((r, i) => <li key={i}><b>{r.name}</b> · {r.position}, {r.company}<small>{r.contact}</small></li>)}
          </ul>
        </section>
      )}

      {canNote && candidateId && (
        <section className="cand-block">
          <h4>Daxili qeydlər <small className="muted">(yalnız komandanız görür)</small></h4>
          <div className="cand-note-form">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} placeholder="Məsələn: telefonla danışdıq, maaşı 1800 AZN deyir, bazar ertəsi cavab verəcək…" />
            <button type="button" className="primary" disabled={!draft.trim()} onClick={addNote}>Qeydi əlavə et</button>
          </div>
          {notes.length ? (
            <ul className="cand-notes">
              {notes.map((n) => (
                <li key={n.id}>
                  <p>{n.text}</p>
                  <small className="muted">{n.author_name || "Komanda"} · {formatDate(n.created)}</small>
                  <button type="button" className="text-button danger-text" onClick={() => removeNote(n.id)}>Sil</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Hələ qeyd yoxdur.</p>
          )}
        </section>
      )}

      {application && (
        <section className="cand-block">
          <h4>Müraciətin tarixçəsi</h4>
          {events === null ? <p className="muted loading-line">Yüklənir…</p> : events.length ? (
            <ul className="cand-timeline">
              {events.map((e, i) => (
                <li key={i}>
                  <b>{e.type}</b>{e.to_value ? `: ${e.from_value ? `${e.from_value} → ` : ""}${e.to_value}` : ""}
                  {!!e.note && <small>{e.note}</small>}
                  <small className="muted">{formatDate(e.created)}</small>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Hadisə yoxdur.</p>}
        </section>
      )}

      <section className="cand-block cand-extra">{children}</section>

      {cvOpen && (
        <Modal title={`${profile.name} — CV`} onClose={() => setCvOpen(false)} className="cv-rewrite-modal">
          <div className="cv-print-area"><BrandedCv profile={profile} /></div>
          <button className="primary" onClick={() => window.print()}>PDF kimi yüklə / çap et</button>
        </Modal>
      )}
    </div>
  );
}
