import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sessionIdentity } from "@/lib/external-auth";
import PublicHome from "./PublicHome";

export const dynamic = "force-dynamic";

// The public home page. A signed-in person goes straight on to the app (/panel); everyone else gets this light page.
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cookie = (await headers()).get("cookie") || "";
  if (cookie.includes("__Host-joblink_session=")) {
    const user = await sessionIdentity(new Request("http://app.local/", { headers: { cookie } })).catch(() => null);
    if (user) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(await searchParams)) if (typeof value === "string") query.set(key, value);
      redirect(`/panel${query.size ? `?${query}` : ""}`);
    }
  }
  return <PublicHome />;
}
