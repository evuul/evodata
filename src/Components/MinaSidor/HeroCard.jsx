"use client";

import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { formatPercent, formatSek } from "./utils";
import { cardBase, statusColors, text } from "./styles";

export default function HeroCard({
  translate,
  totalValue,
  totalReturn,
  totalReturnPct,
  todaysChangePercent,
  shares,
  avgCost,
  currentPrice,
  onManage,
}) {
  return (
    <Paper
      sx={{
        p: { xs: 2.5, md: 3 },
        ...cardBase,
        background: "linear-gradient(135deg, rgba(30,41,59,0.75), rgba(15,23,42,0.9))",
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "center" }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: text.subtle, letterSpacing: 0.5 }}>
            {translate("Totalt marknadsvärde", "Total market value")}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, color: text.heading, mt: 0.5 }}>
            {formatSek(totalValue)}
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1.5, color: text.faint }}>
            <Typography>
              {translate(`Innehav: ${shares.toLocaleString("sv-SE")} st`, `Holdings: ${shares.toLocaleString("sv-SE")} shares`)}
            </Typography>
            <Typography>•</Typography>
            <Typography>{translate(`GAV: ${formatSek(avgCost)}`, `Cost basis: ${formatSek(avgCost)}`)}</Typography>
            <Typography>•</Typography>
            <Typography>{translate(`Live pris: ${formatSek(currentPrice)}`, `Live price: ${formatSek(currentPrice)}`)}</Typography>
          </Stack>
        </Box>
        <Box sx={{ minWidth: 260 }}>
          <Typography sx={{ color: text.subtle }}>{translate("Total avkastning", "Total return")}</Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: totalReturn >= 0 ? statusColors.positive : statusColors.negative,
            }}
          >
            {formatSek(totalReturn)}
          </Typography>
          <Typography sx={{ color: text.muted }}>{formatPercent(totalReturnPct)}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
            <Typography sx={{ color: text.subtle }}>{translate("Idag", "Today")}</Typography>
            <Typography
              sx={{
                fontWeight: 700,
                color:
                  Number.isFinite(todaysChangePercent)
                    ? todaysChangePercent >= 0
                      ? statusColors.positive
                      : statusColors.negative
                    : text.heading,
              }}
            >
              {Number.isFinite(todaysChangePercent) ? formatPercent(todaysChangePercent) : "–"}
            </Typography>
          </Stack>
        </Box>
        <Box>
          <Button
            variant="contained"
            onClick={onManage}
            sx={{ fontWeight: 700, background: "linear-gradient(135deg, #38bdf8, #3b82f6)" }}
          >
            {translate("Hantera innehav", "Manage holdings")}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
