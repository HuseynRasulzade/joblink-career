"use client";
import { useState } from "react";
import { ClipboardCheck, FileSignature, History, MessageCircle, UserRound } from "lucide-react";
import { OFFER_STATUS, type Offer } from "./Offers";
import type { Application } from "@/lib/model";
import { WITHDRAWN_STATUS } from "@/lib/recruitment";
import { siteLanguage, translate } from "./i18n";
import { formatDate } from "@/lib/dates";

const t = (text: string) => translate(text, siteLanguage());

type Column = { key: string; title: string; status: string; stage: string };

// Columns follow the vacancy's own selection stages between review and offer.
export function pipelineColumns(stages: string[] | undefined): Column[] {
  const interview = (stages || []).length
    ? (stages || []).map((stage) => ({ key: `stage:${stage}`, title: stage, status: "Müsahibə", stage }))
    : [{ key: "status:Müsahibə", title: "Müsahibə", status: "Müsahibə", stage: "" }];
  return [
    { key: "status:Göndərildi", title: "Yeni müraciətlər", status: "Göndərildi", stage: "" },
    { key: "status:Baxışda", title: "Baxışda", status: "Baxışda", stage: "" },
    ...interview,
    { key: "status:Təklif edildi", title: "Təklif edildi", status: "Təklif edildi", stage: "" },
    { key: "status:İşə qəbul edildi", title: "İşə qəbul edildi", status: "İşə qəbul edildi", stage: "" },
    { key: "status:Uyğun deyil", title: "Uyğun deyil", status: "Uyğun deyil", stage: "" },
  ];
}
function columnOf(app: Application, columns: Column[]) {
  if (app.status === "Müsahibə") {
    const byStage = columns.find((c) => c.stage && c.stage === app.stage);
    return (byStage || columns.find((c) => c.status === "Müsahibə"))!.key;
  }
  return columns.find((c) => c.status === app.status)?.key || "";
}

export default function PipelineBoard({
  applications,
  stages,
  disabled,
  onMove,
  onOpenProfile,
  onMessage,
  onHistory,
  offers,
  onOffer,
  onWithdrawOffer,
  onAssignTest,
}: {
  applications: Application[];
  stages: string[] | undefined;
  disabled: boolean;
  onMove: (application: Application, status: string, stage: string) => void;
  onOpenProfile: (application: Application) => void;
  onMessage: (application: Application) => void;
  onHistory: (application: Application) => void;
  offers: Record<string, Offer>;
  onOffer: (application: Application) => void;
  onWithdrawOffer: (offer: Offer) => void;
  onAssignTest: (application: Application) => void;
}) {
  const lastStage = (stages || [])[(stages || []).length - 1] || "";
  // Offers follow the last selection stage.
  const canOffer = (app: Application) =>
    app.status === "Müsahibə" && (!lastStage || app.stage === lastStage) && offers[app.id]?.status !== "sent";
  const columns = pipelineColumns(stages);
  const [dragging, setDragging] = useState<string>("");
  const withdrawn = applications.filter((a) => a.status === WITHDRAWN_STATUS);
  return (
    <div className="pipeline">
      <div className="pipeline-board">
        {columns.map((column) => {
          const cards = applications.filter((a) => a.status !== WITHDRAWN_STATUS && columnOf(a, columns) === column.key);
          return (
            <section
              key={column.key}
              className={`pipeline-column ${dragging ? "drop-ready" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const app = applications.find((a) => a.id === event.dataTransfer.getData("text/plain"));
                setDragging("");
                if (app && !disabled && columnOf(app, columns) !== column.key) onMove(app, column.status, column.stage);
              }}
            >
              <header>
                <strong>{t(column.title)}</strong>
                <span>{cards.length}</span>
              </header>
              {cards.map((app) => (
                <article
                  key={app.id}
                  className="pipeline-card"
                  draggable={!disabled}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", app.id);
                    setDragging(app.id);
                  }}
                  onDragEnd={() => setDragging("")}
                >
                  <strong>{app.profile.name}</strong>
                  <small>{app.profile.title}</small>
                  <small>{formatDate(app.created, siteLanguage(), { year: false })}{app.auto ? " · AI" : ""}</small>
                  <select
                    aria-label={`${app.profile.name} — ${t("mərhələ")}`}
                    value={column.key}
                    disabled={disabled}
                    onChange={(event) => {
                      const target = columns.find((c) => c.key === event.target.value);
                      if (target) onMove(app, target.status, target.stage);
                    }}
                  >
                    {columns.map((c) => <option key={c.key} value={c.key}>{t(c.title)}</option>)}
                  </select>
                  {offers[app.id] && (
                    <span className={`offer-chip ${offers[app.id].status}`}>
                      {t("Təklif")}: {t(OFFER_STATUS[offers[app.id].status])}
                    </span>
                  )}
                  {canOffer(app) && !disabled && (
                    <button type="button" className="primary offer-button" onClick={() => onOffer(app)}>
                      <FileSignature size={14} /> {t("İş təklifi et")}
                    </button>
                  )}
                  {offers[app.id]?.status === "sent" && !disabled && (
                    <button type="button" className="text-button" onClick={() => onWithdrawOffer(offers[app.id])}>
                      {t("Təklifi geri götür")}
                    </button>
                  )}
                  <div className="pipeline-card-actions">
                    <button type="button" title={t("Profil")} onClick={() => onOpenProfile(app)}><UserRound size={14} /></button>
                    <button type="button" title={t("Mesaj yaz")} onClick={() => onMessage(app)}><MessageCircle size={14} /></button>
                    <button type="button" title={t("Tarixçə")} onClick={() => onHistory(app)}><History size={14} /></button>
                    {!disabled && !["Uyğun deyil", "İşə qəbul edildi"].includes(app.status) && (
                      <button type="button" title={t("Test göndər")} onClick={() => onAssignTest(app)}><ClipboardCheck size={14} /></button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>
      {withdrawn.length > 0 && (
        <p className="muted fine-print">
          {t("Geri götürülən müraciətlər")}: {withdrawn.map((a) => a.profile.name).join(", ")}
        </p>
      )}
    </div>
  );
}
