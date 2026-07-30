"use client";

// Loads page data only for the dashboard variant the visitor can see.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { combineBuybackSnapshots } from "@/lib/buybackSnapshots";

const LiveHeader = dynamic(() => import("@/Components/LiveHeader"), {
  ssr: false,
  loading: () => <LoadingState label="Laddar kontrollcenter ..." />,
});

const LiveLoggedOutPreview = dynamic(() => import("@/Components/LiveLoggedOutPreview"), {
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

const emptyDataState = {
  loading: false,
  error: null,
  value: null,
};

async function readDefault(modulePromise) {
  const module = await modulePromise;
  return module.default;
}

async function loadLiveHeaderData() {
  const [financialReports, averagePlayersData, dividendData, historicalBuybacks, currentBuybacks, sharesData] = await Promise.all([
    readDefault(import("@/app/data/financialReports.json")),
    readDefault(import("@/app/data/averagePlayers.json")),
    readDefault(import("@/app/data/dividendData.json")),
    readDefault(import("@/app/data/oldBuybackData.json")),
    readDefault(import("@/app/data/buybackData.json")),
    readDefault(import("@/app/data/amountOfShares.json")),
  ]);

  return {
    financialReports,
    averagePlayersData,
    dividendData,
    buybackData: combineBuybackSnapshots(historicalBuybacks, currentBuybacks),
    sharesData,
  };
}

async function loadLoggedOutPreviewData() {
  return {};
}

function LoadingState({ label = "Laddar dashboards ..." }) {
  return (
    <main>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          color: "rgba(255,255,255,0.7)",
          gap: 1.5,
        }}
      >
        <CircularProgress size={28} sx={{ color: "#82c1ff" }} />
        <Typography variant="body2">{label}</Typography>
      </Box>
    </main>
  );
}

function ErrorState({ onRetry }) {
  return (
    <main>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          color: "rgba(248,113,113,0.9)",
          px: 2,
          textAlign: "center",
          gap: 1.5,
        }}
      >
        <Typography variant="body2">Kunde inte ladda dashboarddata. Försök igen om en stund.</Typography>
        <Button variant="outlined" color="inherit" onClick={onRetry}>
          Försök igen
        </Button>
      </Box>
    </main>
  );
}

export default function HomeClient() {
  const { isAuthenticated, initialized } = useAuth();
  const [dashboardData, setDashboardData] = useState(emptyDataState);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!initialized) return undefined;

    let cancelled = false;
    const loader = isAuthenticated ? loadLiveHeaderData : loadLoggedOutPreviewData;
    setDashboardData({ loading: true, error: null, value: null });

    loader()
      .then((value) => {
        if (!cancelled) setDashboardData({ loading: false, error: null, value });
      })
      .catch((error) => {
        if (!cancelled) setDashboardData({ loading: false, error, value: null });
      });

    return () => {
      cancelled = true;
    };
  }, [initialized, isAuthenticated, retryKey]);

  if (!initialized || dashboardData.loading) {
    return <LoadingState />;
  }

  if (dashboardData.error || !dashboardData.value) {
    return <ErrorState onRetry={() => setRetryKey((value) => value + 1)} />;
  }

  if (!isAuthenticated) {
    return (
      <main>
        <LiveLoggedOutPreview {...dashboardData.value} />
      </main>
    );
  }

  return (
    <main>
      <LiveHeader {...dashboardData.value} />
    </main>
  );
}
