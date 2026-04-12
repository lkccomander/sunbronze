import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import "./globals.css";
import es from "@/i18n/es.json";
import { getRequestDictionary } from "@/lib/i18n-server";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: es.meta.title,
  description: es.meta.description,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dictionary: d } = await getRequestDictionary();

  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{const t=localStorage.getItem("sunbronze_theme");document.documentElement.dataset.theme=t==="light"||t==="dark-green"?t:"dark";})();`,
          }}
        />
      </head>
      <body className={`${manrope.variable} ${inter.variable}`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-[var(--color-on-primary)]"
        >
          {d.shell.skip}
        </a>
        {children}
      </body>
    </html>
  );
}
