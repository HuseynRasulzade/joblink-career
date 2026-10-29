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
  initial,
}: {
  employer?: boolean;
  api?: (path: string, body?: unknown) => Promise<any>;
  notify: (message: string) => void;
  initial?: { amount: number; from: "gross" | "net"; sector: Sector; reduction?: number };
}) {
  const [from, setFrom] = useState<"gross" | "net">(initial?.from || "gross");
  const [sector, setSector] = useState<Sector>(initial?.sector || "private");
  const [amount, setAmount] = useState(initial?.amount || 1500);
  const [reduction, setReduction] = useState(initial?.reduction || 0);
  const [headcount, setHeadcount] = useState(1);
  const [serverResult, setServerResult] = useState<Employer | null>(null);
  const local = useMemo(
    () => (from === "net" ? calculateFromNet(amount, sector, { reduction }) : calculateFromGross(amount, sector, { reduction })),
    [from, amount, sector, reduction],
  );
  async function calculate() {
    try {
      setServerResult((await api!("company/salary-calc", { from, sector, amount, headcount, reduction })) as Employer);
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
          <Field label="Vergi güzəşti — aylıq gəlirin azalması (AZN)">
            <select value={reduction} onChange={(e) => setReduction(Number(e.target.value))}>
              <option value={0}>Güzəşt yoxdur</option>
              <option value={50}>50 — himayəsində azı 3 nəfər (102.5)</option>
              <option value={100}>100 — 102.4 (məcburi köçkün, daimi qulluq edən I dərəcə və s.)</option>
              <option value={200}>200 — 102.3 (əlillik 61–100%, əlilliyi olan uşaq, daimi qulluq edən)</option>
              <option value={250}>250 — 200 + himayəsində 3 nəfər</option>
              <option value={400}>400 — 102.2 (qəhrəman, müharibə veteranı, müharibə əlili I–II və s.)</option>
              <option value={450}>450 — 400 + himayəsində 3 nəfər</option>
              <option value={800}>800 — şəhid ailəsi (102.1-1)</option>
              <option value={850}>850 — 800 + himayəsində 3 nəfər</option>
            </select>
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
              {r.taxReduction > 0 && <Row label="Vergi güzəşti (aylıq gəlirin azalması)" value={r.taxReduction} />}
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
            Təxmini hesablamadır (Vergilər Nazirliyinin 2026-cı il dərəcələri). Özəl qeyri-neft sektorunda gəlir vergisi
            2 500 AZN-dək 200 AZN-dən çox hissənin 3%-i, 8 000 AZN-dək 75 AZN + 10%, yuxarısı 625 AZN + 14%. Dövlət və
            neft-qaz sektorunda gəlir vergisi 14% və 2 500 AZN-dən yuxarı 350 AZN + 25%, DSMF işçi 3% və işəgötürən 22%.
            Güzəştlər və əlavə ödənişlər nəzərə alınmır; rəsmi hesablama üçün mühasib və ya Dövlət Vergi Xidməti ilə
            yoxlayın.
          </p>
        </section>
      ) : (
        employer && <p className="muted">Məbləği daxil edib “Hesabla” düyməsini basın.</p>
      )}
    </div>
  );
}
