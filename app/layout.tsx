import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EaseMail - The Future of Email Management",
  description: "Enterprise-grade email client with AI-powered features, smart inbox management, and team collaboration",
  keywords: ["email client", "email management", "AI email", "team collaboration", "productivity"],
  authors: [{ name: "EaseMail" }],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', type: 'image/svg+xml', sizes: '180x180' },
    ],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#667eea',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <CookieConsentBanner />
      </body>
    </html>
  );
}

