"use client";
import { Download } from "lucide-react";
import type { Job, Profile } from "@/lib/model";
import { tailorProfile } from "@/lib/cv-tailor";
import BrandedCv from "./BrandedCv";
import { Modal } from "./components";

// The candidate's own CV with the skills this vacancy asks for first, ready to save as PDF.
export default function TailoredCv({ profile, job, onClose }: { profile: Profile; job: Job; onClose: () => void }) {
  const tailored = tailorProfile(profile, job);
  return (
    <Modal title={`Bu vakansiya üçün CV — ${job.title}`} onClose={onClose} className="cv-rewrite-modal">
      <div className="cv-rewrite-done">
        <p className="notice">
          CV-dəki heç nə dəyişmir və əlavə olunmur: yalnız vakansiyanın istədiyi bacarıqlar önə çıxarılır.
          {tailored.matched.length > 0 && <> Uyğun gələn: <b>{tailored.matched.join(", ")}</b>.</>}
          {tailored.missing.length > 0 && <> CV-nizdə görünməyən tələblər: <b>{tailored.missing.join(", ")}</b>. Bunlar sizdə varsa, profilinizə əlavə edin.</>}
        </p>
        <div className="cv-print-area">
          <BrandedCv profile={tailored.profile} />
        </div>
        <button className="primary" onClick={() => window.print()}>
          <Download size={16} /> PDF kimi yüklə
        </button>
      </div>
    </Modal>
  );
}
