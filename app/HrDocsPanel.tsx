"use client";
import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { buildHrDocument, DOC_KINDS_HR, EMPTY_DOC_OPTIONS, hrDocumentHtml, type DocCompany, type DocKind, type DocOptions } from "@/lib/hr-documents";
import { employeePay } from "@/lib/payroll";
import { weeklyHours } from "@/lib/employee-rights";
import type { EmployeeProfile } from "@/lib/employee-profile";
import { Field } from "./components";

type Employee = { id: string; name: string; position: string; department: string; section: string; startDate: string; salary: number | null; salaryType: "gross" | "net"; sector?: string; taxReduction?: number; profile?: EmployeeProfile | null };

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, { credentials: "same-origin", cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Sorğu tamamlanmadı.");
  return data;
}

// Contract, addendum, certificate and the like, filled in from the employee card and the company details.
export default function HrDocsPanel({ employee }: { employee: Employee }) {
  const today = new Date().toISOString().slice(0, 10);
  const [company, setCompany] = useState<DocCompany>({ name: "", voen: "", address: "", director: "" });
  const [kind, setKind] = useState<DocKind>("contract");
  const [o, setO] = useState<DocOptions>({ ...EMPTY_DOC_OPTIONS, date: today, changeFrom: today });
  useEffect(() => {
    void Promise.all([get<{ company: { name: string } | null }>("company/me"), get<{ details: { legalName: string; voen: string; director: string; legalAddress: string; phone: string } }>("company/profile")])
      .then(([me, profile]) => setCompany({ name: profile.details.legalName || me.company?.name || "", voen: profile.details.voen, address: profile.details.legalAddress, director: profile.details.director, phone: profile.details.phone }))
      .catch(() => undefined);
  }, []);
  const profile = employee.profile;
  const gross = useMemo(
    () => (employee.salary && employee.salary > 0 ? employeePay(employee.salary, employee.salaryType, employee.sector === "public" ? "public" : "private", employee.taxReduction || 0)?.gross || 0 : 0),
    [employee.salary, employee.salaryType, employee.sector, employee.taxReduction],
  );
  const doc = useMemo(
    () =>
      buildHrDocument(
        kind,
        company,
        {
          name: employee.name, fin: profile?.fin || "", idSeries: profile?.idSeries || "", idNumber: profile?.idNumber || "", idIssuedBy: profile?.idIssuedBy || "",
          address: profile?.registeredAddress || profile?.address || "", position: employee.position, department: employee.department, section: employee.section,
          startDate: employee.startDate, gross, weekHours: profile ? weeklyHours(profile, today).hours : 40,
        },
        o,
      ),
    [kind, company, employee, profile, gross, o, today],
  );
  const set = <K extends keyof DocOptions>(key: K, value: DocOptions[K]) => setO({ ...o, [key]: value });
  function print() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(hrDocumentHtml(doc));
    win.document.close();
    win.focus();
    win.print();
  }
  function word() {
    const url = URL.createObjectURL(new Blob(["﻿", hrDocumentHtml(doc)], { type: "application/msword" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${kind}-${employee.name.replace(/\s+/g, "-")}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="offer-composer">
      <p className="muted">{DOC_KINDS_HR.find((k) => k.id === kind)?.hint}. Məlumatlar işçi kartından və şirkət məlumatlarından götürülür; çatışmayan yerlər boş xətt kimi qalır.</p>
      <div className="form-grid">
        <Field label="Sənəd">
          <select value={kind} onChange={(e) => setKind(e.target.value as DocKind)}>
            {DOC_KINDS_HR.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </Field>
        <Field label="Tarix"><input type="date" value={o.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="Nömrə"><input value={o.number} onChange={(e) => set("number", e.target.value)} /></Field>
        {kind === "contract" && (
          <>
            <Field label="Müqavilənin müddəti">
              <select value={o.term} onChange={(e) => set("term", e.target.value as DocOptions["term"])}>
                <option value="indefinite">Müddətsiz</option>
                <option value="fixed">Müddətli</option>
              </select>
            </Field>
            {o.term === "fixed" && <Field label="Bitmə tarixi"><input type="date" value={o.endDate} onChange={(e) => set("endDate", e.target.value)} /></Field>}
            <Field label="Sınaq müddəti (ay, 0 — yoxdur)"><input type="number" min={0} max={6} value={o.probationMonths} onChange={(e) => set("probationMonths", Number(e.target.value))} /></Field>
            <Field label="İş yeri (ünvan)"><input value={o.workPlace} onChange={(e) => set("workPlace", e.target.value)} placeholder="Boşdursa şirkətin ünvanı" /></Field>
            <Field label="Əsas məzuniyyət (gün)"><input type="number" min={21} value={o.leaveDays} onChange={(e) => set("leaveDays", Number(e.target.value))} /></Field>
            <Field label="Əmək haqqı ödəniş günü"><input type="number" min={1} max={31} value={o.payDay} onChange={(e) => set("payDay", Number(e.target.value))} /></Field>
          </>
        )}
        {kind === "addendum" && (
          <>
            <Field label="Qüvvəyə minmə tarixi"><input type="date" value={o.changeFrom} onChange={(e) => set("changeFrom", e.target.value)} /></Field>
            <Field label="Yeni vəzifə (dəyişirsə)"><input value={o.newPosition} onChange={(e) => set("newPosition", e.target.value)} /></Field>
            <Field label="Yeni aylıq maaş, gross (AZN)"><input type="number" min={0} value={o.newGross} onChange={(e) => set("newGross", e.target.value)} /></Field>
            <Field label="Yeni həftəlik saat"><input type="number" min={1} max={40} value={o.newHours} onChange={(e) => set("newHours", e.target.value)} /></Field>
            <Field label="Əsas"><input value={o.changeReason} onChange={(e) => set("changeReason", e.target.value)} /></Field>
          </>
        )}
        {kind === "certificate" && (
          <>
            <Field label="Harada təqdim ediləcək"><input value={o.purpose} onChange={(e) => set("purpose", e.target.value)} /></Field>
            <label className="check"><input type="checkbox" checked={o.withSalary} onChange={(e) => set("withSalary", e.target.checked)} /> Əmək haqqı göstərilsin</label>
          </>
        )}
        {kind === "liability" && <Field label="Etibar olunan dəyərlilər"><input value={o.valuables} onChange={(e) => set("valuables", e.target.value)} placeholder="Məsələn: kassa, anbar malları" /></Field>}
      </div>
      <div className="admin-actions">
        <button type="button" className="primary" onClick={print}><Printer size={14} /> Çap</button>
        <button type="button" className="secondary" onClick={word}>Word (.doc)</button>
      </div>
      <div className="hr-doc-preview">
        <h4>{doc.title}</h4>
        {doc.sections.map((s, i) => (
          <div key={i}>
            {s.heading && <h5>{s.heading}</h5>}
            {s.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
          </div>
        ))}
        <small className="muted">{doc.note}</small>
      </div>
    </div>
  );
}
