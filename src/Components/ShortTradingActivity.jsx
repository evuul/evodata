"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  Typography,
  Tooltip as MuiTooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const DESKTOP_RANGES = [14, 30, 90];
const MOBILE_RANGES = [7, 14];

const LEGEND_ITEMS = [
  { key: "volume", label: "Dagsvolym (miljoner aktier)", color: "#00e676", variant: "bar" },
  { key: "volumeAvg5", label: "Volym – 5-dagars snitt", color: "#29b6f6", variant: "dashed" },
  { key: "shortPct", label: "Blankarnas andel av dagens handel", color: "#FFCA28", variant: "line" },
  { key: "shortAvg5", label: "Blankarnas andel – 5-dagars snitt", color: "#ab47bc", variant: "dashed" },
];

function formatDate(dateStr) {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatShortDirection(change) {
  if (!Number.isFinite(change) || change === 0) return "oförändrat";
  return change > 0 ? "ökade nettot" : "minskade nettot";
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "–";
  return `${value.toFixed(2)}%`;
}

function buildChartData(items) {
  return items.map((item) => ({
    date: item.date,
    volumeShares: item.volumeShares,
    volumeWindowShares: item.volumeWindowShares,
    volumeM: item.volumeShares != null ? item.volumeShares / 1_000_000 : null,
    volumeWindowM: item.volumeWindowShares != null ? item.volumeWindowShares / 1_000_000 : null,
    volumeAverage5M: item.volumeAverage5 != null ? item.volumeAverage5 / 1_000_000 : null,
    volumeAverage20M: item.volumeAverage20 != null ? item.volumeAverage20 / 1_000_000 : null,
    shortSharePct: item.shortShareOfVolumePercent,
    shortShareAvg5: item.shortShareOfVolumeAverage5,
    shortChangeShares: item.shortChangeShares,
  }));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload ?? {};
  return (
    <Box sx={{ p: 1, backgroundColor: "#1f1f1f", border: "1px solid #2b2b2b", borderRadius: 1 }}>
      <Typography variant="caption" sx={{ color: "#b0b0b0" }}>{formatDate(label)}</Typography>
      {Number.isFinite(data.volumeShares) && (
        <Typography variant="body2" sx={{ color: "#00e676" }}>
          Volym: {data.volumeShares.toLocaleString("sv-SE")}
        </Typography>
      )}
      {Number.isFinite(data.volumeWindowShares) && data.volumeWindowShares !== data.volumeShares && (
        <Typography variant="body2" sx={{ color: "#00e676" }}>
          Volym (period): {data.volumeWindowShares.toLocaleString("sv-SE")}
        </Typography>
      )}
      {Number.isFinite(data.shortSharePct) && (
        <Typography variant="body2" sx={{ color: "#FFCA28" }}>
          Blankarnas andel: {formatPercent(data.shortSharePct)}
        </Typography>
      )}
      {Number.isFinite(data.shortChangeShares) && data.shortChangeShares !== 0 && (
        <Typography variant="body2" sx={{ color: data.shortChangeShares > 0 ? "#ff6f6f" : "#29b6f6" }}>
          Netton: {data.shortChangeShares > 0 ? "+" : "-"}{Math.abs(data.shortChangeShares).toLocaleString("sv-SE")} aktier
        </Typography>
      )}
    </Box>
  );
};

export default function ShortTradingActivity() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [range, setRange] = useState(DESKTOP_RANGES[1]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [latest, setLatest] = useState(null);
  const [aggregateShare, setAggregateShare] = useState(null);

  const ranges = useMemo(() => (isMobile ? MOBILE_RANGES : DESKTOP_RANGES), [isMobile]);

  useEffect(() => {
    if (!ranges.includes(range)) {
      setRange(ranges[ranges.length - 1]);
    }
  }, [ranges, range]);

  const fetchData = useCallback(async (days) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/short/activity?days=${days}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Kunde inte hämta handelsstatistik");
      }
      const json = await res.json();
      setItems(Array.isArray(json.items) ? json.items : []);
      setLatest(json.latest ?? null);
      setAggregateShare(Number.isFinite(json.aggregateShare) ? json.aggregateShare : null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Okänt fel";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  const chartData = useMemo(() => buildChartData(items), [items]);

  const latestSummary = useMemo(() => {
    if (!latest) return null;
    const date = formatDate(latest.date);
    const volumeStr = Number.isFinite(latest.volumeShares)
      ? `${latest.volumeShares.toLocaleString("sv-SE")}`
      : "–";
    const changeStr = Number.isFinite(latest.shortChangeShares)
      ? `${latest.shortChangeShares > 0 ? "+" : latest.shortChangeShares < 0 ? "-" : ""}${Math.abs(latest.shortChangeShares).toLocaleString("sv-SE")}`
      : "–";
    const percentStr = formatPercent(latest.shortShareOfVolumePercent);
    const direction = formatShortDirection(latest.shortChangeShares);
    return { date, volumeStr, changeStr, percentStr, direction };
  }, [latest]);

  const rangeLabel = useMemo(() => {
    if (!Number.isFinite(aggregateShare)) return null;
    return `Blankarna stod för ${formatPercent(aggregateShare)} av den totala handeln i intervallet`;
  }, [aggregateShare]);

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: { xs: 0, sm: "12px" }, // full-bleed känsla på mobil
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: { xs: "12px", sm: "16px" },
        width: "100%",
        maxWidth: { sm: "1200px" },
        mx: "auto",
        marginTop: "16px",
      }}
    >
      {/* Header och filter */}
      <Box sx={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff", textAlign: "center" }}>
          Daglig handel & blankarandel
        </Typography>
        {latestSummary && (
          <Typography variant="body2" sx={{ color: "#b0b0b0", textAlign: "center" }}>
            Senaste handelsdag ({latestSummary.date}): omsättning {latestSummary.volumeStr} aktier. Blankarna {latestSummary.direction} {latestSummary.changeStr} aktier ({latestSummary.percentStr}).
          </Typography>
        )}
        {rangeLabel && (
          <MuiTooltip title="Summerad absolut nettoförändring i blankning dividerat med total handelsvolym för vald period.">
            <Chip size="small" label={rangeLabel} sx={{ backgroundColor: "#2a2a2a", color: "#b0b0b0" }} />
          </MuiTooltip>
        )}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
          {ranges.map((value) => (
            <Chip
              key={value}
              size="small"
              label={`${value}D`}
              clickable
              onClick={() => setRange(value)}
              sx={{
                backgroundColor: range === value ? "#00e676" : "#2a2a2a",
                color: range === value ? "#0b0b0b" : "#b0b0b0",
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Error/Loading/Data */}
      {error && (
        <Typography variant="body2" sx={{ color: "#ff6f6f", textAlign: "center", mb: 1 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 220 }}>
          <CircularProgress size={28} sx={{ color: "#00e676" }} />
        </Box>
      ) : (
        <Box
          sx={{
            width: { xs: "100vw", sm: "100%" },
            position: { xs: "relative", sm: "static" },
            left: { xs: "50%", sm: "auto" },
            ml: { xs: "-50vw", sm: 0 },
            height: { xs: 300, sm: 260 },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e676" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#00e676" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2b2b2b" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#b0b0b0" tick={{ fontSize: 12 }} minTickGap={16}
                tickFormatter={(value) => {
                  try { return new Date(`${value}T00:00:00`).toLocaleDateString("sv-SE", { month: "2-digit", day: "2-digit" }); }
                  catch { return value; }
                }} />
              <YAxis yAxisId="volume" stroke="#00e676" tick={{ fontSize: 12 }}
                tickFormatter={(val) => (Number.isFinite(val) ? `${val.toFixed(0)}M` : "")} />
              <YAxis yAxisId="ratio" orientation="right" stroke="#FFCA28" tick={{ fontSize: 12 }}
                tickFormatter={(val) => (Number.isFinite(val) ? `${val.toFixed(0)}%` : "")}
                domain={[0, (dataMax) => Math.max(5, Math.ceil((dataMax ?? 0) / 5) * 5)]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="volume" dataKey="volumeM" fill="url(#volumeFill)" barSize={16} radius={[4, 4, 0, 0]} />
              <Line yAxisId="volume" type="monotone" dataKey="volumeAverage5M" stroke="#29b6f6" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              <Line yAxisId="ratio" type="monotone" dataKey="shortSharePct" stroke="#FFCA28" strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
              <Line yAxisId="ratio" type="monotone" dataKey="shortShareAvg5" stroke="#ab47bc" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Legend + Footer */}
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 0.75, mt: 1.5 }}>
        {LEGEND_ITEMS.map((item) => (
          <Box key={item.key} sx={{ display: "flex", alignItems: "center", gap: 0.75, backgroundColor: "#2a2a2a", borderRadius: 1, px: 1, py: 0.5 }}>
            <Box
              sx={() => {
                if (item.variant === "bar") return { width: 10, height: 14, borderRadius: 0.5, backgroundColor: item.color };
                if (item.variant === "line") return { width: 18, height: 0, borderBottom: `2px solid ${item.color}` };
                return { width: 18, height: 0, borderBottom: `2px dashed ${item.color}` };
              }}
            />
            <Typography variant="caption" sx={{ color: "#b0b0b0", whiteSpace: "nowrap" }}>{item.label}</Typography>
          </Box>
        ))}
      </Box>

      <Typography variant="caption" sx={{ color: "#808080", display: "block", mt: 1, textAlign: "center" }}>
        Handelsefter volym via Yahoo Finance (EVO.ST). Blankningsdata från Finansinspektionen.
      </Typography>
      <Typography variant="caption" sx={{ color: "#ffb74d", display: "block", mt: 0.5, textAlign: "center" }}>
        Disclaimer: Grafen kan visa fel eftersom blankare rapporterar sina positioner i efterhand.
      </Typography>
      <Typography variant="caption" sx={{ color: "#ffb74d", display: "block", textAlign: "center" }}>
        Andelen bygger dessutom på nettot mellan två dagar, så bruttohandeln kan vara högre än vad grafen visar.
      </Typography>
    </Card>
  );
}