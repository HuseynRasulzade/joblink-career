"use client";
import { useEffect, useState } from "react";
import { Download, FileSignature, Send } from "lucide-react";
import type { Application, Job } from "@/lib/model";
import { Field, Modal } from "./components";
import { formatDate } from "@/lib/dates";
import { siteLanguage } from "./i18n";
import { calculateFromGross, calculateFromNet } from "@/lib/salary";

export type OfferData = {
  position: string;
  company: string;
  salary: number;
  salaryPeriod: "net" | "gross";
  startDate: string;
  contractType: string;
  probationMonths: number;
  workSchedule: string;
  location: string;
  benefits: string;
  validUntil: string;
  message: string;
  signerName: string;
  signerTitle: string;
};
export type Offer = {
  id: string;
  application_id: string;
  status: "sent" | "accepted" | "declined" | "withdrawn";
  data: OfferData;
  signature_name: string;
  signed_at: string;
  response_note: string;
  created: string;
  candidate_name?: string;
};
export const OFFER_STATUS: Record<Offer["status"], string> = {
  sent: "Cavab gözləyir",
  accepted: "Qəbul edildi",
  declined: "Rədd edildi",
  withdrawn: "Geri götürüldü",
};
const date = (value: string) =>
  value ? formatDate(value, siteLanguage(), { month: "long" }) : "—";

// The other form of the amount (net for a gross offer, gross for a net one); an estimate for a private-sector main job.
function otherSalary(data: OfferData) {
  try {
    const r =
      data.salaryPeriod === "gross"
        ? calculateFromGross(data.salary)
        : calculateFromNet(data.salary);
    const value = data.salaryPeriod === "gross" ? r.net : r.gross;
    return value > 0 ? Math.round(value) : null;
  } catch {
    return null;
  }
}

// Printable offer letter built from the employer's offer terms.
export function OfferDocument({
  data,
  candidateName,
  offer,
}: {
  data: OfferData;
  candidateName: string;
  offer?: Offer;
}) {
  return (
    <article className="offer-document">
      <header>
        <strong>{data.company}</strong>
        <span>İŞ TƏKLİFİ</span>
      </header>
      <p>Hörmətli {candidateName},</p>
      <p className="branded-cv-pre">{data.message}</p>
      <table>
        <tbody>
          <tr>
            <th>Vəzifə</th>
            <td>{data.position}</td>
          </tr>
          <tr>
            <th>Əmək haqqı</th>
            <td>
              {data.salary.toLocaleString("az-AZ")} AZN (
              {data.salaryPeriod === "gross"
                ? "vergilər daxil, gross"
                : "əlinə, net"}
              ) / ay
              {(() => {
                const other = otherSalary(data);
                return other ? (
                  <small className="skill-description">
                    {" "}
                    {data.salaryPeriod === "gross"
                      ? "Təxmini əlinə (net)"
                      : "Təxmini vergilər daxil (gross)"}
                    : {other.toLocaleString("az-AZ")} AZN
                  </small>
                ) : null;
              })()}
            </td>
          </tr>
          <tr>
            <th>İşə başlama tarixi</th>
            <td>{date(data.startDate)}</td>
          </tr>
          <tr>
            <th>Müqavilə növü</th>
            <td>{data.contractType}</td>
          </tr>
          {data.probationMonths > 0 && (
            <tr>
              <th>Sınaq müddəti</th>
              <td>{data.probationMonths} ay</td>
            </tr>
          )}
          {data.workSchedule && (
            <tr>
              <th>İş qrafiki</th>
              <td>{data.workSchedule}</td>
            </tr>
          )}
          {data.location && (
            <tr>
              <th>İş yeri</th>
              <td>{data.location}</td>
            </tr>
          )}
          {data.benefits && (
            <tr>
              <th>Əlavə imkanlar</th>
              <td className="branded-cv-pre">{data.benefits}</td>
            </tr>
          )}
          {data.validUntil && (
            <tr>
              <th>Təklif qüvvədədir</th>
              <td>{date(data.validUntil)} tarixinədək</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="offer-legal">
        Bu təklif əmək müqaviləsi deyil. Tərəflər razılaşdıqdan sonra Azərbaycan
        Respublikasının Əmək Məcəlləsinə uyğun əmək müqaviləsi bağlanır.
      </p>
      <footer>
        <div>
          <small>İşəgötürən adından</small>
          <strong>{data.signerName || "—"}</strong>
          <span>{data.signerTitle}</span>
        </div>
        <div>
          <small>Namizəd</small>
          {offer?.status === "accepted" ? (
            <>
              <strong>{offer.signature_name}</strong>
              <span>
                Elektron qaydada təsdiqləndi:{" "}
                {formatDate(offer.signed_at, siteLanguage(), { time: true })}
              </span>
            </>
          ) : (
            <span>
              {offer ? OFFER_STATUS[offer.status] : "Təsdiq gözləyir"}
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}

const plusDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

// Employer: compose and send an offer from the standard template.
export function OfferComposer({
  application,
  job,
  companyName,
  onClose,
  onSent,
  notify,
}: {
  application: Application;
  job: Job;
  companyName: string;
  onClose: () => void;
  onSent: () => void;
  notify: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<OfferData>({
    position: job.title,
    company: companyName || job.company,
    salary: job.maxSalary || job.minSalary || 0,
    salaryPeriod: "net",
    startDate: plusDays(14),
    contractType: "Müddətsiz",
    probationMonths: 3,
    workSchedule: job.workSchedule || "",
    location: job.address || job.city || "",
    benefits: job.benefits || "",
    validUntil: plusDays(7),
    message: `${job.company || companyName} olaraq müsabiqə mərhələlərini uğurla keçdiyinizi nəzərə alaraq sizi “${job.title}” vəzifəsinə işə qəbul etməyi təklif edirik. Təklifin əsas şərtləri aşağıda göstərilib. Suallarınız olarsa, platformadakı mesajlar bölməsindən bizimlə əlaqə saxlaya bilərsiniz.`,
    signerName: "",
    signerTitle: "HR meneceri",
  });
  const set = <K extends keyof OfferData>(key: K, value: OfferData[K]) =>
    setData((d) => ({ ...d, [key]: value }));
  type Template = {
    id: string;
    name: string;
    data: Partial<OfferData> & { validDays?: number };
  };
  const [templates, setTemplates] = useState<Template[]>([]);
  const loadTemplates = () =>
    fetch("/api/joblink/offers/templates", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ templates: Template[] }>)
          : { templates: [] as Template[] },
      )
      .then((d) => setTemplates(d.templates))
      .catch(() => {});
  useEffect(() => {
    void loadTemplates();
  }, []);
  const applyTemplate = (t: Template) =>
    setData((d) => ({
      ...d,
      contractType: t.data.contractType ?? d.contractType,
      probationMonths: t.data.probationMonths ?? d.probationMonths,
      workSchedule: t.data.workSchedule || d.workSchedule,
      location: t.data.location || d.location,
      benefits: t.data.benefits || d.benefits,
      message: t.data.message || d.message,
      signerName: t.data.signerName || d.signerName,
      signerTitle: t.data.signerTitle || d.signerTitle,
      validUntil: t.data.validDays ? plusDays(t.data.validDays) : d.validUntil,
    }));
  async function saveTemplate() {
    const name = window.prompt(
      "Şablonun adı (məsələn: Standart ofis təklifi):",
    );
    if (!name) return;
    try {
      const validDays =
        Math.max(
          1,
          Math.round((Date.parse(data.validUntil) - Date.now()) / 86400000),
        ) || 7;
      const response = await fetch("/api/joblink/offers/templates/save", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, data: { ...data, validDays } }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Şablon saxlanmadı.");
      notify("Şablon saxlanıldı. Maaş və başlama tarixi şablona yazılmır.");
      await loadTemplates();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function send() {
    setBusy(true);
    try {
      const response = await fetch("/api/joblink/offers/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id, data }),
      });
      const result = (await response.json()) as {
        error?: string;
        pending?: boolean;
      };
      if (!response.ok) throw new Error(result.error || "Təklif göndərilmədi.");
      notify(
        result.pending
          ? "Təklif direktorun təsdiqinə göndərildi. Təsdiqdən sonra namizədə çatacaq."
          : "İş təklifi namizədə göndərildi.",
      );
      onSent();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`İş təklifi — ${application.profile.name}`}
      onClose={onClose}
      className="offer-modal"
    >
      <div className="offer-composer">
        <div className="admin-actions">
          <select
            value=""
            aria-label="Şablondan doldur"
            onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              if (t) applyTemplate(t);
            }}
          >
            <option value="">
              {templates.length ? "Şablondan doldur…" : "Hələ şablon yoxdur"}
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="button" className="secondary" onClick={saveTemplate}>
            Şablon kimi saxla
          </button>
        </div>
        <div className="form-grid">
          <Field label="Vəzifə">
            <input
              value={data.position}
              onChange={(e) => set("position", e.target.value)}
            />
          </Field>
          <Field label="Aylıq əmək haqqı (AZN)">
            <input
              type="number"
              min={1}
              value={data.salary}
              onChange={(e) => set("salary", Number(e.target.value))}
            />
          </Field>
          <Field label="Məbləğin növü">
            <select
              value={data.salaryPeriod}
              onChange={(e) =>
                set("salaryPeriod", e.target.value as "net" | "gross")
              }
            >
              <option value="net">Əlinə (net)</option>
              <option value="gross">Vergilər daxil (gross)</option>
            </select>
          </Field>
          <Field label="İşə başlama tarixi">
            <input
              type="date"
              value={data.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </Field>
          <Field label="Müqavilə növü">
            <select
              value={data.contractType}
              onChange={(e) => set("contractType", e.target.value)}
            >
              {["Müddətsiz", "Müddətli", "Mülki-hüquqi"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Sınaq müddəti (ay)">
            <input
              type="number"
              min={0}
              max={6}
              value={data.probationMonths}
              onChange={(e) => set("probationMonths", Number(e.target.value))}
            />
          </Field>
          <Field label="İş qrafiki">
            <input
              value={data.workSchedule}
              placeholder="Məsələn: B.e.–Cümə, 09:00–18:00"
              onChange={(e) => set("workSchedule", e.target.value)}
            />
          </Field>
          <Field label="İş yeri">
            <input
              value={data.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </Field>
          <Field label="Təklif qüvvədədir (tarixədək)">
            <input
              type="date"
              value={data.validUntil}
              onChange={(e) => set("validUntil", e.target.value)}
            />
          </Field>
          <Field label="İmzalayan şəxs">
            <input
              value={data.signerName}
              placeholder="Ad Soyad"
              onChange={(e) => set("signerName", e.target.value)}
            />
          </Field>
          <Field label="Vəzifəsi">
            <input
              value={data.signerTitle}
              onChange={(e) => set("signerTitle", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Əlavə imkanlar">
          <textarea
            rows={2}
            value={data.benefits}
            onChange={(e) => set("benefits", e.target.value)}
          />
        </Field>
        <Field label="Müraciət mətni">
          <textarea
            rows={4}
            value={data.message}
            onChange={(e) => set("message", e.target.value)}
          />
        </Field>
        <h3>Önizləmə</h3>
        <OfferDocument data={data} candidateName={application.profile.name} />
        <button
          className="primary"
          disabled={
            busy || !data.salary || !data.startDate || !data.signerName.trim()
          }
          onClick={send}
        >
          <Send size={16} /> Təklifi göndər
        </button>
      </div>
    </Modal>
  );
}

// Candidate: read, accept (electronic signature) or decline an offer.
export function OfferResponse({
  offer,
  candidateName,
  onClose,
  onDone,
  notify,
}: {
  offer: Offer;
  candidateName: string;
  onClose: () => void;
  onDone: () => void;
  notify: (message: string) => void;
}) {
  const [signature, setSignature] = useState("");
  const [agree, setAgree] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function respond(action: "accept" | "decline") {
    if (
      action === "decline" &&
      !window.confirm("Təklifi rədd etmək istəyirsiniz?")
    )
      return;
    setBusy(true);
    try {
      const response = await fetch("/api/joblink/offers/respond", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: offer.id,
          action,
          signatureName: signature,
          agree,
          reason: declineReason,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Cavab göndərilmədi.");
      notify(
        action === "accept"
          ? "Təklifi qəbul etdiniz. Təbrik edirik!"
          : "Təklif rədd edildi.",
      );
      onDone();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="İş təklifi" onClose={onClose} className="offer-modal">
      <div className="offer-composer">
        <div className="cv-print-area">
          <OfferDocument
            data={offer.data}
            candidateName={candidateName}
            offer={offer}
          />
        </div>
        {offer.status === "sent" ? (
          <div className="offer-sign">
            <h3>
              <FileSignature size={18} /> Elektron təsdiq
            </h3>
            <Field label={`Təsdiq üçün tam adınızı yazın (${candidateName})`}>
              <input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
            </Field>
            <label className="checkline">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />{" "}
              Təklifin şərtləri ilə tanış oldum və qəbul edirəm.
            </label>
            <div className="offer-actions">
              <button
                className="primary"
                disabled={busy || !agree || !signature.trim()}
                onClick={() => respond("accept")}
              >
                Qəbul et və təsdiqlə
              </button>
              <input
                value={declineReason}
                placeholder="Rədd səbəbi (istəyə bağlı)"
                onChange={(e) => setDeclineReason(e.target.value)}
              />
              <button
                className="secondary"
                disabled={busy}
                onClick={() => respond("decline")}
              >
                Rədd et
              </button>
            </div>
          </div>
        ) : (
          <button className="secondary" onClick={() => window.print()}>
            <Download size={16} /> PDF kimi saxla
          </button>
        )}
      </div>
    </Modal>
  );
}
