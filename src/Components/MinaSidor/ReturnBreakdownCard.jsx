"use client";

// Explains how market movement and dividends contribute to the holding's return.

import { useMemo, useState } from "react";
import { Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import { buildReturnBreakdown } from "@/lib/portfolioDashboard";
import { cardBase, statusColors, text } from "./styles";
import { formatPercent, formatSek } from "./utils";

const signedSek = (value) => `${Number(value) >= 0 ? "+" : ""}${formatSek(value)}`;

export default function ReturnBreakdownCard({ translate, totalCost, totalValue, dividendsReceived }) {
  const [displayMode, setDisplayMode] = useState("sek");
  const breakdown = useMemo(
    () => buildReturnBreakdown({ totalCost, totalValue, dividendsReceived }),
    [dividendsReceived, totalCost, totalValue]
  );

  const rows = [
    {
      id: "market",
      label: translate("Kursutveckling", "Market return"),
      value: breakdown.marketReturn,
      pct: breakdown.marketReturnPct,
      color: breakdown.marketReturn >= 0 ? statusColors.positive : statusColors.negative,
    },
    {
      id: "dividends",
      label: translate("Mottagna utdelningar", "Dividends received"),
      value: breakdown.dividends,
      pct: breakdown.dividendReturnPct,
      color: "#38bdf8",
    },
  ];
  const largest = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  const formatValue = (row) => displayMode === "sek" ? signedSek(row.value) : formatPercent(row.pct);

  return (
    <Paper sx={{ ...cardBase, p: { xs: 2.2, md: 2.8 }, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TrendingUpRounded sx={{ color: "#a78bfa", fontSize: 20 }} />
            <Typography sx={{ color: text.heading, fontWeight: 850 }}>
              {translate("Så har avkastningen skapats", "How your return was created")}
            </Typography>
          </Stack>
          <Typography sx={{ color: text.muted, fontSize: "0.83rem", mt: 0.5 }}>
            {translate("Nuvarande innehav jämfört med anskaffningsvärdet.", "Current holding compared with its cost basis.")}
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={displayMode}
          onChange={(_, value) => value && setDisplayMode(value)}
          sx={{ "& .MuiToggleButton-root": { color: text.muted, px: 1.2, py: 0.35, textTransform: "none" }, "& .Mui-selected": { color: "#fff!important" } }}
        >
          <ToggleButton value="sek">SEK</ToggleButton>
          <ToggleButton value="percent">%</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box sx={{ mt: 2.4 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.4 }}>
          <Typography sx={{ color: text.subtle }}>{translate("Investerat kapital", "Invested capital")}</Typography>
          <Typography sx={{ color: text.heading, fontWeight: 800 }}>{formatSek(breakdown.investedCapital)}</Typography>
        </Stack>
        <Stack spacing={1.8}>
          {rows.map((row) => (
            <Box key={row.id}>
              <Stack direction="row" justifyContent="space-between" gap={2}>
                <Typography sx={{ color: text.subtle }}>{row.label}</Typography>
                <Typography sx={{ color: row.color, fontWeight: 850 }}>{formatValue(row)}</Typography>
              </Stack>
              <Box sx={{ height: 7, background: "rgba(148,163,184,0.12)", borderRadius: 999, mt: 0.65, overflow: "hidden" }}>
                <Box sx={{ height: "100%", width: `${Math.max(3, Math.abs(row.value) / largest * 100)}%`, background: row.color, borderRadius: 999 }} />
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 2.4, pt: 2, borderTop: "1px solid rgba(148,163,184,0.16)" }}
      >
        <Box>
          <Typography sx={{ color: text.muted, fontSize: "0.78rem" }}>{translate("Total avkastning", "Total return")}</Typography>
          <Typography sx={{ color: breakdown.totalReturn >= 0 ? statusColors.positive : statusColors.negative, fontSize: "1.35rem", fontWeight: 900 }}>
            {displayMode === "sek" ? signedSek(breakdown.totalReturn) : formatPercent(breakdown.totalReturnPct)}
          </Typography>
        </Box>
        <Typography sx={{ color: text.muted, textAlign: "right", fontSize: "0.8rem" }}>
          {translate("Kurs + utdelning", "Market + dividends")}
        </Typography>
      </Stack>
    </Paper>
  );
}
