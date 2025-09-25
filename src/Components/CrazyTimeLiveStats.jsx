"use client";
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Tooltip,
  IconButton,
  Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useCasinoScoresPlayers } from "./useCasinoScoresPlayers";

const ITEMS = [
  {
    id: "crazy-time",
    slug: "crazy-time",
    label: "Crazy Time",
    color: "#C21807",
  },
  {
    id: "crazy-time:a",
    slug: "crazy-time",
    label: "Crazy Time A",
    variant: "a",
    color: "#26A69A",
  },
];

function VariantCard({ slug, label, color, variant }) {
  const { players, fetchedAt, loading, error, refresh } = useCasinoScoresPlayers(slug, {
    variant,
    pollMs: 120_000,
  });

  const formattedPlayers = Number.isFinite(Number(players))
    ? Number(players).toLocaleString("sv-SE")
    : "—";
  const updated = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        background: "rgba(42,42,42,0.7)",
        borderRadius: "10px",
        border: `1px solid ${color}30`,
        padding: { xs: 2, sm: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ color: "#b0b0b0", letterSpacing: 0.3 }}>
          Live Stats
        </Typography>
        <Tooltip title={`Uppdatera ${label}`}>
          <span>
            <IconButton
              onClick={() => refresh(true)}
              size="small"
              sx={{ color }}
              aria-label={`Uppdatera ${label}`}
              disabled={loading}
            >
              {loading ? <CircularProgress size={16} sx={{ color }} /> : <RefreshIcon fontSize="inherit" />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Typography
        variant="h6"
        sx={{ color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {label}
      </Typography>

      <Typography variant="body2" sx={{ color: "#b0b0b0", fontWeight: 500 }}>
        Live players
      </Typography>

      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#ffffff" }}>
          {loading && !Number.isFinite(Number(players)) ? (
            <CircularProgress size={24} sx={{ color }} />
          ) : (
            formattedPlayers
          )}
        </Typography>
        {updated && (
          <Chip
            size="small"
            label={`Uppdaterad ${updated}`}
            sx={{ backgroundColor: "#2a2a2a", color: "#b0b0b0" }}
          />
        )}
      </Box>

      {error && (
        <Typography variant="caption" sx={{ color: "#ff8a65" }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

export default function CrazyTimeLiveStats() {
  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.05)",
        color: "#fff",
        width: { xs: "92%", sm: "85%", md: "75%" },
        m: "16px auto",
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "#ffffff",
          }}
        >
          Crazy Time – Live Players
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 2, md: 3 },
            mt: 2.5,
          }}
        >
          {ITEMS.map((item) => (
            <VariantCard key={item.id} {...item} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
