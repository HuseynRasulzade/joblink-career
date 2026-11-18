"use client";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, FileUp, Undo2 } from "lucide-react";
import type { MonthSummary, PlatformDay } from "@/lib/calendar-az";

const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
const HEAD = ["B.e", "Ç.a", "Ç", "C.a", "C", "Ş", "B"];
const COLOR: Record<string, string> = { weekend: "#eceff1", holiday: "#ffd9d4", transfer: "#ffe9c2", company: "#e0d4ff" };
const KINDS: { id: PlatformDay["kind"] | ""; label: string; help: string }[] = [
  { id: "holiday", label: "Bayram günü", help: "Bayramdır; həftəsonuna düşərsə, növbəti iş gününə köçürülür (qanuna uyğun)." },
  { id: "off", label: "Qeyri-iş günü", help: "Köçürmə olmadan sadəcə istirahət günüdür (Nazirlər Kabineti qərarı ilə əlavə istirahət)." },
  { id: "work", label: "İş günü", help: "Şənbə/bazar günü iş günü elan olunub, ya da bayram ləğv edilib." },
  { id: "short", label: "Qısaldılmış iş günü", help: "Bir saat az işlənir, haqq tam ödənilir." },
  { id: "", label: "Dəyişikliyi sil", help: "Gün yenə standart qaydaya qayıdır." },
];

type Data = { year: number; days: PlatformDay[]; months: MonthSummary[]; knownYears: number[] };

// Admin page: the production calendar of the platform. A change made here is applied to the calendar of every company
// (holidays of a new year, a working Saturday, a cancelled holiday); a company can still add its own days on top.
export default function AdminProductionCalendar({ api, notify }: { api: (path: string, body?: unknown) => Promise<unknown>; notify: (message: string) => void }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<Data | null>(null);
  const [pick, setPick] = useState("");
  const [kind, setKind] = useState<PlatformDay["kind"] | "">("holiday");
  const [label, setLabel] = useState("");
  const [range, setRange] = useState({ from: "", to: "", label: "", kind: "holiday" as PlatformDay["kind"] });
  // Upload of a calendar file: the days found in it are applied at once (auto) or shown for a check first.
  type Found = { day: string; kind: PlatformDay["kind"]; label: string; on: boolean };
  const [auto, setAuto] = useState(true);
  const [found, setFound] = useState<Found[] | null>(null);
  const [upBusy, setUpBusy] = useState(false);
  const [undo, setUndo] = useState<{ day: string; kind: string; label: string }[] | null>(null);
  const [sourceNote, setSourceNote] = useState("");
  const load = useCallback(() => {
    (api(`admin/production-calendar?year=${year}`) as Promise<Data>).then(setData).catch((e) => notify((e as Error).message));
  }, [api, notify, year]);
  useEffect(load, [load]);

  async function save(days: { day: string; kind: string; label: string }[], message: string) {
    try {
      const b = (await api(`admin/production-calendar?year=${year}`, { days })) as Data;
      setData(b);
      setPick("");
      setLabel("");
      notify(message);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function applyFound(list: { day: string; kind: string; label: string }[]) {
    // What each day was before, so that the whole upload can be undone.
    const before = new Map((data?.days || []).map((d) => [d.day, d]));
    setUndo(list.map((d) => before.get(d.day) || { day: d.day, kind: "", label: "" }));
    await save(list, `${list.length} gün təqvimə tətbiq olundu.`);
  }
  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) return notify("Fayl 6 MB-dan böyükdür.");
    setUpBusy(true);
    setFound(null);
    try {
      const encoded = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Fayl oxunmadı."));
        reader.readAsDataURL(file);
      });
      const result = (await api("admin/production-calendar/extract", { name: file.name, type: file.type, data: encoded, year })) as { source: "text" | "ai"; count: number; days: { day: string; kind: PlatformDay["kind"]; label: string }[] };
      setSourceNote(result.source === "ai" ? "Fayl AI ilə oxundu: tarixləri yoxlayın." : "Fayl mətn kimi oxundu.");
      // The calendar jumps to the year the file is about.
      const counts = new Map<number, number>();
      for (const d of result.days) counts.set(Number(d.day.slice(0, 4)), (counts.get(Number(d.day.slice(0, 4))) || 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (top && top !== year) setYear(top);
      if (auto) await applyFound(result.days);
      else setFound(result.days.map((d) => ({ ...d, on: true })));
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setUpBusy(false);
    }
  }
  function addRange() {
    if (!range.from) return notify("Başlanğıc tarixi seçin.");
    const to = range.to || range.from;
    if (to < range.from) return notify("Son tarix başlanğıcdan əvvəl ola bilməz.");
    const days: { day: string; kind: string; label: string }[] = [];
    for (let t = Date.parse(`${range.from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`) && days.length < 60; t += 86_400_000) {
      days.push({ day: new Date(t).toISOString().slice(0, 10), kind: range.kind, label: range.label });
    }
    void save(days, `${days.length} gün əlavə olundu.`);
    setRange({ ...range, from: "", to: "", label: "" });
  }
  if (!data) return <p className="muted loading-line">Yüklənir…</p>;
  const mine = new Map(data.days.map((d) => [d.day, d]));
  const unknown = !data.knownYears.includes(year);
  const total = (key: "workDays" | "hours") => data.months.reduce((n, m) => n + m[key], 0);
  const picked = pick ? data.months.flatMap((m) => m.days).find((d) => d.date === pick) : null;
  return (
    <div className="company-page">
      <section className="panel">
        <h3><CalendarDays size={18} /> İstehsalat təqvimi (bütün şirkətlər üçün)</h3>
        <p className="muted">
          Burada etdiyiniz dəyişiklik bütün şirkətlərin təqvimində, davamiyyətdə, tabeldə və əmək haqqı hesablamasında dərhal nəzərə alınır. Ramazan və Qurban bayramı günləri hər il Nazirlər Kabinetinin qərarı ilə müəyyən edilir: qərar çıxanda yeni ilin bayram günlərini bura əlavə edin.
        </p>
        <div className="section-heading">
          <div className="admin-actions">
            <button type="button" aria-label="Əvvəlki il" onClick={() => setYear(year - 1)}><ChevronLeft size={16} /></button>
            <b>{year}-ci il</b>
            <button type="button" aria-label="Növbəti il" onClick={() => setYear(year + 1)}><ChevronRight size={16} /></button>
          </div>
          <span className="muted">İş günü: <b>{total("workDays")}</b> · iş saatı: <b>{total("hours")}</b> · admin dəyişikliyi: <b>{data.days.length}</b></span>
        </div>
        {unknown && (
          <div className="notice" role="status">
            {year}-ci il üçün Ramazan və Qurban bayramı günləri hələ daxil edilməyib. Aşağıdakı “Bayram dövrü əlavə et” ilə əlavə edin; Novruz və sabit bayramlar avtomatik var.
          </div>
        )}
      </section>

      <section className="panel">
        <h3><FileUp size={18} /> Faylla yenilə (şəkil, PDF, Word, Excel, CSV, mətn)</h3>
        <p className="muted fine-print">Rəsmi istehsalat təqvimini yükləyin: fayldakı bayram, köçürülmüş, işçi və qısaldılmış günlər tapılıb təqvimə yazılır. Şəkil və PDF AI ilə oxunur (AI qoşulubsa), Word/Excel/CSV/mətn/ICS isə AI olmadan. Ən çox 6 MB.</p>
        <div className="admin-actions" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <label className="secondary" style={{ cursor: "pointer" }}>
            {upBusy ? "Oxunur…" : "Fayl seç"}
            <input type="file" hidden disabled={upBusy} accept="image/*,.pdf,.docx,.xlsx,.csv,.tsv,.txt,.md,.html,.htm,.ics,.json,.rtf" onChange={onFile} />
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Avtomatik tətbiq et (yoxlamadan)
          </label>
          {undo && (
            <button type="button" className="ghost" onClick={() => { void save(undo, "Son yükləmə geri alındı."); setUndo(null); }}>
              <Undo2 size={14} /> Son yükləməni geri al
            </button>
          )}
        </div>
        {sourceNote && <p className="muted fine-print">{sourceNote}</p>}
        {found && (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th /><th>Tarix</th><th>Növ</th><th>Ad</th></tr></thead>
                <tbody>
                  {found.map((d, i) => (
                    <tr key={d.day}>
                      <td><input type="checkbox" checked={d.on} onChange={(e) => setFound(found.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} /></td>
                      <td>{d.day}</td>
                      <td>
                        <select value={d.kind} onChange={(e) => setFound(found.map((x, j) => (j === i ? { ...x, kind: e.target.value as PlatformDay["kind"] } : x)))}>
                          {KINDS.filter((k) => k.id).map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                        </select>
                      </td>
                      <td><input value={d.label} onChange={(e) => setFound(found.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-actions">
              <button type="button" className="primary" onClick={() => { const list = found.filter((d) => d.on).map(({ day, kind, label }) => ({ day, kind, label })); setFound(null); void applyFound(list); }}>
                Seçilmişləri tətbiq et ({found.filter((d) => d.on).length})
              </button>
              <button type="button" className="secondary" onClick={() => setFound(null)}>Ləğv et</button>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h3>Bayram dövrü əlavə et</h3>
        <div className="admin-actions" style={{ flexWrap: "wrap", alignItems: "end" }}>
          <label>Başlanğıc<input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
          <label>Son (boşdursa 1 gün)<input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
          <label>Ad<input value={range.label} placeholder="Ramazan bayramı" onChange={(e) => setRange({ ...range, label: e.target.value })} /></label>
          <label>
            Növ
            <select value={range.kind} onChange={(e) => setRange({ ...range, kind: e.target.value as PlatformDay["kind"] })}>
              {KINDS.filter((k) => k.id).map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </label>
          <button type="button" className="primary" onClick={addRange}>Əlavə et</button>
        </div>
      </section>

      <section className="panel">
        <h3>{year} — günə klik edib dəyişin</h3>
        <div className="pcal-grid">
          {data.months.map((m) => {
            const offset = (m.days[0].weekday + 6) % 7;
            return (
              <div className="pcal-month" key={m.month}>
                <b>{MONTHS[m.month - 1]} <small className="muted">· {m.workDays} iş günü, {m.hours} saat</small></b>
                <div className="pcal-days">
                  {HEAD.map((h) => <span className="pcal-head" key={h}>{h}</span>)}
                  {Array.from({ length: offset }, (_, i) => <span key={`o${i}`} />)}
                  {m.days.map((d) => {
                    const set = mine.get(d.date);
                    return (
                      <button
                        key={d.date}
                        type="button"
                        className={`pcal-day${set ? " own" : ""}${pick === d.date ? " picked" : ""}${d.short ? " short" : ""}`}
                        style={{ background: COLOR[d.off] || undefined }}
                        title={`${d.date}${d.label ? ` — ${d.label}` : ""}${set ? " (admin dəyişikliyi)" : ""}`}
                        onClick={() => {
                          setPick(d.date);
                          setKind(set?.kind || (d.off ? "work" : "holiday"));
                          setLabel(set?.label || "");
                        }}
                      >
                        {Number(d.date.slice(8))}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="muted pcal-legend">
          <i style={{ background: COLOR.weekend }} /> istirahət <i style={{ background: COLOR.holiday }} /> bayram <i style={{ background: COLOR.transfer }} /> köçürülmüş gün <i className="short" /> qısaldılmış gün <i className="own" /> admin dəyişikliyi
        </p>
        {picked && (
          <div className="pcal-editor">
            <b>{picked.date}</b>
            <span className="muted">{picked.label || (picked.off === "weekend" ? "İstirahət günü" : picked.off ? "Qeyri-iş günü" : "İş günü")}</span>
            <label>
              Nə edək?
              <select value={kind} onChange={(e) => setKind(e.target.value as PlatformDay["kind"] | "")}>
                {KINDS.map((k) => <option key={k.id || "clear"} value={k.id}>{k.label}</option>)}
              </select>
            </label>
            <small className="muted">{KINDS.find((k) => k.id === kind)?.help}</small>
            {kind && <label>Ad (istəyə görə)<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="məs. Qurban bayramı" /></label>}
            <div className="admin-actions">
              <button type="button" className="primary" onClick={() => save([{ day: picked.date, kind, label }], "Təqvim yeniləndi.")}>Yadda saxla</button>
              <button type="button" className="text-button" onClick={() => setPick("")}>Bağla</button>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <h3>{year} üçün admin dəyişiklikləri</h3>
        {data.days.length ? (
          <ul className="pcal-list">
            {data.days.map((d) => (
              <li key={d.day}>
                <b>{d.day}</b> · {KINDS.find((k) => k.id === d.kind)?.label} {d.label && <span className="muted">— {d.label}</span>}
                <button type="button" className="text-button danger-text" onClick={() => save([{ day: d.day, kind: "", label: "" }], "Dəyişiklik silindi.")}>Sil</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Bu il üçün əlavə dəyişiklik yoxdur: yalnız qanunla müəyyən edilmiş standart təqvim işləyir.</p>
        )}
      </section>
    </div>
  );
}
