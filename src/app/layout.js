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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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