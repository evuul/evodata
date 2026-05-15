'use client';

// Overview block for the live buyback dashboard.

import { Box, Chip, CircularProgress, LinearProgress, Stack, Typography } from "@mui/material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";

export default function LiveStockBuyBackOverviewSection({
  isMobile,
  translate,
  buybackBudgetSek,
  cashUsagePercent,
  remainingCashSharePercent,
  buybackCash,
  totalSpent,
  remainingCash,
  sharesAffordable,
  currentSharePrice,
  est,
  estimateBuybackEur,
  estimateBuybackSek,
  estimateDividendEur,
  estimateDividendSek,
  estimateRetainedSek,
  estimateSharesAffordable,
  estimateSharePercent,
  sharesAfterBuyback,
  dividendPerShareEur,
  dividendPerShareSek,
  estimateProFormaEps,
  estimateEpsLift,
  eps2025,
  hasFullYear2025Reported,
  yearEndLabel,
  FORECAST_BUYBACK_LABEL,
  FORECAST_DIVIDEND_LABEL,
  FORECAST_RETAINED_LABEL,
  FORECAST_CAPITAL_UPDATE_DATE,
  fmtNum,
  fmtPercent,
  fmtCurrency,
  fmtEuroMillions,
  loading,
  error,
  chartData,
  overviewXAxisInterval,
  overviewXAxisTickFormatter,
  viewMode,
  fmtThousands,
  weekNow,
  weekPrev,
  weekDeltaShares,
  weekDeltaSharesPct,
  avgDaily,
}) {
  const formatPct = (value) => (Number.isFinite(value) ? `${value.toFixed(1)}%` : "–");
  const weekDirection = Number.isFinite(weekDeltaShares) && weekDeltaShares !== 0 ? (weekDeltaShares > 0 ? "up" : "down") : "flat";
  const weekDeltaTone = weekDirection === "up" ? "#34d399" : weekDirection === "down" ? "#f87171" : "#cbd5e1";
  const weekRangeLabel =
    weekNow?.periodStart && weekNow?.periodEnd
      ? translate(
          `Senaste vecka: ${weekNow.periodStart.toLocaleDateString("sv-SE")}–${weekNow.periodEnd.toLocaleDateString("sv-SE")}`,
          `Last week: ${weekNow.periodStart.toLocaleDateString("sv-SE")}–${weekNow.periodEnd.toLocaleDateString("sv-SE")}`
        )
      : null;
  const prevWeekLabel =
    weekPrev?.periodStart && weekPrev?.periodEnd
      ? translate(
          `Föregående vecka: ${weekPrev.periodStart.toLocaleDateString("sv-SE")}–${weekPrev.periodEnd.toLocaleDateString("sv-SE")}`,
          `Previous week: ${weekPrev.periodStart.toLocaleDateString("sv-SE")}–${weekPrev.periodEnd.toLocaleDateString("sv-SE")}`
        )
      : null;
  const weekDeltaLabel =
    Number.isFinite(weekDeltaShares) && Number.isFinite(weekDeltaSharesPct)
      ? translate(
          `${weekDeltaShares > 0 ? "+" : ""}${fmtNum(weekDeltaShares)} aktier vs förra veckan (${formatPct(weekDeltaSharesPct)})`,
          `${weekDeltaShares > 0 ? "+" : ""}${fmtNum(weekDeltaShares)} shares vs last week (${formatPct(weekDeltaSharesPct)})`
        )
      : translate("Veckojämförelse saknas", "Week-over-week comparison unavailable");
  const avgDailyValue = Number.isFinite(avgDaily?.averageDaily) ? Math.round(avgDaily.averageDaily) : null;
  const avgDailyLabel =
    avgDailyValue != null
      ? translate(`Snitt ${fmtNum(avgDailyValue)} aktier per handelsdag`, `Average ${fmtNum(avgDailyValue)} shares per trading day`)
      : translate("Snitttakt saknas", "Average pace unavailable");
  return (
    <>
      {Number.isFinite(buybackBudgetSek) && (
        <Box
          sx={{
            mt: 2,
            background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(17,24,39,0.7))",
            border: "1px solid rgba(148,163,184,0.22)",
            borderRadius: { xs: "14px", md: "16px" },
            mx: { xs: -2, sm: -3, md: -4 },
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 2.5 },
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            sx={{ mb: { xs: 1.5, md: 1.8 } }}
          >
            <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2 }}>
              {translate("Nyckeltal för mandatet", "Mandate key metrics")}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.72)" }}>
              {translate(
                "Tre siffror räcker här: hur mycket som är använt, hur fort det går och vad som återstår.",
                "Three numbers are enough here: how much is used, how fast it runs, and what remains."
              )}
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              gap: { xs: 1.2, md: 1.8 },
              alignItems: "stretch",
            }}
          >
            <Box
              sx={{
                background: "linear-gradient(135deg, rgba(56,189,248,0.16), rgba(15,23,42,0.58))",
                borderRadius: "14px",
                border: "1px solid rgba(56,189,248,0.28)",
                p: { xs: 1.6, md: 2 },
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.82)", fontWeight: 700 }}>
                {translate("Använt mandat", "Mandate used")}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.2rem", md: "1.35rem" }, color: "#f8fafc", mt: 0.4 }}>
                {fmtCurrency(totalSpent)}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.76)", mt: 0.5 }}>
                {translate("Budget:", "Budget:")} {fmtEuroMillions(buybackCash)} (≈ {fmtCurrency(buybackBudgetSek)})
              </Typography>
              {Number.isFinite(cashUsagePercent) && (
                <LinearProgress
                  variant="determinate"
                  value={cashUsagePercent}
                  sx={{
                    mt: 1.4,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: "rgba(148,163,184,0.18)",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      background: "linear-gradient(90deg, #38bdf8, #34d399)",
                    },
                  }}
                />
              )}
            </Box>

            <Box
              sx={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(15,23,42,0.58))",
                borderRadius: "14px",
                border: "1px solid rgba(16,185,129,0.28)",
                p: { xs: 1.6, md: 2 },
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.82)", fontWeight: 700 }}>
                {translate("Veckotakt", "Weekly pace")}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.2rem", md: "1.35rem" }, color: "#f8fafc", mt: 0.4 }}>
                {translate(`${fmtNum(weekNow.totalShares)} aktier`, `${fmtNum(weekNow.totalShares)} shares`)}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.76)", mt: 0.5 }}>
                {weekDeltaLabel}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.76)", mt: 0.8, fontWeight: 600 }}>
                {avgDailyLabel}
              </Typography>
            </Box>

            <Box
              sx={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.16), rgba(15,23,42,0.58))",
                borderRadius: "14px",
                border: "1px solid rgba(245,158,11,0.28)",
                p: { xs: 1.6, md: 2 },
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.82)", fontWeight: 700 }}>
                {translate("Kvar att köpa", "Remaining capacity")}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.2rem", md: "1.35rem" }, color: "#f8fafc", mt: 0.4 }}>
                {Number.isFinite(sharesAffordable) && Number.isFinite(currentSharePrice)
                  ? translate(`≈ ${fmtNum(sharesAffordable)} aktier`, `≈ ${fmtNum(sharesAffordable)} shares`)
                  : translate("Ingen livekurs", "No live price")}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.76)", mt: 0.5 }}>
                {Number.isFinite(remainingCash)
                  ? translate(
                      `${fmtCurrency(remainingCash)} kvar och ${est && Number.isFinite(est.daysToCompletion) ? `${fmtNum(est.daysToCompletion)} handelsdagar kvar` : "ingen färdig prognos"}.`,
                      `${fmtCurrency(remainingCash)} left and ${est && Number.isFinite(est.daysToCompletion) ? `${fmtNum(est.daysToCompletion)} trading days left` : "no final forecast"}.`
                    )
                  : translate("Behöver kassauppgift för prognos.", "Need cash information for forecast.")}
              </Typography>
              {Number.isFinite(remainingCashSharePercent) && (
                <Typography variant="body2" sx={{ color: "#cbd5f5", mt: 0.8, fontWeight: 600 }}>
                  {translate(
                    `${fmtPercent(remainingCashSharePercent)} av aktiestocken`,
                    `${fmtPercent(remainingCashSharePercent)} of share base`
                  )}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          mt: 2,
          background: "rgba(15,23,42,0.55)",
          border: "1px solid rgba(148,163,184,0.18)",
          borderRadius: { xs: "14px", md: "16px" },
          mx: { xs: -3, sm: -3, md: -4 },
          px: { xs: 1, sm: 3, md: 4 },
          py: { xs: 2, md: 2.5 },
          height: isMobile ? 240 : 280,
          overflow: "visible",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 1 }}>
            <CircularProgress size={20} sx={{ color: "#38bdf8" }} />
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              {translate("Laddar tidslinje…", "Loading timeline…")}
            </Typography>
          </Box>
        ) : error ? (
          <Typography sx={{ color: "#fecaca" }}>
            {translate("Fel", "Error")}: {error}
          </Typography>
        ) : chartData.length ? (
          <Box
            sx={{
              width: { xs: "calc(100% + 16px)", sm: "100%" },
              mx: { xs: -1, sm: 0, md: 0 },
            }}
          >
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 250}>
              <AreaChart data={chartData} margin={{ top: 8, right: isMobile ? 0 : 8, left: isMobile ? 0 : 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="bbGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="x"
                  tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  height={isMobile ? 36 : viewMode === "daily" ? 42 : 30}
                  interval={overviewXAxisInterval}
                  minTickGap={isMobile ? 18 : viewMode === "daily" ? 14 : 8}
                  angle={isMobile ? 0 : viewMode === "daily" ? -30 : 0}
                  textAnchor={isMobile ? "middle" : viewMode === "daily" ? "end" : "middle"}
                  tickFormatter={overviewXAxisTickFormatter}
                />
                <YAxis
                  tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.75)" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  width={isMobile ? 40 : 60}
                  tickFormatter={(v) => {
                    if (!Number.isFinite(v)) return "–";
                    if (isMobile) {
                      if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}M`;
                      if (Math.abs(v) >= 1_000) return `${(v / 1_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}k`;
                      return Number(v).toLocaleString("sv-SE");
                    }
                    return `${fmtThousands(v, 1)} k`;
                  }}
                />
                <RechartsTooltip
                  contentStyle={{ background: "rgba(15,23,42,0.92)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 12, color: "#f8fafc" }}
                  formatter={(v) => [
                    translate(`${fmtThousands(v, 1)} k aktier`, `${fmtThousands(v, 1)} k shares`),
                    translate("Återköp", "Buybacks"),
                  ]}
                />
                <Area type="monotone" dataKey="sharesK" stroke="#38bdf8" strokeWidth={2.5} fill="url(#bbGradient)" fillOpacity={1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(148,163,184,0.75)" }}>
            {translate("Ingen återköpsdata tillgänglig.", "No buyback data available.")}
          </Box>
        )}
      </Box>
    </>
  );
}
