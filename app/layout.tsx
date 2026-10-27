import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./joblink.css";
import "./features.css";
import RegisterServiceWorker from "./RegisterServiceWorker";
import ClientErrorReporter from "./ClientErrorReporter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Joblink — Karyeranızın növbəti addımı",
  description:
    "CV-nizi təkmilləşdirin, təcrübənizə uyğun vakansiyaları kəşf edin və işə qəbul prosesini idarə edin.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/joblink.svg",
    shortcut: "/joblink.svg",
    apple: "/icon-192.png",
  },
  appleWebApp: { capable: true, title: "Joblink", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#0f766e" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <noscript>
          <main style={{ maxWidth: 640, margin: "48px auto", padding: "0 16px" }}>
            <h1>Joblink</h1>
            <p>
              Joblink iş axtaranları və işəgötürənləri bir yerə gətirir: CV analizi,
              uyğun vakansiyalar və işə qəbul prosesinin idarəsi. Saytı işlətmək üçün
              brauzerdə JavaScript aktiv olmalıdır.
            </p>
            <p>
              <a href="/jobs">Açıq vakansiyalara bax</a>
            </p>
          </main>
        </noscript>
        <RegisterServiceWorker />
        <ClientErrorReporter />
      </body>
    </html>
  );
}
