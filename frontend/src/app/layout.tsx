import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { headers } from "next/headers";
import { WebVitals } from "@/components/layout/WebVitals";
import "./globals.css";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["700", "800"] });
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: { default: "MYUZIK", template: "%s · MYUZIK" },
  description: "Hear what genre you're listening to — upload a track or let it listen live.",
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the nonce opts every page into dynamic rendering, which the per-request CSP requires.
  headers().get("x-nonce");
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#main"
          className="sr-only rounded-md bg-accent px-4 py-2 font-display text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        {children}
        <WebVitals />
      </body>
    </html>
  );
}
