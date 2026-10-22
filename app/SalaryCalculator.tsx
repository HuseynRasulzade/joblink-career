"use client";
import { useMemo, useState } from "react";
import { calculateFromGross, calculateFromNet, type Sector, type SalaryBreakdown } from "@/lib/salary";
import { Field } from "./components";

const azn = (v: number) => `${v.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;

type Employer = { result: SalaryBreakdown; headcount: number; monthlyTotal: number; yearlyTotal: number };

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <tr className={strong ? "calc-strong" : undefined}>
      <td>{label}</td>
      <td>{azn(value)}</td>
    </tr>
  );
}

// Open to everyone: gross/net conversion for the employee. The employer
// variant also shows the employer's contributions and total cost, and runs
// on the server so it is only available to company accounts.
export function SalaryCalculator({
  employer = false,
  api,
  notify,
}: {
  employer?: boolean;
  api?: (path: string, body?: unknown) => Promise<any>;
  notify: (message: string) => void;
}) {
  const [from, setFrom] = useState<"gross" | "net">("gross");
  const [sector, setSector] = useState<Sector>("private");
  const [amount, setAmount] = useState(1500);
  const [headcount, setHeadcount] = useState(1);
  const [serverResult, setServerResult] = useState<Employer | null>(null);
  const local = useMemo(
    () => (from === "net" ? calculateFromNet(amount, sector) : calculateFromGross(amount, sector)),
    [from, amount, sector],
  );
  async function calculate() {
    try {
      setServerResult((await api!("company/salary-calc", { from, sector, amount, headcount })) as Employer);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const r = employer ? serverResult?.result : local;
  return (
    <div className="calc-page">
      <section className="panel calc-form">
        <h3>{employer ? "İşəgötürən kalkulyatoru" : "Əmək haqqı kalkulyatoru"}</h3>
        <div className="form-grid">
          <Field label="Hesablama növü">
            <select value={from} onChange={(e) => setFrom(e.target.value as "gross" | "net")}>
              <option value="gross">Gross (vergilərdən əvvəl) → Net</option>
              <option value="net">Net (ələ keçən) → Gross</option>
            </select>
          </Field>
          <Field label="Sektor">
            <select value={sector} onChange={(e) => setSector(e.target.value as Sector)}>
              <option value="private">Qeyri-neft özəl sektor</option>
              <option value="public">Dövlət / neft-qaz sektoru</option>
            </select>
          </Field>
          <Field label={from === "gross" ? "Aylıq gross maaş (AZN)" : "Aylıq net maaş (AZN)"}>
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </Field>
          {employer && (
            <Field label="İşçi sayı">
              <input type="number" min={1} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} />
            </Field>
          )}
        </div>
        {employer && <button className="primary" onClick={calculate}>Hesabla</button>}
      </section>
      {r ? (
        <section className="panel calc-result">
          <table className="admin-table">
            <tbody>
              <Row label="Gross maaş" value={r.gross} />
              <Row label="Gəlir vergisi" value={r.incomeTax} />
              <Row label="DSMF (işçi payı)" value={r.employeeSocial} />
              <Row label="İşsizlik sığortası (işçi)" value={r.employeeUnemployment} />
              <Row label="İcbari tibbi sığorta (işçi)" value={r.employeeMedical} />
              <Row label="Ələ keçən (net) maaş" value={r.net} strong />
              {employer && (
                <>
                  <Row label="DSMF (işəgötürən payı)" value={r.employerSocial} />
                  <Row label="İşsizlik sığortası (işəgötürən)" value={r.employerUnemployment} />
                  <Row label="İcbari tibbi sığorta (işəgötürən)" value={r.employerMedical} />
                  <Row label="İşəgötürənin ümumi aylıq xərci (1 işçi)" value={r.employerCost} strong />
                  {serverResult && serverResult.headcount > 1 && (
                    <Row label={`${serverResult.headcount} işçi — aylıq`} value={serverResult.monthlyTotal} />
                  )}
                  {serverResult && <Row label="İllik xərc" value={serverResult.yearlyTotal} strong />}
                </>
              )}
            </tbody>
          </table>
          <p className="muted fine-print">
            Təxmini hesablamadır (2026-cı il dərəcələri: özəl qeyri-neft sektorunda gəlir vergisi 2 500 AZN-dək 3%,
            8 000 AZN-dək 10%, yuxarısı 14%). Güzəştlər və əlavə ödənişlər nəzərə alınmır; rəsmi hesablama üçün
            mühasib və ya Dövlət Vergi Xidməti ilə yoxlayın.
          </p>
        </section>
      ) : (
        employer && <p className="muted">Məbləği daxil edib “Hesabla” düyməsini basın.</p>
      )}
    </div>
  );
}
