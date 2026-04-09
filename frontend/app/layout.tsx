import type { Metadata } from "next";
import { IBM_Plex_Sans, Sora } from "next/font/google";

import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SunBronze Front Desk",
  description: "Receptionist and admin interface for SunBronze scheduling and WhatsApp operations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${plexSans.variable} font-sans`}>{children}</body>
    </html>
  );
}
