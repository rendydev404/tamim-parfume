import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { Toaster } from "react-hot-toast";
import ChatWidget from "@/components/chat/ChatWidget";
import BanOverlay from "@/components/auth/BanOverlay";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-montserrat",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://tamimparfume.my.id"
  ),
  title: {
    default: "TAMIM PARFUME — Toko Parfum Premium Online",
    template: "%s | TAMIM PARFUME",
  },
  description:
    "TAMIM PARFUME — Toko parfum premium dengan koleksi terlengkap. Parfum pria, wanita, unisex, Arabian, designer, dan niche dengan harga terbaik.",
  keywords: [
    "parfum",
    "perfume",
    "toko parfum",
    "parfum pria",
    "parfum wanita",
    "parfum premium",
    "oud",
    "arabian perfume",
    "tamim parfume",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "TAMIM PARFUME",
    title: "TAMIM PARFUME — Toko Parfum Premium Online",
    description:
      "Koleksi parfum premium terlengkap dengan harga terbaik. Belanja parfum pria, wanita, unisex, dan Arabian.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TAMIM PARFUME — Toko Parfum Premium Online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TAMIM PARFUME — Toko Parfum Premium Online",
    description:
      "Koleksi parfum premium terlengkap dengan harga terbaik. Belanja parfum pria, wanita, unisex, dan Arabian.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${montserrat.variable} ${playfair.variable}`}>
      <head>
        <link
          rel="preconnect"
          href="https://dsrjrznylbyfitepssvw.supabase.co"
        />
      </head>
      <body className={montserrat.className}>
        <BanOverlay />
        {children}
        <ChatWidget />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              borderRadius: "var(--radius-md)",
              background: "#000",
              color: "#fff",
            },
          }}
        />
      </body>
    </html>
  );
}
