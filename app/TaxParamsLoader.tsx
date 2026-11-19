"use client";
import { useEffect } from "react";
import { setExtraTaxParams, type TaxParams } from "@/lib/salary";

// The calculators of the page run in the browser: they need the tax and insurance parameter sets the admin added, each with its start day.
export default function TaxParamsLoader() {
  useEffect(() => {
    let alive = true;
    fetch("/api/joblink/public/tax-params")
      .then((r) => (r.ok ? (r.json() as Promise<{ sets: TaxParams[] }>) : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.sets)) setExtraTaxParams(d.sets);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return null;
}
