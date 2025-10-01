"use client";
import React, { useEffect, useState } from "react";
import { Card, Box, Typography, LinearProgress, CircularProgress } from "@mui/material";
import { useStockPriceContext } from "@/context/StockPriceContext";
import { formatSek } from "@/utils/formatters";

export default function ShortInterestBox({ totalShares }) {
  const [shortPercent, setShortPercent] = useState(null);
  const [previousPercent, setPreviousPercent] = useState(null);
  const [loading, setLoading] = useState(false);
  const { stockPrice } = useStockPriceContext();

  const fetchLatest = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/short/history", { cache: "no-store" });
      if (!res.ok) throw new Error("Kunde inte hämta blankningsdata");
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        const sorted = [...data.items]
          .map(item => ({ date: item.date, percent: Number(item.percent) }))
          .filter(item => item.date && Number.isFinite(item.percent))
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        const last = sorted[sorted.length - 1];
        const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
        setShortPercent(Number(last.percent));
        setPreviousPercent(prev ? Number(prev.percent) : null);
      } else {
        setShortPercent(null);
        setPreviousPercent(null);
      }
    } catch (err) {
      console.error("ShortInterestBox error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
    // Poll varje timme under handelsdagar om du vill:
    const id = setInterval(fetchLatest, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const percent = Number.isFinite(shortPercent) ? shortPercent : null;
  const prevPercent = Number.isFinite(previousPercent) ? previousPercent : null;
  const deltaPercent =
    percent != null && prevPercent != null
      ? +(percent - prevPercent).toFixed(2)
      : null;
  const displayPercent = percent ?? 0;
  const clampedPercent = Math.max(0, Math.min(100, displayPercent));
  const shortShares =
    totalShares && totalShares > 0 && percent != null
      ? Math.round((percent / 100) * totalShares)
      : null;
  const deltaShares =
    totalShares && totalShares > 0 && deltaPercent != null
      ? Math.round((deltaPercent / 100) * totalShares)
      : null;
  const latestPrice = stockPrice?.price?.regularMarketPrice?.raw;
  const shortValue =
    shortShares != null && Number.isFinite(latestPrice)
      ? shortShares * latestPrice
      : null;
  const deltaValue =
    deltaShares != null && Number.isFinite(latestPrice)
      ? deltaShares * latestPrice
      : null;

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: { xs: "12px", sm: "16px" },
        color: "#fff",
        width: "100%",
        maxWidth: "1200px",
        margin: "16px auto",
        minHeight: "200px",
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Blankning
      </Typography>

      {loading ? (
        <CircularProgress size={24} sx={{ color: "#FFCA28", my: 2 }} />
      ) : (
        <>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: "#FFCA28" }}>
              {clampedPercent.toFixed(1) + "%"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
              av utestående aktier
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={clampedPercent}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: "#3a3a3a",
              "& .MuiLinearProgress-bar": { backgroundColor: "#FFCA28" },
              mb: 1,
            }}
          />

          {shortShares !== null && (
            <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
              ≈ {shortShares.toLocaleString("sv-SE")} aktier blankade
              {shortValue != null && (
                <> ({formatSek(Math.abs(shortValue))})</>
              )}
            </Typography>
          )}
          {deltaPercent != null && deltaPercent !== 0 && deltaShares !== null && deltaShares !== 0 && (
            <Typography
              variant="body2"
              sx={{
                color: deltaShares > 0 ? "#ff6f6f" : "#00e676",
                mt: 0.5,
              }}
            >
              {deltaShares > 0 ? "Ökning" : "Minskning"} sedan föregående ≈ {Math.abs(deltaShares).toLocaleString("sv-SE")} aktier
              {deltaValue != null && (
                <> ({formatSek(Math.abs(deltaValue))})</>
              )}
              {` (${deltaPercent > 0 ? "+" : "-"}${Math.abs(deltaPercent).toFixed(2)}pp)`}
            </Typography>
          )}
        </>
      )}

      <Typography
        variant="caption"
        sx={{ color: "#808080", display: "block", mt: 1 }}
      >
        Källa: Finansinspektionen (total blankning)
      </Typography>
    </Card>
  );
}
