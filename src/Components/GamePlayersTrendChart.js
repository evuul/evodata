"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Chip, CircularProgress } from "@mui/material";
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
import { GAMES, COLORS } from "./GamePlayersLiveList"; // GAMES har id, label, (apiSlug/apiVariant)

export default function GamePlayersTrendChart() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [multi, setMulti] = useState({}); // {id:{daily:[{date,avg}], error?}}
  const [errors, setErrors] = useState({}); // {id: "error text"}

  // Dölj "crazy-time:a" i just trendgrafen (API och andra vyer kan fortsatt använda den)
  const GAMES_FOR_TREND = useMemo(
    () => GAMES.filter((g) => g.id !== "crazy-time:a"),
    []
  );

  async function fetchAllSeries(nDays) {
    setLoading(true);
    const out = {};
    const errs = {};
    await Promise.all(
      GAMES_FOR_TREND.map(async (g) => {
        try {
          // Viktigt: id kan innehålla ":" -> encoda
          const id = encodeURIComponent(g.id);
          const res = await fetch(`/api/casinoscores/series/${id}?days=${nDays}`, {
            cache: "no-store",
          });
          const j = await res.json();
          if (j?.ok) {
            out[g.id] = { daily: j.daily || [] };
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

  useEffect(() => {
    fetchAllSeries(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const chartData = useMemo(() => {
    const map = new Map();
    for (const g of GAMES_FOR_TREND) {
      const arr = multi[g.id]?.daily || [];
      arr.forEach(({ date, avg }) => {
        const row = map.get(date) || { date };
        row[g.id] = avg; // dataKey = g.id
        map.set(date, row);
      });
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [multi, GAMES_FOR_TREND]);

  const hasAnyData = chartData.length > 0;
  const failedIds = Object.keys(errors);

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>
          Dagligt snitt (alla spel)
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {[7, 14, 30, 90].map((n) => (
            <Chip
              key={n}
              label={`${n}d`}
              size="small"
              onClick={() => setDays(n)}
              sx={{
                bgcolor: days === n ? "#3a3a3a" : "#2a2a2a",
                color: "#fff",
                border: "1px solid #3a3a3a",
                cursor: "pointer",
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Visar vilka id som failade (hjälper felsöka ALLOWED/route) */}
      {failedIds.length > 0 && (
        <Box sx={{ mb: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {failedIds.map((id) => (
            <Chip
              key={id}
              size="small"
              label={`${
                GAMES.find((g) => g.id === id)?.label || id
              }: ❌`}
              sx={{ bgcolor: "#402a2a", color: "#ffbaba", border: "1px solid #5a3a3a" }}
            />
          ))}
        </Box>
      )}

      <Box
        sx={{
          width: "100%",
          height: 300,
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
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeOpacity={0.15} />
              <XAxis dataKey="date" tick={{ fill: "#b0b0b0", fontSize: 12 }} />
              <YAxis tick={{ fill: "#b0b0b0", fontSize: 12 }} width={70} />
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
    </Box>
  );
}