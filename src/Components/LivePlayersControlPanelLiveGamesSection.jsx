"use client";

// Live games grid for the live players control panel.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Chip, CircularProgress, FormControl, Grid, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";

export default function LivePlayersControlPanelLiveGamesSection({
  translate,
  numberFormatter,
  timeFormatter,
  loadingLive,
  liveGamesList,
  visibleLiveGames,
  showAllLive,
  onToggleShowAllLive,
}) {
  const [selectedGameId, setSelectedGameId] = useState("");
  const selectedGame = useMemo(
    () => liveGamesList.find((item) => String(item.id) === selectedGameId) ?? liveGamesList[0] ?? null,
    [liveGamesList, selectedGameId]
  );
  const selectedGameIndex = selectedGame ? liveGamesList.findIndex((item) => item.id === selectedGame.id) : -1;

  useEffect(() => {
    if (!liveGamesList.length) {
      setSelectedGameId("");
    } else if (!liveGamesList.some((item) => String(item.id) === selectedGameId)) {
      setSelectedGameId(String(liveGamesList[0].id));
    }
  }, [liveGamesList, selectedGameId]);

  const renderPlayersLabel = (item) =>
    item.stuck
      ? translate(`Stuck ${Number.isFinite(item.stuckDays) ? `${item.stuckDays}d` : ""}`.trim(), `Stuck ${Number.isFinite(item.stuckDays) ? `${item.stuckDays}d` : ""}`.trim())
      : Number.isFinite(item.players)
      ? numberFormatter.format(item.players)
      : "—";

  const renderUpdatedLabel = (item) =>
    item.stuck
      ? translate(item.stuckSince ? `Stuck sedan ${timeFormatter.format(new Date(item.stuckSince))}` : "Ingen ny mätdata ännu", item.stuckSince ? `Stuck since ${timeFormatter.format(new Date(item.stuckSince))}` : "No fresh datapoints yet")
      : item.updated
      ? translate(`Senast ${timeFormatter.format(new Date(item.updated))}`, `Last updated ${timeFormatter.format(new Date(item.updated))}`)
      : translate("Ingen tidsstämpel", "No timestamp");

  const gameCard = (item, index, compact = false) => (
    <Box sx={{ background: "rgba(15,23,42,0.65)", borderRadius: compact ? "12px" : "14px", border: `1px solid ${item.color}55`, p: compact ? { xs: 1.5, sm: 2 } : 2, display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="overline" sx={{ color: "rgba(226,232,240,0.8)", fontWeight: 600 }}>#{index + 1}</Typography>
        <Chip size="small" label={renderPlayersLabel(item)} sx={{ backgroundColor: item.stuck ? "rgba(120,53,15,0.28)" : "rgba(15,23,42,0.55)", color: item.stuck ? "#fbbf24" : item.color, border: `1px solid ${item.stuck ? "rgba(251,191,36,0.4)" : `${item.color}55`}`, borderRadius: "999px", fontWeight: 700 }} />
      </Stack>
      <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc", fontSize: compact ? "1.05rem" : undefined }}>{item.label}</Typography>
      <Typography variant="caption" sx={{ color: item.stuck ? "#fbbf24" : "rgba(148,163,184,0.7)" }}>{renderUpdatedLabel(item)}</Typography>
    </Box>
  );

  return (
    <Box sx={{ width: "100%" }}>
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
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
          <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
            {translate("Liveshower just nu", "Live shows right now")}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
            {loadingLive
              ? translate("Uppdaterar…", "Updating…")
              : translate(`Totalt ${liveGamesList.length} spel`, `Total ${liveGamesList.length} games`)}
          </Typography>
        </Stack>
        <Box sx={{ display: { xs: "block", sm: "none" } }}>
          {loadingLive ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 1 }}>
              <CircularProgress size={18} sx={{ color: "#22c55e" }} />
              <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                {translate("Hämtar live-data…", "Fetching live data…")}
              </Typography>
            </Box>
          ) : liveGamesList.length && selectedGame ? (
            <Stack spacing={1.1}>
              <FormControl fullWidth size="small">
                <InputLabel
                  id="live-game-select-label"
                  sx={{ color: "rgba(248,250,252,0.82)", "&.Mui-focused": { color: "#f8fafc" } }}
                >
                  {translate("Välj spel", "Choose game")}
                </InputLabel>
                <Select
                  labelId="live-game-select-label"
                  value={String(selectedGame.id)}
                  label={translate("Välj spel", "Choose game")}
                  onChange={(event) => setSelectedGameId(event.target.value)}
                  sx={{ color: "#f8fafc", borderRadius: "10px", backgroundColor: "rgba(15,23,42,0.72)", ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(148,163,184,0.25)" } }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 320,
                        color: "#f8fafc",
                        backgroundColor: "#111c2f",
                      },
                    },
                  }}
                >
                  {liveGamesList.map((item, index) => (
                    <MenuItem key={item.id} value={String(item.id)}>
                      #{index + 1} · {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {gameCard(selectedGame, selectedGameIndex < 0 ? 0 : selectedGameIndex, true)}
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
              {translate("Ingen live-data tillgänglig just nu.", "No live data available right now.")}
            </Typography>
          )}
        </Box>
        <Grid container spacing={1.5} sx={{ display: { xs: "none", sm: "flex" } }}>
          {loadingLive && (
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                <CircularProgress size={18} sx={{ color: "#22c55e" }} />
                <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                  {translate("Hämtar live-data…", "Fetching live data…")}
                </Typography>
              </Box>
            </Grid>
          )}
          {!loadingLive &&
            visibleLiveGames.map((item, index) => (
              <Grid key={item.id} item xs={12} sm={6} md={4} lg={3}>
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${item.color}22, rgba(15,23,42,0.65))`,
                    borderRadius: "14px",
                    border: `1px solid ${item.color}44`,
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="overline" sx={{ color: "rgba(226,232,240,0.8)", fontWeight: 600 }}>
                      #{index + 1}
                    </Typography>
                    <Chip
                      size="small"
                      label={
                        item.stuck
                          ? translate(
                              `Stuck ${Number.isFinite(item.stuckDays) ? `${item.stuckDays}d` : ""}`.trim(),
                              `Stuck ${Number.isFinite(item.stuckDays) ? `${item.stuckDays}d` : ""}`.trim()
                            )
                          : Number.isFinite(item.players)
                          ? numberFormatter.format(item.players)
                          : "—"
                      }
                      sx={{
                        backgroundColor: item.stuck ? "rgba(120,53,15,0.28)" : "rgba(15,23,42,0.55)",
                        color: item.stuck ? "#fbbf24" : item.color,
                        border: `1px solid ${item.stuck ? "rgba(251,191,36,0.4)" : `${item.color}55`}`,
                        borderRadius: "999px",
                        fontWeight: 700,
                      }}
                    />
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: item.stuck ? "#fbbf24" : "rgba(148,163,184,0.7)" }}>
                    {item.stuck
                      ? translate(
                          item.stuckSince
                            ? `Stuck sedan ${timeFormatter.format(new Date(item.stuckSince))}`
                            : "Ingen ny mätdata ännu",
                          item.stuckSince
                            ? `Stuck since ${timeFormatter.format(new Date(item.stuckSince))}`
                            : "No fresh datapoints yet"
                        )
                      : item.updated
                      ? translate(
                          `Senast ${timeFormatter.format(new Date(item.updated))}`,
                          `Last updated ${timeFormatter.format(new Date(item.updated))}`
                        )
                      : translate("Ingen tidsstämpel", "No timestamp")}
                  </Typography>
                </Box>
              </Grid>
            ))}
          {!loadingLive && !liveGamesList.length && (
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                {translate("Ingen live-data tillgänglig just nu.", "No live data available right now.")}
              </Typography>
            </Grid>
          )}
          {!loadingLive && liveGamesList.length > visibleLiveGames.length && (
            <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
              <Chip
                label={showAllLive ? translate("Visa mindre", "Show less") : translate("Visa fler", "Show more")}
                onClick={onToggleShowAllLive}
                clickable
                sx={{
                  backgroundColor: "rgba(148,163,184,0.12)",
                  color: "#cbd5f5",
                  borderRadius: "999px",
                }}
              />
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
}
