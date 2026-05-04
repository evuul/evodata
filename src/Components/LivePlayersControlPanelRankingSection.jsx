"use client";

// Ranking section for the live players control panel.

import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";

export default function LivePlayersControlPanelRankingSection({
  rankingRows,
  overviewLoading,
  numberFormatter,
  translate,
}) {
  return (
    <Box
      sx={{
        background: "rgba(15,23,42,0.45)",
        borderRadius: "16px",
        border: "1px solid rgba(148,163,184,0.18)",
        p: { xs: 2, md: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1.5}
      >
        <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
          {translate("Ranking", "Ranking")}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
          {overviewLoading
            ? translate("Uppdaterar ranking…", "Updating ranking…")
            : translate(`${rankingRows.length} spel listade`, `${rankingRows.length} games listed`)}
        </Typography>
      </Stack>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {rankingRows.map((row, index) => (
          <Stack
            key={row.slug}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              background: "rgba(15,23,42,0.55)",
              borderRadius: "12px",
              border: `1px solid ${row.color}33`,
              padding: "12px 16px",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: row.color }} />
              <Typography sx={{ color: "#f8fafc", fontWeight: 600 }}>
                #{index + 1} {row.label}
              </Typography>
            </Stack>
            {row.stuck ? (
              <Stack spacing={0.35} alignItems="flex-end">
                <Chip
                  size="small"
                  label={translate(
                    `Stuck ${Number.isFinite(row.stuckDays) ? `${row.stuckDays}d` : ""}`.trim(),
                    `Stuck ${Number.isFinite(row.stuckDays) ? `${row.stuckDays}d` : ""}`.trim()
                  )}
                  sx={{
                    backgroundColor: "rgba(120,53,15,0.28)",
                    color: "#fbbf24",
                    border: "1px solid rgba(251,191,36,0.4)",
                    borderRadius: "999px",
                    fontWeight: 700,
                  }}
                />
                <Typography variant="caption" sx={{ color: "rgba(251,191,36,0.8)" }}>
                  {translate("Siffran dold", "Value hidden")}
                </Typography>
              </Stack>
            ) : (
              <Typography sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 600 }}>
                {numberFormatter.format(row.avgPlayers)}
              </Typography>
            )}
          </Stack>
        ))}
        {rankingRows.length === 0 && (
          <Typography sx={{ color: "rgba(148,163,184,0.7)", textAlign: "center", py: 2 }}>
            {translate("Ingen rankingdata tillgänglig.", "No ranking data available.")}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
