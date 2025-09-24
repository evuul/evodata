"use client";
import React, { useEffect, useState } from "react";
import { Card, Box, Typography, LinearProgress, CircularProgress } from "@mui/material";

export default function ShortInterestBox({ totalShares }) {
  const [shortPercent, setShortPercent] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLatest = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/short/history", { cache: "no-store" });
      if (!res.ok) throw new Error("Kunde inte hämta blankningsdata");
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        const last = data.items[data.items.length - 1];
        setShortPercent(Number(last.percent));
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

  const percent = typeof shortPercent === "number" ? shortPercent : 0;
  const clamped = Math.max(0, Math.min(100, percent));
  const shortShares =
    totalShares && totalShares > 0
      ? Math.round((clamped / 100) * totalShares)
      : null;

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: { xs: "12px", sm: "16px" },
        color: "#fff",
        width: { xs: "92%", sm: "85%", md: "75%" },
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
              {clamped.toFixed(1) + "%"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
              av utestående aktier
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={clamped}
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