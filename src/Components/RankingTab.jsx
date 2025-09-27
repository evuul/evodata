"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  Label,
  Cell,
} from "recharts";
import { GAMES, COLORS as defaultColors } from "./GamePlayersLiveList";

const RANK_MODE = { TOTAL: "total", PER_GAME: "pergame" };
const FALLBACK_TOTAL_BAR_COLOR = "#FFCA28"; // används bara om färg saknas
const FALLBACK_PER_GAME_BAR_COLOR = "#29B6F6";
const ROW_HEIGHT = 28;
const BASE_HEIGHT = 320;

function wrapLabel(label = "", maxCharsPerLine = 16) {
  const words = String(label).split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let current = words.shift();

  for (const word of words) {
    if ((current + " " + word).length <= maxCharsPerLine) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

export default function RankingTab({
  days: daysProp,
  onChangeDays,
  colors: colorsProp,
  games: gamesProp,
}) {
  const colors = colorsProp || defaultColors;

  // “days” från föräldern; fallback lokalt
  const [internalDays, setInternalDays] = useState(30);
  const days = typeof daysProp === "number" ? daysProp : internalDays;
  const setDays = onChangeDays || setInternalDays;

  const [mode, setMode] = useState(RANK_MODE.TOTAL);
  const [selectedGame, setSelectedGame] = useState("");

  // Lokal data (Ranking hämtar själv)
  const [loading, setLoading] = useState(false);
  const [multi, setMulti] = useState({});   // {id:{daily:[{date,avg}], error?}}
  const [errors, setErrors] = useState({}); // {id:"error text"}

  const games = gamesProp || GAMES;

  // Dölj “crazy-time:a” i ranking
  const GAMES_FOR_RANK = useMemo(
    () => (games || []).filter((g) => g.id !== "crazy-time:a"),
    [games]
  );

  async function fetchAllSeries(nDays) {
    setLoading(true);
    const out = {};
    const errs = {};
    await Promise.all(
      GAMES_FOR_RANK.map(async (g) => {
        try {
          const id = encodeURIComponent(g.id);
          const res = await fetch(`/api/casinoscores/series/${id}?days=${nDays}`, { cache: "no-store" });
          const j = await res.json();
          if (j?.ok) out[g.id] = { daily: j.daily || [] };
          else {
            out[g.id] = { daily: [], error: j?.error || `HTTP ${res.status}` };
            errs[g.id] = j?.error || `HTTP ${res.status}`;
          }
        } catch (e) {
          out[g.id] = { daily: [], error: e.message };
          errs[g.id] = e.message;
        }
      })
    );
    setMulti(out);
    setErrors(errs);
    setLoading(false);
  }

  useEffect(() => {
    fetchAllSeries(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, GAMES_FOR_RANK.length]);

  useEffect(() => {
    if (!selectedGame && GAMES_FOR_RANK.length) {
      setSelectedGame(GAMES_FOR_RANK[0].id);
    }
  }, [GAMES_FOR_RANK, selectedGame]);

  // Total ranking – senaste snittvärdet per spel
  const rankingRows = useMemo(() => {
    const rows = GAMES_FOR_RANK.map((g) => {
      const series = multi?.[g.id]?.daily || [];
      const last = series.length ? series[series.length - 1] : null;
      const latest = last ? Number(last.avg) : null;
      return { id: g.id, label: g.label, latest, color: colors?.[g.id] || FALLBACK_TOTAL_BAR_COLOR };
    });

    rows.sort((a, b) => {
      const av = a.latest, bv = b.latest;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });

    return rows;
  }, [GAMES_FOR_RANK, multi, colors]);

  // Per spel – stapelserie
  const perGameSeries = useMemo(() => {
    if (!selectedGame) return [];
    const arr = multi?.[selectedGame]?.daily || [];
    return arr.map((d) => ({ date: d.date, avg: Number(d.avg) }));
  }, [multi, selectedGame]);

  // Dynamisk höjd på total-grafen så den inte blir “ihoptryckt”
  const totalChartHeight = useMemo(() => {
    const rows = rankingRows.length;
    return Math.max(BASE_HEIGHT, rows * ROW_HEIGHT + 80);
  }, [rankingRows.length]);

  // Fix för att grafen “drar åt höger”: anpassa etiketter och marginaler dynamiskt
  const isXs = useMediaQuery("(max-width:600px)");
  const maxCharsPerLine = isXs ? 12 : 18;

  const maxLineLength = useMemo(() => {
    let maxLen = 0;
    rankingRows.forEach((row) => {
      wrapLabel(row.label, maxCharsPerLine).forEach((line) => {
        maxLen = Math.max(maxLen, line.length);
      });
    });
    return maxLen || maxCharsPerLine;
  }, [rankingRows, maxCharsPerLine]);

  const yAxisW = Math.min(200, Math.max(84, Math.round(maxLineLength * 7) + 18));

  const renderYAxisTick = useCallback(
    ({ x, y, payload }) => {
      const lines = wrapLabel(payload?.value || "", maxCharsPerLine);
      const lineHeight = 16;
      const startY = y - ((lines.length - 1) * lineHeight) / 2;
      return (
        <text
          x={x - 4}
          y={startY}
          fill="#f2f2f2"
          textAnchor="end"
          fontSize={isXs ? 13 : 14}
          fontWeight={600}
        >
          {lines.map((line, idx) => (
            <tspan key={`${payload?.value}-${idx}`} x={x - 4} dy={idx === 0 ? 0 : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      );
    },
    [maxCharsPerLine, isXs]
  );

  const failedIds = Object.keys(errors);
  const hasAnyData =
    mode === RANK_MODE.TOTAL
      ? rankingRows.some(r => r.latest != null)
      : perGameSeries.length > 0;

  // Färg för per-spel-staplar baserat på valt spel
  const perGameBarColor =
    (selectedGame && colors?.[selectedGame]) || FALLBACK_PER_GAME_BAR_COLOR;

  return (
    <Box sx={{ p: 2 }}>
      {/* Sub-tabs centrerade, days till höger – samma känsla som Trend */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 1,
          mb: 1,
        }}
      >
        <Box />
        <Tabs
          value={mode}
          onChange={(_, v) => v && setMode(v)}
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: "#ffffff" } }}
          sx={{
            "& .MuiTab-root": { color: "#b0b0b0", textTransform: "none" },
            "& .Mui-selected": { color: "#fff" },
            justifySelf: "center",
          }}
        >
          <Tab value={RANK_MODE.TOTAL} label="Ranking – total" />
          <Tab value={RANK_MODE.PER_GAME} label="Ranking – per spel" />
        </Tabs>
        <Box sx={{ justifySelf: "end" }}>
          <Select
            size="small"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            sx={{
              minWidth: 120,
              color: "#fff",
              ".MuiOutlinedInput-notchedOutline": { borderColor: "#3a3a3a" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#5a5a5a" },
            }}
          >
            {[7, 30, 90].map((n) => (
              <MenuItem key={n} value={n}>
                {n} dagar
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

      {/* Errorchips (om något spel failar att ladda) */}
      {failedIds.length > 0 && (
        <Box sx={{ mb: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {failedIds.map((id) => (
            <Chip
              key={id}
              size="small"
              label={`${(GAMES_FOR_RANK.find((g) => g.id === id)?.label) || id}: ❌`}
              sx={{ bgcolor: "#402a2a", color: "#ffbaba", border: "1px solid #5a3a3a" }}
            />
          ))}
        </Box>
      )}

      {/* Loader / tom vy */}
      {loading ? (
        <Box sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : !hasAnyData ? (
        <Typography sx={{ color: "#ff6f6f", textAlign: "center", my: 2 }}>
          Ingen rankingdata att visa just nu.
        </Typography>
      ) : mode === RANK_MODE.TOTAL ? (
        <>
          <Typography
            variant="h6"
            sx={{ color: "#fff", textAlign: "center", mb: 1, fontWeight: 700 }}
          >
            Total ranking (senaste dagliga snitt)
          </Typography>

          <ResponsiveContainer width="100%" height={totalChartHeight}>
            <BarChart
              data={rankingRows}
              layout="vertical"
              margin={{ top: 10, right: 14, bottom: 10, left: isXs ? 8 : 12 }}
              barCategoryGap={6}
              barSize={14}
            >
              <CartesianGrid strokeOpacity={0.15} />
              <XAxis
                type="number"
                tick={{ fill: "#b0b0b0", fontSize: 12 }}
                tickFormatter={(v) => Number(v).toLocaleString("sv-SE")}
              >
                <Label
                  value="Senaste dagliga snittet"
                  position="insideBottom"
                  offset={-6}
                  fill="#b0b0b0"
                />
              </XAxis>
              <YAxis
                type="category"
                dataKey="label"
                width={yAxisW}
                tickLine={false}
                axisLine={false}
                tick={renderYAxisTick}
              />
              <RTooltip
                formatter={(value) => [Number(value).toLocaleString("sv-SE"), "Senaste snitt"]}
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.label || "Spel"}
                labelStyle={{ color: "#fff", fontWeight: 600 }}
                itemStyle={{ color: "#fff" }}
                contentStyle={{
                  background: "#2a2a2a",
                  border: "none",
                  color: "#fff",
                }}
              />
              <Bar dataKey="latest" name="Senaste snitt" radius={[4, 4, 4, 4]}>
                {rankingRows.map((row) => (
                  <Cell key={row.id} fill={row.color || FALLBACK_TOTAL_BAR_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      ) : (
        <>
          {/* Centrera spelväljaren */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
            <Select
              size="small"
              value={selectedGame || ""}
              onChange={(e) => setSelectedGame(e.target.value)}
              sx={{
                minWidth: 260,
                color: "#fff",
                ".MuiOutlinedInput-notchedOutline": { borderColor: "#3a3a3a" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#5a5a5a" },
              }}
            >
              {GAMES_FOR_RANK.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Typography
            variant="h6"
            sx={{ color: "#fff", textAlign: "center", mb: 1, fontWeight: 700 }}
          >
            {(() => {
              const g = GAMES_FOR_RANK.find((x) => x.id === selectedGame);
              return g ? `Per spel – ${g.label}` : "Per spel";
            })()}
          </Typography>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={perGameSeries}
              margin={{ top: 12, right: 20, bottom: 28, left: isXs ? 10 : 18 }}
            >
              <CartesianGrid strokeOpacity={0.15} />
              <XAxis dataKey="date" tick={{ fill: "#b0b0b0", fontSize: 12 }}>
                <Label
                  value="Datum"
                  offset={-10}
                  position="insideBottom"
                  fill="#b0b0b0"
                />
              </XAxis>
              <YAxis
                tick={{ fill: "#b0b0b0", fontSize: 12 }}
                tickFormatter={(v) => Number(v).toLocaleString("sv-SE")}
                width={isXs ? 56 : 68}
                tickLine={false}
                axisLine={false}
              >
                <Label
                  value="Spelare (snitt)"
                  angle={-90}
                  position="insideLeft"
                  fill="#b0b0b0"
                />
              </YAxis>
              <RTooltip
                formatter={(value) => [Number(value).toLocaleString("sv-SE"), "Snitt"]}
                labelFormatter={(label) => `Datum: ${label}`}
                labelStyle={{ color: "#fff", fontWeight: 600 }}
                itemStyle={{ color: "#fff" }}
                contentStyle={{
                  background: "#2a2a2a",
                  border: "none",
                  color: "#fff",
                }}
              />
              <Bar
                dataKey="avg"
                name="Dagligt snitt"
                fill={perGameBarColor || FALLBACK_PER_GAME_BAR_COLOR}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Liten notis för konsekvens med Trend */}
      <Typography variant="caption" sx={{ color: "#b0b0b0", display: "block", mt: 1 }}>
        Visar kompletta dagar (t.o.m. gårdagen) i Europe/Stockholm.
      </Typography>
    </Box>
  );
}
