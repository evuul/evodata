"use client";

// Compact tracker announcement beneath the header navigation.

import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

const EXPIRES_AT = Date.parse("2026-09-25T00:00:00+02:00");
const MAX_PLAYER_AGE_MS = 25 * 60 * 1000;

export default function LiveHeaderNewsFlash({ translate, game, locale = "sv", now }) {
  const [currentTime, setCurrentTime] = useState(null);
  useEffect(() => {
    setCurrentTime(Date.now());
    const timer = setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const timestamp = now ?? currentTime;
  if (timestamp == null || timestamp >= EXPIRES_AT) return null;

  const age = timestamp - Date.parse(game?.updated || "");
  const hasPlayers = Number.isFinite(game?.players) && game.players >= 0
    && !game.stale && !game.stuck && !game.error && age >= 0 && age <= MAX_PLAYER_AGE_MS;
  const playersLabel = hasPlayers
    ? `${Math.round(game.players).toLocaleString(locale === "sv" ? "sv-SE" : "en-GB")} ${translate("spelare", "players")}`
    : translate("Spelarantal saknas just nu", "Player count currently unavailable");
  return (
    <Box
      component="aside"
      aria-label={translate("Trackernyheter", "Tracker news")}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.2,
        px: 1.5,
        py: 1,
        borderRadius: 2,
        border: "1px solid rgba(232,121,249,0.24)",
        background: "linear-gradient(100deg, rgba(232,121,249,0.10), rgba(56,189,248,0.04))",
      }}
    >
      <Box
        component="span"
        sx={{
          flexShrink: 0,
          px: 0.8,
          py: 0.25,
          borderRadius: 1,
          bgcolor: "rgba(232,121,249,0.16)",
          color: "#f0abfc",
          fontSize: "0.65rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
        }}
      >
        {translate("NYHET", "NEW")}
      </Box>
      <Typography component="p" sx={{ color: "#e2e8f0", fontSize: { xs: "0.78rem", sm: "0.85rem" }, lineHeight: 1.5 }}>
        <Box component="strong" sx={{ color: "#f8fafc", fontWeight: 700 }}>Disco Balls</Box>
        {translate(" är nu live i vår tracker!", " is now live in our tracker!")}
        <Box component="span" sx={{ color: "#f0abfc", ml: 1, display: "inline-block" }}>
          {`· ${playersLabel}`}
        </Box>
      </Typography>
    </Box>
  );
}
