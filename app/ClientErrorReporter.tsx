"use client";
import { useEffect } from "react";

// Sends uncaught browser errors to the admin's error log (at most 5 per page load; no personal data).
export default function ClientErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const report = (message: unknown) => {
      if (sent >= 5) return;
      sent += 1;
      const text = message instanceof Error ? message.message : String(message || "");
      fetch("/api/joblink/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, where: window.location.pathname }),
        keepalive: true,
      }).catch(() => {});
    };
    const onError = (event: ErrorEvent) => report(event.error || event.message);
    const onRejection = (event: PromiseRejectionEvent) => report(event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
