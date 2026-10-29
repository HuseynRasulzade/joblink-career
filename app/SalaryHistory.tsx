"use client";
import { useEffect, useState } from "react";

type Entry = { from: string; salary: number; type: string; note: string; created: string };
const azn = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "ilk maaş");

// The dated pay changes of an employee; the pay slips of past months use the pay that was in force then.
export default function SalaryHistory({ employeeId }: { employeeId: string }) {
  const [list, setList] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/joblink/company/employees/salary-history?id=${employeeId}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as { history?: Entry[]; error?: string };
        if (!r.ok) throw new Error(data.error || "Tarixçə alınmadı.");
        setList(data.history || []);
      })
      .catch((e) => setError((e as Error).message));
  }, [employeeId]);
  if (error) return <p className="danger-text">{error}</p>;
  if (!list) return <p className="muted">Yüklənir…</p>;
  if (!list.length) return <p className="muted">Maaş dəyişikliyi qeydə alınmayıb: hazırkı maaş bütün aylar üçün götürülür.</p>;
  return (
    <div className="offer-composer">
      <table className="admin-table">
        <thead><tr><th>Qüvvəyə minir</th><th>Maaş</th><th>Növ</th></tr></thead>
        <tbody>
          {list.map((h, i) => <tr key={i}><td>{dmy(h.from)}</td><td>{azn(h.salary)}</td><td>{h.type === "net" ? "net" : "gross"}</td></tr>)}
        </tbody>
      </table>
      <small className="muted">Maaş dəyişəndə qüvvəyə minmə tarixi göstərilir; həmin tarixdən əvvəlki günlər köhnə maaşla, sonrakılar yeni maaşla hesablanır.</small>
    </div>
  );
}
