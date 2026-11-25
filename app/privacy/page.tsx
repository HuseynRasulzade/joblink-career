import type { Metadata } from "next";
import { runtime } from "@/lib/server";
import { LEGAL_UPDATED, privacyDoc, type LegalLang, type Operator } from "@/lib/legal-text";
import { operatorOf } from "@/lib/platform-company";
import LegalPage from "../LegalPage";
import PublicShell from "../jobs/PublicShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Məxfilik siyasəti | JobMatch", description: "JobMatch şəxsi məlumatları necə toplayır, işlədir və qoruyur.", alternates: { canonical: "/privacy" } };

export default function Page() {
  const env = runtime();
  const op: Operator = operatorOf(env);
  const docs = { az: privacyDoc(op, "az"), en: privacyDoc(op, "en"), ru: privacyDoc(op, "ru") } as Record<LegalLang, ReturnType<typeof privacyDoc>>;
  return (
    <PublicShell>
      <LegalPage kind="privacy" docs={docs} updated={LEGAL_UPDATED} />
    </PublicShell>
  );
}
