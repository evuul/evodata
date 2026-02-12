"use client";

import { useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { cardBase, text } from "./styles";
import { normalizeYmd, resolveDividendExDate } from "@/lib/dividendEligibility";
import useMediaQuery from "@/lib/useMuiMediaQuery";

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

const computeYearSeries = ({ transactions, lots, historicalDividends }) => {
  const divs = (Array.isArray(historicalDividends) ? historicalDividends : [])
    .map((d) => ({
      date: normalizeYmd(d?.date),
      exDate: resolveDividendExDate(d),
      perShare: Number(d?.dividendPerShare),
    }))
    .filter((d) => d.date && d.exDate && Number.isFinite(d.perShare) && d.perShare > 0)
    .sort((a, b) => a.exDate.localeCompare(b.exDate));

  if (!divs.length) return [];

  // Prefer transactions for correctness across sells.
  const tx = (Array.isArray(transactions) ? transactions : [])
    .map((t, idx) => ({
      idx,
      type: t?.type === "buy" || t?.type === "sell" ? t.type : null,
      date: normalizeYmd(t?.date),
      shares: Math.abs(Math.round(Number(t?.shares))),
      price: Number(t?.price),
      fee: Number(t?.fee) || 0,
    }))
    .filter((t) => t.type && t.date && Number.isFinite(t.shares) && t.shares > 0)
    .sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      if (c !== 0) return c;
      if (a.type !== b.type) return a.type === "buy" ? -1 : 1;
      return a.idx - b.idx;
    });

  const fallbackLots = (Array.isArray(lots) ? lots : [])
    .map((l) => ({
      type: "buy",
      date: normalizeYmd(l?.date) || "1900-01-01",
      shares: Math.abs(Math.round(Number(l?.shares))),
      price: Number(l?.price),
      fee: 0,
    }))
    .filter((t) => t.date && Number.isFinite(t.shares) && t.shares > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const timeline = tx.length ? tx : fallbackLots;
  if (!timeline.length) return [];

  const byYear = new Map(); // year -> { year, total, rows: [] }
  let lotState = [];
  let i = 0;

  for (const div of divs) {
    // Shares held before X-day are dividend-eligible.
    while (i < timeline.length && timeline[i].date < div.exDate) {
      const t = timeline[i];
      if (t.type === "buy") {
        lotState.push({ shares: t.shares, date: t.date, price: t.price, fee: t.fee });
      } else if (t.type === "sell") {
        lotState = applySellFifo(lotState, t.shares);
      }
      i += 1;
    }

    const sharesHeld = sumShares(lotState);
    const cash = sharesHeld * div.perShare;
    const year = String(div.date).slice(0, 4);
    const prev = byYear.get(year) || { year, cash: 0, sharesAtDiv: sharesHeld, perShare: div.perShare };
    prev.cash += cash;
    // For annual dividends it's usually one row; keep last.
    prev.sharesAtDiv = sharesHeld;
    prev.perShare = div.perShare;
    byYear.set(year, prev);
  }

  return Array.from(byYear.values()).sort((a, b) => a.year.localeCompare(b.year));
};

export default function DividendYearChart({ translate, profile, historicalDividends }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const series = useMemo(
    () =>
      computeYearSeries({
        transactions: profile?.transactions,
        lots: profile?.lots,
        historicalDividends,
      }).map((row) => ({
        year: row.year,
        cash: row.cash,
        cashLabel: Math.round(row.cash).toLocaleString("sv-SE"),
        sharesAtDiv: row.sharesAtDiv,
        perShare: row.perShare,
      })),
    [historicalDividends, profile?.lots, profile?.transactions]
  );

  const hasData = series.length > 0 && series.some((r) => Number.isFinite(r.cash));

  const yearTicks = useMemo(() => {
    if (!series.length) return undefined;
    const maxTicks = isMobile ? 4 : 7;
    if (series.length <= maxTicks) return series.map((row) => row.year);
    const step = Math.ceil((series.length - 1) / (maxTicks - 1));
    const ticks = [];
    for (let i = 0; i < series.length; i += step) ticks.push(series[i].year);
    const last = series[series.length - 1]?.year;
    if (last && ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [series, isMobile]);

  const formatCompactNumber = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    if (!isMobile) return Math.round(n).toLocaleString("sv-SE");
    if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
    return Math.round(n).toLocaleString("sv-SE");
  };

  return (
    <Box sx={{ ...cardBase, p: { xs: 2, md: 2.5 } }}>
      <Stack spacing={1}>
        <Box>
          <Typography sx={{ color: text.sectionLabel, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 800, fontSize: "0.78rem" }}>
            {translate("Utdelning över tid", "Dividend history")}
          </Typography>
          <Typography sx={{ color: text.heading, fontWeight: 900, fontSize: { xs: "1.05rem", md: "1.15rem" } }}>
            {translate("Årlig utdelning (beräknad)", "Annual dividends (estimated)")}
          </Typography>
          <Typography sx={{ color: text.muted, fontSize: "0.9rem" }}>
            {translate(
              "Beräknas från dina köp/sälj-datum och historiska utdelningar.",
              "Calculated from your buy/sell dates and historical dividends."
            )}
          </Typography>
        </Box>

        <Box sx={{ height: 260, width: "100%", mx: { xs: -1, md: 0 } }}>
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={isMobile ? { top: 8, right: 6, left: -14, bottom: 0 } : { top: 10, right: 10, left: 0, bottom: 0 }}
                barCategoryGap={isMobile ? "18%" : "24%"}
              >
                <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="year"
                  ticks={yearTicks}
                  interval={0}
                  tick={{ fontSize: isMobile ? 10 : 12, fill: "rgba(226,232,240,0.7)" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  minTickGap={isMobile ? 18 : 12}
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
                    border: "1px solid rgba(96,165,250,0.25)",
                    borderRadius: 12,
                    color: "#f8fafc",
                  }}
                  formatter={(value, name, props) => {
                    const v = Number(value);
                    const label = Number.isFinite(v) ? `${Math.round(v).toLocaleString("sv-SE")} SEK` : "–";
                    return [label, translate("Utdelning", "Dividends")];
                  }}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="cash" fill="rgba(56,189,248,0.75)" stroke="rgba(125,211,252,0.9)" radius={[10, 10, 2, 2]} maxBarSize={isMobile ? 40 : 64} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ color: text.muted, fontWeight: 700 }}>
                {translate("Ingen data ännu. Importera transaktioner eller registrera köp med datum.", "No data yet. Import transactions or add buys with dates.")}
              </Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
