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
}) {
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
            sx={{ mb: { xs: 1.5, md: 2 } }}
          >
            <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2 }}>
              {translate("Översikt • Aktivt program", "Overview • Active program")}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              {Number.isFinite(cashUsagePercent) && (
                <Chip
                  size="small"
                  label={translate(
                    `Använt: ${cashUsagePercent.toFixed(1)}%`,
                    `Used: ${cashUsagePercent.toFixed(1)}%`
                  )}
                  sx={{
                    backgroundColor: "rgba(16,185,129,0.16)",
                    color: "#a7f3d0",
                    border: "1px solid rgba(16,185,129,0.35)",
                  }}
                />
              )}
              {Number.isFinite(remainingCashSharePercent) && (
                <Chip
                  size="small"
                  label={translate(
                    `${fmtPercent(remainingCashSharePercent)} av aktiestock`,
                    `${fmtPercent(remainingCashSharePercent)} of share base`
                  )}
                  sx={{
                    backgroundColor: "rgba(59,130,246,0.16)",
                    color: "#bfdbfe",
                    border: "1px solid rgba(59,130,246,0.35)",
                  }}
                />
              )}
            </Stack>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
              gap: { xs: 1.2, md: 2.2 },
              alignItems: "start",
            }}
          >
            <Stack spacing={0.75} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700 }}>
                {translate("Kassaläge", "Cash position")}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.1rem", md: "1.25rem" }, color: "#f8fafc" }}>
                {fmtCurrency(totalSpent)}
              </Typography>
              <Typography variant="body2" sx={{ color: "#e2e8f0", fontWeight: 600, letterSpacing: 0.2 }}>
                {translate("Budget:", "Budget:")} {fmtEuroMillions(buybackCash)} (≈ {fmtCurrency(buybackBudgetSek)})
              </Typography>
            </Stack>

            <Stack spacing={0.8} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700 }}>
                {translate("Återstående kassa", "Remaining cash")}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.15rem", md: "1.3rem" }, color: "#f8fafc" }}>
                {fmtCurrency(remainingCash)}
              </Typography>
              {Number.isFinite(cashUsagePercent) ? (
                <>
                  <Typography variant="caption" sx={{ color: "#cbd5f5", fontWeight: 600, letterSpacing: 0.3 }}>
                    {translate(`${cashUsagePercent.toFixed(1)}% utnyttjat`, `${cashUsagePercent.toFixed(1)}% used`)}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={cashUsagePercent}
                    sx={{
                      height: 6,
                      width: { xs: "100%", md: "80%" },
                      borderRadius: 999,
                      backgroundColor: "rgba(148,163,184,0.18)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 999,
                        background: "linear-gradient(90deg, #38bdf8, #34d399)",
                      },
                    }}
                  />
                </>
              ) : (
                <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                  {translate("Lägg till budget för att följa kassaanvändning.", "Add a budget to track cash usage.")}
                </Typography>
              )}
            </Stack>

            <Stack spacing={0.8} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700 }}>
                {translate("Kapacitet vid kurs", "Capacity at price")}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.05rem", md: "1.18rem" }, color: "#f8fafc" }}>
                {Number.isFinite(sharesAffordable) && Number.isFinite(currentSharePrice)
                  ? translate(
                      `≈ ${fmtNum(sharesAffordable)} aktier vid ${fmtCurrency(currentSharePrice)}`,
                      `≈ ${fmtNum(sharesAffordable)} shares at ${fmtCurrency(currentSharePrice)}`
                    )
                  : translate("Ingen livekurs tillgänglig.", "No live price available.")}
              </Typography>
              <Typography sx={{ fontWeight: 700, color: "#f8fafc", fontSize: { xs: "1.05rem", md: "1.18rem" } }}>
                {Number.isFinite(remainingCashSharePercent)
                  ? translate(
                      `${fmtPercent(remainingCashSharePercent)} av aktiestocken`,
                      `${fmtPercent(remainingCashSharePercent)} of share base`
                    )
                  : translate("Beräknas när kurs och budget finns.", "Calculated when price and budget exist.")}
              </Typography>
            </Stack>

            <Stack spacing={0.8} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700 }}>
                {translate("Framåtblick", "Forward look")}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.05rem", md: "1.18rem" }, color: "#f8fafc" }}>
                {est && Number.isFinite(est.daysToCompletion)
                  ? translate(`${fmtNum(est.daysToCompletion)} handelsdagar kvar`, `${fmtNum(est.daysToCompletion)} trading days left`)
                  : Number.isFinite(remainingCash) && remainingCash <= 0
                  ? translate("Budget förbrukad", "Budget spent")
                  : translate("Lägg till budget", "Add budget")}
              </Typography>
              <Typography variant="body2" sx={{ color: "#cbd5f5", fontWeight: 600 }}>
                {est?.estimatedCompletionDate
                  ? translate(`Klar: ${est.estimatedCompletionDate}`, `Complete: ${est.estimatedCompletionDate}`)
                  : Number.isFinite(remainingCash) && remainingCash <= 0
                  ? translate("Återköpsbudgeten är förbrukad.", "The buyback budget is spent.")
                  : translate("Behöver kassainformation för prognos.", "Need cash information for forecast.")}
              </Typography>
            </Stack>
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
