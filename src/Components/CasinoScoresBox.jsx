"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, Chip, ToggleButton, ToggleButtonGroup, Typography, CircularProgress, Tooltip, IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";

const GAMES = [
  { slug: "crazy-time",          label: "Crazy Time" },
  { slug: "monopoly-big-baller", label: "Big Baller" },
  { slug: "funky-time",          label: "Funky Time" },
  { slug: "lightning-storm",     label: "Lightning Storm" },
  { slug: "crazy-balls",         label: "Crazy Balls" },
];

export default function CasinoScoresBox({ defaultSlug = "crazy-time", days = 30 }) {
  const [slug, setSlug] = useState(defaultSlug);
  const [data, setData] = useState(null); // { points, daily }
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load(force = false) {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`/api/casinoscores/series/${slug}?days=${days}${force ? "&force=1" : ""}`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "error");
      setData(j);
    } catch (e) {
      setErr("Kunde inte hämta historik just nu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [slug, days]);

  const chartData = useMemo(() => {
    if (!data?.daily) return [];
    // Map till format som Recharts gillar: { date, avg }
    return data.daily.map(d => ({ date: d.date, avg: d.avg }));
  }, [data]);

  return (
    <Card
      id="casino-scores"
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        color: "#fff",
        width: "100%",
        maxWidth: "1200px",
        margin: "16px auto",
        p: 2,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, gap: 1, flexWrap: "wrap" }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Live-spelare & Dagligt snitt</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={slug}
            onChange={(_, v) => v && setSlug(v)}
            sx={{
              backgroundColor: "#2a2a2a",
              borderRadius: "8px",
              "& .MuiToggleButton-root": { color: "#b0b0b0", border: "1px solid #3a3a3a" },
              "& .Mui-selected": { color: "#fff", backgroundColor: "#3a3a3a" },
            }}
          >
            {GAMES.map(g => (
              <ToggleButton key={g.slug} value={g.slug}>{g.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Tooltip title="Uppdatera">
            <span>
              <IconButton onClick={() => load(true)} disabled={loading} sx={{ color: "#00e676" }}>
                {loading ? <CircularProgress size={18} sx={{ color: "#00e676" }} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Badges-rad (hämtar live från players-routen via dina header-badges – valfritt duplicera här) */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
        {GAMES.map(g => (
          <Chip
            key={g.slug}
            label={g.label}
            size="small"
            sx={{ backgroundColor: "#2a2a2a", color: "#ffffff", border: "1px solid #3a3a3a" }}
            onClick={() => setSlug(g.slug)}
          />
        ))}
      </Box>

      {/* Graf */}
      <Box sx={{ width: "100%", height: 280, background: "#1b1b1b", borderRadius: "10px", p: 1 }}>
        {err ? (
          <Typography variant="body2" sx={{ color: "#ff6f6f" }}>{err}</Typography>
        ) : loading && !data ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <CircularProgress />
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="avgFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopOpacity={0.6} />
                  <stop offset="95%" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeOpacity={0.15} />
              <XAxis dataKey="date" tick={{ fill: "#b0b0b0", fontSize: 12 }} />
              <YAxis tick={{ fill: "#b0b0b0", fontSize: 12 }} width={70} />
              <RTooltip
                formatter={(v) => [Number(v).toLocaleString("sv-SE"), "Snitt"]}
                labelFormatter={(l) => `Datum: ${l}`}
                contentStyle={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a", color: "#fff" }}
              />
              <Area type="monotone" dataKey="avg" stroke="#ffffff" fill="url(#avgFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Box>

      <Typography variant="caption" sx={{ color: "#b0b0b0", display: "block", mt: 1 }}>
        Snitt beräknas per dag (Europe/Stockholm) från sparade mätpunkter.
      </Typography>
    </Card>
  );
}
