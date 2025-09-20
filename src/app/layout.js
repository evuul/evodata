import { Geist, Geist_Mono } from "next/font/google";
// import Sidebar from "../Components/Sidebar"; // Importera Sidebar
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { Box } from "@mui/material";
import { StockPriceProvider } from "../context/StockPriceContext"; // Importera StockPriceProvider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "EVOLUTION TRACKER",
  description: "Följer Evolution Gaming",
  applicationName: "Evolution Tracker",
  metadataBase: undefined, // sätt en full URL vid deployment, t.ex. new URL('https://evo.example.com')
  openGraph: {
    title: "Evolution Tracker",
    description: "Finansiell översikt, återköp, utdelning och nyheter om Evolution (EVO.ST)",
    url: "/",
    siteName: "Evolution Tracker",
    locale: "sv_SE",
    type: "website",
    images: [
      { url: "/opengraph-image", width: 1200, height: 630, alt: "Evolution Tracker" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Evolution Tracker",
    description: "Finansiell översikt, återköp, utdelning och nyheter om EVO.ST",
    site: "@Alexand93085679",
    creator: "@Alexand93085679",
    images: [
      { url: "/twitter-image", width: 1200, height: 630, alt: "Evolution Tracker" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* Wrappa hela appen i StockPriceProvider */}
        <StockPriceProvider stockSymbol="EVO.ST" updateInterval={300000}>
          <Box sx={{ display: "flex" }}>
            {/* Sidomeny */}
            {/* <Sidebar /> */}
            <Analytics />
            {/* Huvudinnehåll */}
            <Box sx={{ flexGrow: 1, padding: "20px" }}>
              {children}
            </Box>
          </Box>
        </StockPriceProvider>
      </body>
    </html>
  );
}
