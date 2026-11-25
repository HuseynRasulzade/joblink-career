import type { Metadata } from "next";
import { runtime } from "@/lib/server";
import { LEGAL_UPDATED, termsDoc, type LegalLang, type Operator } from "@/lib/legal-text";
import { operatorOf } from "@/lib/platform-company";
import LegalPage from "../LegalPage";
import PublicShell from "../jobs/PublicShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "İstifadə şərtləri | JobMatch", description: "JobMatch platformasından istifadə qaydaları.", alternates: { canonical: "/terms" } };

export default function Page() {
  const env = runtime();
  const op: Operator = operatorOf(env);
  const docs = { az: termsDoc(op, "az"), en: termsDoc(op, "en"), ru: termsDoc(op, "ru") } as Record<LegalLang, ReturnType<typeof termsDoc>>;
  return (
    <PublicShell>
      <LegalPage kind="terms" docs={docs} updated={LEGAL_UPDATED} />
    </PublicShell>
  );
}
