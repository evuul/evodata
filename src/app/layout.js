import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Box from "@mui/material/Box";
import Providers from "./providers"; // ⬅️ NYTT: gemensam klient-wrapper för alla providers

const geistSans = localFont({
  variable: "--font-geist-sans",
  src: [{ path: "./fonts/Geist-Variable.woff2", weight: "100 900", style: "normal" }],
  display: "swap",
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: [{ path: "./fonts/GeistMono-Variable.woff2", weight: "100 900", style: "normal" }],
  display: "swap",
});

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata = {
  title: "EVOLUTION TRACKER",
  description: "Följer Evolution Gaming",
  applicationName: "Evolution Tracker",
  metadataBase: new URL(site),
  openGraph: {
    title: "Evolution Tracker",
    description: "Finansiell översikt, återköp, utdelning och nyheter om Evolution (EVO.ST)",
    url: "/",
    siteName: "Evolution Tracker",
    locale: "sv_SE",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Evolution Tracker" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Evolution Tracker",
    description: "Finansiell översikt, återköp, utdelning och nyheter om EVO.ST",
    site: "@Alexand93085679",
    creator: "@Alexand93085679",
    images: [{ url: "/twitter-image", width: 1200, height: 630, alt: "Evolution Tracker" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <Box sx={{ display: "flex" }}>
            {/* <Sidebar /> */}
            <Analytics />
            <SpeedInsights />
            <Box sx={{ flexGrow: 1, padding: "20px" }}>
              {children}
            </Box>
          </Box>
        </Providers>
      </body>
    </html>
  );
}
