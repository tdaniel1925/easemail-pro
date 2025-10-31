import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EaseMail - The Future of Email Management",
  description: "Enterprise-grade email client with AI-powered features",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Prevent theme flash on page load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedThemeId = localStorage.getItem('easemail-theme');
                  if (savedThemeId) {
                    const themes = ${JSON.stringify(require('../lib/themes').themes)};
                    const savedTheme = themes.find(t => t.id === savedThemeId);
                    if (savedTheme) {
                      Object.entries(savedTheme.colors).forEach(([key, value]) => {
                        const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
                        document.documentElement.style.setProperty(cssVar, value);
                      });
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

