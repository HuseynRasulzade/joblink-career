"use client";
import { COMPANY_AI_PACKAGES } from "@/lib/ai-packages";
import { PLANS } from "@/lib/plans";
import { useEffect, useState } from "react";
import { Briefcase, CalendarClock, Calculator, ChartNoAxesColumn, Check, FileSpreadsheet, Languages, Lock, Network, Plane, Scale, Sparkles, Users, UserSearch, Wallet } from "lucide-react";
import { calculateFromGross, calculateFromNet, type Sector } from "@/lib/salary";
import SuperGross from "./SuperGross";
import { localizeTree } from "./i18n";

// The public page under the sign-in: what the platform is, for whom, how it starts, what it costs.
const ROLES = [
  { tag: "İŞ AXTARANLAR", title: "İş tapın", text: "CV analizi, uyğunluq balı, bir kliklə müraciət və hər mərhələnin izlənməsi.", points: ["AI ilə CV təhlili və tövsiyələr", "Vakansiyaya uyğunluq faizi", "13 kalkulyator: maaş, məzuniyyət, müavinət"] },
  { tag: "İŞƏ QƏBUL", title: "Namizəd seçin", text: "Elandan təklifə qədər bütün proses bir yerdə.", points: ["AI ilə vakansiya hazırlamaq", "Namizəd qıfı və müsahibə skorkartı", "Test, təklif məktubu, analitika"] },
  { tag: "KADR (HR)", title: "Komandanı idarə edin", text: "İşçi kartından əmək haqqına qədər, qanuna uyğun.", points: ["Əmr və imza axını", "Əmək haqqı, davamiyyət, məzuniyyət", "Ştat planı: say və maaş həddi"] },
];
const STEPS = [
  { n: "1", title: "Qeydiyyatdan keçin", text: "E-poçtla hesab açın və «İş axtaran» və ya «Şirkət» seçin." },
  { n: "2", title: "Profilinizi qurun", text: "CV-ni yükləyin və ya şirkət məlumatlarını və komandanı əlavə edin." },
  { n: "3", title: "İlk nəticəni alın", text: "İlk müraciəti göndərin və ya ilk vakansiyanı AI köməkçi ilə yaradın." },
];
const FEATURES = [
  "Uyğunluq balı və AI sıralama", "Müsahibə vaxtı seçimi və təqvim", "Test və qiymətləndirmə kriteriyaları", "Əmək haqqı və haqq-hesab vərəqəsi",
  "Davamiyyət, məzuniyyət və ezamiyyət", "Hesabatlar, Excel və Power BI", "Rol və icazələr, baxış jurnalı", "Azərbaycan, ingilis və rus dilləri",
];
const FAQ = [
  { q: "Platforma pulsuzdurmu?", a: "Başlamaq pulsuzdur: iş axtaran paketsiz, şirkət pulsuz paketlə istifadə edə bilər. Daha çox AI təhlili lazımdırsa, aylıq paket seçilir." },
  { q: "Məlumatlarım təhlükəsizdirmi?", a: "Hər istifadəçi yalnız rolunun icazəsi çatan məlumatı görür; FİN, IBAN və maaşlar ayrıca icazə tələb edir; baxış və dəyişikliklər jurnala yazılır." },
  { q: "Hesablamalar qanuna uyğundurmu?", a: "Əmək haqqı, vergi, sığorta, məzuniyyət və ezamiyyət hesabları Azərbaycan Əmək və Vergi Məcəlləsinə əsaslanır. Hesablamalar məlumat xarakterlidir; rəsmi sənədləşmədən əvvəl mühasib yoxlamalıdır." },
  { q: "Mövcud məlumatı necə köçürürəm?", a: "İşçilər, ştat, davamiyyət və digər bölmələrdə Excel idxalı var: nümunə faylı yükləyin, doldurun, geri yükləyin." },
];

const ROLE_ICONS = [UserSearch, Briefcase, Users];
const FEATURE_ICONS = [Sparkles, CalendarClock, Scale, Wallet, Plane, FileSpreadsheet, Lock, Languages];
const CALCULATORS = [
  { title: "Maaş (gross ↔ net)", text: "Vergi, sosial, işsizlik və tibbi sığorta ilə ələ keçən və işəgötürənin xərci." },
  { title: "Məzuniyyət və kompensasiya", text: "Staja, uşaqlara və şəraitə görə gün sayı, məzuniyyət pulu." },
  { title: "Orta əmək haqqı", text: "Ezamiyyət, donor günü və məhkəmə günləri üçün bir günlük məbləğ." },
  { title: "İxtisar və son haqq-hesab", text: "İşdənçıxarma müavinəti, xəbərdarlıq müddəti və yekun ödəniş." },
  { title: "Hamiləlik və xəstəlik müavinəti", text: "Sosial Sığorta Qanununa uyğun müavinət və staj şərti." },
  { title: "Artıq iş, gecə, boşdayanma", text: "İş vaxtından artıq və istirahət günü işi, gecə əlavəsi." },
  { title: "Tutulmalar", text: "İcra sənədləri və aliment üçün qanunun həddi." },
  { title: "İş günləri və ƏDV", text: "İstehsalat təqviminə görə iş günləri; ƏDV və vergilər." },
];
const fmt = (n: number) => n.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// A small working calculator: the real salary calculation of the platform, so the visitor sees what the calculators do before signing up.
function LandingCalc({ onSignup }: { onSignup: () => void }) {
  const [amount, setAmount] = useState("2000");
  const [kind, setKind] = useState<"gross" | "net">("gross");
  const [sector, setSector] = useState<Sector>("private");
  const value = Math.max(0, Math.min(1_000_000, Number(amount) || 0));
  const r = kind === "gross" ? calculateFromGross(value, sector) : calculateFromNet(value, sector);
  const rows: [string, number, boolean?][] = [
    ["Gross (hesablanan)", r.gross],
    ["Gəlir vergisi", -r.incomeTax],
    ["Sosial sığorta (işçi)", -r.employeeSocial],
    ["İşsizlik sığortası (işçi)", -r.employeeUnemployment],
    ["Tibbi sığorta (işçi)", -r.employeeMedical],
    ["Ələ keçən (net)", r.net, true],
  ];
  return (
    <div className="lc">
      <div className="lc-inputs">
        <label>
          <span>Məbləğ (AZN)</span>
          <input type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Məbləğ (AZN)" />
        </label>
        <div className="lc-seg" role="group" aria-label="Məbləğin növü">
          <button type="button" className={kind === "gross" ? "on" : ""} aria-pressed={kind === "gross"} onClick={() => setKind("gross")}>Gross</button>
          <button type="button" className={kind === "net" ? "on" : ""} aria-pressed={kind === "net"} onClick={() => setKind("net")}>Net</button>
        </div>
        <div className="lc-seg" role="group" aria-label="Sektor">
          <button type="button" className={sector === "private" ? "on" : ""} aria-pressed={sector === "private"} onClick={() => setSector("private")}>Qeyri-neft özəl</button>
          <button type="button" className={sector === "public" ? "on" : ""} aria-pressed={sector === "public"} onClick={() => setSector("public")}>Dövlət / neft-qaz</button>
        </div>
      </div>
      <dl className="lc-rows">
        {rows.map(([label, v, strong]) => (
          <div key={label} className={strong ? "strong" : ""}>
            <dt>{label}</dt>
            <dd>{v < 0 ? "−" : ""}{fmt(Math.abs(v))} ₼</dd>
          </div>
        ))}
      </dl>
      <p className="lc-employer"><span>İşəgötürənin ümumi xərci (super-gross)</span><b>{fmt(r.employerCost)} ₼</b></p>
      <details className="lc-sg"><summary>Super-gross necə yaranır?</summary><SuperGross gross={r.gross} sector={sector} /></details>
      <p className="lc-note">Hesablama məlumat xarakterlidir. İşçi kartında vergi güzəşti, müavinət və digər tutulmalar da nəzərə alınır.</p>
      <button type="button" className="primary" onClick={onSignup}>Bütün kalkulyatorlardan istifadə et</button>
    </div>
  );
}

type PublicJob = { id: string; title: string; company: string; city: string; mode: string; type: string; minSalary: number; maxSalary: number; skills: string[]; demo?: boolean; companyLogo?: boolean; owner?: string };
const salaryText = (j: PublicJob) => (j.minSalary || j.maxSalary ? `${j.minSalary.toLocaleString("az-AZ")}–${j.maxSalary.toLocaleString("az-AZ")} AZN` : "Razılaşma ilə");

// Real open vacancies when there are any, the platform's sample vacancies otherwise (marked «Nümunə»).
function JobsShowcase({ onAuth }: { onAuth: (want: "login" | "register") => void }) {
  const [jobs, setJobs] = useState<PublicJob[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/joblink/state", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ jobs?: PublicJob[] }>) : Promise.resolve({ jobs: [] as PublicJob[] })))
      .then((d) => { if (alive) setJobs((d.jobs || []).filter((j) => !(j as { external?: unknown }).external).slice(0, 6)); })
      .catch(() => { if (alive) setJobs([]); });
    return () => { alive = false; };
  }, []);
  if (jobs && !jobs.length) return null;
  return (
    <section className="landing-block" id="vakansiyalar">
      <header className="landing-head">
        <p className="landing-eyebrow">VAKANSİYALAR</p>
        <h2>Elanlar bu formatda görünür</h2>
        <p className="landing-lead">Namizəd vakansiyanı filtrlərlə tapır, uyğunluq balını görür və bir kliklə müraciət edir. İşəgötürən elanı AI köməkçi ilə hazırlayır.</p>
      </header>
      <div className="landing-jobs">
        {(jobs || Array.from({ length: 3 }, () => null)).map((j, i) =>
          j ? (
            <article className="job-tile" key={j.id}>
              <div className="job-tile-top">
                {j.companyLogo && j.owner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="job-tile-mark" src={`/api/joblink/companies/logo?id=${encodeURIComponent(j.owner)}`} alt="" loading="lazy" />
                ) : (
                  <span className="job-tile-mark">{j.company.trim().slice(0, 1).toLocaleUpperCase("az")}</span>
                )}
                <div>
                  <h3>{j.title}</h3>
                  <small>{j.company}</small>
                </div>
                {j.demo && <span className="job-tile-demo">Nümunə</span>}
              </div>
              <ul className="job-tile-meta">
                <li>{j.city}</li>
                <li>{j.mode}</li>
                <li>{j.type}</li>
              </ul>
              <p className="job-tile-salary">{salaryText(j)}</p>
              <ul className="job-tile-skills">{j.skills.slice(0, 3).map((k) => <li key={k}>{k}</li>)}</ul>
              <button type="button" className="job-tile-apply" onClick={() => onAuth("register")}>Müraciət et</button>
            </article>
          ) : (
            <article className="job-tile skeleton" key={i} aria-hidden="true" />
          ),
        )}
      </div>
      <p className="landing-cta"><a className="gate-link" href="/jobs">Bütün vakansiyalara bax →</a></p>
    </section>
  );
}

export default function Landing({ onAuth }: { onAuth: (want: "login" | "register") => void }) {
  const [audience, setAudience] = useState<"seeker" | "company">("seeker");
  const signup = () => onAuth("register");
  return localizeTree(
    <div className="landing">
      <section className="landing-block" id="kimler">
        <header className="landing-head">
          <p className="landing-eyebrow">KİMLƏR ÜÇÜN</p>
          <h2>Bir hesab, üç istifadəçi növü</h2>
        </header>
        <div className="landing-grid three">
          {ROLES.map((r, i) => {
            const Icon = ROLE_ICONS[i];
            return (
              <article key={r.tag} className="landing-card role-card">
                <span className="landing-icon"><Icon size={22} /></span>
                <span className="landing-tag">{r.tag}</span>
                <h3>{r.title}</h3>
                <p>{r.text}</p>
                <ul className="landing-checks">{r.points.map((p) => <li key={p}><Check size={15} />{p}</li>)}</ul>
              </article>
            );
          })}
        </div>
      </section>

      <JobsShowcase onAuth={onAuth} />

      <section className="landing-block tint">
        <header className="landing-head">
          <p className="landing-eyebrow">NECƏ BAŞLAMAQ</p>
          <h2>Üç addımda işə başlayın</h2>
        </header>
        <ol className="landing-steps">
          {STEPS.map((s) => (
            <li key={s.n} className="landing-step"><span className="landing-num">{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></li>
          ))}
        </ol>
        <p className="landing-cta"><button type="button" className="primary" onClick={signup}>Qeydiyyatdan keç</button></p>
      </section>

      <section className="landing-block">
        <header className="landing-head">
          <p className="landing-eyebrow">İMKANLAR</p>
          <h2>Gündəlik iş üçün lazım olan hər şey</h2>
        </header>
        <ul className="landing-features">
          {FEATURES.map((f, i) => {
            const Icon = FEATURE_ICONS[i] || Network;
            return <li key={f}><span className="landing-icon sm"><Icon size={18} /></span>{f}</li>;
          })}
        </ul>
      </section>

      <section className="landing-block tint" id="qiymetler">
        <header className="landing-head">
          <p className="landing-eyebrow">QİYMƏTLƏR</p>
          <h2>Pulsuz başlayın, ehtiyac artdıqca paket seçin</h2>
        </header>
        <div className="landing-tabs" role="tablist" aria-label="Paket növü">
          <button type="button" role="tab" aria-selected={audience === "seeker"} className={audience === "seeker" ? "on" : ""} onClick={() => setAudience("seeker")}>İş axtaranlar üçün</button>
          <button type="button" role="tab" aria-selected={audience === "company"} className={audience === "company" ? "on" : ""} onClick={() => setAudience("company")}>Şirkətlər üçün</button>
        </div>
        {audience === "seeker" ? (
          <>
            <p className="landing-note">Aylıq ödəniş. Paketsiz istifadə pulsuzdur.</p>
            <div className="landing-plans cols3">
              {PLANS.map((p) => (
                <article className={`landing-card plan-card${p.id === "plus-7" ? " popular" : ""}`} key={p.id}>
                  {p.id === "plus-7" && <span className="plan-badge">Ən çox seçilən</span>}
                  <span className="landing-tag">{p.name}</span>
                  <p className="landing-price">{p.priceAzn ? <>{p.priceAzn}<small> ₼ / ay</small></> : "Pulsuz"}</p>
                  <p className="plan-summary">{p.summary}</p>
                  <ul className="landing-checks">{p.features.map((f) => <li key={f}><Check size={15} />{f}</li>)}</ul>
                  <button type="button" className={p.id === "plus-7" ? "primary" : "secondary"} onClick={signup}>{p.priceAzn ? "Paketi seç" : "Pulsuz başla"}</button>
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="landing-note">Aylıq ödəniş, ƏDV daxil. Ştat, əmrlər, əmək haqqı və bütün HR alətləri hər paketə daxildir; paket yalnız AI analizinin sayını müəyyən edir. Limit bitəndə əlavə analiz paketi almaq olar.</p>
            <div className="landing-plans cols5">
              {COMPANY_AI_PACKAGES.map((p) => (
                <article className={`landing-card plan-card${p.id === "pro" ? " popular" : ""}`} key={p.id}>
                  {p.id === "pro" && <span className="plan-badge">Ən çox seçilən</span>}
                  <span className="landing-tag">{p.name}</span>
                  <p className="landing-price">{p.priceAzn ? <>{p.priceAzn}<small> ₼ / ay</small></> : "Pulsuz"}</p>
                  <ul className="landing-checks">
                    <li><Check size={15} /><span><b>{p.fullPerMonth}</b> tam CV analizi / ay</span></li>
                    <li><Check size={15} /><span><b>{p.rankPerMonth}</b> AI reytinqi / ay</span></li>
                    <li><Check size={15} />Bütün HR alətləri</li>
                    <li><Check size={15} />Əlavə analiz paketi alıla bilər</li>
                  </ul>
                  <button type="button" className={p.id === "pro" ? "primary" : "secondary"} onClick={signup}>{p.priceAzn ? "Paketi seç" : "Pulsuz başla"}</button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="landing-block" id="kalkulyatorlar">
        <header className="landing-head">
          <p className="landing-eyebrow">KALKULYATORLAR</p>
          <h2>Əmək hesablamaları bir yerdə, qanuna uyğun</h2>
          <p className="landing-lead">Maaşdan məzuniyyət pulunadək hesabları saniyələrdə çıxarın. Aşağıdakı maaş kalkulyatoru platformadakı ilə eynidir: sınayın.</p>
        </header>
        <div className="landing-calc">
          <LandingCalc onSignup={signup} />
          <div>
            <h3 className="landing-sub" style={{ marginTop: 0 }}>Platformada olan kalkulyatorlar</h3>
            <ul className="landing-calc-list">
              {CALCULATORS.map((c) => (
                <li key={c.title}>
                  <span className="landing-icon sm"><Calculator size={17} /></span>
                  <span><b>{c.title}</b><small>{c.text}</small></span>
                </li>
              ))}
            </ul>
            <p className="landing-lead sm"><a href="/kalkulyatorlar" target="_blank" rel="noreferrer"><b>Kalkulyatorları ayrıca səhifədə aç</b></a> (qeydiyyatsız, linki paylaşmaq olar).</p>
            <p className="landing-lead sm"><ChartNoAxesColumn size={15} /> Hesab açanda kalkulyator işçi kartına bağlanır: nəticəni saxlayın, əmr hazırlayın.</p>
          </div>
        </div>
      </section>

      <section className="landing-block tint" id="suallar">
        <header className="landing-head">
          <p className="landing-eyebrow">SUALLAR</p>
          <h2>Tez-tez verilən suallar</h2>
        </header>
        <div className="landing-faq">
          {FAQ.map((f) => (
            <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
          ))}
        </div>
      </section>

      <section className="landing-band">
        <h2>Bu gün pulsuz başlayın</h2>
        <p>Hesab açın, profilinizi və ya şirkətinizi qurun, ilk nəticəni bu gün alın.</p>
        <button type="button" className="primary" onClick={signup}>Qeydiyyatdan keç</button>
      </section>

      <footer className="landing-footer">
        <span>jobmatch<span className="star">✳</span></span>
        <span><a href="/terms" target="_blank" rel="noreferrer">İstifadə şərtləri</a> · <a href="/privacy" target="_blank" rel="noreferrer">Məxfilik siyasəti</a></span>
      </footer>
    </div>,
  );
}
