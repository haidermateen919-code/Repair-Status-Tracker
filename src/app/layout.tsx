import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import { OfflineBanner } from "@/components/offline-banner";
import { PwaRegister } from "@/components/pwa-register";
import { copy } from "@/content/copy";

import "./globals.css";

export const metadata: Metadata = {
  title: copy.app.name,
  description: copy.app.description,
  applicationName: copy.app.name,
  manifest: "/manifest.webmanifest",
  // This app contains customer repair data — nothing here belongs in a search index.
  robots: { index: false, follow: false, nocache: true },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1D4ED8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <OfflineBanner />
        {children}
        <Toaster position="top-center" theme="light" richColors closeButton />
        <PwaRegister />
      </body>
    </html>
  );
}
