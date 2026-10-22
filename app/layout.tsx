import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./joblink.css";
import "./features.css";

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
  icons: {
    icon: "/joblink.svg",
    shortcut: "/joblink.svg",
  },
};

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
      </body>
    </html>
  );
}
