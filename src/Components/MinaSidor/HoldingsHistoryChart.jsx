"use client";

import { useMemo, useState } from "react";
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Area,
  AreaChart,
  Bar,
  Cell,
  ComposedChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import { cardBase, text } from "./styles";
import { normalizeYmd, resolveDividendExDate } from "@/lib/dividendEligibility";
import { useFxRateContext } from "@/context/FxRateContext";
import { buildDividendEstimate } from "./dividendEstimate";

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
      date: normalizeYmd(l?.date),
      shares: Math.abs(Math.round(Number(l?.shares))),
    }))
    .filter((t) => t.date && Number.isFinite(t.shares) && t.shares > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.idx - b.idx);

  if (!tx.length && !fallbackLots.length) return [];

  if (!tx.length && fallbackLots.length) {
    const byYear = new Map();
    for (const div of divs) {
      const sharesHeld = fallbackLots.reduce((sum, lot) => {
        return lot.date < div.exDate ? sum + lot.shares : sum;
      }, 0);
      if (!(sharesHeld > 0)) continue;
      const cash = sharesHeld * div.perShare;
      const year = String(div.date).slice(0, 4);
      const prev = byYear.get(year) || { year, cash: 0, events: 0, lastExDate: null, lastPerShare: null, lastSharesHeld: null, source: "lots" };
      prev.cash += cash;
      prev.events += 1;
      prev.lastExDate = div.exDate;
      prev.lastPerShare = div.perShare;
      prev.lastSharesHeld = sharesHeld;
      byYear.set(year, prev);
    }
    return Array.from(byYear.values()).sort((a, b) => a.year.localeCompare(b.year));
  }

  const byYear = new Map();
  let lotState = [];
  let i = 0;

  for (const div of divs) {
    while (i < tx.length && tx[i].date < div.exDate) {
      const t = tx[i];
      if (t.type === "buy") lotState.push({ shares: t.shares, date: t.date });
      if (t.type === "sell") lotState = applySellFifo(lotState, t.shares);
      i += 1;
    }

    const sharesHeld = sumShares(lotState);
    const cash = sharesHeld * div.perShare;
    const year = String(div.date).slice(0, 4);
    const prev = byYear.get(year) || { year, cash: 0, events: 0, lastExDate: null, lastPerShare: null, lastSharesHeld: null, source: "transactions" };
    prev.cash += cash;
    prev.events += 1;
    prev.lastExDate = div.exDate;
    prev.lastPerShare = div.perShare;
    prev.lastSharesHeld = sharesHeld;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mode, setMode] = useState("dividends");
  const { rate: fxRate } = useFxRateContext();

  const dividendsSeries = useMemo(() => {
    const rows = computeDividendYearSeries({
      transactions: profile?.transactions,
      lots: profile?.lots,
      historicalDividends,
    });
    const base = rows
      .filter((r) => Number(r?.cash) > 0)
      .map((r) => ({
        year: r.year,
        cashValue: r.cash,
        isEstimate: false,
        source: r.source || "transactions",
        lastExDate: r.lastExDate || null,
        lastPerShare: Number.isFinite(r.lastPerShare) ? r.lastPerShare : null,
        lastSharesHeld: Number.isFinite(r.lastSharesHeld) ? r.lastSharesHeld : null,
        events: Number.isFinite(r.events) ? r.events : null,
      }));
    const estimate = buildDividendEstimate({ profileShares: profile?.shares, fxRate });
    if (!estimate) return base;
    return [
      ...base,
      {
        year: estimate.yearLabel,
        cashValue: estimate.estimatedCashSek,
        isEstimate: true,
        estimateMeta: estimate,
      },
    ];
  }, [fxRate, historicalDividends, profile?.lots, profile?.shares, profile?.transactions]);

  const holdingsSeries = useMemo(
    () =>
      computeHoldingsSeries({
        transactions: profile?.transactions,
        lots: profile?.lots,
      }),
    [profile?.lots, profile?.transactions]
  );

  const hasDividendData = dividendsSeries.length > 0 && dividendsSeries.some((r) => Number.isFinite(r.cashValue));
  const hasHoldingsData = holdingsSeries.length > 0 && holdingsSeries.some((r) => Number.isFinite(r.shares));

  const dividendTicks = useMemo(() => {
    if (!dividendsSeries.length) return undefined;
    const maxTicks = isMobile ? 4 : 7;
    if (dividendsSeries.length <= maxTicks) return dividendsSeries.map((row) => row.year);
    const step = Math.ceil((dividendsSeries.length - 1) / (maxTicks - 1));
    const ticks = [];
    for (let i = 0; i < dividendsSeries.length; i += step) ticks.push(dividendsSeries[i].year);
    const last = dividendsSeries[dividendsSeries.length - 1]?.year;
    if (last && ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [dividendsSeries, isMobile]);

  const holdingsTicks = useMemo(() => {
    if (!holdingsSeries.length) return undefined;
    const maxTicks = isMobile ? 4 : 7;
    if (holdingsSeries.length <= maxTicks) return holdingsSeries.map((row) => row.date);
    const step = Math.ceil((holdingsSeries.length - 1) / (maxTicks - 1));
    const ticks = [];
    for (let i = 0; i < holdingsSeries.length; i += step) ticks.push(holdingsSeries[i].date);
    const last = holdingsSeries[holdingsSeries.length - 1]?.date;
    if (last && ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [holdingsSeries, isMobile]);

  const formatDateTick = (value) => {
    if (!value) return "";
    const textValue = String(value);
    if (!isMobile) return textValue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(textValue)) return textValue.slice(5);
    return textValue;
  };

  const formatCompactNumber = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    if (!isMobile) return Math.round(n).toLocaleString("sv-SE");
    if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
    return Math.round(n).toLocaleString("sv-SE");
  };

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
                "Beräknas från dina köp/sälj-datum och historiska utdelningar. 2026 EST är satt till 0 efter styrelsens besked 2026-03-18 om att ingen utdelning föreslås för 2025.",
                "Calculated from your buy/sell dates and historical dividends. 2026 EST is set to 0 after the Board's 2026-03-18 announcement that no dividend is proposed for 2025."
              )
            : translate(
                "Bygger på dina köp/sälj och visar hur antalet aktier förändrats.",
                "Based on your buys/sells and shows how your share count changed."
              )}
        </Typography>

        <Box sx={{ height: 280, width: "100%", mx: { xs: -1, md: 0 } }}>
          {mode === "dividends" ? (
            hasDividendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={dividendsSeries}
                  margin={isMobile ? { top: 8, right: 6, left: -14, bottom: 0 } : { top: 10, right: 10, left: 0, bottom: 0 }}
                  barCategoryGap={isMobile ? "18%" : "24%"}
                >
                  <defs>
                    <pattern id="estimateBarPattern" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                      <rect width="8" height="8" fill="rgba(245,158,11,0.17)" />
                      <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(251,191,36,0.45)" strokeWidth="2" />
                    </pattern>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="year"
                    ticks={dividendTicks}
                    interval={0}
                    tickFormatter={formatDateTick}
                    tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(226,232,240,0.7)" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                    tickMargin={8}
                    minTickGap={isMobile ? 18 : 12}
                  />
                  <YAxis
                    tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(226,232,240,0.7)" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                    width={isMobile ? 38 : 56}
                    tickFormatter={formatCompactNumber}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.96)",
                      border: "1px solid rgba(96,165,250,0.25)",
                      borderRadius: 12,
                      color: "#f8fafc",
                    }}
                    labelStyle={{ color: "#f8fafc", fontWeight: 700 }}
                    itemStyle={{ color: "#f8fafc" }}
                    labelFormatter={(label, payload) => {
                      const row = Array.isArray(payload) && payload[0] ? payload[0].payload : null;
                      const shares = Number(row?.lastSharesHeld);
                      const perShare = Number(row?.lastPerShare);
                      const exDate = row?.lastExDate;
                      if (!Number.isFinite(shares) || !Number.isFinite(perShare) || !exDate) return label;
                      return `${label} • ${Math.round(shares).toLocaleString("sv-SE")} st @ ${perShare.toFixed(4)} SEK • X ${exDate}`;
                    }}
                    formatter={(value, name, item) => {
                      const v = Number(value);
                      const label = Number.isFinite(v) ? `${Math.round(v).toLocaleString("sv-SE")} SEK` : "–";
                      if (item?.payload?.isEstimate) {
                        if (item?.payload?.estimateMeta?.status === "no_dividend_proposed") {
                          return [
                            label,
                            translate(
                              `Ingen utdelning föreslagen (${item.payload.estimateMeta.announcementDate})`,
                              `No dividend proposed (${item.payload.estimateMeta.announcementDate})`
                            ),
                          ];
                        }
                        return [label, translate("Estimat", "Estimate")];
                      }
                      const sourceLabel =
                        item?.payload?.source === "lots"
                          ? translate("Utdelning (lot fallback)", "Dividends (lot fallback)")
                          : translate("Utdelning (transaktioner)", "Dividends (transactions)");
                      return [label, sourceLabel];
                    }}
                  />
                  <Bar
                    dataKey="cashValue"
                    radius={[10, 10, 2, 2]}
                    maxBarSize={isMobile ? 40 : 74}
                  >
                    {dividendsSeries.map((row, idx) => (
                      <Cell
                        // eslint-disable-next-line react/no-array-index-key
                        key={`${row.year}-${idx}`}
                        fill={row?.isEstimate ? "url(#estimateBarPattern)" : "rgba(56,189,248,0.75)"}
                        stroke={row?.isEstimate ? "rgba(251,191,36,0.95)" : "rgba(125,211,252,0.9)"}
                        strokeWidth={row?.isEstimate ? 2 : 1}
                      />
                    ))}
                  </Bar>
                </ComposedChart>
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
              <AreaChart
                data={holdingsSeries}
                margin={isMobile ? { top: 8, right: 6, left: -14, bottom: 0 } : { top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="holdingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="date"
                  ticks={holdingsTicks}
                  interval={0}
                  tickFormatter={formatDateTick}
                  tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(226,232,240,0.7)" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  minTickGap={isMobile ? 18 : 24}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(226,232,240,0.7)" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  width={isMobile ? 38 : 56}
                  tickFormatter={formatCompactNumber}
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
