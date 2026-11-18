import type { Metadata } from "next";
import { runtime } from "@/lib/server";
import { termsSections, LEGAL_UPDATED, type Operator } from "@/lib/legal-text";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "İstifadə şərtləri | JobMatch", description: "JobMatch platformasından istifadə qaydaları." };

export default function Page() {
  const env = runtime();
  const op: Operator = { name: env.PLATFORM_LEGAL_NAME || "", voen: env.PLATFORM_VOEN || "", address: env.PLATFORM_ADDRESS || "", email: env.PLATFORM_EMAIL || "" };
  return (
    <main className="seo-page">
      <h1>İstifadə şərtləri</h1>
      <p className="muted">Son yenilənmə: {LEGAL_UPDATED}</p>
      <p><a href="/">JobMatch-ə keç</a></p>
      {termsSections(op).map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.body.map((text, i) => <p key={i}>{text}</p>)}
        </section>
      ))}
    </main>
  );
}
