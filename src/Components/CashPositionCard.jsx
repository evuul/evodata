"use client";

import { useMemo } from "react";
import { Card, CardContent, Chip, Stack, Typography, Box } from "@mui/material";
import SavingsIcon from "@mui/icons-material/Savings";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import { useTranslate } from "@/context/LocaleContext";

const QUARTER_ORDER = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

const sortReports = (reports = []) =>
  [...reports].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (QUARTER_ORDER[a.quarter] || 0) - (QUARTER_ORDER[b.quarter] || 0);
  });

const fmtCash = (value) =>
  Number.isFinite(value)
    ? `${value.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MEUR`
    : "–";

export default function CashPositionCard({ financialReports }) {
  const translate = useTranslate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { series, latest, previous } = useMemo(() => {
    const rows = sortReports(financialReports?.financialReports || []).filter(
      (r) => Number.isFinite(r?.cashEnd) || Number.isFinite(r?.cashStart)
    );
    const mapped = rows.map((r) => ({
      label: `${r.year} ${r.quarter}`,
      cash: Number.isFinite(r.cashEnd) ? r.cashEnd : Number.isFinite(r.cashStart) ? r.cashStart : null,
    }));
    const valid = mapped.filter((m) => Number.isFinite(m.cash));
    const latestEntry = valid[valid.length - 1] || null;
    const prevEntry = valid.length > 1 ? valid[valid.length - 2] : null;
    return { series: valid, latest: latestEntry, previous: prevEntry };
  }, [financialReports]);

  const changeAbs = useMemo(() => {
    if (!Number.isFinite(latest?.cash) || !Number.isFinite(previous?.cash)) return null;
    return latest.cash - previous.cash;
  }, [latest, previous]);

  const changePct = useMemo(() => {
    if (!Number.isFinite(latest?.cash) || !Number.isFinite(previous?.cash) || previous.cash === 0) return null;
    return ((latest.cash - previous.cash) / previous.cash) * 100;
  }, [latest, previous]);

  const xTicks = useMemo(() => {
    if (!series.length) return undefined;
    const maxTicks = isMobile ? 4 : 8;
    if (series.length <= maxTicks) return series.map((row) => row.label);
    const step = Math.ceil((series.length - 1) / (maxTicks - 1));
    const ticks = [];
    for (let i = 0; i < series.length; i += step) {
      ticks.push(series[i].label);
    }
    const last = series[series.length - 1]?.label;
    if (last && ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [series, isMobile]);

  const formatXAxisLabel = (value) => {
    if (!value) return "";
    const text = String(value);
    if (!isMobile) return text;
    const match = text.match(/^(\d{4})\s(Q[1-4])$/);
    if (!match) return text;
    return `${match[1].slice(-2)} ${match[2]}`;
  };

  const formatYAxisLabel = (value) => {
    if (!Number.isFinite(value)) return "";
    if (!isMobile) return value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
    if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
    return value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
  };

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #0f172a, #111c2f)",
        borderRadius: "16px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        border: "1px solid rgba(148,163,184,0.16)",
        color: "#e2e8f0",
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <SavingsIcon sx={{ color: "#38bdf8" }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#f8fafc" }}>
              {translate("Kassa per kvartal", "Cash by quarter")}
            </Typography>
          </Stack>
          <Chip
            size="small"
            label={
              latest
                ? translate(`Senaste: ${latest.label}`, `Latest: ${latest.label}`)
                : translate("Ingen kassa rapporterad", "No cash reported")
            }
            sx={{ backgroundColor: "rgba(148,163,184,0.12)", color: "#e2e8f0", borderRadius: "10px", border: "1px solid rgba(148,163,184,0.25)" }}
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
          <Box
            sx={{
              flex: 1,
              background: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.2)",
              borderRadius: "14px",
              p: 1.75,
            }}
          >
            <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 600 }}>
              {translate("Senaste rapporterad kassa", "Latest reported cash")}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <SavingsIcon fontSize="small" sx={{ color: "#34d399" }} />
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#ecfeff" }}>
                {latest ? fmtCash(latest.cash) : "–"}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.7)" }}>
              {translate(
                "Hämtat från senaste kvartalsrapporten (cash end)",
                "Sourced from the latest quarterly report (cash end)"
              )}
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.25)",
              borderRadius: "14px",
              p: 1.75,
            }}
          >
            <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 600 }}>
              {translate("Förändring mot föregående kvartal", "Change vs previous quarter")}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <TrendingUpIcon fontSize="small" sx={{ color: changeAbs && changeAbs < 0 ? "#f87171" : "#fbbf24" }} />
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#e2e8f0" }}>
                {changeAbs != null ? `${fmtCash(changeAbs)} (${Number.isFinite(changePct) ? changePct.toFixed(1) + "%" : "–"})` : "–"}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.7)" }}>
              {previous
                ? translate(`Föregående: ${previous.label}`, `Previous: ${previous.label}`)
                : translate("Ingen föregående datapunkt", "No previous data point")}
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            height: 230,
            background: "rgba(15,23,42,0.55)",
            border: "1px solid rgba(148,163,184,0.18)",
            borderRadius: "14px",
            p: 1,
            mx: { xs: -1, md: 0 },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={series}
              margin={isMobile ? { top: 10, right: 8, left: -16, bottom: 2 } : { top: 10, right: 14, left: -6, bottom: 4 }}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis
                dataKey="label"
                ticks={xTicks}
                interval={0}
                tickFormatter={formatXAxisLabel}
                tick={{ fill: "rgba(226,232,240,0.78)", fontSize: isMobile ? 10 : 12 }}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                tickLine={{ stroke: "rgba(148,163,184,0.25)" }}
                minTickGap={isMobile ? 20 : 12}
                tickMargin={8}
              />
              <YAxis
                tick={{ fill: "rgba(226,232,240,0.78)", fontSize: isMobile ? 10 : 12 }}
                axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                tickLine={{ stroke: "rgba(148,163,184,0.25)" }}
                tickFormatter={formatYAxisLabel}
                width={isMobile ? 40 : 70}
              />
              <RechartsTooltip
                formatter={(value) => fmtCash(value)}
                labelFormatter={(label) => translate(`Kvartal: ${label}`, `Quarter: ${label}`)}
                contentStyle={{
                  background: "rgba(15,23,42,0.95)",
                  border: "1px solid rgba(56,189,248,0.35)",
                  borderRadius: 12,
                  color: "#e2e8f0",
                }}
              />
              <Line
                type="monotone"
                dataKey="cash"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 3, fill: "#e0f2fe", strokeWidth: 1, stroke: "#0f172a" }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
