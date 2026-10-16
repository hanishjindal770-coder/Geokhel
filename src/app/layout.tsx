import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "GeoKhel",
  description: "Five Indian sports moments a day. Tap where each one happened on the map of India.",
  openGraph: { title: "GeoKhel", description: "Five Indian sports moments a day. Tap where each one happened on the map.", images: ["/og"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1714" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Teko:wght@500;600;700&family=Hind:wght@400;500;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
