import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono, Inter } from "next/font/google";
import "./joblink.css";
import "./features.css";
import "./polish.css";
import "./landing.css";
import "./ember.css";
import "./ember-base.css";
import "./public-light.css";
import RegisterServiceWorker from "./RegisterServiceWorker";
import TaxParamsLoader from "./TaxParamsLoader";
import ClientErrorReporter from "./ClientErrorReporter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const fraunces = Fraunces({ variable: "--font-serif", subsets: ["latin", "latin-ext"], display: "swap" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobMatch — Karyeranızın növbəti addımı",
  description:
    "CV-nizi təkmilləşdirin, təcrübənizə uyğun vakansiyaları kəşf edin və işə qəbul prosesini idarə edin.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/joblink.svg",
    shortcut: "/joblink.svg",
    apple: "/icon-192.png",
  },
  appleWebApp: { capable: true, title: "JobMatch", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#0f766e" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" suppressHydrationWarning>
      <head>
        {/* The white look is chosen with the sun/moon button; it is applied before the first paint so the page does not flash dark. */}
        <script dangerouslySetInnerHTML={{ __html: 'try{if(localStorage.getItem("joblink-theme")==="light")document.documentElement.dataset.pub="light"}catch(e){}' }} />
      </head>
      <body
        className={`${fraunces.variable} ${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <noscript>
          <main style={{ maxWidth: 640, margin: "48px auto", padding: "0 16px" }}>
            <h1>JobMatch</h1>
            <p>
              JobMatch iş axtaranları və işəgötürənləri bir yerə gətirir: CV analizi,
              uyğun vakansiyalar və işə qəbul prosesinin idarəsi. Saytı işlətmək üçün
              brauzerdə JavaScript aktiv olmalıdır.
            </p>
            <p>
              <a href="/jobs">Açıq vakansiyalara bax</a>
            </p>
          </main>
        </noscript>
        <RegisterServiceWorker />
        <TaxParamsLoader />
        <ClientErrorReporter />
      </body>
    </html>
  );
}
