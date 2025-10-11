"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Chip, CircularProgress, useMediaQuery, Select, MenuItem } from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { GAMES, COLORS } from "./GamePlayersLiveList"; // GAMES: {id,label}

const STOCKHOLM_OPTIONS = { timeZone: "Europe/Stockholm", hour12: false };
function formatDateStockholm(isoString) {
  try {
    const date = new Date(isoString);
    if (!Number.isFinite(date.getTime())) throw new Error("bad");
    const year = date.toLocaleString("sv-SE", { ...STOCKHOLM_OPTIONS, year: "numeric" });
    const month = date.toLocaleString("sv-SE", { ...STOCKHOLM_OPTIONS, month: "2-digit" });
    const day = date.toLocaleString("sv-SE", { ...STOCKHOLM_OPTIONS, day: "2-digit" });
    return `${year}-${month}-${day}`;
  } catch {
    const now = new Date();
    const year = now.toLocaleString("sv-SE", { ...STOCKHOLM_OPTIONS, year: "numeric" });
    const month = now.toLocaleString("sv-SE", { ...STOCKHOLM_OPTIONS, month: "2-digit" });
    const day = now.toLocaleString("sv-SE", { ...STOCKHOLM_OPTIONS, day: "2-digit" });
    return `${year}-${month}-${day}`;
  }
}

function buildDailySeries(entry) {
  if (entry?.daily?.length) return entry.daily;
  if (entry && Number.isFinite(entry.latest)) {
    const date = formatDateStockholm(entry.latestTs || new Date().toISOString());
    return [{ date, avg: entry.latest }];
  }
  return [];
}

export default function GamePlayersTrendChart() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [multi, setMulti] = useState({});   // {id:{daily:[{date,avg}], error?}}
  const [errors, setErrors] = useState({}); // {id:"error text"}

  // Responsiv höjd – rejäl även på mobil
  const isXs = useMediaQuery("(max-width:599.95px)");
  const isSm = useMediaQuery("(min-width:600px) and (max-width:899.95px)");
  const chartHeight = isXs ? 380 : isSm ? 420 : 460;

  const GAMES_FOR_TREND = useMemo(() => GAMES || [], []);

  async function fetchAllSeries(nDays) {
    setLoading(true);
    const out = {};
    const errs = {};
    await Promise.all(
      GAMES_FOR_TREND.map(async (g) => {
        try {
          const id = encodeURIComponent(g.id); // ":" måste encodas
          const res = await fetch(`/api/casinoscores/series/${id}?days=${nDays}`, { cache: "no-store" });
          const j = await res.json();
          if (j?.ok) {
            const latestVal = Number(j.latest);
            out[g.id] = {
              daily: j.daily || [],
              latest: Number.isFinite(latestVal) ? latestVal : null,
              latestTs: j.latestTs || null,
            };
          } else {
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

  useEffect(() => { fetchAllSeries(days); }, [days]);

  const chartData = useMemo(() => {
    const map = new Map();
    for (const g of GAMES_FOR_TREND) {
    const entry = multi[g.id] || {};
    const arr = buildDailySeries(entry);
      arr.forEach(({ date, avg }) => {
        const row = map.get(date) || { date };
        row[g.id] = avg;
        map.set(date, row);
      });
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [multi, GAMES_FOR_TREND]);

  const hasAnyData = chartData.length > 0;
  const failedIds = Object.keys(errors);

  const formatPlayers = (value) =>
    Number.isFinite(value)
      ? value.toLocaleString("sv-SE", { maximumFractionDigits: 0 })
      : "—";

  const formatDelta = (value, fractionDigits = 2, { showPlus = true } = {}) => {
    if (!Number.isFinite(value)) return "—";
    const sign = value > 0 ? (showPlus ? "+" : "") : value < 0 ? "-" : "";
    return `${sign}${Math.abs(value).toFixed(fractionDigits)}`;
  };

  const trendingHighlight = useMemo(() => {
    const candidates = [];
    for (const g of GAMES_FOR_TREND) {
      const series = buildDailySeries(multi[g.id]);
      if (series.length < 2) continue;
      const slice = series.slice(-Math.min(days, series.length));
      if (slice.length < 2) continue;
      const first = slice[0]?.avg;
      const last = slice[slice.length - 1]?.avg;
      if (!Number.isFinite(first) || !Number.isFinite(last)) continue;
      const changeAbs = +(last - first).toFixed(2);
      const changePct = Number.isFinite(first) && first !== 0
        ? +(((last - first) / first) * 100).toFixed(1)
        : null;
      const direction = changeAbs === 0 ? 0 : changeAbs > 0 ? 1 : -1;
      candidates.push({
        id: g.id,
        label: g.label,
        changeAbs,
        changePct,
        direction,
        last,
      });
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      if (a.direction !== b.direction) return b.direction - a.direction;
      const metricA = Number.isFinite(a.changePct) ? a.changePct : a.changeAbs;
      const metricB = Number.isFinite(b.changePct) ? b.changePct : b.changeAbs;
      if (metricA === metricB) return b.changeAbs - a.changeAbs;
      return metricB - metricA;
    });

    const best = candidates[0];
    const periodLabel = days === 7 ? "de senaste 7 dagarna" : days === 30 ? "de senaste 30 dagarna" : "de senaste 90 dagarna";
    const deltaDigits = Math.abs(best.changeAbs) >= 10 ? 0 : 1;

    if (best.direction > 0) {
      const changeAbsStr = formatDelta(best.changeAbs, deltaDigits);
      const pctPositive = Number.isFinite(best.changePct)
        ? `${formatDelta(best.changePct, 1)}%`
        : null;
      return {
        direction: best.direction,
        message: pctPositive
          ? `${best.label} har starkast procentuella trend ${periodLabel}: ${pctPositive} (~${changeAbsStr} spelare).`
          : `${best.label} har starkast trend ${periodLabel}: ${changeAbsStr} spelare.`,
      };
    }

    if (best.direction < 0) {
      const changeAbsStr = formatDelta(best.changeAbs, deltaDigits, { showPlus: false });
      const pctNegative = Number.isFinite(best.changePct)
        ? `${formatDelta(best.changePct, 1, { showPlus: false })}%`
        : null;
      return {
        direction: best.direction,
        message: pctNegative
          ? `${best.label} tappar mest procentuellt ${periodLabel}: ${pctNegative} (~${changeAbsStr} spelare).`
          : `${best.label} tappar mest ${periodLabel}: ${changeAbsStr} spelare.`,
      };
    }

    return {
      direction: best.direction,
      message: `${best.label} ligger stabilt ${periodLabel} med cirka ${formatPlayers(best.last)} spelare (±0%).`,
    };
  }, [GAMES_FOR_TREND, multi, days]);

  const growthStats = useMemo(() => {
    const SLICE = 7;
    const rows = [];
    for (const g of GAMES_FOR_TREND) {
      const daily = buildDailySeries(multi[g.id]).slice(-SLICE);
      if (daily.length < 2) continue;
      const first = daily[0]?.avg;
      const last = daily[daily.length - 1]?.avg;
      if (!Number.isFinite(first) || !Number.isFinite(last)) continue;
      const deltaAbs = +(last - first).toFixed(2);
      const deltaPct = Number.isFinite(first) && first !== 0
        ? +((deltaAbs / first) * 100).toFixed(1)
        : null;
      const direction = deltaAbs === 0 ? 0 : deltaAbs > 0 ? 1 : -1;
      rows.push({
        id: g.id,
        label: g.label,
        deltaAbs,
        deltaPct,
        first,
        last,
        direction,
        color: COLORS[g.id] || "#fff",
      });
    }

    const gainers = [...rows]
      .filter((r) => r.direction > 0)
      .sort((a, b) => b.deltaAbs - a.deltaAbs)
      .slice(0, 3);
    const decliners = [...rows]
      .filter((r) => r.direction < 0)
      .sort((a, b) => a.deltaAbs - b.deltaAbs)
      .slice(0, 3);
    return { gainers, decliners };
  }, [multi, GAMES_FOR_TREND]);

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Header: titel + dagväljare (bara 7/30/90) */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.75,
          mb: 1,
        }}
      >
        <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, textAlign: "center" }}>
          Dagligt snitt (alla spel)
        </Typography>

        <Select
          size="small"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          sx={{
            minWidth: 160,
            color: "#fff",
            ".MuiSelect-icon": { color: "#fff" },
            ".MuiOutlinedInput-notchedOutline": { borderColor: "#3a3a3a" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#5a5a5a" },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#7a7a7a" },
          }}
        >
          {[7, 30, 90].map((n) => (
            <MenuItem key={n} value={n}>{`${n} dagar`}</MenuItem>
          ))}
        </Select>
      </Box>

      {trendingHighlight && (
        <Typography
          variant="body2"
          sx={{
            color: trendingHighlight.direction > 0 ? "#a7ffbf" : trendingHighlight.direction < 0 ? "#ffbaba" : "#b0b0b0",
            fontWeight: 600,
            mb: 1,
            textAlign: "center",
          }}
        >
          {trendingHighlight.message}
        </Typography>
      )}

      {/* Felchips */}
      {failedIds.length > 0 && (
        <Box sx={{ mb: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {failedIds.map((id) => (
            <Chip
              key={id}
              size="small"
              label={`${(GAMES.find((g) => g.id === id)?.label) || id}: ❌`}
              sx={{ bgcolor: "#402a2a", color: "#ffbaba", border: "1px solid #5a3a3a" }}
            />
          ))}
        </Box>
      )}

      {/* Chart container: full bredd, centrerad, större höjd */}
      <Box
        sx={{
          width: "100%",
          mx: "auto",
          height: chartHeight,
          background: "#1b1b1b",
          borderRadius: "10px",
          p: 1,
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <CircularProgress />
          </Box>
        ) : !hasAnyData ? (
          <Typography sx={{ color: "#ff6f6f" }}>
            Ingen historik att visa just nu. Kontrollera att /api/casinoscores/series/[game] returnerar data och att ALLOWED är uppdaterad.
          </Typography>
        ) : (
          // minWidth:0 fixar layoutbuggar där grafen kan “tryckas åt höger” i flex-konton
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: isXs ? 14 : 18, left: 8 }} // jämna marginaler → centrerad
            >
              <CartesianGrid strokeOpacity={0.15} />
              <XAxis dataKey="date" tick={{ fill: "#b0b0b0", fontSize: 12 }} />
              <YAxis tick={{ fill: "#b0b0b0", fontSize: 12 }} width={isXs ? 56 : 70} />
              <RTooltip
                formatter={(v, key) => [Number(v).toLocaleString("sv-SE"), GAMES.find((g) => g.id === key)?.label || key]}
                labelFormatter={(l) => `Datum: ${l}`}
                contentStyle={{ background: "#2a2a2a", border: "1px solid #3a3a3a", color: "#fff" }}
              />
              <Legend wrapperStyle={{ color: "#b0b0b0" }} />
              {GAMES_FOR_TREND.map((g) => (
                <Line
                  key={g.id}
                  type="monotone"
                  dataKey={g.id}
                  stroke={COLORS[g.id] || "#fff"}
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Box>

      <Typography variant="caption" sx={{ color: "#b0b0b0", display: "block", mt: 1 }}>
        Visar kompletta dagar (t.o.m. gårdagen) i Europe/Stockholm.
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "#808080", display: "block", mt: 0.5, textAlign: "center" }}
      >
        Underlaget bygger på egen insamlad historik. Siffror kan variera kraftigt om ett spel varit nere för service eller rapporterat 0 spelare vid en mätning, så tolka trenderna som indikativa.
      </Typography>

      {(growthStats.gainers.length > 0 || growthStats.decliners.length > 0) && (
        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: growthStats.decliners.length ? "repeat(2, 1fr)" : "1fr",
            },
            gap: 1.5,
          }}
        >
          {growthStats.gainers.length > 0 && (
            <Box
              sx={{
                background: "#1d2b1d",
                border: "1px solid #2f4f2f",
                borderRadius: "10px",
                p: 1.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "#7fff7f", fontWeight: 700, mb: 0.75 }}>
                Snabbast växande (senaste 7 dagarna)
              </Typography>
              <Typography variant="caption" sx={{ color: "#9ad69a", display: "block", mb: 0.75 }}>
                Mäter störst ökning i antal spelare (absolut förändring).
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {growthStats.gainers.map((item) => (
                  <Box key={item.id} sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.color }} />
                      <Typography sx={{ color: "#e0ffe0", fontWeight: 600 }}>{item.label}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <Typography variant="body2" sx={{ color: "#bde5bd" }}>
                        Senaste snitt: {formatPlayers(item.last)} spelare
                      </Typography>
                      <Typography sx={{ color: "#00e676", fontWeight: 700 }}>
                        ↑ {formatDelta(item.deltaAbs)} {item.deltaPct != null ? `(${formatDelta(item.deltaPct, 1)}%)` : ""}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {growthStats.decliners.length > 0 && (
            <Box
              sx={{
                background: "#2b1d1d",
                border: "1px solid #4f2f2f",
                borderRadius: "10px",
                p: 1.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "#ff9f9f", fontWeight: 700, mb: 0.75 }}>
                Störst tapp (senaste 7 dagarna)
              </Typography>
              <Typography variant="caption" sx={{ color: "#ffc7c7", display: "block", mb: 0.75 }}>
                Mäter störst minskning i antal spelare (absolut förändring).
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {growthStats.decliners.map((item) => (
                  <Box key={item.id} sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.color }} />
                      <Typography sx={{ color: "#ffe0e0", fontWeight: 600 }}>{item.label}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <Typography variant="body2" sx={{ color: "#f2c5c5" }}>
                        Senaste snitt: {formatPlayers(item.last)} spelare
                      </Typography>
                      <Typography sx={{ color: "#ff6f6f", fontWeight: 700 }}>
                        ↓ {formatDelta(Math.abs(item.deltaAbs), 2, { showPlus: false })} {item.deltaPct != null ? `(-${formatDelta(Math.abs(item.deltaPct), 1, { showPlus: false })}%)` : ""}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
