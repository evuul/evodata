"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Tooltip,
} from "@mui/material";

const TZ = "Europe/Stockholm";
const WEEKDAY_ORDER = ["mån", "tis", "ons", "tors", "fre", "lör", "sön"];
const WEEKDAY_LABELS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}`);

const HEATMAP_GAMES = [
  { id: "crazy-time", label: "Crazy Time" },
  { id: "monopoly-big-baller", label: "Big Baller" },
  { id: "funky-time", label: "Funky Time" },
  { id: "lightning-storm", label: "Lightning Storm" },
  { id: "crazy-balls", label: "Crazy Balls" },
  { id: "ice-fishing", label: "Ice Fishing" },
  { id: "xxxtreme-lightning-roulette", label: "XXXtreme Lightning Roulette" },
  { id: "monopoly-live", label: "Monopoly Live" },
  { id: "red-door-roulette", label: "Red Door Roulette" },
  { id: "auto-roulette", label: "Auto Roulette" },
  { id: "speed-baccarat-a", label: "Speed Baccarat A" },
  { id: "super-andar-bahar", label: "Super Andar Bahar" },
  { id: "lightning-dice", label: "Lightning Dice" },
  { id: "lightning-roulette", label: "Lightning Roulette" },
  { id: "bac-bo", label: "Bac Bo" },
];

const weekdayFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  weekday: "short",
});

const hourFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  hour: "2-digit",
  hour12: false,
});

const ymdFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function getWeekdayIndex(date) {
  const wd = weekdayFormatter.format(date).toLowerCase();
  const clean = wd.replace(/\.$/, "");
  const idx = WEEKDAY_ORDER.indexOf(clean);
  return idx >= 0 ? idx : 0;
}

function getHour(date) {
  const hourStr = hourFormatter.format(date);
  return parseInt(hourStr, 10);
}

function getStockholmYMD(date) {
  return ymdFormatter.format(date);
}

function aggregatePoints(points) {
  const buckets = new Map();
  for (const point of points) {
    if (!point || !Number.isFinite(point.value)) continue;
    const date = new Date(point.ts);
    if (!Number.isFinite(date.getTime())) continue;
    const weekdayIndex = getWeekdayIndex(date);
    const hour = getHour(date);
    const key = `${weekdayIndex}-${hour}`;
    const current = buckets.get(key) || { sum: 0, count: 0 };
    current.sum += point.value;
    current.count += 1;
    buckets.set(key, current);
  }

  const matrix = WEEKDAY_ORDER.map((_, dayIndex) =>
    HOUR_LABELS.map((_, hour) => {
      const entry = buckets.get(`${dayIndex}-${hour}`);
      if (!entry || entry.count === 0) return { value: null };
      return { value: +(entry.sum / entry.count).toFixed(0), count: entry.count };
    })
  );

  let max = 0;
  for (const row of matrix) {
    for (const cell of row) {
      if (cell.value != null) max = Math.max(max, cell.value);
    }
  }

  return { matrix, max };
}

function colorForValue(value, max) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return "#1f1f1f";
  const ratio = Math.max(0.15, Math.min(1, value / max));
  const alpha = Math.min(0.9, ratio);
  return `rgba(0, 230, 118, ${alpha.toFixed(2)})`;
}

export default function GamePlayersHeatmap() {
  const [selectedGame, setSelectedGame] = useState(HEATMAP_GAMES[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [points, setPoints] = useState([]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchPoints() {
      setLoading(true);
      setError("");
      try {
        const encoded = encodeURIComponent(selectedGame);
        const res = await fetch(`/api/casinoscores/series/${encoded}?days=14`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.ok || !Array.isArray(json.points)) throw new Error("Ogiltigt svar");
        if (!isCancelled) setPoints(json.points);
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setPoints([]);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchPoints();
    return () => {
      isCancelled = true;
    };
  }, [selectedGame]);

  const { matrix, max } = useMemo(() => aggregatePoints(points), [points]);

  const todayPeak = useMemo(() => {
    if (!Array.isArray(points) || points.length === 0) return null;
    const todayYMD = getStockholmYMD(new Date());
    let peak = null;
    for (const point of points) {
      if (!point || !Number.isFinite(point.value)) continue;
      const ts = new Date(point.ts);
      if (!Number.isFinite(ts.getTime())) continue;
      if (getStockholmYMD(ts) !== todayYMD) continue;
      if (!peak || point.value > peak.value) {
        peak = {
          value: Math.round(point.value),
          time: timeFormatter.format(ts),
        };
      }
    }
    return peak;
  }, [points]);

  return (
    <Card
      sx={{
        mt: 2,
        background: "linear-gradient(135deg, #1e1e1e, #262626)",
        borderRadius: "12px",
        p: { xs: 1.5, sm: 2 },
        color: "#fff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          När peakar spelarna?
        </Typography>
        <FormControl
          size="small"
          sx={{
            minWidth: 200,
            maxWidth: 280,
            width: "100%",
            backgroundColor: "#181818",
            borderRadius: "8px",
          }}
        >
          <InputLabel id="heatmap-game-select-label" sx={{ color: "#d5d5d5" }}>
            Välj spel
          </InputLabel>
          <Select
            labelId="heatmap-game-select-label"
            value={selectedGame}
            label="Välj spel"
            onChange={(event) => setSelectedGame(event.target.value)}
            sx={{
              color: "#fff",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#3a3a3a" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#4f4f4f" },
              "& .MuiSelect-icon": { color: "#fff" },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: "#1e1e1e",
                  color: "#fff",
                  maxHeight: 360,
                },
              },
            }}
          >
            {HEATMAP_GAMES.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ color: "#00e676", display: "block", mt: 0.5 }}>
          {todayPeak ? `Dagens peak: ${todayPeak.value.toLocaleString("sv-SE") } spelare kl ${todayPeak.time}` : "Dagens peak saknas (inga datapunkter ännu)."}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
          <CircularProgress size={24} sx={{ color: "#00e676" }} />
        </Box>
      ) : error ? (
        <Typography sx={{ color: "#ff6f6f", mt: 2 }}>Kunde inte ladda heatmap: {error}</Typography>
      ) : max === 0 ? (
        <Typography sx={{ color: "#b0b0b0", mt: 2 }}>
          Inga datapunkter än. Låt sidan samla in fler mätningar för att visa mönstret.
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto", mt: 2 }}>
          <Box sx={{ minWidth: 600 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: `100px repeat(${HOUR_LABELS.length}, 1fr)`, alignItems: "center", gap: 0.25 }}>
              <Box />
              {HOUR_LABELS.map((hour) => (
                <Typography key={hour} variant="caption" sx={{ color: "#9e9e9e", textAlign: "center" }}>
                  {hour}
                </Typography>
              ))}

              {matrix.map((row, dayIndex) => (
                <React.Fragment key={WEEKDAY_LABELS[dayIndex]}>
                  <Typography variant="subtitle2" sx={{ color: "#e0e0e0" }}>
                    {WEEKDAY_LABELS[dayIndex]}
                  </Typography>
                  {row.map((cell, hourIndex) => {
                    const content = cell.value != null
                      ? `${cell.value.toLocaleString("sv-SE")} spelare`
                      : "Ingen mätning";
                    const tooltip = `${WEEKDAY_LABELS[dayIndex]} kl ${HOUR_LABELS[hourIndex]}:00 — ${content}${cell.count ? ` (${cell.count} mätningar)` : ""}`;
                    return (
                      <Tooltip key={`${dayIndex}-${hourIndex}`} title={tooltip} arrow>
                        <Box
                          sx={{
                            height: 28,
                            borderRadius: "4px",
                            backgroundColor: cell.value != null ? colorForValue(cell.value, max) : "#1f1f1f",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: cell.value != null ? "#0b0b0b" : "#505050",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}
                        >
                          {cell.value != null ? Math.round(cell.value) : ""}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </React.Fragment>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          mt: 1.5,
          color: "#b0b0b0",
          fontSize: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <Typography variant="body2" sx={{ color: "#b0b0b0", display: "block", width: "100%", textAlign: "center" }}>
          Genomsnittligt antal spelare per timme och veckodag (senaste 14 dagarna).
        </Typography>
        <Typography variant="caption" sx={{ color: "#8d8d8d", display: "block", width: "100%", textAlign: "center" }}>
          Vi snittar varje timme över de två senaste veckorna. Leta efter mörkare gröna rutor där trycket brukar vara som störst.
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 20, height: 12, borderRadius: "4px", backgroundColor: "rgba(0, 230, 118, 0.18)" }} />
          <span>Lägre snitt</span>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 20, height: 12, borderRadius: "4px", backgroundColor: "rgba(0, 230, 118, 0.9)" }} />
          <span>Högre snitt (max ≈ {max.toLocaleString("sv-SE")})</span>
        </Box>
      </Box>
    </Card>
  );
}
