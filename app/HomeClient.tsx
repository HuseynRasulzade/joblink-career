"use client";
import dynamic from "next/dynamic";

// The whole app is interactive and depends on the signed-in person, so it is
// drawn in the browser. Rendering it on the server as well cost enough CPU for
// Cloudflare to refuse a share of page loads (error 1102).
const Joblink = dynamic(() => import("./Joblink"), {
  ssr: false,
  loading: () => (
    <div role="status" aria-live="polite" style={{ padding: "48px 16px", textAlign: "center", color: "#5b6b68" }}>
      Yüklənir…
    </div>
  ),
});

export default function HomeClient() {
  return <Joblink />;
}
