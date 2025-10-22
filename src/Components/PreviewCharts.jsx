"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Typography,
} from "@mui/material";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

const ROLLING_POINTS = 24;
const CRAZY_TIME_POINTS = 7;

const generateRevenueSeries = (financialReports) => {
  const rows = Array.isArray(financialReports) ? financialReports : [];
  const byYear = rows.reduce((acc, report) => {
    const year = report?.year;
    if (!Number.isFinite(year)) return acc;
    acc[year] = acc[year] || 0;
    acc[year] += Number(report?.operatingRevenues ?? 0);
    return acc;
  }, {});

  return Object.keys(byYear)
    .map((year) => ({ year: Number(year), value: byYear[year] }))
    .filter((item) => item.year < 2025)
    .sort((a, b) => a.year - b.year)
    .slice(-ROLLING_POINTS)
    .map((item) => ({ label: `${item.year}`, value: item.value }));
};

const findCrazyTimeSeries = (gameShowsData) => {
  const array = Array.isArray(gameShowsData) ? gameShowsData : [];
  const crazyTime = array.find((entry) =>
    typeof entry?.name === "string" &&
    entry.name.toLowerCase().includes("crazy time")
  );
  if (!crazyTime || !Array.isArray(crazyTime.playerData)) return [];

  return [...crazyTime.playerData]
    .sort((a, b) => new Date(a.date ?? a.Datum) - new Date(b.date ?? b.Datum))
    .slice(-CRAZY_TIME_POINTS)
    .map((row) => {
      const date = new Date(row.date ?? row.Datum);
      const label = Number.isNaN(date.getTime())
        ? row.date ?? row.Datum ?? ""
        : date.toLocaleDateString("sv-SE", {
            month: "short",
            day: "numeric",
          });
      return {
        label,
        value: Number(row.players ?? row.Players ?? 0),
      };
    });
};

const generateSharesSeries = (sharesData) => {
  const rows = Array.isArray(sharesData) ? sharesData : [];
  return [...rows]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((row) => ({
      label: new Date(row.date).toLocaleDateString("sv-SE", {
        month: "short",
        year: "numeric",
      }),
      value: Number(row.sharesOutstanding ?? 0),
    }));
};

export default function PreviewCharts({ financialReports, gameShowsData, sharesData }) {
  const revenueSeries = useMemo(
    () => generateRevenueSeries(financialReports?.financialReports ?? []),
    [financialReports]
  );

  const crazyTimeSeries = useMemo(
    () => findCrazyTimeSeries(gameShowsData),
    [gameShowsData]
  );

  const sharesSeries = useMemo(
    () => generateSharesSeries(sharesData),
    [sharesData]
  );

  const charts = useMemo(() => {
    const result = [];
    if (revenueSeries.length) {
      result.push({
        key: "revenue",
        title: "Evolution omsättning per år",
        subtitle:
          "Logga in för att låsa upp kompletta KPI:er, helårsvyer och historiska nyckeltal – allt uppdateras automatiskt efter varje rapport.",
        render: () => (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueSeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="previewRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#82c1ff" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#82c1ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.45)"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }}
                interval={revenueSeries.length > 12 ? 1 : 0}
              />
              <YAxis
                stroke="rgba(255,255,255,0.45)"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }}
                tickCount={5}
                domain={[0, "dataMax"]}
                tickFormatter={(value) =>
                  `${Number(value).toLocaleString("sv-SE", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })} M€`
                }
              />
              <Tooltip
                cursor={{ stroke: "rgba(130,193,255,0.3)", strokeWidth: 1 }}
                contentStyle={{
                  backgroundColor: "rgba(15,15,20,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#ffffff",
                  fontSize: "0.85rem",
                }}
                formatter={(value) => [
                  `${Number(value).toLocaleString("sv-SE", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })} M€`,
                  "Omsättning",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#82c1ff"
                strokeWidth={2}
                fill="url(#previewRevenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ),
      });
    }

    if (crazyTimeSeries.length) {
      result.push({
        key: "crazy-time",
        title: "Crazy Time – spelare senaste dagarna",
        subtitle:
          "Få full inblick i lobbytrender, spelrankingar och djuplodande statistik för varje game show genom att logga in.",
        render: () => (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={crazyTimeSeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="previewCrazyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4cafef" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#4cafef" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.45)"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.45)"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }}
                tickCount={5}
                domain={[0, "dataMax"]}
                tickFormatter={(value) =>
                  Number(value).toLocaleString("sv-SE", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })
                }
              />
              <Tooltip
                cursor={{ fill: "rgba(76,175,239,0.12)" }}
                contentStyle={{
                  backgroundColor: "rgba(15,15,20,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#ffffff",
                  fontSize: "0.85rem",
                }}
                formatter={(value) => [
                  `${Number(value).toLocaleString("sv-SE")} spelare`,
                  "Crazy Time",
                ]}
              />
              <Bar dataKey="value" fill="url(#previewCrazyGradient)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ),
      });
    }

    if (sharesSeries.length) {
      const values = sharesSeries.map((item) => item.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = max - min || 1;
      const buffer = span * 0.05;

      result.push({
        key: "shares",
        title: "Utestående aktier minskar",
        subtitle:
          "Se hur återköpen påverkar antalet aktier över tid och följ utvecklingen månad för månad när du loggar in.",
        render: () => (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sharesSeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="previewSharesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9c9cff" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#9c9cff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.45)"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.45)"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }}
                tickCount={5}
                domain={[Math.max(0, min - buffer), max + buffer]}
                tickFormatter={(value) =>
                  `${Number(value).toLocaleString("sv-SE", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })} M`
                }
              />
              <Tooltip
                cursor={{ stroke: "rgba(156,156,255,0.3)", strokeWidth: 1 }}
                contentStyle={{
                  backgroundColor: "rgba(15,15,20,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#ffffff",
                  fontSize: "0.85rem",
                }}
                formatter={(value) => [
                  `${Number(value).toLocaleString("sv-SE", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })} miljoner aktier`,
                  "Utestående",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#9c9cff"
                strokeWidth={2}
                fill="url(#previewSharesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ),
      });
    }

    return result;
  }, [revenueSeries, crazyTimeSeries, sharesSeries]);

  const [index, setIndex] = useState(0);

  if (!charts.length) {
    return null;
  }

  const currentChart = charts[index];

  const handlePrev = () => setIndex((prev) => Math.max(prev - 1, 0));
  const handleNext = () => setIndex((prev) => Math.min(prev + 1, charts.length - 1));

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1100px",
        mx: "auto",
        mt: { xs: 2.5, sm: 3 },
        px: { xs: 2, sm: 0 },
      }}
    >
      <Card
        sx={{
          background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "0 16px 32px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        <CardContent
          sx={{
            py: { xs: 3, sm: 4 },
            px: { xs: 3, sm: 4 },
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
            }}
          >
            <IconButton
              onClick={handlePrev}
              disabled={index === 0}
              sx={{
                color: "#82c1ff",
                backgroundColor: "rgba(130,193,255,0.12)",
                "&:hover": { backgroundColor: "rgba(130,193,255,0.2)" },
                visibility: charts.length > 1 ? "visible" : "hidden",
              }}
            >
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>

            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography
                variant="overline"
                sx={{
                  color: "#82c1ff",
                  letterSpacing: 2,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Smakprov – {currentChart.key === "revenue" ? "intäkter" : "lobbytrend"}
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: "#ffffff",
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  mt: 0.8,
                }}
              >
                {currentChart.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(255,255,255,0.65)",
                  maxWidth: 620,
                  mx: "auto",
                  mt: 1,
                }}
              >
                {currentChart.subtitle}
              </Typography>
            </Box>

            <IconButton
              onClick={handleNext}
              disabled={index >= charts.length - 1}
              sx={{
                color: "#82c1ff",
                backgroundColor: "rgba(130,193,255,0.12)",
                "&:hover": { backgroundColor: "rgba(130,193,255,0.2)" },
                visibility: charts.length > 1 ? "visible" : "hidden",
              }}
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ width: "100%", height: { xs: 260, sm: 320 } }}>
            {currentChart.render()}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
