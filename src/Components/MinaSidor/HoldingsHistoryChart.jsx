"use client";

import { useMemo, useState } from "react";
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cardBase, text } from "./styles";
import { normalizeYmd, resolveDividendExDate } from "@/lib/dividendEligibility";

const sumShares = (lots) =>
  (Array.isArray(lots) ? lots : []).reduce((sum, lot) => sum + Math.max(0, Number(lot?.shares) || 0), 0);

const applySellFifo = (lots, sharesToSell) => {
  let remaining = Math.max(0, Number(sharesToSell) || 0);
  const next = [];
  for (const lot of lots) {
    const lotShares = Math.max(0, Number(lot?.shares) || 0);
    if (lotShares <= 0) continue;
    if (remaining <= 0) {
      next.push({ ...lot, shares: lotShares });
      continue;
    }
    if (lotShares <= remaining) {
      remaining -= lotShares;
      continue;
    }
    next.push({ ...lot, shares: lotShares - remaining });
    remaining = 0;
  }
  return next;
};

const computeDividendYearSeries = ({ transactions, lots, historicalDividends }) => {
  const divs = (Array.isArray(historicalDividends) ? historicalDividends : [])
    .map((d) => ({
      date: normalizeYmd(d?.date),
      exDate: resolveDividendExDate(d),
      perShare: Number(d?.dividendPerShare),
    }))
    .filter((d) => d.date && d.exDate && Number.isFinite(d.perShare) && d.perShare > 0)
    .sort((a, b) => a.exDate.localeCompare(b.exDate));

  if (!divs.length) return [];

  const tx = (Array.isArray(transactions) ? transactions : [])
    .map((t, idx) => ({
      idx,
      type: t?.type === "buy" || t?.type === "sell" ? t.type : null,
      date: normalizeYmd(t?.date),
      shares: Math.abs(Math.round(Number(t?.shares))),
    }))
    .filter((t) => t.type && t.date && Number.isFinite(t.shares) && t.shares > 0)
    .sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      if (c !== 0) return c;
      if (a.type !== b.type) return a.type === "buy" ? -1 : 1;
      return a.idx - b.idx;
    });

  const fallbackLots = (Array.isArray(lots) ? lots : [])
    .map((l, idx) => ({
      idx,
      type: "buy",
      date: normalizeYmd(l?.date) || "1900-01-01",
      shares: Math.abs(Math.round(Number(l?.shares))),
    }))
    .filter((t) => t.date && Number.isFinite(t.shares) && t.shares > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.idx - b.idx);

  const timeline = tx.length ? tx : fallbackLots;
  if (!timeline.length) return [];

  const byYear = new Map();
  let lotState = [];
  let i = 0;

  for (const div of divs) {
    while (i < timeline.length && timeline[i].date < div.exDate) {
      const t = timeline[i];
      if (t.type === "buy") lotState.push({ shares: t.shares, date: t.date });
      if (t.type === "sell") lotState = applySellFifo(lotState, t.shares);
      i += 1;
    }

    const sharesHeld = sumShares(lotState);
    const cash = sharesHeld * div.perShare;
    const year = String(div.date).slice(0, 4);
    const prev = byYear.get(year) || { year, cash: 0 };
    prev.cash += cash;
    byYear.set(year, prev);
  }

  return Array.from(byYear.values()).sort((a, b) => a.year.localeCompare(b.year));
};

const computeHoldingsSeries = ({ transactions, lots }) => {
  const tx = (Array.isArray(transactions) ? transactions : [])
    .map((t, idx) => ({
      idx,
      type: t?.type === "buy" || t?.type === "sell" ? t.type : null,
      date: normalizeYmd(t?.date),
      shares: Math.abs(Math.round(Number(t?.shares))),
    }))
    .filter((t) => t.type && t.date && Number.isFinite(t.shares) && t.shares > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.type === "buy" ? -1 : 1) || a.idx - b.idx);

  if (tx.length) {
    const byDate = new Map(); // date -> delta shares
    for (const t of tx) {
      const delta = t.type === "buy" ? t.shares : -t.shares;
      byDate.set(t.date, (byDate.get(t.date) || 0) + delta);
    }
    const dates = Array.from(byDate.keys()).sort();
    let shares = 0;
    const points = dates.map((d) => {
      shares += byDate.get(d) || 0;
      return { date: d, shares: Math.max(0, shares) };
    });

    // Downsample if too many points: keep last value per month.
    if (points.length > 420) {
      const byMonth = new Map();
      for (const p of points) {
        const m = p.date.slice(0, 7); // YYYY-MM
        byMonth.set(m, p.shares);
      }
      const months = Array.from(byMonth.keys()).sort();
      return months.map((m) => ({ date: `${m}-01`, shares: byMonth.get(m) }));
    }
    return points;
  }

  // Fallback: just show current shares.
  const currentShares = sumShares(lots);
  return currentShares > 0 ? [{ date: "Now", shares: currentShares }] : [];
};

export default function HoldingsHistoryChart({ translate, profile, historicalDividends }) {
  const [mode, setMode] = useState("dividends");

  const dividendsSeries = useMemo(() => {
    const rows = computeDividendYearSeries({
      transactions: profile?.transactions,
      lots: profile?.lots,
      historicalDividends,
    });
    return rows.map((r) => ({ year: r.year, cash: r.cash }));
  }, [historicalDividends, profile?.lots, profile?.transactions]);

  const holdingsSeries = useMemo(
    () =>
      computeHoldingsSeries({
        transactions: profile?.transactions,
        lots: profile?.lots,
      }),
    [profile?.lots, profile?.transactions]
  );

  const hasDividendData = dividendsSeries.length > 0 && dividendsSeries.some((r) => Number.isFinite(r.cash));
  const hasHoldingsData = holdingsSeries.length > 0 && holdingsSeries.some((r) => Number.isFinite(r.shares));

  return (
    <Box sx={{ ...cardBase, p: { xs: 2, md: 2.5 } }}>
      <Stack spacing={1.2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography
              sx={{
                color: text.sectionLabel,
                textTransform: "uppercase",
                letterSpacing: 1.3,
                fontWeight: 800,
                fontSize: "0.78rem",
              }}
            >
              {translate("Historik", "History")}
            </Typography>
            <Typography sx={{ color: text.heading, fontWeight: 900, fontSize: { xs: "1.05rem", md: "1.15rem" } }}>
              {mode === "dividends"
                ? translate("Årlig utdelning (beräknad)", "Annual dividends (estimated)")
                : translate("Aktieägande över tid", "Share holdings over time")}
            </Typography>
          </Box>

          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={(_, value) => value && setMode(value)}
            sx={{
              backgroundColor: "rgba(15,23,42,0.45)",
              borderRadius: "999px",
              p: 0.3,
              "& .MuiToggleButton-root": {
                textTransform: "none",
                border: 0,
                borderRadius: "999px!important",
                px: 1.3,
                color: "rgba(226,232,240,0.75)",
              },
              "& .Mui-selected": {
                color: "#0f172a",
                backgroundColor: "#f8fafc!important",
                fontWeight: 800,
              },
            }}
          >
            <ToggleButton value="dividends">{translate("Utdelning", "Dividends")}</ToggleButton>
            <ToggleButton value="holdings">{translate("Innehav", "Holdings")}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Typography sx={{ color: text.muted, fontSize: "0.9rem" }}>
          {mode === "dividends"
            ? translate(
                "Beräknas från dina köp/sälj-datum och historiska utdelningar.",
                "Calculated from your buy/sell dates and historical dividends."
              )
            : translate(
                "Bygger på dina köp/sälj och visar hur antalet aktier förändrats.",
                "Based on your buys/sells and shows how your share count changed."
              )}
        </Typography>

        <Box sx={{ height: 280, width: "100%" }}>
          {mode === "dividends" ? (
            hasDividendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dividendsSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: "rgba(226,232,240,0.7)" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "rgba(226,232,240,0.7)" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.96)",
                      border: "1px solid rgba(96,165,250,0.25)",
                      borderRadius: 12,
                      color: "#f8fafc",
                    }}
                    formatter={(value) => {
                      const v = Number(value);
                      const label = Number.isFinite(v) ? `${Math.round(v).toLocaleString("sv-SE")} SEK` : "–";
                      return [label, translate("Utdelning", "Dividends")];
                    }}
                  />
                  <Bar
                    dataKey="cash"
                    fill="rgba(56,189,248,0.75)"
                    stroke="rgba(125,211,252,0.9)"
                    radius={[10, 10, 2, 2]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography sx={{ color: text.muted, fontWeight: 700 }}>
                  {translate(
                    "Ingen data ännu. Importera transaktioner eller registrera köp med datum.",
                    "No data yet. Import transactions or add buys with dates."
                  )}
                </Typography>
              </Box>
            )
          ) : hasHoldingsData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={holdingsSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="holdingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "rgba(226,232,240,0.7)" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  minTickGap={18}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "rgba(226,232,240,0.7)" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.96)",
                    border: "1px solid rgba(34,197,94,0.22)",
                    borderRadius: 12,
                    color: "#f8fafc",
                  }}
                  formatter={(value) => {
                    const v = Number(value);
                    const label = Number.isFinite(v) ? `${Math.round(v).toLocaleString("sv-SE")} st` : "–";
                    return [label, translate("Aktier", "Shares")];
                  }}
                />
                <Area type="monotone" dataKey="shares" stroke="#34d399" strokeWidth={2.3} fill="url(#holdingsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ color: text.muted, fontWeight: 700 }}>
                {translate(
                  "Ingen data ännu. Importera transaktioner eller registrera köp med datum.",
                  "No data yet. Import transactions or add buys with dates."
                )}
              </Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
