import type { Metadata } from "next";
import { runtime } from "@/lib/server";
import { privacySections, LEGAL_UPDATED, type Operator } from "@/lib/legal-text";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Məxfilik siyasəti | JobMatch", description: "JobMatch şəxsi məlumatları necə toplayır, işlədir və qoruyur." };

export default function Page() {
  const env = runtime();
  const op: Operator = { name: env.PLATFORM_LEGAL_NAME || "", voen: env.PLATFORM_VOEN || "", address: env.PLATFORM_ADDRESS || "", email: env.PLATFORM_EMAIL || "" };
  return (
    <main className="seo-page">
      <h1>Məxfilik siyasəti</h1>
      <p className="muted">Son yenilənmə: {LEGAL_UPDATED}</p>
      <p><a href="/">JobMatch-ə keç</a></p>
      {privacySections(op).map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.body.map((text, i) => <p key={i}>{text}</p>)}
        </section>
      ))}
    </main>
  );
}
