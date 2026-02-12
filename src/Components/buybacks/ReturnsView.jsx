"use client";
import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import { useTranslate } from "@/context/LocaleContext";
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
  const translate = useTranslate();
  const hasData = Array.isArray(chartData) && chartData.length > 0;
  const formatCompactAxisValue = (value) => {
    if (!Number.isFinite(value)) return "-";
    if (!isMobile) return value.toLocaleString("sv-SE");
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}k`;
    return value.toLocaleString("sv-SE");
  };
  const formatMillionsLocalized = (value) =>
    Number.isFinite(value)
      ? `${value.toLocaleString("sv-SE")} ${translate("Mkr", "MSEK")}`
      : "-";
  const totalReturnsM = (totalReturns / 1_000_000).toLocaleString("sv-SE");
  const totalDividendsM = (totalDividends / 1_000_000).toLocaleString("sv-SE");
  const totalBuybacksM = (totalBuybacks / 1_000_000).toLocaleString("sv-SE");
  const directYieldLabel = loadingPrice
    ? translate("Laddar direktavkastning…", "Loading dividend yield…")
    : translate(
        `Direktavkastning ${latestYear}: ${directYieldPercentage.toLocaleString("sv-SE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}%`,
        `Dividend yield ${latestYear}: ${directYieldPercentage.toLocaleString("sv-SE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}%`
      );

  return (
    <Box
      sx={{
        width: "100%",
        background: COLORS.surface,
        borderRadius: "20px",
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 18px 40px rgba(8,15,40,0.46)",
        px: { xs: 1.2, md: 3 },
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
        {translate("Återinvestering till investerare", "Capital returned to investors")}
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
              {translate("Totalt återförd kapital", "Total capital returned")}
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
              {translate("Utdelningar", "Dividends")}
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
              {translate("Återköp", "Buybacks")}
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
            {translate("Direktavkastning", "Dividend yield")}
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
            {translate(
              `Marknadsvärde ≈ ${(marketCap / 1_000_000_000).toLocaleString("sv-SE")} Mdkr`,
              `Market cap ≈ ${(marketCap / 1_000_000_000).toLocaleString("sv-SE")} BSEK`
            )}
          </Typography>
        </Box>
      </Stack>

      {hasData ? (
        <Box sx={{ width: "100%", mx: { xs: -0.6, md: 0 } }}>
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 360}>
          <BarChart
            data={chartData}
            margin={{
              top: 24,
              right: isMobile ? 4 : 16,
              left: isMobile ? 2 : 0,
              bottom: isMobile ? 16 : 12,
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
              height={isMobile ? 38 : 40}
            >
              {!isMobile && (
                <Label
                  value={translate("År", "Years")}
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
              tickFormatter={formatCompactAxisValue}
              width={isMobile ? 44 : 60}
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
              formatter={(value, _name, entry) => [
                formatMillionsLocalized(value),
                entry?.dataKey === "dividends"
                  ? translate("Utdelningar", "Dividends")
                  : translate("Aktieåterköp", "Share buybacks"),
              ]}
              labelFormatter={(label) => translate(`År ${label}`, `Year ${label}`)}
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
              formatter={(_value, entry) =>
                entry?.dataKey === "dividends"
                  ? translate("Utdelningar", "Dividends")
                  : translate("Aktieåterköp", "Share buybacks")
              }
            />
            <Bar
              dataKey="dividends"
              fill="url(#dividendsGradient)"
              name={translate("Utdelningar", "Dividends")}
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="buybacks"
              fill="url(#buybacksGradient)"
              name={translate("Aktieåterköp", "Share buybacks")}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
          {translate("Laddar data…", "Loading data…")}
        </Typography>
      )}
    </Box>
  );
};

export default ReturnsView;
