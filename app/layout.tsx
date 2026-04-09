import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import ChatWidget from "@/components/chat/ChatWidget";
import "./globals.css";

export const metadata: Metadata = {
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
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
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
