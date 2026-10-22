"use client";
import { type Profile, candidateCertifications, years } from "@/lib/model";
import { certificationById, detectCertifications } from "@/lib/certification-catalog";

const STATUS: Record<string, string> = { in_progress: "davam edir", expired: "müddəti bitib" };

// A4 CV layout with Joblink branding, used for the preview and PDF export
// (the browser's "Save as PDF"). Only facts from the profile are shown.
export default function BrandedCv({ profile: p }: { profile: Profile }) {
  const certifications = candidateCertifications(p);
  const contact = [p.email, p.phone, p.city].filter(Boolean);
  // Lines already shown as recognized certifications are not repeated.
  const courses = p.certificates
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !detectCertifications(line).length);
  const bullets = (text: string) =>
    text
      .split(/\n+/)
      .map((line) => line.replace(/^[•\-–*]\s*/, "").trim())
      .filter(Boolean);
  return (
    <article className="branded-cv">
      <header className="branded-cv-head">
        <div>
          <h1>{p.name || "Ad Soyad"}</h1>
          <p className="branded-cv-title">{p.title}</p>
          <p className="branded-cv-contact">{contact.join("  ·  ")}</p>
          {p.links && <p className="branded-cv-contact">{p.links}</p>}
        </div>
        <span className="branded-cv-logo">
          joblink<span>✳</span>
        </span>
      </header>
      <div className="branded-cv-body">
        <aside>
          {p.skills.length > 0 && (
            <section>
              <h2>Bacarıqlar</h2>
              <ul>{p.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
            </section>
          )}
          {certifications.length > 0 && (
            <section>
              <h2>Sertifikatlar</h2>
              <ul>
                {certifications.map((c) => (
                  <li key={c.id}>
                    <strong>{certificationById(c.id)?.name}</strong>
                    {[c.level, STATUS[c.status], c.year].filter(Boolean).length > 0 && (
                      <small>{[c.level, STATUS[c.status], c.year].filter(Boolean).join(" · ")}</small>
                    )}
                    {c.detail && <small>{c.detail}</small>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {p.languages && (
            <section>
              <h2>Dillər</h2>
              <p>{p.languages}</p>
            </section>
          )}
          {p.education.length > 0 && (
            <section>
              <h2>Təhsil</h2>
              {p.education.map((e) => (
                <p key={e.id}>
                  <strong>{e.degree}</strong>
                  <br />
                  {e.school}
                  {e.year ? `, ${e.year}` : ""}
                </p>
              ))}
            </section>
          )}
        </aside>
        <main>
          {p.summary && (
            <section>
              <h2>Peşəkar xülasə</h2>
              <p>{p.summary}</p>
            </section>
          )}
          {p.experiences.length > 0 && (
            <section>
              <h2>İş təcrübəsi · {years(p)} il</h2>
              {p.experiences.map((e) => (
                <div className="branded-cv-role" key={e.id}>
                  <div className="branded-cv-role-head">
                    <strong>{e.title}</strong>
                    <span>
                      {e.start} — {e.current ? "hazırda" : e.end}
                    </span>
                  </div>
                  <p className="branded-cv-company">{e.company}</p>
                  {bullets(e.description).length > 1 ? (
                    <ul>{bullets(e.description).map((line, i) => <li key={i}>{line}</li>)}</ul>
                  ) : (
                    <p>{e.description}</p>
                  )}
                </div>
              ))}
            </section>
          )}
          {courses.length > 0 && (
            <section>
              <h2>Kurslar və təlimlər</h2>
              <p className="branded-cv-pre">{courses.join("\n")}</p>
            </section>
          )}
        </main>
      </div>
      <footer className="branded-cv-foot">
        <span>
          joblink<span>✳</span>
        </span>
        <span>Bu CV Joblink platformasında hazırlanıb</span>
      </footer>
    </article>
  );
}
