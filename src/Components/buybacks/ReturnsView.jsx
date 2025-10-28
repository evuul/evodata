"use client";
import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Label,
  Bar,
} from "recharts";

const COLORS = {
  surface: "rgba(15,23,42,0.62)",
  border: "rgba(148,163,184,0.18)",
  textPrimary: "#f8fafc",
  textSecondary: "rgba(203,213,225,0.78)",
  accent: "#38bdf8",
  accentAlt: "#34d399",
  grid: "rgba(148,163,184,0.14)",
  tooltipBg: "rgba(15,23,42,0.92)",
};

const formatMillions = (value) =>
  Number.isFinite(value) ? `${value.toLocaleString("sv-SE")} Mkr` : "-";

const ReturnsView = ({
  isMobile,
  chartData,
  totalReturns,
  totalDividends,
  totalBuybacks,
  loadingPrice,
  directYieldPercentage,
  marketCap,
  latestYear,
}) => {
  const hasData = Array.isArray(chartData) && chartData.length > 0;
  const totalReturnsM = (totalReturns / 1_000_000).toLocaleString("sv-SE");
  const totalDividendsM = (totalDividends / 1_000_000).toLocaleString("sv-SE");
  const totalBuybacksM = (totalBuybacks / 1_000_000).toLocaleString("sv-SE");
  const directYieldLabel = loadingPrice
    ? "Laddar direktavkastning…"
    : `Direktavkastning ${latestYear}: ${directYieldPercentage.toLocaleString("sv-SE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`;

  return (
    <Box
      sx={{
        width: "100%",
        background: COLORS.surface,
        borderRadius: "20px",
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 18px 40px rgba(8,15,40,0.46)",
        px: { xs: 2.2, md: 3 },
        py: { xs: 2.6, md: 3.2 },
        display: "flex",
        flexDirection: "column",
        gap: 2.8,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: COLORS.textPrimary,
          fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.6rem" },
        }}
      >
        Återinvestering till investerare
      </Typography>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 1.8, md: 2.4 }}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1.2, sm: 1.6 }}
          flex={1}
          sx={{ flexWrap: "wrap" }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: { xs: "100%", sm: 200 },
              background: "linear-gradient(140deg, rgba(56,189,248,0.28), rgba(30,64,175,0.28))",
              borderRadius: "16px",
              border: `1px solid rgba(59,130,246,0.35)`,
              px: 2.2,
              py: 1.8,
              display: "flex",
              flexDirection: "column",
              gap: 0.4,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
              Totalt återförd kapital
            </Typography>
            <Typography variant="h5" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>
              {totalReturnsM} Mkr
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: { xs: "100%", sm: 180 },
              background: "linear-gradient(140deg, rgba(52,211,153,0.22), rgba(17,94,89,0.18))",
              borderRadius: "16px",
              border: `1px solid rgba(52,211,153,0.35)`,
              px: 2.2,
              py: 1.8,
              display: "flex",
              flexDirection: "column",
              gap: 0.4,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
              Utdelningar
            </Typography>
            <Typography variant="h6" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>
              {totalDividendsM} Mkr
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: { xs: "100%", sm: 180 },
              background: "linear-gradient(140deg, rgba(56,189,248,0.18), rgba(14,116,144,0.18))",
              borderRadius: "16px",
              border: `1px solid rgba(56,189,248,0.28)`,
              px: 2.2,
              py: 1.8,
              display: "flex",
              flexDirection: "column",
              gap: 0.4,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
              Återköp
            </Typography>
            <Typography variant="h6" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>
              {totalBuybacksM} Mkr
            </Typography>
          </Box>
        </Stack>
        <Box
          sx={{
            minWidth: { xs: "100%", md: 220 },
            background: "rgba(15,23,42,0.45)",
            borderRadius: "16px",
            border: `1px solid ${COLORS.border}`,
            px: 2.2,
            py: 1.8,
            display: "flex",
            flexDirection: "column",
            gap: 0.4,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
            Direktavkastning
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: loadingPrice ? COLORS.textSecondary : COLORS.accentAlt,
              fontWeight: loadingPrice ? 500 : 700,
            }}
          >
            {directYieldLabel}
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            Marknadsvärde ≈ {(marketCap / 1_000_000_000).toLocaleString("sv-SE")} Mdkr
          </Typography>
        </Box>
      </Stack>

      {hasData ? (
        <ResponsiveContainer width="100%" height={isMobile ? 260 : 360}>
          <BarChart
            data={chartData}
            margin={{
              top: 24,
              right: isMobile ? 8 : 16,
              left: isMobile ? -8 : 0,
              bottom: 12,
            }}
          >
            <defs>
              <linearGradient id="dividendsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.accentAlt} stopOpacity={0.9} />
                <stop offset="95%" stopColor={COLORS.accentAlt} stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="buybacksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.9} />
                <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0.25} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="year"
              stroke={COLORS.textSecondary}
              tick={{ fill: COLORS.textSecondary, fontSize: isMobile ? 12 : 13 }}
              height={isMobile ? 30 : 40}
            >
              {!isMobile && (
                <Label
                  value="År"
                  offset={-10}
                  position="insideBottom"
                  fill={COLORS.textSecondary}
                  style={{ fontSize: 13 }}
                />
              )}
            </XAxis>
            <YAxis
              stroke={COLORS.textSecondary}
              tick={{
                fill: COLORS.textSecondary,
                fontSize: isMobile ? 12 : 13,
              }}
              tickFormatter={(value) => value.toLocaleString("sv-SE")}
              width={isMobile ? 40 : 60}
            >
              {!isMobile && (
                <Label
                  value="Belopp (Mkr)"
                  angle={-90}
                  offset={-10}
                  position="insideLeft"
                  fill={COLORS.textSecondary}
                  style={{ fontSize: 13 }}
                />
              )}
            </YAxis>
            <Tooltip
              formatter={(value, name) => [
                formatMillions(value),
                name === "dividends" ? "Utdelningar" : "Återköp",
              ]}
              labelFormatter={(label) => `År ${label}`}
              contentStyle={{
                backgroundColor: COLORS.tooltipBg,
                color: COLORS.textPrimary,
                border: "none",
                borderRadius: "10px",
                boxShadow: "0 12px 30px rgba(8,15,40,0.38)",
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{
                color: COLORS.textSecondary,
                paddingBottom: 8,
              }}
              formatter={(value) =>
                value === "dividends" ? "Utdelningar" : "Aktieåterköp"
              }
            />
            <Bar
              dataKey="dividends"
              fill="url(#dividendsGradient)"
              name="Utdelningar"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="buybacks"
              fill="url(#buybacksGradient)"
              name="Aktieåterköp"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
          Laddar data…
        </Typography>
      )}
    </Box>
  );
};

export default ReturnsView;
