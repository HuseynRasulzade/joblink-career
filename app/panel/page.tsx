import type { Metadata } from "next";
import HomeClient from "../HomeClient";

export const metadata: Metadata = { title: "JobMatch — Panel", robots: { index: false, follow: false } };

// The signed-in app (and its sign-in screen): a separate page from the public home page.
export default function Panel() {
  return <HomeClient />;
}
