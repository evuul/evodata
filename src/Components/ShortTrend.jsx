"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Box, Typography, Chip, CircularProgress, Link, IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { totalSharesData } from "./buybacks/utils";
import { useStockPriceContext } from "@/context/StockPriceContext";
import { formatSek } from "@/utils/formatters";

const TZ = "Europe/Stockholm";
const LATEST_TOTAL_SHARES = totalSharesData?.[totalSharesData.length - 1]?.totalShares || null; // senast kända utestående aktier

function stockholmTodayYMD() {
  try {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === "year")?.value ?? "0000";
    const m = parts.find(p => p.type === "month")?.value ?? "00";
    const d = parts.find(p => p.type === "day")?.value ?? "00";
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function inTradingWindow() {
  try {
    const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, weekday: "short", hour: "2-digit", hour12: false }).formatToParts(new Date());
    const wd = (parts.find(p => p.type === "weekday")?.value || "").toLowerCase();
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
    const weekend = wd.startsWith("lör") || wd.startsWith("sön");
    return !weekend && hour >= 8 && hour < 18;
  } catch {
    return false;
  }
}

export default function ShortTrend() {
  const { stockPrice } = useStockPriceContext();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]); // [{date:'YYYY-MM-DD', percent:Number}]
  const [updatedAt, setUpdatedAt] = useState(null);
  const [range, setRange] = useState("30"); // '7' | '30'

  const fetchHistory = useCallback(async ({ skipSpinner = false } = {}) => {
    if (!skipSpinner) setLoading(true);
    try {
      const res = await fetch("/api/short/history", { cache: "no-store" });
      if (!res.ok) throw new Error("Kunde inte hämta historik");
      const data = await res.json();
      const arr = Array.isArray(data.items) ? data.items : [];
      // sortera stigande på datum och normalisera
      const sorted = [...arr]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(x => ({ date: x.date, percent: Number(x.percent) }));
      setItems(sorted);
      setUpdatedAt(data.updatedAt || null);
    } catch {
      // behåll tidigare state vid fel
    } finally {
      if (!skipSpinner) setLoading(false);
    }
  }, []);

  const refreshNow = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/short/snapshot", { method: "POST", cache: "no-store" });
      if (!res.ok) throw new Error(`Snapshot misslyckades (${res.status})`);
    } catch (err) {
      console.error("ShortTrend snapshot error:", err);
    } finally {
      await fetchHistory({ skipSpinner: true });
      setLoading(false);
    }
  }, [fetchHistory]);

  // Första laddning
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Om dagens datum saknas: trigga snapshot och hämta om
  useEffect(() => {
    (async () => {
      const today = stockholmTodayYMD();
      const last = items.length ? items[items.length - 1].date : null;
      if (last !== today) {
        await fetch("/api/short/snapshot", { method: "POST", cache: "no-store" }).catch(() => {});
        await fetchHistory();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Polling på vardagar 08–18 (var 10:e minut)
  useEffect(() => {
    const id = setInterval(() => { if (inTradingWindow()) fetchHistory(); }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchHistory]);

  // Refetch när fliken blir aktiv
  useEffect(() => {
    const onFocus = () => fetchHistory();
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchHistory]);

  useEffect(() => {
    const tick = async () => {
      if (!inTradingWindow()) return;
      try {
        await fetch("/api/short/snapshot", { method: "POST", cache: "no-store" });
        await fetchHistory({ skipSpinner: true });
      } catch (err) {
        console.error("ShortTrend hourly snapshot error:", err);
      }
    };

    const id = setInterval(tick, 60 * 60 * 1000);
    tick();
    return () => clearInterval(id);
  }, [fetchHistory]);

  const data = useMemo(() => {
    const n = range === "7" ? 7 : 30;
    return items.slice(-n).map(x => ({
      date: x.date,
      percent: Number.isFinite(x.percent) ? x.percent : 0,
    }));
  }, [items, range]);

  // Y-domain och 0.1pp ticks
  const yStats = useMemo(() => {
    if (!data.length) return { min: 0, max: 1, ticks: [0, 0.5, 1] };
    let min = Math.min(...data.map(d => d.percent));
    let max = Math.max(...data.map(d => d.percent));
    if (min === max) { min -= 0.1; max += 0.1; }
    const pad = 0.1;
    min = Math.floor((min - pad) * 10) / 10;
    max = Math.ceil((max + pad) * 10) / 10;
    const ticks = [];
    for (let v = min; v <= max + 1e-9; v = +(v + 0.1).toFixed(1)) ticks.push(+v.toFixed(1));
    return { min, max, ticks };
  }, [data]);

  const formatDateLabel = (s) => {
    try { return new Date(s + "T00:00:00Z").toLocaleDateString("sv-SE", { month: "2-digit", day: "2-digit" }); }
    catch { return s; }
  };

  const latest = data.length ? data[data.length - 1].percent : null;
  const prev   = data.length > 1 ? data[data.length - 2].percent : null;
  const deltaPP = (latest != null && prev != null) ? +(latest - prev).toFixed(2) : null;
  const totalBlankedShares =
    latest != null && LATEST_TOTAL_SHARES
      ? Math.round((latest / 100) * LATEST_TOTAL_SHARES)
      : null;
  const deltaBlankedShares =
    deltaPP != null && LATEST_TOTAL_SHARES
      ? Math.round((deltaPP / 100) * LATEST_TOTAL_SHARES)
      : null;
  const latestPrice = stockPrice?.price?.regularMarketPrice?.raw;
  const totalBlankedValue =
    totalBlankedShares != null && Number.isFinite(latestPrice)
      ? totalBlankedShares * latestPrice
      : null;
  const deltaBlankedValue =
    deltaBlankedShares != null && Number.isFinite(latestPrice)
      ? deltaBlankedShares * latestPrice
      : null;

  // ----- Tooltip med pp och färger -----
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const val = Number(payload[0].value || 0);
    const dStr = (() => {
      try { return new Date(label + "T00:00:00Z").toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" }); }
      catch { return label; }
    })();
    const idx = data.findIndex(p => p.date === label);
    const prevVal = idx > 0 ? data[idx - 1].percent : null;
    const dPP = prevVal != null ? +(val - prevVal).toFixed(2) : null;

    const isUp = dPP != null && dPP > 0;     // blankning ökar → röd
    const isDown = dPP != null && dPP < 0;   // blankning minskar → grön
    const color = isDown ? "#00e676" : isUp ? "#ff6f6f" : "#b0b0b0";

    return (
      <Box sx={{ p: 1, backgroundColor: "#1f1f1f", border: "1px solid #2b2b2b", borderRadius: 1 }}>
        <Typography variant="caption" sx={{ color: "#b0b0b0" }}>{dStr}</Typography>
        <Typography variant="subtitle2" sx={{ color: "#FFCA28", fontWeight: 700 }}>
          {val.toFixed(2)}%
        </Typography>
        {dPP != null && (
          <Typography variant="caption" sx={{ color, display: "block" }}>
            {isUp ? "↑" : isDown ? "↓" : ""} {Math.abs(dPP).toFixed(2)}pp sedan föregående
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Card sx={{
      background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      padding: { xs: "12px", sm: "16px" },
      width: "100%",
      maxWidth: "1200px",
      margin: "16px auto",
      minHeight: 260,
    }}>
      {/* Header */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, mb: 1, position: "relative" }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff", textAlign: "center" }}>
          Blankning – trend
        </Typography>
        <IconButton
          aria-label="Uppdatera"
          onClick={refreshNow}
          disabled={loading}
          sx={{ color: "#00e676", position: "absolute", right: 8, top: -2 }}
          size="small"
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
        {latest != null && (
          <Chip
            size="small"
            label={
              <span>
                Senaste: {latest.toFixed(2)}%{" "}
                {deltaPP != null && deltaPP !== 0 && (
                  <span style={{ color: deltaPP < 0 ? "#00e676" : "#ff6f6f" }}>
                    {deltaPP > 0 ? "↑" : "↓"} {Math.abs(deltaPP).toFixed(2)}pp
                  </span>
                )}
              </span>
            }
            sx={{ backgroundColor: "#2a2a2a", color: "#b0b0b0",
                  "& .MuiChip-label": { display: "flex", alignItems: "center", gap: 4 } }}
          />
        )}
        {totalBlankedShares != null && (
          <Typography variant="body2" sx={{ color: "#b0b0b0", textAlign: "center" }}>
            Totalt blankat ≈ {totalBlankedShares.toLocaleString("sv-SE")} aktier
            {totalBlankedValue != null && (
              <> ({formatSek(Math.abs(totalBlankedValue))})</>
            )}
          </Typography>
        )}
        {deltaPP != null && deltaPP !== 0 && deltaBlankedShares != null && deltaBlankedShares !== 0 && (
          <Typography
            variant="body2"
            sx={{
              color: deltaBlankedShares > 0 ? "#ff6f6f" : "#00e676",
              textAlign: "center",
            }}
          >
            {deltaBlankedShares > 0 ? "Ökning" : "Minskning"} sedan föregående ≈ {Math.abs(deltaBlankedShares).toLocaleString("sv-SE")} aktier
            {deltaBlankedValue != null && (
              <> ({formatSek(Math.abs(deltaBlankedValue))})</>
            )}
            {` (${deltaPP > 0 ? "+" : "-"}${Math.abs(deltaPP).toFixed(2)}pp)`}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip size="small" label="7D" clickable onClick={() => setRange("7")} sx={{ backgroundColor: range==="7" ? "#00e676" : "#2a2a2a", color: range==="7" ? "#0b0b0b" : "#b0b0b0" }} />
          <Chip size="small" label="30D" clickable onClick={() => setRange("30")} sx={{ backgroundColor: range==="30" ? "#00e676" : "#2a2a2a", color: range==="30" ? "#0b0b0b" : "#b0b0b0" }} />
        </Box>
      </Box>

      {loading ? (
        <CircularProgress size={24} sx={{ color: "#00e676" }} />
      ) : (
        <Box sx={{ width: "100%", height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="shortFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFCA28" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#FFCA28" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2b2b2b" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#b0b0b0" tick={{ fontSize: 12 }} minTickGap={16} tickFormatter={formatDateLabel} />
              <YAxis stroke="#b0b0b0" domain={[yStats.min, yStats.max]} ticks={yStats.ticks} tickFormatter={(v)=>`${v.toFixed(1)}%`} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="percent" fill="url(#shortFill)" stroke="none" />
              <Line type="monotone" dataKey="percent" stroke="#FFCA28" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 4 }} strokeLinecap="round" />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Källa och uppdateringstid */}
      <Typography variant="caption" sx={{ color: "#808080", display: "block", mt: 1, textAlign: "center" }}>
        Källa: <Link href="https://www.fi.se/sv/vara-register/blankningsregistret/emittent/?id=549300SUH6ZR1RF6TA88" target="_blank" rel="noopener" underline="hover" sx={{ color: "#FFCA28" }}>Finansinspektionen (FI) – blankningsregistret</Link>
      </Typography>
      {updatedAt && (
        <Typography variant="caption" sx={{ color: "#808080", display: "block", textAlign: "center" }}>
          Senast uppdaterad: {new Date(updatedAt).toLocaleString("sv-SE")}
        </Typography>
      )}
    </Card>
  );
}
