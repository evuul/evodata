"use client";
import React from "react";
import { Card, Box, Typography, LinearProgress } from "@mui/material";

const ShortInterestBox = ({ shortPercent: shortPercentProp, totalShares }) => {
  // Hardcoded fallback until API is enabled again
  const SHORT_TOTAL = typeof shortPercentProp === 'number' ? shortPercentProp : 5.15;
  const clamped = Math.max(0, Math.min(100, SHORT_TOTAL));
  const shortShares = totalShares && totalShares > 0 ? Math.round((clamped / 100) * totalShares) : null;

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
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Blankning</Typography>

      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, color: "#FFCA28" }}>
          {clamped.toFixed(1) + '%'}
        </Typography>
        <Typography variant="body2" sx={{ color: "#b0b0b0" }}>av utestående aktier</Typography>
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

      <Typography variant="caption" sx={{ color: "#808080", display: "block", mt: 1 }}>
        Källa: Offentliga blankningsregister (exempel)
      </Typography>
    </Card>
  );
};

export default ShortInterestBox;
