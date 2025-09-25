"use client";
import React from "react";
import { Chip, Tooltip, Box, CircularProgress, IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useCasinoScoresPlayers } from "./useCasinoScoresPlayers";

export default function CasinoScoresBadge({ slug, label = "Game", pollMs = 60_000, showRefresh = false, color = "#ffffff" }) {
  const { players, fetchedAt, loading, error, refresh } = useCasinoScoresPlayers(slug, { pollMs });

  const chipLabel = loading
    ? (
      <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
        <CircularProgress size={12} sx={{ color }} />
        <span>{label}…</span>
      </Box>
    )
    : (error
        ? `${label}: —`
        : `${label}: ${Number.isFinite(Number(players)) ? Number(players).toLocaleString('sv-SE') : "—"}`);

  const updatedShort = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <Tooltip title={updatedShort ? `${label} • Uppdaterad ${updatedShort}` : label}>
        <Chip
          size="small"
          label={chipLabel}
          sx={{
            backgroundColor: '#2a2a2a',
            color,
            border: '1px solid #3a3a3a',
            cursor: 'default',
            '& .MuiChip-label': {
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              whiteSpace: 'nowrap',
            },
          }}
        />
      </Tooltip>

      {showRefresh && (
        <Tooltip title={`Uppdatera ${label}`}>
          <span>
            <IconButton onClick={() => refresh(true)} size="small" sx={{ color }} aria-label={`Uppdatera ${label}`}>
              <RefreshIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
}