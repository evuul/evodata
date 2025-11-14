"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";

const formatAmount = (value, locale) => {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString(locale, { maximumFractionDigits: 0 })} €`;
};

const defaultLocale = (locale) => (locale === "en" ? "en-GB" : "sv-SE");

const buildChartData = (entries = []) => {
  const map = new Map();
  entries.forEach((entry) => {
    if (!entry?.gameShow) return;
    const amount = Number(entry.totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const multiplier = Number(entry.multiplier);
    const gameKey = entry.gameShow;
    if (!map.has(gameKey)) {
      map.set(gameKey, {
        gameShow: gameKey,
        totalAmount: 0,
        hits: 0,
        maxMultiplier: Number.isFinite(multiplier) ? multiplier : null,
      });
    }
    const current = map.get(gameKey);
    current.totalAmount += amount;
    current.hits += 1;
    if (Number.isFinite(multiplier)) {
      current.maxMultiplier = Math.max(current.maxMultiplier ?? multiplier, multiplier);
    }
  });
  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
};

const ChartTooltip = ({ active, payload, label, locale, translate }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <Box
      sx={{
        backgroundColor: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(148,163,184,0.4)",
        borderRadius: 1.5,
        p: 1.5,
        minWidth: 180,
      }}
    >
      <Typography variant="subtitle2" sx={{ color: "#f8fafc", fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: "#e2e8f0", fontWeight: 500 }}>
        {translate("Total utdelning", "Total payout")}: {formatAmount(data.totalAmount, locale)}
      </Typography>
      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.9)", display: "block" }}>
        {translate(`${data.hits} vinster`, `${data.hits} wins`)}
      </Typography>
      {Number.isFinite(data.maxMultiplier) && (
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.9)" }}>
          {translate(`Högsta multiplikator ${data.maxMultiplier}×`, `Top multiplier ${data.maxMultiplier}×`)}
        </Typography>
      )}
    </Box>
  );
};

const LiveTop3PayoutChart = ({ dayOptions = [], translate, locale, isLoading }) => {
  const [selectedDay, setSelectedDay] = useState(dayOptions[0]?.id ?? null);

  useEffect(() => {
    if (!dayOptions.length) {
      setSelectedDay(null);
      return;
    }
    if (!selectedDay || !dayOptions.find((day) => day.id === selectedDay)) {
      setSelectedDay(dayOptions[0].id);
    }
  }, [dayOptions, selectedDay]);

  const activeDay = useMemo(() => {
    if (!dayOptions.length) return null;
    return dayOptions.find((day) => day.id === selectedDay) ?? dayOptions[0];
  }, [dayOptions, selectedDay]);

  const chartData = useMemo(() => buildChartData(activeDay?.entries ?? []), [activeDay]);

  const totalPayout = useMemo(
    () => chartData.reduce((sum, row) => sum + row.totalAmount, 0),
    [chartData]
  );

  const dayLabel = (day) => {
    if (!day) return translate("Inget datum", "No date");
    if (day.isToday) return translate("Idag", "Today");
    if (!day.ymd) return translate("Okänt datum", "Unknown date");
    return new Date(day.ymd).toLocaleDateString(defaultLocale(locale), {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading && !dayOptions.length) {
    return <Skeleton variant="rounded" height={320} sx={{ backgroundColor: "rgba(15,23,42,0.55)" }} />;
  }

  if (!dayOptions.length) {
    return (
      <Card
        sx={{
          background: "rgba(15,23,42,0.55)",
          border: "1px solid rgba(148,163,184,0.18)",
          borderRadius: 3,
        }}
      >
        <CardContent>
          <Typography variant="body2" sx={{ color: "#e2e8f0" }}>
            {translate("Inga vinster att visa ännu.", "No payouts available yet.")}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        background: "rgba(15,23,42,0.55)",
        border: "1px solid rgba(148,163,184,0.18)",
        borderRadius: 3,
        boxShadow: "0 20px 35px rgba(2,6,23,0.55)",
      }}
    >
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2 }}>
              {translate("Payout per spel", "Payout per game")}
            </Typography>
            <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
              {translate("Samlad utdelning", "Aggregated payouts")}
            </Typography>
            {activeDay && (
              <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.9)", mt: 0.5 }}>
                {translate(`Visar ${dayLabel(activeDay)}`, `Showing ${dayLabel(activeDay)}`)}
              </Typography>
            )}
          </Box>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: "rgba(226,232,240,0.85)" }}>
              {translate("Välj dag", "Select day")}
            </InputLabel>
            <Select
              value={activeDay?.id ?? ""}
              label={translate("Välj dag", "Select day")}
              onChange={(event) => setSelectedDay(event.target.value)}
              sx={{
                color: "#f8fafc",
                ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(148,163,184,0.35)" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(148,163,184,0.6)" },
                "& .MuiSvgIcon-root": { color: "rgba(226,232,240,0.85)" },
              }}
            >
              {dayOptions.map((day) => (
                <MenuItem key={day.id} value={day.id}>
                  {dayLabel(day)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ color: "rgba(94,234,212,0.9)", textTransform: "uppercase" }}>
              {translate("Totalt", "Total")}
            </Typography>
            <Typography variant="h4" sx={{ color: "#f0fdf4", fontWeight: 700 }}>
              {formatAmount(totalPayout, defaultLocale(locale))}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.9)" }}>
              {translate(
                `${chartData.length} spel visade`,
                `${chartData.length} games shown`
              )}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ color: "rgba(94,234,212,0.9)", textTransform: "uppercase" }}>
              {translate("Antal vinster", "Number of wins")}
            </Typography>
            <Typography variant="h4" sx={{ color: "#f0fdf4", fontWeight: 700 }}>
              {activeDay?.entries?.length ?? 0}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.9)" }}>
              {translate("Unika spelarevent", "Unique game events")}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis
                dataKey="gameShow"
                stroke="rgba(226,232,240,0.9)"
                tick={{ fill: "rgba(226,232,240,0.85)", fontSize: 12 }}
                angle={-20}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                stroke="rgba(226,232,240,0.9)"
                tick={{ fill: "rgba(226,232,240,0.85)", fontSize: 12 }}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <RechartsTooltip
                content={(props) => (
                  <ChartTooltip {...props} locale={defaultLocale(locale)} translate={translate} />
                )}
              />
              <Bar
                dataKey="totalAmount"
                fill="url(#payoutGradient)"
                stroke="rgba(16,185,129,0.9)"
                radius={[6, 6, 0, 0]}
              />
              <defs>
                <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(34,197,94,0.9)" stopOpacity={0.95} />
                  <stop offset="95%" stopColor="rgba(14,165,233,0.25)" stopOpacity={0.25} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default LiveTop3PayoutChart;
