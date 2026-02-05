"use client";

import LiveHeader from "../Components/LiveHeader";
import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import financialReports from "./data/financialReports.json";
import averagePlayersData from "./data/averagePlayers.json";
import dividendData from "./data/dividendData.json";
import buybackData from "./data/buybackData.json";
import gameShowsPreview from "./data/gameShows.json";
import shortHistoryData from "./data/shortHistory.json";
import insiderTransactions from "./data/insiderTransactions.json";
import outstandingShares from "./data/amountOfShares.json";
import { useAuth } from "../context/AuthContext";

function useInViewOnce(ref) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || visible || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, visible]);

  return visible;
}

export default function Home() {
  const { isAuthenticated, initialized } = useAuth();
  const [showAuthenticatedContent, setShowAuthenticatedContent] = useState(false);
  useEffect(() => {
    if (isAuthenticated) {
      const id = setTimeout(() => setShowAuthenticatedContent(true), 300);
      return () => clearTimeout(id);
    }
    setShowAuthenticatedContent(false);
  }, [isAuthenticated]);

  const renderAuthenticatedContent = () => (
    <>
    </>
  );

  if (!initialized) {
    return (
      <main>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <CircularProgress />
        </Box>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main>
        <LiveLoggedOutPreview
          financialReports={financialReports}
          averagePlayersData={averagePlayersData}
          dividendData={dividendData}
          buybackData={buybackData}
          gameShowsData={gameShowsPreview}
          shortHistoryData={shortHistoryData}
          insiderTransactions={insiderTransactions}
          sharesData={outstandingShares}
        />
      </main>
    );
  }

  return (
    <main>
      <LiveHeader
        financialReports={financialReports}
        averagePlayersData={averagePlayersData}
        dividendData={dividendData}
        buybackData={buybackData}
        sharesData={outstandingShares}
      />

      {showAuthenticatedContent ? (
        renderAuthenticatedContent()
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "40vh",
            color: "rgba(255,255,255,0.7)",
            gap: 1.5,
          }}
        >
          <CircularProgress size={28} sx={{ color: "#82c1ff" }} />
          <Typography variant="body2">Laddar dashboards …</Typography>
        </Box>
      )}
    </main>
  );
}
const LiveLoggedOutPreview = dynamic(() => import("../Components/LiveLoggedOutPreview"), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress />
    </Box>
  ),
});
