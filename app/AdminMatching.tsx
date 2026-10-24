"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { MatchingMode, MatchingSettings } from "@/lib/matching-settings";
import { Field } from "./components";

const AUDIENCES: { key: "candidate" | "employer" | "autoApply"; label: string; help: string }[] = [
  { key: "candidate", label: "İş axtaran (vakansiya siyahısı və sıralama)", help: "AI seçilərsə, CV-yə uyğun vakansiyalar avtomatik qiymətləndirilir və siyahı AI balına görə sıralanır." },
  { key: "employer", label: "İşəgötürən (namizədlərin AI sıralaması)", help: "Qaydalar seçilərsə, “AI ilə sırala” düyməsi yalnız qaydalarla hesablanmış balı göstərir və AI çağırılmır." },
  { key: "autoApply", label: "Avtomatik müraciət", help: "AI seçilərsə, vakansiya həm qayda-əsaslı təhlükəsizlik həddini, həm də namizədin minimum balını AI reytinqi ilə keçməlidir. AI işləməsə qaydalara qayıdılır." },
];

// Admin page: which fit score each audience uses, and the AI cost controls.
export default function AdminMatching({ api, notify }: { api: (path: string, body?: unknown) => Promise<unknown>; notify: (message: string) => void }) {
  const [settings, setSettings] = useState<MatchingSettings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (api("admin/matching-settings") as Promise<{ settings: MatchingSettings }>).then((b) => setSettings(b.settings)).catch((e) => notify((e as Error).message));
  }, [api, notify]);
  if (!settings) return <p className="muted">Yüklənir…</p>;
  async function save() {
    setBusy(true);
    try {
      const b = (await api("admin/matching-settings", settings)) as { settings: MatchingSettings };
      setSettings(b.settings);
      notify("Uyğunluq ayarları yadda saxlanıldı.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const set = (patch: Partial<MatchingSettings>) => setSettings({ ...settings, ...patch });
  return (
    <div className="company-page">
      <section className="panel">
        <h3><Sparkles size={18} /> Uyğunluq balı: qaydalar və ya AI</h3>
        <p className="muted">
          “Qaydalar” pulsuzdur və ani işləyir. “AI” hər namizəd–vakansiya cütü üçün bir dəfə analiz edir, nəticə saxlanılır və yalnız CV və ya vakansiya dəyişəndə yenidən hesablanır. Hər iki bal həmişə mövcuddur; burada yalnız hansının əsas götürüləcəyi seçilir.
        </p>
        {AUDIENCES.map((a) => (
          <Field key={a.key} label={a.label}>
            <select value={settings[a.key]} onChange={(e) => set({ [a.key]: e.target.value as MatchingMode })}>
              <option value="rules">Qaydalar (pulsuz)</option>
              <option value="ai">AI (xərc var)</option>
            </select>
            <small className="skill-picker-help">{a.help}</small>
          </Field>
        ))}
        <div className="form-grid">
          <Field label="Avtomatik analiz olunan vakansiya sayı (hər CV üçün)">
            <input type="number" min={1} max={50} value={settings.autoJobs} onChange={(e) => set({ autoJobs: Number(e.target.value) })} />
          </Field>
          <Field label="AI-yə göndərilən minimum qayda balı">
            <input type="number" min={0} max={90} value={settings.minRuleScore} onChange={(e) => set({ minRuleScore: Number(e.target.value) })} />
          </Field>
          <Field label="Gündəlik yeni AI qiymətləndirmə limiti (0 = limitsiz)">
            <input type="number" min={0} max={1000} value={settings.dailyAiRatings} onChange={(e) => set({ dailyAiRatings: Number(e.target.value) })} />
          </Field>
        </div>
        <button className="primary" disabled={busy} onClick={save}>Yadda saxla</button>
      </section>
      <MatchingHistory api={api} refresh={settings} />
    </div>
  );
}

type Rating = { user_id: string; job_id: string; score: number; reason: string; flagged: number; created: string; job_title: string; candidate_title: string };
// What changed in the settings and when, and a sample of recent AI ratings to check their quality.
function MatchingHistory({ api, refresh }: { api: (path: string, body?: unknown) => Promise<unknown>; refresh: unknown }) {
  const [history, setHistory] = useState<{ summary: string; created: string; admin_name: string }[]>([]);
  const [ratings, setRatings] = useState<{ ratings: Rating[]; flagged: number; total: number } | null>(null);
  const load = () => {
    (api("admin/matching-history") as Promise<{ history: typeof history }>).then((d) => setHistory(d.history)).catch(() => {});
    (api("admin/ai-ratings") as Promise<NonNullable<typeof ratings>>).then(setRatings).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [refresh]);
  return (
    <>
      <section className="panel">
        <h3>Ayarların dəyişmə tarixçəsi</h3>
        <ol className="event-timeline">
          {history.map((h, i) => <li key={i}><time>{new Date(h.created).toLocaleString("az-AZ")}</time><span>{h.admin_name}: {h.summary}</span></li>)}
          {!history.length && <li>Hələ dəyişiklik qeydə alınmayıb.</li>}
        </ol>
      </section>
      <section className="panel">
        <h3>AI qiymətləndirmə nümunələri {ratings && <small className="muted">· {ratings.total} qiymətləndirmə, {ratings.flagged} “səhvdir” işarəsi</small>}</h3>
        {ratings?.ratings.map((r) => (
          <article key={`${r.user_id}${r.job_id}`} className="repeat-card">
            <b>{r.score}%</b> · {r.candidate_title || "Namizəd"} → {r.job_title || "Vakansiya"}
            <p>{r.reason}</p>
            <button
              type="button"
              className="text-button"
              onClick={async () => { await api("admin/ai-ratings/flag", { userId: r.user_id, jobId: r.job_id, flagged: !r.flagged }); load(); }}
            >
              {r.flagged ? "İşarəni götür" : "Səhvdir"}
            </button>
          </article>
        ))}
        {ratings && !ratings.ratings.length && <p className="muted">Hələ AI qiymətləndirməsi yoxdur.</p>}
      </section>
    </>
  );
}
