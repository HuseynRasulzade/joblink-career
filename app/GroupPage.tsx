"use client";
import { Field } from "./components";
import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { createXlsxBook } from "@/lib/xlsx";

type Notify = (message: string) => void;
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Sorğu tamamlanmadı.");
  return data;
}
const azn = (n: number) => `${n.toLocaleString("az", { maximumFractionDigits: 2 })} AZN`;
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : iso);

type Info = {
  group: { id: string; name: string } | null;
  links: { id: string; companyName: string; status: string; sharePay: boolean; joinedAt: string; code: string; expires: string }[];
  membership: { groupName: string; headName: string; sharePay: boolean; joinedAt: string } | null;
};
type Company = { companyId: string; name: string; isHead: boolean; headcount: number; onLeave: number; joiners12: number; leavers12: number; turnover: number; pendingOrders: number; openJobs: number; pay: { month: string; gross: number; net: number; cost: number } | null; paySharing: boolean };
type Overview = { group: { name: string }; companies: Company[]; totals: { headcount: number; onLeave: number; joiners12: number; leavers12: number; turnover: number; pendingOrders: number; openJobs: number; departments: { name: string; count: number }[]; pay: { gross: number; net: number; cost: number; companies: number; of: number } } };

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="panel" style={{ flex: "1 1 150px" }}>
      <small className="muted">{label}</small>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {hint && <small className="muted">{hint}</small>}
    </div>
  );
}

// A holding: companies that agreed to be seen together. The head company sees totals only, never a person; each member decides
// whether its pay total is shared and can leave at any time.
export default function GroupPage({ notify }: { notify: Notify }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sharePay, setSharePay] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    request<Info>("company/group")
      .then((r) => {
        setInfo(r);
        if (r.group) request<Overview>("company/group/overview").then(setOverview).catch((e) => notify((e as Error).message));
        else setOverview(null);
      })
      .catch((e) => {
        notify((e as Error).message);
        setInfo({ group: null, links: [], membership: null });
      });
  }, [notify]);
  useEffect(load, [load]);
  async function act(path: string, body: unknown, done?: string) {
    setBusy(true);
    try {
      await request(path, body);
      if (done) notify(done);
      load();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportExcel() {
    if (!overview) return;
    const rows = overview.companies.map((c) => [c.name + (c.isHead ? " (baş şirkət)" : ""), c.headcount, c.onLeave, c.joiners12, c.leavers12, c.turnover, c.pendingOrders, c.openJobs, c.pay ? c.pay.gross : "", c.pay ? c.pay.net : "", c.pay ? c.pay.cost : "", c.pay ? c.pay.month : c.paySharing ? "təsdiqlənmiş ay yoxdur" : "paylaşılmır"]);
    const t = overview.totals;
    rows.push(["CƏMİ", t.headcount, t.onLeave, t.joiners12, t.leavers12, t.turnover, t.pendingOrders, t.openJobs, t.pay.gross, t.pay.net, t.pay.cost, `${t.pay.companies}/${t.pay.of} şirkət`]);
    const bytes = createXlsxBook([
      { name: "Qrup icmalı", headers: ["Şirkət", "İşçi sayı", "Məzuniyyətdə", "İşə qəbul (12 ay)", "İşdən çıxan (12 ay)", "Axıcılıq %", "Gözləyən əmr", "Açıq vakansiya", "Gross maaş", "Net maaş", "İşəgötürən xərci", "Maaş ayı"], rows },
      { name: "Departamentlər", headers: ["Departament", "İşçi sayı"], rows: t.departments.map((d) => [d.name, d.count]) },
    ]);
    const blob = new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "qrup-icmali.xlsx";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  if (!info) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="company-page">
      <p className="muted">
        Holdinq: bir neçə şirkət hesabı razılıqla bir qrupda birləşir. Qrupun baş şirkəti yalnız <b>yekun göstəriciləri</b> (say, işə qəbul/çıxış, axıcılıq, departamentlər) görür; heç bir işçinin adı, maaşı və ya şəxsi məlumatı görünmür. Maaş yekunu yalnız üzv şirkət özü icazə verəndə göstərilir. Hər şirkət istənilən vaxt qrupdan çıxa bilər.
      </p>

      {info.membership && (
        <div className="panel">
          <h3>Şirkətiniz “{info.membership.groupName}” qrupunun üzvüdür</h3>
          <p className="muted">
            Baş şirkət: <b>{info.membership.headName}</b> · qoşulma: {dmy(info.membership.joinedAt.slice(0, 10))}
          </p>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={info.membership.sharePay} disabled={busy} onChange={(e) => void act("company/group/share", { sharePay: e.target.checked }, e.target.checked ? "Maaş yekunu qrupla paylaşılır." : "Maaş yekunu paylaşılmır.")} />
            Qrupla ən son təsdiqlənmiş ayın maaş yekununu (gross, net, işəgötürən xərci) paylaş
          </label>
          <div className="admin-actions">
            <button type="button" className="secondary" disabled={busy} onClick={() => window.confirm("Şirkətiniz qrupdan çıxsın?") && void act("company/group/leave", {}, "Qrupdan çıxdınız.")}>
              Qrupdan çıx
            </button>
          </div>
        </div>
      )}

      {!info.group && !info.membership && (
        <div className="form-grid">
          <div className="panel">
            <h3>Qrup yarat</h3>
            <p className="muted">Siz qrupun baş şirkəti olursunuz, digər şirkətləri dəvət kodu ilə çağırırsınız.</p>
            <Field label="Qrupun adı">
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="admin-actions">
              <button type="button" className="primary" disabled={busy} onClick={() => void act("company/group/create", { name }, "Qrup yaradıldı.")}>
                Qrupu yarat
              </button>
            </div>
          </div>
          <div className="panel">
            <h3>Qrupa qoşul</h3>
            <p className="muted">Baş şirkətin verdiyi dəvət kodunu yazın. Qoşulmaq üçün hesab sahibi və ya direktor olmalısınız.</p>
            <Field label="Dəvət kodu">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </Field>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={sharePay} onChange={(e) => setSharePay(e.target.checked)} /> Maaş yekununu da paylaş (sonradan dəyişmək olar)
            </label>
            <div className="admin-actions">
              <button type="button" className="primary" disabled={busy || !code.trim()} onClick={() => void act("company/group/join", { code, sharePay }, "Qrupa qoşuldunuz.")}>
                Qoşul
              </button>
            </div>
          </div>
        </div>
      )}

      {info.group && (
        <>
          <div className="section-heading">
            <h3>{info.group.name}</h3>
            <div className="admin-actions">
              <button type="button" className="secondary" disabled={!overview} onClick={exportExcel}>
                <Download size={14} /> Excel
              </button>
              <button type="button" className="secondary" disabled={busy} onClick={() => window.confirm("Qrup silinsin? Bütün üzvlər qrupdan çıxarılacaq.") && void act("company/group/delete", {}, "Qrup silindi.")}>
                Qrupu sil
              </button>
            </div>
          </div>
          {overview && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Kpi label="İşçi sayı" value={overview.totals.headcount} hint={`${overview.totals.onLeave} nəfər məzuniyyətdə`} />
                <Kpi label="İşə qəbul (12 ay)" value={overview.totals.joiners12} />
                <Kpi label="İşdən çıxan (12 ay)" value={overview.totals.leavers12} hint={`axıcılıq ${overview.totals.turnover}%`} />
                <Kpi label="Gözləyən əmr" value={overview.totals.pendingOrders} />
                <Kpi label="Açıq vakansiya" value={overview.totals.openJobs} />
                <Kpi label="Aylıq maaş fondu (gross)" value={overview.totals.pay.companies ? azn(overview.totals.pay.gross) : "—"} hint={`${overview.totals.pay.companies}/${overview.totals.pay.of} şirkət paylaşır`} />
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Şirkət</th>
                      <th>İşçi</th>
                      <th>Məzuniyyətdə</th>
                      <th>Qəbul / çıxış (12 ay)</th>
                      <th>Axıcılıq</th>
                      <th>Gözləyən əmr</th>
                      <th>Vakansiya</th>
                      <th>Maaş (gross / net / xərc)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.companies.map((c) => (
                      <tr key={c.companyId}>
                        <td>
                          <b>{c.name}</b>
                          {c.isHead && <small className="skill-description">baş şirkət</small>}
                        </td>
                        <td>{c.headcount}</td>
                        <td>{c.onLeave}</td>
                        <td>
                          {c.joiners12} / {c.leavers12}
                        </td>
                        <td>{c.turnover}%</td>
                        <td>{c.pendingOrders}</td>
                        <td>{c.openJobs}</td>
                        <td>{c.pay ? `${azn(c.pay.gross)} / ${azn(c.pay.net)} / ${azn(c.pay.cost)} (${c.pay.month})` : c.paySharing ? "təsdiqlənmiş ay yoxdur" : "paylaşılmır"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h4>Departamentlər üzrə (bütün şirkətlər)</h4>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <tbody>
                    {overview.totals.departments.map((d) => (
                      <tr key={d.name}>
                        <td>{d.name}</td>
                        <td style={{ width: 90 }}>{d.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <h4>Üzv şirkətlər və dəvətlər</h4>
          <div className="admin-actions">
            <button type="button" className="primary" disabled={busy} onClick={() => void act("company/group/invite", {}, "Dəvət kodu yaradıldı: 14 gün keçərlidir.")}>
              Yeni dəvət kodu
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <tbody>
                {info.links.map((l) => (
                  <tr key={l.id}>
                    <td>{l.status === "active" ? <b>{l.companyName}</b> : <>Dəvət kodu: <b style={{ letterSpacing: 1 }}>{l.code}</b> <small className="muted">({dmy(l.expires.slice(0, 10))}-dək)</small></>}</td>
                    <td>{l.status === "active" ? (l.sharePay ? "maaş yekunu paylaşılır" : "yalnız göstəricilər") : "gözləyir"}</td>
                    <td className="admin-actions">
                      <button type="button" disabled={busy} onClick={() => window.confirm(l.status === "active" ? "Şirkət qrupdan çıxarılsın?" : "Dəvət ləğv edilsin?") && void act("company/group/remove", { linkId: l.id }, l.status === "active" ? "Şirkət qrupdan çıxarıldı." : "Dəvət ləğv edildi.")}>
                        {l.status === "active" ? "Çıxar" : "Ləğv et"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!info.links.length && (
                  <tr>
                    <td>
                      <p className="admin-empty">Hələ üzv və ya dəvət yoxdur. “Yeni dəvət kodu” yaradıb digər şirkətin hesab sahibinə göndərin.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
